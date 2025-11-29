// packages/web/app/(dashboard)/dashboard/orders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getAllOrders,
  getAllOrdersWithProducts,
  Order,
  OrderStatus,
  formatCurrency,
  formatDate,
  DeliveryArea,
  getAllDeliveryAreas,
  User,
  UserRole,
  getUsersByRole,
} from '@ecommerce/shared';
import { generateDeliverySheetPDF } from '@/lib/delivery-sheet-generator';
import { showToast } from '@/lib/toast';

type TabType = 'new' | 'active' | 'closed';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSlot, setFilterSlot] = useState<string>('all'); // 'all' | 'morning' | 'evening' | 'flexible'
  const [filterArea, setFilterArea] = useState<string>('all'); // 'all' | area name
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [filterDate, setFilterDate] = useState<string>('all'); // 'today' | 'tomorrow' | 'all' | specific date
  const [filterPartner, setFilterPartner] = useState<string>('all'); // 'all' | partnerId
  const [deliveryPartners, setDeliveryPartners] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  useEffect(() => {
    loadOrders();
    loadDeliveryAreas();
    loadDeliveryPartners();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await getAllOrdersWithProducts(); //getAllOrders();
      setOrders(data);
      console.log('✅ Loaded orders:', data.length);
    } catch (error) {
      console.error('Error loading orders:', error);
      showToast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveryAreas = async () => {
    try {
      const areas = await getAllDeliveryAreas();
      setDeliveryAreas(areas);
    } catch (error) {
      console.error('Error loading delivery areas:', error);
    }
  };

  const loadDeliveryPartners = async () => {
    try {
      const partners = await getUsersByRole(UserRole.DELIVERY_PARTNER);
      const activePartners = partners.filter(p => p.isActive !== false);
      setDeliveryPartners(activePartners);
    } catch (error) {
      console.error('Error loading delivery partners:', error);
    }
  };

  const isOrderOlderThan7Days = (order: Order) => {
    const now = new Date();
    const orderDate = order.createdAt.toDate();
    const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 7;
  };

  const getFilteredOrders = () => {
    let filtered = [...orders];

    // Filter by tab
    if (activeTab === 'new') {
      filtered = filtered.filter((order) => order.status === OrderStatus.PENDING);
    } else if (activeTab === 'active') {
      filtered = filtered.filter(
        (order) =>
          order.status === OrderStatus.CONFIRMED ||
          order.status === OrderStatus.OUT_FOR_DELIVERY
      );
    } else {
      // Closed: Delivered and Cancelled (last 7 days only)
      filtered = filtered.filter(
        (order) =>
          (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) &&
          !isOrderOlderThan7Days(order)
      );
    }

    // Filter by delivery date
    if (filterDate !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (filterDate === 'today') {
        filtered = filtered.filter((order) => {
          const orderDate = order.scheduledDeliveryDate.toDate();
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === today.getTime();
        });
      } else if (filterDate === 'tomorrow') {
        filtered = filtered.filter((order) => {
          const orderDate = order.scheduledDeliveryDate.toDate();
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === tomorrow.getTime();
        });
      } else {
        // Specific date selected
        const selectedDate = new Date(filterDate);
        selectedDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter((order) => {
          const orderDate = order.scheduledDeliveryDate.toDate();
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === selectedDate.getTime();
        });
      }
    }

    // Filter by delivery partner
    if (filterPartner !== 'all') {
      if (filterPartner === 'unassigned') {
        filtered = filtered.filter((order) => !order.deliveryPartnerId);
      } else {
        filtered = filtered.filter((order) => order.deliveryPartnerId === filterPartner);
      }
    }

    // Filter by delivery slot
    if (filterSlot !== 'all') {
      filtered = filtered.filter((order) => order.deliverySlot === filterSlot);
    }

    // Filter by delivery area
    if (filterArea !== 'all') {
      filtered = filtered.filter(
        (order) => order.deliveryAddress.location === filterArea
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(query) ||
          order.id.toLowerCase().includes(query) ||
          order.deliveryAddress.city.toLowerCase().includes(query) ||
          order.deliveryAddress.street.toLowerCase().includes(query)
      );
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    return filtered;
  };

  const getPaginatedOrders = () => {
    const filtered = getFilteredOrders();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(getFilteredOrders().length / itemsPerPage);
  };

  const getTabCount = (tab: TabType) => {
    if (tab === 'new') {
      return orders.filter((order) => order.status === OrderStatus.PENDING).length;
    } else if (tab === 'active') {
      return orders.filter(
        (order) =>
          order.status === OrderStatus.CONFIRMED ||
          order.status === OrderStatus.OUT_FOR_DELIVERY
      ).length;
    } else {
      return orders.filter(
        (order) =>
          (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) &&
          !isOrderOlderThan7Days(order)
      ).length;
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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  // Reset to page 1 when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const paginatedOrders = getPaginatedOrders();
  const totalPages = getTotalPages();
  const filteredCount = getFilteredOrders().length;

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">📦</div>
          <div className="text-lg text-gray-600">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
        <p className="text-gray-600 mt-2">Manage and track all customer orders</p>
      </div>

      {/* Stats Overview */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">New Orders</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">
                {getTabCount('new')}
              </p>
            </div>
            <div className="text-3xl">🆕</div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Active Orders</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {getTabCount('active')}
              </p>
            </div>
            <div className="text-3xl">🚚</div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Closed (7 days)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {getTabCount('closed')}
              </p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
      </div> */}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search by order number, ID, or address..."
            className="input pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
            🔍
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filters Row */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Delivery Date Filter - NEW */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            📅 Delivery Date
          </label>
          <select
            className="input py-2 px-3 text-sm"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="custom">Select Date...</option>
          </select>
          {filterDate === 'custom' && (
            <input
              type="date"
              className="input py-2 px-3 text-sm"
              onChange={(e) => setFilterDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          )}
        </div>

        {/* Delivery Partner Filter - NEW */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            👤 Delivery Partner
          </label>
          <select
            className="input py-2 px-3 text-sm"
            value={filterPartner}
            onChange={(e) => setFilterPartner(e.target.value)}
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
        
        {/* Delivery Slot Filter */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            🕐 Delivery Slot
          </label>
          <select
            className="input py-2 px-3 text-sm"
            value={filterSlot}
            onChange={(e) => setFilterSlot(e.target.value)}
          >
            <option value="all">All Slots</option>
            <option value="morning">🌅 Morning (6 AM - 12 PM)</option>
            <option value="evening">🌆 Evening (4 PM - 8 PM)</option>
            <option value="flexible">🕐 Flexible</option>
          </select>
        </div>

        {/* Delivery Area Filter */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            📍 Delivery Area
          </label>
          <select
            className="input py-2 px-3 text-sm"
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
          >
            <option value="all">All Areas</option>
            {deliveryAreas.map((area) => (
              <option key={area.id} value={area.name}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        

        {/* Generate Delivery Sheet Button */}
        {paginatedOrders.length > 0 && (
          <button
            onClick={async () => {
              try {
                const filteredOrders = getFilteredOrders();
                
                if (filteredOrders.length === 0) {
                  showToast.error('No orders to generate delivery sheet');
                  return;
                }

                const toastId = showToast.loading('Generating delivery sheet...');

                const partnerName = filterPartner !== 'all' && filterPartner !== 'unassigned'
                  ? deliveryPartners.find(p => p.id === filterPartner)?.name || 
                    deliveryPartners.find(p => p.id === filterPartner)?.phoneNumber
                  : undefined;
                
                await generateDeliverySheetPDF(filteredOrders, {
                  deliveryDate: filterDate === 'today' ? new Date().toLocaleDateString('en-IN') :
                                filterDate === 'tomorrow' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-IN') :
                                filterDate !== 'all' && filterDate !== 'custom' ? filterDate :
                                new Date().toLocaleDateString('en-IN'),
                  deliveryPartner: partnerName,
                  deliveryArea: filterArea !== 'all' ? filterArea : undefined,
                  deliverySlot: filterSlot !== 'all' ? filterSlot : undefined,
                });

                showToast.dismiss(toastId);
                showToast.success(`Delivery sheet generated with ${filteredOrders.length} orders!`);
              } catch (error) {
                console.error('Error generating delivery sheet:', error);
                showToast.error('Failed to generate delivery sheet');
              }
            }}
            className="btn-primary text-sm py-2 flex items-center gap-2"
          >
            <span>📄</span>
            <span>Generate Delivery Sheet ({getFilteredOrders().length})</span>
          </button>
        )}

        {/* Clear Filters Button */}
        {(filterDate !== 'all' || filterPartner !== 'all' || filterSlot !== 'all' || filterArea !== 'all') && (
          <button
            onClick={() => {
              setFilterDate('all');
              setFilterPartner('all');
              setFilterSlot('all');
              setFilterArea('all');
            }}
            className="btn-secondary text-sm py-2"
          >
            ✕ Clear Filters
          </button>
        )}

      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('new')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'new'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            New Orders
            {getTabCount('new') > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 py-0.5 px-2 rounded-full text-xs font-semibold">
                {getTabCount('new')}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'active'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Active Orders
            {getTabCount('active') > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 py-0.5 px-2 rounded-full text-xs font-semibold">
                {getTabCount('active')}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('closed')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'closed'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Closed Orders
            {getTabCount('closed') > 0 && (
              <span className="ml-2 bg-gray-200 text-gray-600 py-0.5 px-2 rounded-full text-xs font-semibold">
                {getTabCount('closed')}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Orders Table */}
      {paginatedOrders.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No orders found
          </h3>
          <p className="text-gray-600">
            {searchQuery
              ? `No results for "${searchQuery}"`
              : `No ${activeTab} orders at the moment`}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn-secondary mt-4"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delivery Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {order.orderNumber}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{order.deliveryAddress.label}</div>
                        <div className="text-xs text-gray-500">
                          {order.deliveryAddress.city}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{order.items.length} item(s)</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">
                          {formatDate(order.scheduledDeliveryDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          View Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results count with active filters */}
          {(searchQuery || filterDate !== 'all' || filterPartner !== 'all' || filterSlot !== 'all' || filterArea !== 'all') && (
            <div className="mt-4 text-sm text-gray-600">
              Found {filteredCount} result{filteredCount !== 1 ? 's' : ''}
              {searchQuery && ` for "${searchQuery}"`}
              {filterDate !== 'all' && (
                <span className="ml-1">
                  • Date: <span className="font-medium">
                    {filterDate === 'today' ? 'Today' :
                    filterDate === 'tomorrow' ? 'Tomorrow' :
                    filterDate}
                  </span>
                </span>
              )}
              {filterPartner !== 'all' && (
                <span className="ml-1">
                  • Partner: <span className="font-medium">
                    {filterPartner === 'unassigned' ? 'Unassigned' :
                    deliveryPartners.find(p => p.id === filterPartner)?.name || 'Selected Partner'}
                  </span>
                </span>
              )}
              {filterSlot !== 'all' && (
                <span className="ml-1">
                  • Slot: <span className="font-medium">
                    {filterSlot === 'morning' ? 'Morning' : 
                    filterSlot === 'evening' ? 'Evening' : 'Flexible'}
                  </span>
                </span>
              )}
              {filterArea !== 'all' && (
                <span className="ml-1">
                  • Area: <span className="font-medium">{filterArea}</span>
                </span>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, filteredCount)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{filteredCount}</span>{' '}
                results
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>

                {/* Page numbers */}
                <div className="hidden sm:flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, index, array) => {
                      const showEllipsis = index > 0 && array[index - 1] !== page - 1;

                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`
                              px-4 py-2 rounded-lg text-sm font-medium transition-colors
                              ${
                                currentPage === page
                                  ? 'bg-primary-500 text-white'
                                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }
                            `}
                          >
                            {page}
                          </button>
                        </div>
                      );
                    })}
                </div>

                {/* Mobile page indicator */}
                <div className="sm:hidden px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}