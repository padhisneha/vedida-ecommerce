'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getAllDeliveryPartners,
  toggleDeliveryPartnerStatus,
  User,
  formatDate,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

export default function DeliveryPartnersPage() {
  const [partners, setPartners] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      const data = await getAllDeliveryPartners();
      setPartners(data);
      console.log('✅ Loaded delivery partners:', data.length);
    } catch (error) {
      console.error('Error loading delivery partners:', error);
      showToast.error('Failed to load delivery partners');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (partnerId: string, currentStatus: boolean) => {
    const toastId = showToast.loading('Updating partner status...');
    
    try {
      await toggleDeliveryPartnerStatus(partnerId, !currentStatus);
      showToast.dismiss(toastId);
      showToast.success(`Partner ${!currentStatus ? 'activated' : 'suspended'} successfully!`);
      await loadPartners();
    } catch (error) {
      console.error('Error toggling partner status:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to update partner status');
    }
  };

  const getFilteredPartners = () => {
    let filtered = [...partners];

    // Filter by status
    if (statusFilter === 'active') {
      filtered = filtered.filter((p) => p.isActive !== false);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((p) => p.isActive === false);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.phoneNumber.toLowerCase().includes(query) ||
          p.vehicleNumber?.toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const getPaginatedPartners = () => {
    const filtered = getFilteredPartners();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  };

  const getTotalPages = () => {
    return Math.ceil(getFilteredPartners().length / itemsPerPage);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const paginatedPartners = getPaginatedPartners();
  const totalPages = getTotalPages();
  const filteredCount = getFilteredPartners().length;

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">🚚</div>
          <div className="text-lg text-gray-600">Loading delivery partners...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Partners</h1>
          <p className="text-gray-600 mt-2">Manage delivery partner accounts</p>
        </div>
        <Link href="/dashboard/delivery-partners/new" className="btn-primary flex items-center gap-2">
          <span>➕</span>
          <span>Add Delivery Partner</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Active Partners</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {partners.filter((p) => p.isActive !== false).length}
              </p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Suspended</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {partners.filter((p) => p.isActive === false).length}
              </p>
            </div>
            <div className="text-4xl">⏸️</div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Total Partners</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {partners.length}
              </p>
            </div>
            <div className="text-4xl">🚚</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, phone, or vehicle number..."
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

        {/* Status Filter */}
        <select
          className="input w-full sm:w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Suspended Only</option>
        </select>
      </div>

      {/* Table */}
      {paginatedPartners.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🚚</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No delivery partners found
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Start by adding your first delivery partner'}
          </p>
          <Link href="/dashboard/delivery-partners/new" className="btn-primary inline-block">
            ➕ Add Delivery Partner
          </Link>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Partner Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Deliveries
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedPartners.map((partner) => (
                    <tr key={partner.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {partner.name?.charAt(0).toUpperCase() || 'D'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {partner.name || 'Unnamed Partner'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Since {formatDate(partner.createdAt)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{partner.phoneNumber}</div>
                        {partner.email && (
                          <div className="text-xs text-gray-500">{partner.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {partner.vehicleType || '-'}
                        </div>
                        {partner.vehicleNumber && (
                          <div className="text-xs text-gray-500 font-mono">
                            {partner.vehicleNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {partner.totalDeliveries || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          partner.isActive !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {partner.isActive !== false ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/delivery-partners/${partner.id}`}
                            className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                          >
                            View
                          </Link>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleToggleStatus(partner.id, partner.isActive !== false)}
                            className={`font-medium text-sm ${
                              partner.isActive !== false
                                ? 'text-red-600 hover:text-red-700'
                                : 'text-green-600 hover:text-green-700'
                            }`}
                          >
                            {partner.isActive !== false ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredCount)} of {filteredCount}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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