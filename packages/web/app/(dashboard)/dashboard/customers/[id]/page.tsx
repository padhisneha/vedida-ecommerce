'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getUserById,
  getUserOrdersWithProducts,
  getUserSubscriptionsWithProducts,
  getCustomerStats,
  User,
  Order,
  Subscription,
  OrderStatus,
  SubscriptionStatus,
  formatCurrency,
  formatDate,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const [customer, setCustomer] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomerData();
  }, [params.id]);

  const loadCustomerData = async () => {
    try {
      // Load customer details
      const customerData = await getUserById(params.id);
      setCustomer(customerData);

      if (!customerData) {
        setLoading(false);
        return;
      }

      // Load orders
      const ordersData = await getUserOrdersWithProducts(params.id);
      setOrders(ordersData);

      // Load subscriptions
      const subsData = await getUserSubscriptionsWithProducts(params.id);
      setSubscriptions(subsData);

      // Load stats
      const statsData = await getCustomerStats(params.id);
      setStats(statsData);

      console.log('✅ Loaded customer data');
    } catch (error) {
      console.error('Error loading customer data:', error);
      showToast.error('Failed to load customer details');
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

  const getClosedOrders = () => {
    return orders.filter(
      (order) =>
        order.status === OrderStatus.DELIVERED ||
        order.status === OrderStatus.CANCELLED
    ).slice(0, 5); // Show last 5
  };

  const getActiveSubscriptions = () => {
    return subscriptions.filter(
      (sub) =>
        sub.status === SubscriptionStatus.PENDING ||
        sub.status === SubscriptionStatus.ACTIVE ||
        sub.status === SubscriptionStatus.PAUSED
    );
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">👤</div>
          <div className="text-lg text-gray-600">Loading customer details...</div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Customer Not Found</h2>
          <Link href="/dashboard/customers" className="btn-primary">
            ← Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  const activeOrders = getActiveOrders();
  const closedOrders = getClosedOrders();
  const activeSubscriptions = getActiveSubscriptions();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/customers"
          className="text-primary-600 hover:text-primary-700 font-medium text-sm mb-4 inline-flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to Customers</span>
        </Link>
        
        <div className="flex items-start gap-6 mt-4">
          <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-3xl">
              {customer.name?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {customer.name || 'Unnamed Customer'}
            </h1>
            <p className="text-gray-600 mt-1">{customer.phoneNumber}</p>
            {customer.email && (
              <p className="text-gray-600">{customer.email}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Customer since {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalOrders}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Total Spent</p>
          <p className="text-2xl font-bold text-primary-600 mt-2">
            {formatCurrency(stats.totalSpent)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Subscriptions</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalSubscriptions}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{stats.activeSubscriptions}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              📦 Active Orders ({activeOrders.length})
            </h2>
            <Link
              href={`/dashboard/orders?customer=${params.id}`}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          
          {activeOrders.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No active orders</p>
          ) : (
            <div className="space-y-3">
              {activeOrders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-sm">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        order.status === OrderStatus.PENDING
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Closed Orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              📋 Recent Closed Orders
            </h2>
          </div>
          
          {closedOrders.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No closed orders</p>
          ) : (
            <div className="space-y-3">
              {closedOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-sm">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        order.status === OrderStatus.DELIVERED
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Active Subscriptions */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              📅 Active Subscriptions ({activeSubscriptions.length})
            </h2>
            <Link
              href={`/dashboard/subscriptions?customer=${params.id}`}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          
          {activeSubscriptions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No active subscriptions</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeSubscriptions.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/dashboard/subscriptions/${sub.id}`}
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-gray-900">
                      {sub.subscriptionNumber || `SUB-${sub.id.slice(0, 8)}`}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      sub.status === SubscriptionStatus.PENDING
                        ? 'bg-yellow-100 text-yellow-800'
                        : sub.status === SubscriptionStatus.ACTIVE
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {sub.frequency} • {sub.items.length} item(s)
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Started: {formatDate(sub.startDate)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Customer Addresses */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            📍 Delivery Addresses ({customer.addresses.length})
          </h2>
          
          {customer.addresses.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No addresses added</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.addresses.map((address) => (
                <div
                  key={address.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-gray-900">{address.label}</p>
                    {address.isDefault && (
                      <span className="bg-primary-100 text-primary-800 text-xs px-2 py-0.5 rounded-full font-medium">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    {address.apartment && `${address.apartment}, `}
                    {address.street}
                  </p>
                  <p className="text-sm text-gray-700">
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                  {address.landmark && (
                    <p className="text-xs text-gray-500 mt-2">
                      📍 {address.landmark}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}