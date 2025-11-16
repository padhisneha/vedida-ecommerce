'use client';

import { useState, useEffect } from 'react';
import {
  getAllOrders,
  getAllSubscriptionsWithProducts,
  getUsersByRole,
  bulkUpdateOrderStatus,
  bulkUpdateSubscriptionStatus,
  bulkAssignDeliveryPartner,
  Order,
  Subscription,
  OrderStatus,
  SubscriptionStatus,
  UserRole,
  User,
  formatCurrency,
  formatDate,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

type TabType = 'update-orders' | 'update-subscriptions' | 'assign-partners';

export default function BulkUpdatePage() {
  const [activeTab, setActiveTab] = useState<TabType>('update-orders');
  
  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [orderPartnerFilter, setOrderPartnerFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [newOrderStatus, setNewOrderStatus] = useState<OrderStatus | ''>('');
  
  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<Set<string>>(new Set());
  const [subStatusFilter, setSubStatusFilter] = useState<SubscriptionStatus | 'all'>('all');
  const [subPartnerFilter, setSubPartnerFilter] = useState<string>('all');
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [newSubStatus, setNewSubStatus] = useState<SubscriptionStatus | ''>('');
  
  // Partner assignment state
  const [assignOrders, setAssignOrders] = useState<Order[]>([]);
  const [selectedAssignOrders, setSelectedAssignOrders] = useState<Set<string>>(new Set());
  const [assignPartnerFilter, setAssignPartnerFilter] = useState<string>('all');
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [newPartnerId, setNewPartnerId] = useState<string>('');
  
  // Common state
  const [deliveryPartners, setDeliveryPartners] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(() => async () => {});
  const [confirmMessage, setConfirmMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, subscriptionsData, partnersData] = await Promise.all([
        getAllOrders(),
        getAllSubscriptionsWithProducts(),
        getUsersByRole(UserRole.DELIVERY_PARTNER),
      ]);
      
      setOrders(ordersData);
      setSubscriptions(subscriptionsData);
      
      // Filter active partners
      const activePartners = partnersData.filter(p => p.isActive !== false);
      setDeliveryPartners(activePartners);
      
      // For assign tab, filter to PENDING, CONFIRMED, OUT_FOR_DELIVERY orders only
      const activeOrders = ordersData.filter(
        o => o.status === OrderStatus.PENDING || 
             o.status === OrderStatus.CONFIRMED || 
             o.status === OrderStatus.OUT_FOR_DELIVERY
      );
      setAssignOrders(activeOrders);
      
      console.log('✅ Loaded bulk update data');
    } catch (error) {
      console.error('Error loading data:', error);
      showToast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filter functions
  const getFilteredOrders = () => {
    let filtered = orders.filter(
      o => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED
    );

    if (orderStatusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === orderStatusFilter);
    }

    if (orderPartnerFilter === 'unassigned') {
      filtered = filtered.filter(o => !o.deliveryPartnerId);
    } else if (orderPartnerFilter !== 'all') {
      filtered = filtered.filter(o => o.deliveryPartnerId === orderPartnerFilter);
    }

    if (orderSearchQuery.trim()) {
      const query = orderSearchQuery.toLowerCase();
      filtered = filtered.filter(
        o => o.orderNumber.toLowerCase().includes(query) ||
             o.deliveryAddress.city.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  };

  const getFilteredSubscriptions = () => {
    let filtered = subscriptions.filter(
      s => s.status !== SubscriptionStatus.COMPLETED && 
           s.status !== SubscriptionStatus.CANCELLED
    );

    if (subStatusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === subStatusFilter);
    }

    if (subPartnerFilter === 'unassigned') {
      filtered = filtered.filter(s => !s.deliveryPartnerId);
    } else if (subPartnerFilter !== 'all') {
      filtered = filtered.filter(s => s.deliveryPartnerId === subPartnerFilter);
    }

    if (subSearchQuery.trim()) {
      const query = subSearchQuery.toLowerCase();
      filtered = filtered.filter(
        s => s.subscriptionNumber?.toLowerCase().includes(query) ||
             s.deliveryAddress.city.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  };

  const getFilteredAssignOrders = () => {
    let filtered = [...assignOrders];

    if (assignPartnerFilter === 'unassigned') {
      filtered = filtered.filter(o => !o.deliveryPartnerId);
    } else if (assignPartnerFilter !== 'all') {
      filtered = filtered.filter(o => o.deliveryPartnerId === assignPartnerFilter);
    }

    if (assignSearchQuery.trim()) {
      const query = assignSearchQuery.toLowerCase();
      filtered = filtered.filter(
        o => o.orderNumber.toLowerCase().includes(query) ||
             o.deliveryAddress.city.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  };

  // Selection handlers
  const handleSelectAllOrders = () => {
    const filtered = getFilteredOrders();
    if (selectedOrders.size === filtered.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filtered.map(o => o.id)));
    }
  };

  const handleSelectAllSubscriptions = () => {
    const filtered = getFilteredSubscriptions();
    if (selectedSubscriptions.size === filtered.length) {
      setSelectedSubscriptions(new Set());
    } else {
      setSelectedSubscriptions(new Set(filtered.map(s => s.id)));
    }
  };

  const handleSelectAllAssignOrders = () => {
    const filtered = getFilteredAssignOrders();
    if (selectedAssignOrders.size === filtered.length) {
      setSelectedAssignOrders(new Set());
    } else {
      setSelectedAssignOrders(new Set(filtered.map(o => o.id)));
    }
  };

  // Bulk action handlers
  const handleBulkUpdateOrderStatus = async () => {
    if (selectedOrders.size === 0 || !newOrderStatus) {
      showToast.error('Please select orders and a new status');
      return;
    }

    const statusLabels = {
      [OrderStatus.PENDING]: 'Pending',
      [OrderStatus.CONFIRMED]: 'Confirmed',
      [OrderStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
      [OrderStatus.DELIVERED]: 'Delivered',
      [OrderStatus.CANCELLED]: 'Cancelled',
    };

    setConfirmMessage(
      `Are you sure you want to update ${selectedOrders.size} order(s) to status "${statusLabels[newOrderStatus]}"?`
    );
    setConfirmAction(() => async () => {
      setProcessing(true);
      const toastId = showToast.loading(`Updating ${selectedOrders.size} orders...`);

      try {
        const result = await bulkUpdateOrderStatus(
          Array.from(selectedOrders),
          newOrderStatus
        );

        showToast.dismiss(toastId);
        
        if (result.success > 0) {
          showToast.success(
            `Successfully updated ${result.success} order(s)${
              result.failed > 0 ? `, ${result.failed} failed` : ''
            }`
          );
        } else {
          showToast.error('Failed to update orders');
        }

        setSelectedOrders(new Set());
        setNewOrderStatus('');
        await loadData();
      } catch (error) {
        showToast.dismiss(toastId);
        showToast.error('Failed to update orders');
      } finally {
        setProcessing(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleBulkUpdateSubscriptionStatus = async () => {
    if (selectedSubscriptions.size === 0 || !newSubStatus) {
      showToast.error('Please select subscriptions and a new status');
      return;
    }

    const statusLabels = {
      [SubscriptionStatus.PENDING]: 'Pending',
      [SubscriptionStatus.ACTIVE]: 'Active',
      [SubscriptionStatus.PAUSED]: 'Paused',
      [SubscriptionStatus.COMPLETED]: 'Completed',
      [SubscriptionStatus.CANCELLED]: 'Cancelled',
    };

    setConfirmMessage(
      `Are you sure you want to update ${selectedSubscriptions.size} subscription(s) to status "${statusLabels[newSubStatus]}"?`
    );
    setConfirmAction(() => async () => {
      setProcessing(true);
      const toastId = showToast.loading(`Updating ${selectedSubscriptions.size} subscriptions...`);

      try {
        const result = await bulkUpdateSubscriptionStatus(
          Array.from(selectedSubscriptions),
          newSubStatus
        );

        showToast.dismiss(toastId);
        
        if (result.success > 0) {
          showToast.success(
            `Successfully updated ${result.success} subscription(s)${
              result.failed > 0 ? `, ${result.failed} failed` : ''
            }`
          );
        } else {
          showToast.error('Failed to update subscriptions');
        }

        setSelectedSubscriptions(new Set());
        setNewSubStatus('');
        await loadData();
      } catch (error) {
        showToast.dismiss(toastId);
        showToast.error('Failed to update subscriptions');
      } finally {
        setProcessing(false);
      }
    });
    setShowConfirmModal(true);
  };

  const handleBulkAssignPartner = async () => {
    if (selectedAssignOrders.size === 0 || !newPartnerId) {
      showToast.error('Please select orders and a delivery partner');
      return;
    }

    const partner = deliveryPartners.find(p => p.id === newPartnerId);
    if (!partner) return;

    const partnerName = partner.name || partner.phoneNumber;

    setConfirmMessage(
      `Are you sure you want to assign ${partnerName} to ${selectedAssignOrders.size} order(s)?`
    );
    setConfirmAction(() => async () => {
      setProcessing(true);
      const toastId = showToast.loading(`Assigning partner to ${selectedAssignOrders.size} orders...`);

      try {
        const result = await bulkAssignDeliveryPartner(
          Array.from(selectedAssignOrders),
          newPartnerId,
          partnerName
        );

        showToast.dismiss(toastId);
        
        if (result.success > 0) {
          showToast.success(
            `Successfully assigned partner to ${result.success} order(s)${
              result.failed > 0 ? `, ${result.failed} failed` : ''
            }`
          );
        } else {
          showToast.error('Failed to assign partner');
        }

        setSelectedAssignOrders(new Set());
        setNewPartnerId('');
        await loadData();
      } catch (error) {
        showToast.dismiss(toastId);
        showToast.error('Failed to assign partner');
      } finally {
        setProcessing(false);
      }
    });
    setShowConfirmModal(true);
  };

  const executeConfirmedAction = async () => {
    setShowConfirmModal(false);
    await confirmAction();
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

  const getSubStatusBadge = (status: SubscriptionStatus) => {
    const styles = {
      [SubscriptionStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [SubscriptionStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [SubscriptionStatus.PAUSED]: 'bg-orange-100 text-orange-800',
      [SubscriptionStatus.COMPLETED]: 'bg-blue-100 text-blue-800',
      [SubscriptionStatus.CANCELLED]: 'bg-red-100 text-red-800',
    };

    const labels = {
      [SubscriptionStatus.PENDING]: 'Pending',
      [SubscriptionStatus.ACTIVE]: 'Active',
      [SubscriptionStatus.PAUSED]: 'Paused',
      [SubscriptionStatus.COMPLETED]: 'Completed',
      [SubscriptionStatus.CANCELLED]: 'Cancelled',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">⚡</div>
          <div className="text-lg text-gray-600">Loading bulk update data...</div>
        </div>
      </div>
    );
  }

  const filteredOrders = getFilteredOrders();
  const filteredSubscriptions = getFilteredSubscriptions();
  const filteredAssignOrders = getFilteredAssignOrders();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bulk Updates</h1>
        <p className="text-gray-600 mt-2">Perform bulk operations on orders and subscriptions</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('update-orders')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'update-orders'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📦 Update Order Status
          </button>
          <button
            onClick={() => setActiveTab('update-subscriptions')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'update-subscriptions'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📅 Update Subscription Status
          </button>
          <button
            onClick={() => setActiveTab('assign-partners')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'assign-partners'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            👤 Assign Delivery Partners
          </button>
        </nav>
      </div>

      {/* Tab: Update Order Status */}
      {activeTab === 'update-orders' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Orders</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  className="input"
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value as OrderStatus | 'all')}
                >
                  <option value="all">All Statuses</option>
                  <option value={OrderStatus.PENDING}>Pending</option>
                  <option value={OrderStatus.CONFIRMED}>Confirmed</option>
                  <option value={OrderStatus.OUT_FOR_DELIVERY}>Out for Delivery</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Partner
                </label>
                <select
                  className="input"
                  value={orderPartnerFilter}
                  onChange={(e) => setOrderPartnerFilter(e.target.value)}
                >
                  <option value="all">All Partners</option>
                  <option value="unassigned">Unassigned</option>
                  {deliveryPartners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name || partner.phoneNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Order number, city..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="card bg-blue-50 border border-blue-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="font-semibold text-blue-900">
                  {selectedOrders.size} order(s) selected
                </p>
                <p className="text-sm text-blue-700">
                  {filteredOrders.length} order(s) available for update
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="input"
                  value={newOrderStatus}
                  onChange={(e) => setNewOrderStatus(e.target.value as OrderStatus)}
                  disabled={processing}
                >
                  <option value="">Select new status...</option>
                  <option value={OrderStatus.PENDING}>Pending</option>
                  <option value={OrderStatus.CONFIRMED}>Confirmed</option>
                  <option value={OrderStatus.OUT_FOR_DELIVERY}>Out for Delivery</option>
                  <option value={OrderStatus.DELIVERED}>Delivered</option>
                  <option value={OrderStatus.CANCELLED}>Cancelled</option>
                </select>
                <button
                  className="btn-primary whitespace-nowrap"
                  onClick={handleBulkUpdateOrderStatus}
                  disabled={processing || selectedOrders.size === 0 || !newOrderStatus}
                >
                  {processing ? '⏳ Updating...' : '✅ Update Status'}
                </button>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          {filteredOrders.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No orders found
              </h3>
              <p className="text-gray-600">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                          onChange={handleSelectAllOrders}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Order Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Partner
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(order.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedOrders);
                              if (e.target.checked) {
                                newSet.add(order.id);
                              } else {
                                newSet.delete(order.id);
                              }
                              setSelectedOrders(newSet);
                            }}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{order.orderNumber}</div>
                          <div className="text-xs text-gray-500">{formatDate(order.createdAt)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900">{order.deliveryAddress.label}</div>
                          <div className="text-xs text-gray-500">{order.deliveryAddress.city}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(order.totalAmount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {order.deliveryPartnerName || '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Update Subscription Status */}
      {activeTab === 'update-subscriptions' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Subscriptions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  className="input"
                  value={subStatusFilter}
                  onChange={(e) => setSubStatusFilter(e.target.value as SubscriptionStatus | 'all')}
                >
                  <option value="all">All Statuses</option>
                  <option value={SubscriptionStatus.PENDING}>Pending</option>
                  <option value={SubscriptionStatus.ACTIVE}>Active</option>
                  <option value={SubscriptionStatus.PAUSED}>Paused</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Partner
                </label>
                <select
                  className="input"
                  value={subPartnerFilter}
                  onChange={(e) => setSubPartnerFilter(e.target.value)}
                >
                  <option value="all">All Partners</option>
                  <option value="unassigned">Unassigned</option>
                  {deliveryPartners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name || partner.phoneNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Subscription number, city..."
                  value={subSearchQuery}
                  onChange={(e) => setSubSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="card bg-green-50 border border-green-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="font-semibold text-green-900">
                  {selectedSubscriptions.size} subscription(s) selected
                </p>
                <p className="text-sm text-green-700">
                  {filteredSubscriptions.length} subscription(s) available for update
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="input"
                  value={newSubStatus}
                  onChange={(e) => setNewSubStatus(e.target.value as SubscriptionStatus)}
                  disabled={processing}
                >
                  <option value="">Select new status...</option>
                  <option value={SubscriptionStatus.PENDING}>Pending</option>
                  <option value={SubscriptionStatus.ACTIVE}>Active</option>
                  <option value={SubscriptionStatus.PAUSED}>Paused</option>
                  <option value={SubscriptionStatus.COMPLETED}>Completed</option>
                  <option value={SubscriptionStatus.CANCELLED}>Cancelled</option>
                </select>
                <button
                  className="btn-primary whitespace-nowrap"
                  onClick={handleBulkUpdateSubscriptionStatus}
                  disabled={processing || selectedSubscriptions.size === 0 || !newSubStatus}
                >
                  {processing ? '⏳ Updating...' : '✅ Update Status'}
                </button>
              </div>
            </div>
          </div>

          {/* Subscriptions Table */}
          {filteredSubscriptions.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No subscriptions found
              </h3>
              <p className="text-gray-600">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedSubscriptions.size === filteredSubscriptions.length && filteredSubscriptions.length > 0}
                          onChange={handleSelectAllSubscriptions}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Subscription #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Frequency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Partner
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSubscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedSubscriptions.has(sub.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedSubscriptions);
                              if (e.target.checked) {
                                newSet.add(sub.id);
                              } else {
                                newSet.delete(sub.id);
                              }
                              setSelectedSubscriptions(newSet);
                            }}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {sub.subscriptionNumber || `SUB-${sub.id.slice(0, 8)}`}
                          </div>
                          <div className="text-xs text-gray-500">{formatDate(sub.createdAt)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900">{sub.deliveryAddress.label}</div>
                          <div className="text-xs text-gray-500">{sub.deliveryAddress.city}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {sub.frequency === 'daily' && 'Daily'}
                            {sub.frequency === 'alternate_days' && 'Alternate Days'}
                            {sub.frequency === 'weekly' && 'Weekly'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getSubStatusBadge(sub.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {sub.deliveryPartnerName || '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Assign Delivery Partners */}
      {activeTab === 'assign-partners' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Orders</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Delivery Partner
                </label>
                <select
                  className="input"
                  value={assignPartnerFilter}
                  onChange={(e) => setAssignPartnerFilter(e.target.value)}
                >
                  <option value="all">All Partners</option>
                  <option value="unassigned">Unassigned</option>
                  {deliveryPartners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name || partner.phoneNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Order number, city..."
                  value={assignSearchQuery}
                  onChange={(e) => setAssignSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="card bg-purple-50 border border-purple-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="font-semibold text-purple-900">
                  {selectedAssignOrders.size} order(s) selected
                </p>
                <p className="text-sm text-purple-700">
                  {filteredAssignOrders.length} active order(s) available
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="input"
                  value={newPartnerId}
                  onChange={(e) => setNewPartnerId(e.target.value)}
                  disabled={processing}
                >
                  <option value="">Select delivery partner...</option>
                  {deliveryPartners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name || partner.phoneNumber}
                      {partner.totalDeliveries ? ` (${partner.totalDeliveries} deliveries)` : ''}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-primary whitespace-nowrap"
                  onClick={handleBulkAssignPartner}
                  disabled={processing || selectedAssignOrders.size === 0 || !newPartnerId}
                >
                  {processing ? '⏳ Assigning...' : '👤 Assign Partner'}
                </button>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          {filteredAssignOrders.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No active orders found
              </h3>
              <p className="text-gray-600">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedAssignOrders.size === filteredAssignOrders.length && filteredAssignOrders.length > 0}
                          onChange={handleSelectAllAssignOrders}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Order Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Current Partner
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAssignOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedAssignOrders.has(order.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedAssignOrders);
                              if (e.target.checked) {
                                newSet.add(order.id);
                              } else {
                                newSet.delete(order.id);
                              }
                              setSelectedAssignOrders(newSet);
                            }}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{order.orderNumber}</div>
                          <div className="text-xs text-gray-500">{formatDate(order.createdAt)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900">{order.deliveryAddress.label}</div>
                          <div className="text-xs text-gray-500">{order.deliveryAddress.city}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(order.totalAmount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {order.deliveryPartnerName || (
                              <span className="text-yellow-600 font-medium">Unassigned</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Confirm Bulk Update</h2>
              <p className="text-gray-600">{confirmMessage}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary flex-1"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                className="btn-primary flex-1"
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}