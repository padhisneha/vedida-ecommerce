'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getUserById,
  updateDeliveryPartner,
  toggleDeliveryPartnerStatus,
  getDeliveryPartnerStats,
  getAllOrders,
  User,
  Order,
  OrderStatus,
  formatDate,
  formatCurrency,
  formatDateTime,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

export default function DeliveryPartnerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [partner, setPartner] = useState<User | null>(null);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    totalDelivered: 0,
    totalRevenue: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    vehicleType: 'bike',
    vehicleNumber: '',
  });

  const loadPartner = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUserById(params.id);
      if (data) {
        setPartner(data);
        setFormData({
          name: data.name || '',
          email: data.email || '',
          vehicleType: data.vehicleType || 'bike',
          vehicleNumber: data.vehicleNumber || '',
        });
      }
    } catch (error) {
      console.error('Error loading delivery partner:', error);
      showToast.error('Failed to load delivery partner');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const loadStats = useCallback(async () => {
    try {
      const data = await getDeliveryPartnerStats(params.id);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [params.id]);

  const loadAssignedOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const allOrders = await getAllOrders();

      const partnerOrders = allOrders.filter(
        order =>
          order.deliveryPartnerId === params.id &&
          order.status !== OrderStatus.DELIVERED &&
          order.status !== OrderStatus.CANCELLED
      );

      partnerOrders.sort(
        (a, b) =>
          a.scheduledDeliveryDate.toMillis() -
          b.scheduledDeliveryDate.toMillis()
      );

      setAssignedOrders(partnerOrders);
      console.log('✅ Loaded assigned orders:', partnerOrders.length);
    } catch (error) {
      console.error('Error loading assigned orders:', error);
      showToast.error('Failed to load assigned orders');
    } finally {
      setLoadingOrders(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadPartner();
    loadStats();
    loadAssignedOrders();
  }, [loadPartner, loadStats, loadAssignedOrders]);

  const handleSave = async () => {
    if (!partner) return;

    if (!formData.name.trim()) {
      showToast.error('Please enter partner name');
      return;
    }

    setSaving(true);
    const toastId = showToast.loading('Updating delivery partner...');

    try {
      await updateDeliveryPartner(partner.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        vehicleType: formData.vehicleType,
        vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
      });

      showToast.dismiss(toastId);
      showToast.success('Delivery partner updated successfully!');
      setEditing(false);
      await loadPartner();
    } catch (error: any) {
      console.error('Error updating delivery partner:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to update delivery partner');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!partner) return;

    const action = partner.isActive !== false ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this delivery partner?`)) {
      return;
    }

    setSaving(true);
    const toastId = showToast.loading(`${action === 'suspend' ? 'Suspending' : 'Activating'} partner...`);

    try {
      await toggleDeliveryPartnerStatus(partner.id, partner.isActive === false);
      showToast.dismiss(toastId);
      showToast.success(`Partner ${action}d successfully!`);
      await loadPartner();
    } catch (error) {
      console.error('Error toggling status:', error);
      showToast.dismiss(toastId);
      showToast.error(`Failed to ${action} partner`);
    } finally {
      setSaving(false);
    }
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
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getStatusIcon = (status: OrderStatus) => {
    const icons = {
      [OrderStatus.PENDING]: '⏳',
      [OrderStatus.CONFIRMED]: '✅',
      [OrderStatus.OUT_FOR_DELIVERY]: '🚚',
      [OrderStatus.DELIVERED]: '📦',
      [OrderStatus.CANCELLED]: '❌',
    };
    return icons[status];
  };

  const isDeliveryToday = (order: Order) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDate = order.scheduledDeliveryDate.toDate();
    deliveryDate.setHours(0, 0, 0, 0);
    return deliveryDate.getTime() === today.getTime();
  };

  const isDeliveryOverdue = (order: Order) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDate = order.scheduledDeliveryDate.toDate();
    deliveryDate.setHours(0, 0, 0, 0);
    return deliveryDate.getTime() < today.getTime();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">🚚</div>
          <div className="text-lg text-gray-600">Loading delivery partner...</div>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Delivery Partner Not Found</h2>
          <Link href="/dashboard/delivery-partners" className="btn-primary">
            ← Back to Delivery Partners
          </Link>
        </div>
      </div>
    );
  }

  // Group orders by status
  const todayOrders = assignedOrders.filter(isDeliveryToday);
  const overdueOrders = assignedOrders.filter(isDeliveryOverdue);
  const upcomingOrders = assignedOrders.filter(
    order => !isDeliveryToday(order) && !isDeliveryOverdue(order)
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/delivery-partners"
          className="text-primary-600 hover:text-primary-700 font-medium text-sm mb-4 inline-flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to Delivery Partners</span>
        </Link>
        
        <div className="flex items-start justify-between mt-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-3xl">
                {partner.name?.charAt(0).toUpperCase() || 'D'}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{partner.name || 'Unnamed Partner'}</h1>
              <p className="text-gray-600 mt-1">{partner.phoneNumber}</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                partner.isActive !== false
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {partner.isActive !== false ? '✅ Active' : '⏸️ Suspended'}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2">
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <span>✏️</span>
                  <span>Edit Details</span>
                </button>
                <button
                  onClick={handleToggleStatus}
                  disabled={saving}
                  className={partner.isActive !== false ? 'btn-danger' : 'btn-primary'}
                >
                  {partner.isActive !== false ? '⏸️ Suspend' : '✅ Activate'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      name: partner.name || '',
                      email: partner.email || '',
                      vehicleType: partner.vehicleType || 'bike',
                      vehicleNumber: partner.vehicleNumber || '',
                    });
                  }}
                  disabled={saving}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Total Assigned</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalAssigned}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Completed</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalDelivered}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Success Rate</p>
          <p className="text-3xl font-bold text-primary-600 mt-2">
            {stats.successRate.toFixed(1)}%
          </p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Revenue Generated</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {formatCurrency(stats.totalRevenue)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          {editing ? (
            /* Edit Form */
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                📝 Edit Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Vehicle Type</label>
                  <select
                    className="input"
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  >
                    <option value="bike">🏍️ Bike/Scooter</option>
                    <option value="car">🚗 Car</option>
                    <option value="bicycle">🚲 Bicycle</option>
                    <option value="van">🚐 Van</option>
                  </select>
                </div>

                <div>
                  <label className="label">Vehicle Number</label>
                  <input
                    type="text"
                    className="input uppercase"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                📋 Partner Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Phone Number</p>
                    <p className="font-medium text-gray-900">{partner.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    <p className="font-medium text-gray-900">{partner.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Vehicle Type</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {partner.vehicleType || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Vehicle Number</p>
                    <p className="font-medium text-gray-900 font-mono">
                      {partner.vehicleNumber || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Joined Date</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(partner.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Deliveries</p>
                    <p className="font-medium text-gray-900">
                      {partner.totalDeliveries || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assigned Deliveries */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                📦 Assigned Deliveries
              </h2>
              <span className="text-sm font-medium text-gray-600">
                {assignedOrders.length} active order(s)
              </span>
            </div>

            {loadingOrders ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4 animate-pulse">📦</div>
                <p className="text-gray-600">Loading assigned orders...</p>
              </div>
            ) : assignedOrders.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Active Deliveries
                </h3>
                <p className="text-gray-600">
                  This partner has no active orders assigned
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overdue Orders */}
                {overdueOrders.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-red-600 font-semibold">⚠️ Overdue</span>
                      <span className="text-sm text-red-600">({overdueOrders.length})</span>
                    </div>
                    <div className="space-y-3">
                      {overdueOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-red-50 border border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <Link
                                href={`/dashboard/orders/${order.id}`}
                                className="font-semibold text-gray-900 hover:text-primary-600 text-lg"
                              >
                                {order.orderNumber}
                              </Link>
                              <p className="text-sm text-gray-600 mt-1">
                                {order.items.length} item(s) • {formatCurrency(order.totalAmount)}
                              </p>
                            </div>
                            {getStatusBadge(order.status)}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-xs text-gray-600">Customer</p>
                              <p className="text-sm font-medium text-gray-900">
                                {order.deliveryAddress.label}
                              </p>
                              <p className="text-xs text-gray-600">{order.deliveryAddress.city}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Scheduled Delivery</p>
                              <p className="text-sm font-medium text-red-600">
                                {formatDate(order.scheduledDeliveryDate)}
                              </p>
                              <p className="text-xs text-red-600">Overdue!</p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-red-200">
                            <p className="text-xs text-gray-600 mb-1">Address</p>
                            <p className="text-sm text-gray-900">
                              {order.deliveryAddress.apartment && `${order.deliveryAddress.apartment}, `}
                              {order.deliveryAddress.street}, {order.deliveryAddress.city} - {order.deliveryAddress.pincode}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Today's Orders */}
                {todayOrders.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-blue-600 font-semibold">📅 Today</span>
                      <span className="text-sm text-blue-600">({todayOrders.length})</span>
                    </div>
                    <div className="space-y-3">
                      {todayOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <Link
                                href={`/dashboard/orders/${order.id}`}
                                className="font-semibold text-gray-900 hover:text-primary-600 text-lg"
                              >
                                {order.orderNumber}
                              </Link>
                              <p className="text-sm text-gray-600 mt-1">
                                {order.items.length} item(s) • {formatCurrency(order.totalAmount)}
                              </p>
                            </div>
                            {getStatusBadge(order.status)}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-xs text-gray-600">Customer</p>
                              <p className="text-sm font-medium text-gray-900">
                                {order.deliveryAddress.label}
                              </p>
                              <p className="text-xs text-gray-600">{order.deliveryAddress.city}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Order Type</p>
                              <p className="text-sm font-medium text-gray-900">
                                {order.type === 'one_time' ? 'One-Time' : 'Subscription'}
                              </p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-blue-200">
                            <p className="text-xs text-gray-600 mb-1">Address</p>
                            <p className="text-sm text-gray-900">
                              {order.deliveryAddress.apartment && `${order.deliveryAddress.apartment}, `}
                              {order.deliveryAddress.street}, {order.deliveryAddress.city} - {order.deliveryAddress.pincode}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Orders */}
                {upcomingOrders.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-gray-700 font-semibold">📆 Upcoming</span>
                      <span className="text-sm text-gray-600">({upcomingOrders.length})</span>
                    </div>
                    <div className="space-y-3">
                      {upcomingOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <Link
                                href={`/dashboard/orders/${order.id}`}
                                className="font-semibold text-gray-900 hover:text-primary-600 text-lg"
                              >
                                {order.orderNumber}
                              </Link>
                              <p className="text-sm text-gray-600 mt-1">
                                {order.items.length} item(s) • {formatCurrency(order.totalAmount)}
                              </p>
                            </div>
                            {getStatusBadge(order.status)}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-xs text-gray-600">Customer</p>
                              <p className="text-sm font-medium text-gray-900">
                                {order.deliveryAddress.label}
                              </p>
                              <p className="text-xs text-gray-600">{order.deliveryAddress.city}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Scheduled Delivery</p>
                              <p className="text-sm font-medium text-gray-900">
                                {formatDate(order.scheduledDeliveryDate)}
                              </p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">Address</p>
                            <p className="text-sm text-gray-900">
                              {order.deliveryAddress.apartment && `${order.deliveryAddress.apartment}, `}
                              {order.deliveryAddress.street}, {order.deliveryAddress.city} - {order.deliveryAddress.pincode}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Info */}
        <div className="space-y-6">
          {/* Active Deliveries Summary */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              📊 Active Summary
            </h2>
            <div className="space-y-3">
              {overdueOrders.length > 0 && (
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-red-900">Overdue</span>
                  <span className="text-lg font-bold text-red-600">{overdueOrders.length}</span>
                </div>
              )}
              {todayOrders.length > 0 && (
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-900">Today</span>
                  <span className="text-lg font-bold text-blue-600">{todayOrders.length}</span>
                </div>
              )}
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Upcoming</span>
                <span className="text-lg font-bold text-gray-900">{upcomingOrders.length}</span>
              </div>
            </div>
          </div>

          {/* Partner ID */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              🔑 Partner Info
            </h2>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-600">Partner ID</p>
                <p className="text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded break-all">
                  {partner.id}
                </p>
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              📊 Performance
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="font-semibold text-gray-900">
                  {stats.successRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${stats.successRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}