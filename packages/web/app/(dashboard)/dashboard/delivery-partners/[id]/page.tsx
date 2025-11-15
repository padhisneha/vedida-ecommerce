'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getUserById,
  updateDeliveryPartner,
  toggleDeliveryPartnerStatus,
  getDeliveryPartnerStats,
  User,
  formatDate,
  formatCurrency,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

export default function DeliveryPartnerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [partner, setPartner] = useState<User | null>(null);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    totalDelivered: 0,
    totalRevenue: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    vehicleType: 'bike',
    vehicleNumber: '',
  });

  useEffect(() => {
    loadPartner();
    loadStats();
  }, [params.id]);

  const loadPartner = async () => {
    try {
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
  };

  const loadStats = async () => {
    try {
      const data = await getDeliveryPartnerStats(params.id);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

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

          {/* Recent Deliveries - Placeholder */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              📦 Recent Deliveries
            </h2>
            <div className="text-center py-8 text-gray-500">
              <p>Recent deliveries will appear here</p>
              <p className="text-sm mt-2">(Feature coming soon)</p>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Info */}
        <div className="space-y-6">
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