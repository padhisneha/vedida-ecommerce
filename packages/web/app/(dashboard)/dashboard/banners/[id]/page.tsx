// packages/web/app/(dashboard)/dashboard/banners/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  getBannerById,
  updateBanner,
  deleteBanner,
  uploadBannerImage,
  generateBannerImagePath,
  deleteBannerImage,
  Banner,
  BannerPlatform,
  BannerPosition,
  BannerActionType,
  BannerImageSource,
  ProductCategory,
  formatDate,
  initialCapital,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

export default function EditBannerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Image handling
  const [imageSource, setImageSource] = useState<BannerImageSource>(BannerImageSource.UPLOAD);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [externalImageUrl, setExternalImageUrl] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    platform: BannerPlatform.WEB,
    position: BannerPosition.HOME_HERO,
    actionType: BannerActionType.NONE,
    actionValue: '',
    actionText: '',
    displayOrder: 1,
    isActive: true,
  });

  useEffect(() => {
    loadBanner();
  }, [params.id]);

  const loadBanner = async () => {
    try {
      const data = await getBannerById(params.id);
      if (data) {
        setBanner(data);
        setFormData({
          title: data.title,
          description: data.description || '',
          platform: data.platform,
          position: data.position,
          actionType: data.actionType,
          actionValue: data.actionValue || '',
          actionText: data.actionText || '',
          displayOrder: data.displayOrder,
          isActive: data.isActive,
        });
        setImageSource(data.imageSource);
        setImagePreview(data.imageUrl);
        if (data.imageSource === BannerImageSource.URL) {
          setExternalImageUrl(data.imageUrl);
        }
      }
    } catch (error) {
      console.error('Error loading banner:', error);
      showToast.error('Failed to load banner');
    } finally {
      setLoading(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast.error('Image size must be less than 5MB');
      return;
    }

    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    showToast.success('New image selected!');
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      showToast.error('Please enter banner title');
      return false;
    }

    if (imageSource === BannerImageSource.UPLOAD && !imagePreview && !imageFile) {
      showToast.error('Please select an image');
      return false;
    }

    if (imageSource === BannerImageSource.URL && !externalImageUrl.trim()) {
      showToast.error('Please enter image URL');
      return false;
    }

    if (formData.actionType !== BannerActionType.NONE && !formData.actionValue.trim()) {
      showToast.error('Please enter action value for the selected action type');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!banner) return;
    if (!validateForm()) return;

    setSaving(true);
    const toastId = showToast.loading('Saving banner...');

    try {
        let finalImageUrl = banner.imageUrl;
        let finalImageSource = imageSource;

        // Handle image updates
        if (imageSource === BannerImageSource.UPLOAD && imageFile) {
            showToast.loading('Uploading new image...', { id: toastId });

            // Delete old image if it was uploaded (not external URL)
            if (banner.imageSource === BannerImageSource.UPLOAD && banner.imageUrl) {
            try {
                await deleteBannerImage(banner.imageUrl);
            } catch (error) {
                console.warn('Could not delete old image:', error);
            }
            }

            // Upload new image
            const path = generateBannerImagePath(banner.id, imageFile.name);
            finalImageUrl = await uploadBannerImage(imageFile, path);
            finalImageSource = BannerImageSource.UPLOAD;
            
            console.log('✅ New image uploaded:', finalImageUrl);
        } else if (imageSource === BannerImageSource.URL) {
            // Delete old uploaded image if switching to URL
            if (banner.imageSource === BannerImageSource.UPLOAD && banner.imageUrl) {
            try {
                await deleteBannerImage(banner.imageUrl);
            } catch (error) {
                console.warn('Could not delete old image:', error);
            }
            }

            finalImageUrl = externalImageUrl.trim();
            finalImageSource = BannerImageSource.URL;
        }

        showToast.loading('Updating banner...', { id: toastId });

        // Build update data, excluding undefined values
        const updateData: any = {
        title: formData.title.trim(),
        imageSource: finalImageSource,
        imageUrl: finalImageUrl,
        platform: formData.platform,
        position: formData.position,
        actionType: formData.actionType,
        displayOrder: formData.displayOrder,
        isActive: formData.isActive,
        };

        // Only add optional fields if they have values
        if (formData.description.trim()) {
        updateData.description = formData.description.trim();
        }

        if (formData.actionValue.trim()) {
        updateData.actionValue = formData.actionValue.trim();
        }

        if (formData.actionText.trim()) {
        updateData.actionText = formData.actionText.trim();
        }

        await updateBanner(banner.id, updateData);

        showToast.dismiss(toastId);
        showToast.success('Banner updated successfully!');
        router.push('/dashboard/banners');
    } catch (error: any) {
        console.error('Error updating banner:', error);
        showToast.dismiss(toastId);
        showToast.error(error.message || 'Failed to update banner');
    } finally {
        setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!banner) return;

    if (!confirm(`Delete banner "${banner.title}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    setSaving(true);
    const toastId = showToast.loading('Deleting banner...');

    try {
      // Delete image if uploaded
      if (banner.imageSource === BannerImageSource.UPLOAD && banner.imageUrl) {
        try {
          await deleteBannerImage(banner.imageUrl);
        } catch (error) {
          console.warn('Could not delete image:', error);
        }
      }

      await deleteBanner(banner.id);
      
      showToast.dismiss(toastId);
      showToast.success('Banner deleted successfully!');
      router.push('/dashboard/banners');
    } catch (error: any) {
      console.error('Error deleting banner:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to delete banner');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">🎨</div>
          <div className="text-lg text-gray-600">Loading banner...</div>
        </div>
      </div>
    );
  }

  if (!banner) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Banner Not Found</h2>
          <Link href="/dashboard/banners" className="btn-primary">
            ← Back to Banners
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
          href="/dashboard/banners"
          className="text-primary-600 hover:text-primary-700 font-medium text-sm mb-4 inline-flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to Banners</span>
        </Link>

        <div className="flex items-start justify-between mt-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Banner</h1>
            <p className="text-gray-600 mt-2">
              Created on {formatDate(banner.createdAt)}
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={saving}
            className="btn-danger"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form - Same as create page */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">📝 Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="label">Banner Title *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Summer Sale - 50% Off!"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                {/* <div>
                  <label className="label">Description (Optional)</label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Brief description for admin reference"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div> */}
              </div>
            </div>

            {/* Banner Image */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">🖼️ Banner Image</h2>

              {/* Image Source Toggle */}
              <div className="mb-4">
                <label className="label">Image Source</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setImageSource(BannerImageSource.UPLOAD)}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                      imageSource === BannerImageSource.UPLOAD
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📤 Upload Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSource(BannerImageSource.URL)}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                      imageSource === BannerImageSource.URL
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🔗 Image URL
                  </button>
                </div>
              </div>

              {/* Upload Mode */}
              {imageSource === BannerImageSource.UPLOAD && (
                <div className="space-y-4">
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-6xl mb-2">🖼️</div>
                        <p className="text-gray-500 text-sm">No image</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="label">
                      {imagePreview ? 'Upload New Image' : 'Upload Image *'}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary-50 file:text-primary-700
                        hover:file:bg-primary-100
                        cursor-pointer border border-gray-300 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      📷 PNG, JPG, JPEG up to 5MB
                      {imagePreview && ' • Leave empty to keep current image'}
                    </p>
                  </div>
                </div>
              )}

              {/* URL Mode */}
              {imageSource === BannerImageSource.URL && (
                <div className="space-y-4">
                  <div>
                    <label className="label">Image URL *</label>
                    <input
                      type="url"
                      className="input"
                      placeholder="https://example.com/banner-image.jpg"
                      value={externalImageUrl}
                      onChange={(e) => {
                        setExternalImageUrl(e.target.value);
                        setImagePreview(e.target.value);
                      }}
                      required
                    />
                  </div>

                  {imagePreview && (
                    <div className="h-64 bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={() => {
                          showToast.error('Failed to load image from URL');
                          setImagePreview(externalImageUrl);
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Display Settings */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">⚙️ Display Settings</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Platform *</label>
                    <select
                      className="input"
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value as BannerPlatform })}
                    >
                      {/* <option value={BannerPlatform.BOTH}>🌐📱 Both (Web & Mobile)</option> */}
                      <option value={BannerPlatform.WEB}>🌐 Web Only</option>
                      <option value={BannerPlatform.MOBILE}>📱 Mobile Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Position *</label>
                    <select
                      className="input"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value as BannerPosition })}
                    >
                      <option value={BannerPosition.HOME_HERO}>Hero Banner (Top)</option>
                      <option value={BannerPosition.HOME_PROMO}>Promotional Card</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Display Order</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Lower numbers appear first
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-primary-600 rounded"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <div>
                      <p className="font-medium text-gray-900">Active</p>
                      <p className="text-sm text-gray-600">Show this banner to users</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Action/Navigation */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">🎯 Banner Action</h2>

              <div className="space-y-4">
                <div>
                  <label className="label">Action Type *</label>
                  <select
                    className="input"
                    value={formData.actionType}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      actionType: e.target.value as BannerActionType,
                      actionValue: '',
                    })}
                  >
                    <option value={BannerActionType.NONE}>No Action (Display Only)</option>
                    {formData.platform === BannerPlatform.MOBILE &&
                      <>
                        <option value={BannerActionType.CATEGORY}>Navigate to Category</option>
                        <option value={BannerActionType.PRODUCT}>Navigate to Product</option>
                        <option value={BannerActionType.SUBSCRIPTIONS}>Navigate to Subscriptions</option>
                      </>
                    }
                    {/* <option value={BannerActionType.OFFERS}>Navigate to Offers</option> */}
                    {formData.platform !== BannerPlatform.MOBILE &&
                        <option value={BannerActionType.INTERNAL}>Internal Link</option>
                    }
                    <option value={BannerActionType.EXTERNAL}>External Link</option>
                  </select>
                </div>

                {formData.actionType === BannerActionType.CATEGORY && (
                  <div>
                    <label className="label">Category *</label>
                    <select
                      className="input"
                      value={formData.actionValue}
                      onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                      required
                    >
                      <option value="">Select category...</option>
                      {Object.values(ProductCategory).map((cat) => (
                        <option key={cat} value={cat}>
                            {initialCapital(cat).replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.actionType === BannerActionType.PRODUCT && (
                  <div>
                    <label className="label">Product ID *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter product ID"
                      value={formData.actionValue}
                      onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                      required
                    />
                  </div>
                )}

                {formData.actionType === BannerActionType.INTERNAL && (
                  <div>
                    <label className="label">Internal URL *</label>
                    <input
                      type="url"
                      className="input"
                      placeholder="https://example.com/promotion"
                      value={formData.actionValue}
                      onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                      required
                    />
                  </div>
                )}

                {formData.actionType === BannerActionType.EXTERNAL && (
                  <div>
                    <label className="label">External URL *</label>
                    <input
                      type="url"
                      className="input"
                      placeholder="https://example.com/promotion"
                      value={formData.actionValue}
                      onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                      required
                    />
                  </div>
                )}

                {formData.actionType !== BannerActionType.NONE && (
                  <div>
                    <label className="label">Button Text (Optional)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Shop Now, Learn More"
                      value={formData.actionText}
                      onChange={(e) => setFormData({ ...formData, actionText: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Preview & Analytics */}
          <div className="space-y-6">
            {/* Preview - same as create page */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">👁️ Preview</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className={`bg-gray-100 rounded-lg overflow-hidden mb-3 ${
                  formData.position === BannerPosition.HOME_HERO ? 'h-40' : 'h-32'
                }`}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">🖼️</div>
                  )}
                </div>

                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-1">
                    {formData.title || 'Banner Title'}
                  </h3>
                  {formData.description && (
                    <p className="text-xs text-gray-600 mb-2">{formData.description}</p>
                  )}
                  {formData.actionType !== BannerActionType.NONE && (
                    <button type="button" className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                      {formData.actionText || 'Click Here'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">📊 Analytics</h2>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Impressions</span>
                  <span className="font-bold text-gray-900">{banner.impressions || 0}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Clicks</span>
                  <span className="font-bold text-gray-900">{banner.clicks || 0}</span>
                </div>
                <div className="flex justify-between p-3 bg-primary-50 rounded-lg">
                  <span className="text-sm text-primary-700">Click-Through Rate</span>
                  <span className="font-bold text-primary-900">
                    {banner.impressions > 0 
                      ? ((banner.clicks / banner.impressions) * 100).toFixed(1) 
                      : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="card">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full mb-3"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    <span>Saving...</span>
                  </span>
                ) : (
                  '💾 Save Changes'
                )}
              </button>
              <Link
                href="/dashboard/banners"
                className="block text-center btn-secondary w-full"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}