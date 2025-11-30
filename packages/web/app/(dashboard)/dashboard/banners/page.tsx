// packages/web/app/(dashboard)/dashboard/banners/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getAllBanners,
  toggleBannerStatus,
  deleteBanner,
  updateBannerOrder,
  Banner,
  BannerPlatform,
  BannerPosition,
  BannerActionType,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState<'all' | BannerPlatform>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const data = await getAllBanners();
      setBanners(data);
      console.log('✅ Loaded banners:', data.length);
    } catch (error) {
      console.error('Error loading banners:', error);
      showToast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (bannerId: string) => {
    try {
      await toggleBannerStatus(bannerId);
      showToast.success('Banner status updated!');
      await loadBanners();
    } catch (error) {
      console.error('Error toggling banner:', error);
      showToast.error('Failed to update banner status');
    }
  };

  const handleDelete = async (bannerId: string, title: string) => {
    if (!confirm(`Delete banner "${title}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await deleteBanner(bannerId);
      showToast.success('Banner deleted successfully!');
      await loadBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      showToast.error('Failed to delete banner');
    }
  };

  const handleMoveUp = async (banner: Banner, index: number) => {
    if (index === 0) return;
    
    const prevBanner = filteredBanners[index - 1];
    
    try {
      await updateBannerOrder(banner.id, prevBanner.displayOrder);
      await updateBannerOrder(prevBanner.id, banner.displayOrder);
      await loadBanners();
    } catch (error) {
      console.error('Error reordering:', error);
      showToast.error('Failed to reorder banners');
    }
  };

  const handleMoveDown = async (banner: Banner, index: number) => {
    if (index === filteredBanners.length - 1) return;
    
    const nextBanner = filteredBanners[index + 1];
    
    try {
      await updateBannerOrder(banner.id, nextBanner.displayOrder);
      await updateBannerOrder(nextBanner.id, banner.displayOrder);
      await loadBanners();
    } catch (error) {
      console.error('Error reordering:', error);
      showToast.error('Failed to reorder banners');
    }
  };

  const getFilteredBanners = () => {
    let filtered = [...banners];

    if (filterPlatform !== 'all') {
      filtered = filtered.filter(
        (b) => b.platform === filterPlatform || b.platform === 'both'
      );
    }

    if (filterStatus === 'active') {
      filtered = filtered.filter((b) => b.isActive);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter((b) => !b.isActive);
    }

    return filtered;
  };

  const getPlatformLabel = (platform: BannerPlatform) => {
    const labels = {
      [BannerPlatform.WEB]: '🌐 Web',
      [BannerPlatform.MOBILE]: '📱 Mobile',
      [BannerPlatform.BOTH]: '🌐📱 Both',
    };
    return labels[platform];
  };

  const getPositionLabel = (position: BannerPosition) => {
    const labels = {
      [BannerPosition.HOME_HERO]: 'Hero Banner',
      [BannerPosition.HOME_PROMO]: 'Promo Card',
    };
    return labels[position];
  };

  const getActionLabel = (actionType: BannerActionType, actionValue?: string) => {
    if (actionType === 'none') return 'No Action';
    if (actionType === 'category') return `Category: ${actionValue}`;
    if (actionType === 'product') return `Product: ${actionValue?.slice(0, 8)}...`;
    if (actionType === 'subscriptions') return 'Subscriptions Page';
    if (actionType === 'offers') return 'Offers Page';
    if (actionType === 'external') return `External: ${actionValue}`;
    return actionType;
  };

  const getCTR = (banner: Banner) => {
    if (banner.impressions === 0) return 0;
    return ((banner.clicks / banner.impressions) * 100).toFixed(1);
  };

  const filteredBanners = getFilteredBanners();
  const activeCount = banners.filter((b) => b.isActive).length;
  const totalImpressions = banners.reduce((sum, b) => sum + (b.impressions || 0), 0);
  const totalClicks = banners.reduce((sum, b) => sum + (b.clicks || 0), 0);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">🎨</div>
          <div className="text-lg text-gray-600">Loading banners...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Banner Management</h1>
          <p className="text-gray-600 mt-2">Manage promotional banners and ads</p>
        </div>
        <Link href="/dashboard/banners/new" className="btn-primary flex items-center gap-2">
          <span>➕</span>
          <span>Create New Banner</span>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Total Banners</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {banners.length}
              </p>
            </div>
            <div className="text-4xl">🎨</div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Active</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {activeCount}
              </p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-800">Total Views</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">
                {totalImpressions.toLocaleString()}
              </p>
            </div>
            <div className="text-4xl">👁️</div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-800">Total Clicks</p>
              <p className="text-3xl font-bold text-orange-900 mt-1">
                {totalClicks.toLocaleString()}
              </p>
            </div>
            <div className="text-4xl">👆</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Platform:</label>
          <select
            className="input py-2 px-3 text-sm"
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value as any)}
          >
            <option value="all">All Platforms</option>
            <option value="web">🌐 Web</option>
            <option value="mobile">📱 Mobile</option>
            {/* <option value="both">Both</option> */}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            className="input py-2 px-3 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {(filterPlatform !== 'all' || filterStatus !== 'all') && (
          <button
            onClick={() => {
              setFilterPlatform('all');
              setFilterStatus('all');
            }}
            className="btn-secondary text-sm py-2"
          >
            ✕ Clear Filters
          </button>
        )}
      </div>

      {/* Banners List */}
      {filteredBanners.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🎨</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {banners.length === 0 ? 'No banners yet' : 'No banners match filters'}
          </h3>
          <p className="text-gray-600 mb-6">
            {banners.length === 0 
              ? 'Create your first promotional banner to get started'
              : 'Try adjusting your filters'}
          </p>
          {banners.length === 0 && (
            <Link href="/dashboard/banners/new" className="btn-primary inline-flex items-center gap-2">
              <span>➕</span>
              <span>Create First Banner</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBanners.map((banner, index) => (
            <div
              key={banner.id}
              className={`card border-2 ${
                banner.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="flex gap-4">
                {/* Banner Image Preview */}
                <div className="w-48 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {banner.imageUrl ? (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      🎨
                    </div>
                  )}
                </div>

                {/* Banner Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {banner.title}
                      </h3>
                      {banner.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {banner.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Status Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      banner.isActive
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }`}>
                      {banner.isActive ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </div>

                  {/* Meta Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Platform</p>
                      <p className="font-medium text-gray-900">
                        {getPlatformLabel(banner.platform)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Position</p>
                      <p className="font-medium text-gray-900">
                        {getPositionLabel(banner.position)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Action</p>
                      <p className="font-medium text-gray-900 truncate" title={getActionLabel(banner.actionType, banner.actionValue)}>
                        {getActionLabel(banner.actionType, banner.actionValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Display Order</p>
                      <p className="font-medium text-gray-900">#{banner.displayOrder}</p>
                    </div>
                  </div>

                  {/* Analytics */}
                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                    <span>👁️ {banner.impressions || 0} views</span>
                    <span>👆 {banner.clicks || 0} clicks</span>
                    <span>📊 {getCTR(banner)}% CTR</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/banners/${banner.id}`}
                      className="btn-secondary text-sm px-4 py-2"
                    >
                      ✏️ Edit
                    </Link>

                    <button
                      onClick={() => handleToggleStatus(banner.id)}
                      className={`text-sm px-4 py-2 rounded-lg font-medium ${
                        banner.isActive
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {banner.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                    </button>

                    <button
                      onClick={() => handleMoveUp(banner, index)}
                      disabled={index === 0}
                      className="btn-secondary text-sm px-3 py-2 disabled:opacity-30"
                      title="Move up"
                    >
                      ⬆️
                    </button>

                    <button
                      onClick={() => handleMoveDown(banner, index)}
                      disabled={index === filteredBanners.length - 1}
                      className="btn-secondary text-sm px-3 py-2 disabled:opacity-30"
                      title="Move down"
                    >
                      ⬇️
                    </button>

                    <button
                      onClick={() => handleDelete(banner.id, banner.title)}
                      className="text-sm px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-medium ml-auto"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}