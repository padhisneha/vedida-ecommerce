'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getAllSubscriptionsWithProducts,
  Subscription,
  SubscriptionStatus,
  SubscriptionFrequency,
  formatCurrency,
  formatDate,
} from '@ecommerce/shared';

type TabType = 'new' | 'active' | 'closed';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const data = await getAllSubscriptionsWithProducts();
      setSubscriptions(data);
      console.log('✅ Loaded subscriptions with products:', data.length);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      alert('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const isSubscriptionOlderThan7Days = (sub: Subscription) => {
    if (sub.status !== SubscriptionStatus.COMPLETED && sub.status !== SubscriptionStatus.CANCELLED) {
      return false;
    }
    
    const now = new Date();
    const subDate = sub.updatedAt.toDate();
    const daysDiff = Math.floor((now.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 7;
  };

  const getFilteredSubscriptions = () => {
    let filtered = [...subscriptions];

    // Filter by tab
    if (activeTab === 'new') {
        // New subscriptions: PENDING status
        filtered = filtered.filter(
        (sub) => sub.status === SubscriptionStatus.PENDING
        );
    } else if (activeTab === 'active') {
        // Active: ACTIVE and PAUSED subscriptions
        filtered = filtered.filter(
        (sub) =>
            sub.status === SubscriptionStatus.ACTIVE ||
            sub.status === SubscriptionStatus.PAUSED
        );
    } else {
        // Closed: COMPLETED and CANCELLED (last 7 days only)
        filtered = filtered.filter(
        (sub) =>
            (sub.status === SubscriptionStatus.COMPLETED || sub.status === SubscriptionStatus.CANCELLED) &&
            !isSubscriptionOlderThan7Days(sub)
        );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.subscriptionNumber?.toLowerCase().includes(query) ||
          sub.id.toLowerCase().includes(query) ||
          sub.deliveryAddress.city.toLowerCase().includes(query) ||
          sub.deliveryAddress.label.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const getPaginatedSubscriptions = () => {
    const filtered = getFilteredSubscriptions();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(getFilteredSubscriptions().length / itemsPerPage);
  };

  const getTabCount = (tab: TabType) => {
    if (tab === 'new') {
        return subscriptions.filter(
        (sub) => sub.status === SubscriptionStatus.PENDING
        ).length;
    } else if (tab === 'active') {
        return subscriptions.filter(
        (sub) =>
            sub.status === SubscriptionStatus.ACTIVE ||
            sub.status === SubscriptionStatus.PAUSED
        ).length;
    } else {
        return subscriptions.filter(
        (sub) =>
            (sub.status === SubscriptionStatus.COMPLETED || sub.status === SubscriptionStatus.CANCELLED) &&
            !isSubscriptionOlderThan7Days(sub)
        ).length;
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    const styles = {
        [SubscriptionStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
        [SubscriptionStatus.ACTIVE]: 'bg-green-100 text-green-800',
        [SubscriptionStatus.PAUSED]: 'bg-orange-100 text-orange-800',
        [SubscriptionStatus.COMPLETED]: 'bg-blue-100 text-blue-800',
        [SubscriptionStatus.CANCELLED]: 'bg-red-100 text-red-800',
    };

    const labels = {
        [SubscriptionStatus.PENDING]: 'Pending Approval',
        [SubscriptionStatus.ACTIVE]: 'Active',
        [SubscriptionStatus.PAUSED]: 'Paused',
        [SubscriptionStatus.COMPLETED]: 'Completed',
        [SubscriptionStatus.CANCELLED]: 'Cancelled',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
        </span>
    );
  };

  const getFrequencyText = (frequency: SubscriptionFrequency) => {
    const labels = {
      [SubscriptionFrequency.DAILY]: 'Daily',
      [SubscriptionFrequency.ALTERNATE_DAYS]: 'Alternate Days',
      [SubscriptionFrequency.WEEKLY]: 'Weekly',
    };
    return labels[frequency];
  };

  const calculatePerDeliveryAmount = (sub: Subscription) => {
    return sub.items.reduce((total, item) => {
      if (item.product) {
        return total + item.product.price * item.quantity;
      }
      return total;
    }, 0);
  };

  // Reset to page 1 when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const paginatedSubscriptions = getPaginatedSubscriptions();
  const totalPages = getTotalPages();
  const filteredCount = getFilteredSubscriptions().length;

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">📅</div>
          <div className="text-lg text-gray-600">Loading subscriptions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Subscriptions Management</h1>
        <p className="text-gray-600 mt-2">Manage recurring customer subscriptions</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">New Subscriptions</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {getTabCount('new')}
              </p>
            </div>
            <div className="text-3xl">🆕</div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Active Subscriptions</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {getTabCount('active')}
              </p>
            </div>
            <div className="text-3xl">📅</div>
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
            <div className="text-3xl">📋</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search by subscription number, ID, or customer..."
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
            New Subscriptions
            {getTabCount('new') > 0 && (
              <span className="ml-2 bg-green-100 text-green-800 py-0.5 px-2 rounded-full text-xs font-semibold">
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
            Active Subscriptions
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
            Closed Subscriptions
            {getTabCount('closed') > 0 && (
              <span className="ml-2 bg-gray-200 text-gray-600 py-0.5 px-2 rounded-full text-xs font-semibold">
                {getTabCount('closed')}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Subscriptions Table */}
      {paginatedSubscriptions.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No subscriptions found
          </h3>
          <p className="text-gray-600">
            {searchQuery
              ? `No results for "${searchQuery}"`
              : `No ${activeTab} subscriptions at the moment`}
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
                      Subscription Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frequency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Per Delivery
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
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
                  {paginatedSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {sub.subscriptionNumber || `SUB-${sub.id.slice(0, 8)}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(sub.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{sub.deliveryAddress.label}</div>
                        <div className="text-xs text-gray-500">
                          {sub.deliveryAddress.city}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{getFrequencyText(sub.frequency)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{sub.items.length} item(s)</div>
                        <div className="text-xs text-gray-500">
                          {sub.items[0]?.product?.name}
                          {sub.items.length > 1 && ` +${sub.items.length - 1} more`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(calculatePerDeliveryAmount(sub))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(sub.startDate)}
                        </div>
                        {sub.endDate && (
                          <div className="text-xs text-gray-500">
                            to {formatDate(sub.endDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(sub.status)}
                        {sub.pausedUntil && sub.status === SubscriptionStatus.PAUSED && (
                          <div className="text-xs text-yellow-600 mt-1">
                            Until {formatDate(sub.pausedUntil)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/dashboard/subscriptions/${sub.id}`}
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

          {/* Results count */}
          {searchQuery && (
            <div className="mt-4 text-sm text-gray-600">
              Found {filteredCount} result{filteredCount !== 1 ? 's' : ''} for "{searchQuery}"
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