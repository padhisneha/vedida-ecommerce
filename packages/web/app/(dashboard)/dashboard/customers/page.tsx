'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getAllUsers,
  User,
  UserRole,
  formatDate,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await getAllUsers();
      // Filter only customers (exclude admins)
      const customersOnly = data.filter((user) => user.role === UserRole.CUSTOMER);
      setCustomers(customersOnly);
      console.log('✅ Loaded customers:', customersOnly.length);
    } catch (error) {
      console.error('Error loading customers:', error);
      showToast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCustomers = () => {
    let filtered = [...customers];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (customer) =>
          customer.name?.toLowerCase().includes(query) ||
          customer.phoneNumber.toLowerCase().includes(query) ||
          customer.email?.toLowerCase().includes(query) ||
          customer.id.toLowerCase().includes(query)
      );
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    return filtered;
  };

  const getPaginatedCustomers = () => {
    const filtered = getFilteredCustomers();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(getFilteredCustomers().length / itemsPerPage);
  };

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const paginatedCustomers = getPaginatedCustomers();
  const totalPages = getTotalPages();
  const filteredCount = getFilteredCustomers().length;

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">👥</div>
          <div className="text-lg text-gray-600">Loading customers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Customers Management</h1>
        <p className="text-gray-600 mt-2">View and manage customer accounts</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Total Customers</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {customers.length}
              </p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">With Orders</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {customers.filter(c => c.name).length}
              </p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-800">With Subscriptions</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">
                {customers.filter(c => c.addresses.length > 0).length}
              </p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-800">New This Month</p>
              <p className="text-3xl font-bold text-orange-900 mt-1">
                {customers.filter(c => {
                  const thirtyDaysAgo = new Date();
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                  return c.createdAt.toDate() > thirtyDaysAgo;
                }).length}
              </p>
            </div>
            <div className="text-4xl">🆕</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search by name, phone, email, or ID..."
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

      {/* Customers Table */}
      {paginatedCustomers.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No customers found
          </h3>
          <p className="text-gray-600">
            {searchQuery
              ? `No results for "${searchQuery}"`
              : 'No customers registered yet'}
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
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Addresses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {customer.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {customer.name || 'Unnamed Customer'}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {customer.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{customer.phoneNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">
                          {customer.email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">
                          {customer.addresses.length} address(es)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(customer.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
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