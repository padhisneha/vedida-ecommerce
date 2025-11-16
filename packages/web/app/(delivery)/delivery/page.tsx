'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getAllOrders,
  updateOrderStatus,
  Order,
  OrderStatus,
  User,
  formatCurrency,
  formatDate,
  formatDateTime,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@ecommerce/shared';

type FilterType = 'all' | 'overdue' | 'today' | 'upcoming' | 'delivered';

export default function DeliveryPartnerHomePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');


  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
        router.push('/login');
    } else if (!isLoading && user && user.role !== UserRole.DELIVERY_PARTNER) {
        if (user && user.role === UserRole.ADMIN) {
            router.push('/dashboard');
        } else {
            showToast.error('Access denied. Admin privileges required.');
            router.push('/login');
        }
    }
    loadOrders();
  }, [user, isAuthenticated, isLoading, isAdmin, router]);

  const loadOrders = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const allOrders = await getAllOrders();
      
      // Filter orders assigned to this delivery partner
      const myOrders = allOrders.filter(
        order => order.deliveryPartnerId === user.id
      );
      
      // Sort by scheduled delivery date (earliest first)
      myOrders.sort((a, b) => 
        a.scheduledDeliveryDate.toMillis() - b.scheduledDeliveryDate.toMillis()
      );
      
      setOrders(myOrders);
      console.log('✅ Loaded assigned orders:', myOrders.length);
    } catch (error) {
      console.error('Error loading orders:', error);
      showToast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    const statusLabels = {
      [OrderStatus.PENDING]: 'Pending',
      [OrderStatus.CONFIRMED]: 'Confirmed',
      [OrderStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
      [OrderStatus.DELIVERED]: 'Delivered',
      [OrderStatus.CANCELLED]: 'Cancelled',
    };

    if (!confirm(`Mark this order as "${statusLabels[newStatus]}"?`)) {
      return;
    }

    setUpdating(orderId);
    const toastId = showToast.loading('Updating order status...');

    try {
      await updateOrderStatus(orderId, newStatus);
      showToast.dismiss(toastId);
      showToast.success('Order status updated successfully!');
      await loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to update order status');
    } finally {
      setUpdating(null);
    }
  };

  const isDeliveryToday = (order: Order) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDate = order.scheduledDeliveryDate.toDate();
    deliveryDate.setHours(0, 0, 0, 0);
    return deliveryDate.getTime() === today.getTime();
  };

  const isDeliveryOverdue = (order: Order) => {
    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDate = order.scheduledDeliveryDate.toDate();
    deliveryDate.setHours(0, 0, 0, 0);
    return deliveryDate.getTime() < today.getTime();
  };

  const isDeliveredToday = (order: Order) => {
    if (!order.deliveredAt) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveredDate = order.deliveredAt.toDate();
    deliveredDate.setHours(0, 0, 0, 0);
    return deliveredDate.getTime() === today.getTime();
  };

  const getFilteredOrders = () => {
    let filtered = [...orders];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        o => o.orderNumber.toLowerCase().includes(query) ||
             o.deliveryAddress.label.toLowerCase().includes(query) ||
             o.deliveryAddress.city.toLowerCase().includes(query) ||
             o.deliveryAddress.street.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (activeFilter === 'all') {
      filtered = filtered.filter(o => 
        o.status !== OrderStatus.DELIVERED && 
        o.status !== OrderStatus.CANCELLED);
    } else if (activeFilter === 'overdue') {
      filtered = filtered.filter(isDeliveryOverdue);
    } else if (activeFilter === 'today') {
      filtered = filtered.filter(o => isDeliveryToday(o) && 
        o.status !== OrderStatus.DELIVERED && 
        o.status !== OrderStatus.CANCELLED);
    } else if (activeFilter === 'upcoming') {
      filtered = filtered.filter(o => !isDeliveryToday(o) && 
        !isDeliveryOverdue(o) && 
        o.status !== OrderStatus.DELIVERED && 
        o.status !== OrderStatus.CANCELLED);
    } else if (activeFilter === 'delivered') {
      filtered = filtered.filter(o => 
        (o.status === OrderStatus.DELIVERED && isDeliveredToday(o)) ||
        (o.status === OrderStatus.CANCELLED && isDeliveredToday(o))
      );
    }

    return filtered;
  };

  const getCategoryCount = (category: FilterType) => {
    if (category === 'all') {
      return orders.filter(o => 
        o.status !== OrderStatus.DELIVERED && 
        o.status !== OrderStatus.CANCELLED
      ).length;
    }
    if (category === 'overdue') {
      return orders.filter(isDeliveryOverdue).length;
    }
    if (category === 'today') {
      return orders.filter(o => isDeliveryToday(o) && 
        o.status !== OrderStatus.DELIVERED && 
        o.status !== OrderStatus.CANCELLED).length;
    }
    if (category === 'upcoming') {
      return orders.filter(o => !isDeliveryToday(o) && 
        !isDeliveryOverdue(o) && 
        o.status !== OrderStatus.DELIVERED && 
        o.status !== OrderStatus.CANCELLED).length;
    }
    if (category === 'delivered') {
      return orders.filter(o => 
        (o.status === OrderStatus.DELIVERED && isDeliveredToday(o)) ||
        (o.status === OrderStatus.CANCELLED && isDeliveredToday(o))
      ).length;
    }
    return 0;
  };

  const getStatusBadge = (status: OrderStatus) => {
    const styles = {
      [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [OrderStatus.CONFIRMED]: 'bg-blue-100 text-blue-800',
      [OrderStatus.OUT_FOR_DELIVERY]: 'bg-purple-100 text-purple-800',
      [OrderStatus.DELIVERED]: 'bg-green-100 text-green-800',
      [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800',
    };

    const labels = {
      [OrderStatus.PENDING]: 'Pending',
      [OrderStatus.CONFIRMED]: 'Confirmed',
      [OrderStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
      [OrderStatus.DELIVERED]: 'Delivered',
      [OrderStatus.CANCELLED]: 'Cancelled',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    if (currentStatus === OrderStatus.PENDING) return OrderStatus.CONFIRMED;
    if (currentStatus === OrderStatus.CONFIRMED) return OrderStatus.OUT_FOR_DELIVERY;
    if (currentStatus === OrderStatus.OUT_FOR_DELIVERY) return OrderStatus.DELIVERED;
    return null;
  };

  const getNextStatusLabel = (currentStatus: OrderStatus): string => {
    const next = getNextStatus(currentStatus);
    if (!next) return '';
    const labels = {
      [OrderStatus.CONFIRMED]: 'Confirm',
      [OrderStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
      [OrderStatus.DELIVERED]: 'Mark Delivered',
    };
    return labels[next] || '';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">🚚</div>
          <div className="text-lg text-gray-600">Loading your deliveries...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">This page is only accessible to delivery partners.</p>
        </div>
      </div>
    );
  }

  const filteredOrders = getFilteredOrders();
  const overdueCount = getCategoryCount('overdue');
  const todayCount = getCategoryCount('today');
  const upcomingCount = getCategoryCount('upcoming');
  const deliveredCount = getCategoryCount('delivered');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Hello, {user.name || 'Partner'}! 
            </h1>
            <p className="text-gray-600 mt-2">Manage your delivery assignments</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Vehicle</p>
            <p className="font-semibold text-gray-900 capitalize">
              {user.vehicleType || 'Not Set'} {user.vehicleNumber && `• ${user.vehicleNumber}`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800">Overdue</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{overdueCount}</p>
            </div>
            <div className="text-3xl">⚠️</div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Today</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{todayCount}</p>
            </div>
            <div className="text-3xl">📅</div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Upcoming</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{upcomingCount}</p>
            </div>
            <div className="text-3xl">📆</div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Completed Today</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{deliveredCount}</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              className="input"
              placeholder="Order number, customer, address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
            >
              <option value="all">All Statuses</option>
              <option value={OrderStatus.PENDING}>Pending</option>
              <option value={OrderStatus.CONFIRMED}>Confirmed</option>
              <option value={OrderStatus.OUT_FOR_DELIVERY}>Out for Delivery</option>
              <option value={OrderStatus.DELIVERED}>Delivered</option>
              <option value={OrderStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setActiveFilter('all');
              }}
              className="btn-secondary w-full"
            >
              🔄 Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`pb-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeFilter === 'all'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Active
            {getCategoryCount('all') > 0 && (
              <span className="ml-2 bg-gray-200 text-gray-600 py-0.5 px-2 rounded-full text-xs font-semibold">
                {getCategoryCount('all')}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter('overdue')}
            className={`pb-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeFilter === 'overdue'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ⚠️ Overdue
            {overdueCount > 0 && (
              <span className="ml-2 bg-red-100 text-red-800 py-0.5 px-2 rounded-full text-xs font-semibold">
                {overdueCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter('today')}
            className={`pb-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeFilter === 'today'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📅 Today
            {todayCount > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 py-0.5 px-2 rounded-full text-xs font-semibold">
                {todayCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter('upcoming')}
            className={`pb-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeFilter === 'upcoming'
                ? 'border-gray-500 text-gray-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📆 Upcoming
            {upcomingCount > 0 && (
              <span className="ml-2 bg-gray-200 text-gray-600 py-0.5 px-2 rounded-full text-xs font-semibold">
                {upcomingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter('delivered')}
            className={`pb-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeFilter === 'delivered'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ✅ Delivered Today
            {deliveredCount > 0 && (
              <span className="ml-2 bg-green-100 text-green-800 py-0.5 px-2 rounded-full text-xs font-semibold">
                {deliveredCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No orders found
          </h3>
          <p className="text-gray-600">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : activeFilter === 'all'
              ? 'You have no active deliveries at the moment'
              : `No ${activeFilter} deliveries`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrders.map((order) => {
            const isOverdue = isDeliveryOverdue(order);
            const isToday = isDeliveryToday(order);
            const nextStatus = getNextStatus(order.status);
            const canUpdateStatus = nextStatus && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED;

            return (
              <div
                key={order.id}
                className={`card hover:shadow-lg transition-shadow ${
                  isOverdue && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED
                    ? 'border-red-300 bg-red-50'
                    : isToday && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED
                    ? 'border-blue-300 bg-blue-50'
                    : order.status === OrderStatus.DELIVERED
                    ? 'border-green-300 bg-green-50'
                    : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {order.orderNumber}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.items.length} item(s) • {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Delivery Info */}
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Customer</p>
                      <p className="font-semibold text-gray-900">{order.deliveryAddress.label}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Scheduled Delivery</p>
                      <p className={`font-semibold ${
                        isOverdue && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED
                          ? 'text-red-600'
                          : isToday
                          ? 'text-blue-600'
                          : 'text-gray-900'
                      }`}>
                        {formatDate(order.scheduledDeliveryDate)}
                        {isOverdue && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && (
                          <span className="text-xs ml-1">(Overdue!)</span>
                        )}
                        {isToday && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && (
                          <span className="text-xs ml-1">(Today)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">📍 Delivery Address</p>
                    <p className="text-sm font-medium text-gray-900">
                      {order.deliveryAddress.apartment && `${order.deliveryAddress.apartment}, `}
                      {order.deliveryAddress.street}
                    </p>
                    <p className="text-sm text-gray-700">
                      {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
                    </p>
                    {order.deliveryAddress.landmark && (
                      <p className="text-xs text-gray-600 mt-1">
                        Landmark: {order.deliveryAddress.landmark}
                      </p>
                    )}
                  </div>

                  {/* Order Items Preview */}
                  <div>
                    <p className="text-xs text-gray-600 mb-2">📦 Items</p>
                    <div className="space-y-1">
                      {order.items.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="text-sm text-gray-700">
                          • {item.quantity}x at {formatCurrency(item.price)} each
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-xs text-gray-500">
                          +{order.items.length - 2} more item(s)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Delivered info */}
                  {order.deliveredAt && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                      <p className="text-xs text-green-700">
                        ✅ Delivered on {formatDateTime(order.deliveredAt)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {canUpdateStatus && (
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleStatusUpdate(order.id, nextStatus)}
                      disabled={updating === order.id}
                      className="btn-primary w-full"
                    >
                      {updating === order.id
                        ? '⏳ Updating...'
                        : `✅ ${getNextStatusLabel(order.status)}`}
                    </button>
                  </div>
                )}

                {order.status === OrderStatus.DELIVERED && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-center py-2 bg-green-100 rounded-lg">
                      <span className="text-green-800 font-semibold">✅ Completed</span>
                    </div>
                  </div>
                )}

                {order.status === OrderStatus.CANCELLED && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-center py-2 bg-red-100 rounded-lg">
                      <span className="text-red-800 font-semibold">❌ Cancelled</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}