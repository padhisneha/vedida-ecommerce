'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getAllOrders,
  getAllOrdersWithProducts,
  getAllSubscriptions,
  getAllUsers,
  generateSubscriptionOrders,
  Order,
  Subscription,
  OrderStatus,
  SubscriptionStatus,
  UserRole,
  formatCurrency,
  formatDate,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [customers, setCustomers] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [ordersData, subsData, usersData] = await Promise.all([
        getAllOrdersWithProducts(), // Changed from getAllOrders
        getAllSubscriptions(),
        getAllUsers(),
      ]);

      setOrders(ordersData);
      setSubscriptions(subsData);
      setCustomers(usersData.filter((u) => u.role === UserRole.CUSTOMER).length);
      
      console.log('✅ Dashboard data loaded with products');
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActiveOrders = () => {
    return orders.filter(
      (order) =>
        order.status === OrderStatus.PENDING ||
        order.status === OrderStatus.CONFIRMED ||
        order.status === OrderStatus.OUT_FOR_DELIVERY
    );
  };

  const getActiveSubscriptions = () => {
    return subscriptions.filter(
      (sub) =>
        sub.status === SubscriptionStatus.ACTIVE ||
        sub.status === SubscriptionStatus.PAUSED
    );
  };

  const getTodayRevenue = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return orders
      .filter((order) => {
        const orderDate = order.createdAt.toDate();
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime() && order.status === OrderStatus.DELIVERED;
      })
      .reduce((sum, order) => sum + order.totalAmount, 0);
  };

  const getTodayOrders = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return orders.filter((order) => {
      const deliveryDate = order.scheduledDeliveryDate.toDate();
      deliveryDate.setHours(0, 0, 0, 0);
      return deliveryDate.getTime() === today.getTime();
    });
  };

  const getTodayDeliverySummary = () => {
    const todayOrders = getTodayOrders();
    const productMap = new Map<string, { name: string; quantity: number; unit: string }>();

    todayOrders.forEach((order) => {
      order.items.forEach((item) => {
        const product = item.product;
        const productKey = item.productId;
        
        if (product) {
          const existing = productMap.get(productKey) || { 
            name: product.name, 
            quantity: 0,
            unit: product.unit 
          };
          
          productMap.set(productKey, {
            name: product.name,
            quantity: existing.quantity + item.quantity,
            unit: product.unit,
          });
        }
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity);
  };

  const getRecentActivity = () => {
    const activities: Array<{ type: string; message: string; time: Date }> = [];

    // Recent orders
    orders
      .slice(0, 3)
      .forEach((order) => {
        activities.push({
          type: order.status === OrderStatus.PENDING ? 'new_order' : 'order_update',
          message: `Order ${order.orderNumber} - ${order.status}`,
          time: order.createdAt.toDate(),
        });
      });

    // Recent subscriptions
    subscriptions
      .slice(0, 2)
      .forEach((sub) => {
        activities.push({
          type: 'subscription',
          message: `New subscription created - ${sub.frequency}`,
          time: sub.createdAt.toDate(),
        });
      });

    return activities
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 5);
  };

  const handleGenerateOrders = async () => {
    const activeCount = activeSubscriptionsList.length;
    
    if (!confirm(
      `Generate orders from ${activeCount} active subscription(s) for today?\n\n` +
      `This will create delivery orders for all applicable subscriptions.`
    )) {
      return;
    }

    setGenerating(true);
    try {
      const today = new Date();
      const result = await generateSubscriptionOrders(today);

      if (result.errors.length > 0) {
        alert(
          `⚠️ Orders Generated with Some Issues\n\n` +
          `✅ Successfully Created: ${result.created} order(s)\n` +
          `⏭️ Skipped: ${result.skipped} (already exists, paused, or not scheduled)\n` +
          `❌ Failed: ${result.errors.length}\n\n` +
          `Error Details:\n${result.errors.slice(0, 3).join('\n')}` +
          (result.errors.length > 3 ? `\n...and ${result.errors.length - 3} more` : '')
        );
      } else {
        alert(
          `✅ Subscription Orders Generated!\n\n` +
          `📦 Created: ${result.created} new order(s)\n` +
          `⏭️ Skipped: ${result.skipped}\n\n` +
          `Orders are now visible in the Orders section.`
        );
      }

      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Error generating orders:', error);
      showToast.error('Failed to generate orders. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const hasGeneratedTodayOrders = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = orders.filter((order) => {
      if (order.type !== 'subscription') return false;
      
      const deliveryDate = order.scheduledDeliveryDate.toDate();
      deliveryDate.setHours(0, 0, 0, 0);
      
      return deliveryDate.getTime() === today.getTime();
    });

    return todayOrders.length > 0;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">📊</div>
          <div className="text-lg text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  const activeOrders = getActiveOrders();
  const activeSubscriptionsList = getActiveSubscriptions();
  const todayRevenue = getTodayRevenue();
  const deliverySummary = getTodayDeliverySummary();
  const recentActivity = getRecentActivity();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {user?.name || 'Admin'}! 
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your business today
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/dashboard/orders" className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{activeOrders.length}</p>
              <p className="text-xs text-green-600 mt-2">
                {orders.filter(o => o.status === OrderStatus.PENDING).length} pending approval
              </p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </Link>

        <Link href="/dashboard/subscriptions" className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{activeSubscriptionsList.length}</p>
              <p className="text-xs text-blue-600 mt-2">
                {subscriptions.filter(s => s.status === SubscriptionStatus.PENDING).length} pending approval
              </p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </Link>

        <Link href="/dashboard/customers" className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{customers}</p>
              <p className="text-xs text-blue-600 mt-2">Registered users</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </Link>

        <div className="card bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Today's Revenue</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {formatCurrency(todayRevenue)}
              </p>
              <p className="text-xs text-green-700 mt-2">
                {getTodayOrders().length} deliveries today
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>
      </div>

      {/* Today's Delivery Summary & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Today's Delivery Summary */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              📋 Today's Delivery Summary
            </h2>
            <span className="text-sm text-gray-500">
              {getTodayOrders().length} orders
            </span>
          </div>
          
          {/* Product Summary */}
          {deliverySummary.length > 0 ? (
            <div className="space-y-3 mb-4">
            {deliverySummary.slice(0, 5).map((item) => (
              <div key={item.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📦</span>
                  <span className="font-medium text-gray-900">{item.name}</span>
                </div>
                <span className="text-lg font-bold text-primary-600">
                  {item.quantity} {item.unit}
                </span>
              </div>
            ))}
          </div>
          ) : (
            <div className="text-center py-6 mb-4">
              <p className="text-gray-500 text-sm">
                {getTodayOrders().length === 0 
                  ? 'No deliveries scheduled for today'
                  : 'Loading delivery summary...'}
              </p>
            </div>
          )}
          
          {/* Generate Orders Button - Always show if there are active subscriptions */}
          {activeSubscriptionsList.length > 0 ? (
            hasGeneratedTodayOrders() ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-sm text-green-800 font-medium flex items-center justify-center gap-2">
                  <span>✅</span>
                  <span>Today's subscription orders have been generated</span>
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {getTodayOrders().filter(o => o.type === 'subscription').length} subscription orders created
                </p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-blue-800">
                    💡 <strong>{activeSubscriptionsList.length} active subscription(s)</strong> ready for order generation
                  </p>
                </div>
                <button
                  onClick={handleGenerateOrders}
                  disabled={generating}
                  className="btn-primary w-full"
                >
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      <span>Generating Orders...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>📦</span>
                      <span>Generate Today's Subscription Orders</span>
                    </span>
                  )}
                </button>
              </>
            )
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                No active subscriptions to generate orders from
              </p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            🕒 Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'new_order' ? 'bg-green-500' :
                    activity.type === 'subscription' ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(activity.time.getTime())}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/orders?tab=new" className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="text-4xl mb-3">📦</div>
            <h3 className="font-semibold text-gray-900 mb-2">New Orders</h3>
            <p className="text-sm text-gray-600 mb-4">
              View and manage pending orders
            </p>
            <div className="text-2xl font-bold text-yellow-600">
              {orders.filter(o => o.status === OrderStatus.PENDING).length}
            </div>
          </div>
        </Link>

        <Link href="/dashboard/orders?tab=active" className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="text-4xl mb-3">🚚</div>
            <h3 className="font-semibold text-gray-900 mb-2">Out for Delivery</h3>
            <p className="text-sm text-gray-600 mb-4">
              Track ongoing deliveries
            </p>
            <div className="text-2xl font-bold text-blue-600">
              {orders.filter(o => o.status === OrderStatus.OUT_FOR_DELIVERY).length}
            </div>
          </div>
        </Link>

        <Link href="/dashboard/inventory" className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="font-semibold text-gray-900 mb-2">Low Stock Items</h3>
            <p className="text-sm text-gray-600 mb-4">
              Items needing restock
            </p>
            <div className="text-2xl font-bold text-red-600">
              {/* This would need a proper inventory tracking system */}
              0
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}