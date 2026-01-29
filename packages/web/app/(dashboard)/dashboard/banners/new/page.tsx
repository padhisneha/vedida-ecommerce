// packages/web/app/(dashboard)/dashboard/banners/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  createBanner,
  uploadBannerImage,
  generateBannerImagePath,
  BannerPlatform,
  BannerPosition,
  BannerActionType,
  BannerImageSource,
  ProductCategory,
  initialCapital,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';
import Image from 'next/image';

export default function NewBannerPage() {
  const router = useRouter();
  const { user } = useAuth();
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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast.error('Image size must be less than 5MB');
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    showToast.success('Image selected!');
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      showToast.error('Please enter banner title');
      return false;
    }

    if (imageSource === BannerImageSource.UPLOAD && !imageFile) {
      showToast.error('Please select an image to upload');
      return false;
    }

    if (imageSource === BannerImageSource.URL && !externalImageUrl.trim()) {
      showToast.error('Please enter image URL');
      return false;
    }

    if (imageSource === BannerImageSource.URL) {
      try {
        new URL(externalImageUrl);
      } catch {
        showToast.error('Please enter a valid URL');
        return false;
      }
    }

    if (formData.actionType !== BannerActionType.NONE && !formData.actionValue.trim()) {
      showToast.error('Please enter action value for the selected action type');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!user?.id || !user?.name) {
        showToast.error('User information not available');
        return;
    }

    setSaving(true);
    const toastId = showToast.loading('Creating banner...');

    try {
        let finalImageUrl = '';

        if (imageSource === BannerImageSource.UPLOAD && imageFile) {
        const toastId = showToast.loading('Uploading image...');
        const tempId = `temp_${Date.now()}`;
        const path = generateBannerImagePath(tempId, imageFile.name);
        finalImageUrl = await uploadBannerImage(imageFile, path);
        } else if (imageSource === BannerImageSource.URL) {
        finalImageUrl = externalImageUrl.trim();
        }

        const toastId = showToast.loading('Creating banner...');
        
        // Build banner data, excluding undefined/empty values
        const bannerData: any = {
            title: formData.title.trim(),
            imageSource,
            imageUrl: finalImageUrl,
            platform: formData.platform,
            position: formData.position,
            actionType: formData.actionType,
            displayOrder: formData.displayOrder,
            isActive: formData.isActive,
            createdBy: user.id,
            createdByName: user.name,
        };

        // Only add optional fields if they have values
        if (formData.description.trim()) {
            bannerData.description = formData.description.trim();
        }

        if (formData.actionValue.trim()) {
            bannerData.actionValue = formData.actionValue.trim();
        }

        if (formData.actionText.trim()) {
            bannerData.actionText = formData.actionText.trim();
        }

        const bannerId = await createBanner(bannerData);

        showToast.dismiss(toastId);
        showToast.success('Banner created successfully!');
        router.push('/dashboard/banners');
    } catch (error: any) {
        console.error('Error creating banner:', error);
        showToast.dismiss(toastId);
        showToast.error(error.message || 'Failed to create banner');
    } finally {
        setSaving(false);
    }
  };

  const getPreviewDimensions = () => {
    if (formData.platform === BannerPlatform.MOBILE || 
        (formData.platform === BannerPlatform.BOTH && formData.position === BannerPosition.HOME_HERO)) {
      return 'Recommended: 375x200px (Mobile) or 1920x600px (Web Hero)';
    }
    if (formData.position === BannerPosition.HOME_HERO) {
      return 'Recommended: 1920x600px for hero banners';
    }
    return 'Recommended: 400x300px for promo cards';
  };

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

        <h1 className="text-3xl font-bold text-gray-900 mt-4">Create New Banner</h1>
        <p className="text-gray-600 mt-2">Add a promotional banner to your store</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form */}
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

              {/* Image Upload */}
              {imageSource === BannerImageSource.UPLOAD && (
                <div className="space-y-4">
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                    {imagePreview ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={imagePreview}
                          alt="Preview"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-6xl mb-2">🖼️</div>
                        <p className="text-gray-500 text-sm">No image selected</p>
                      </div>
                    )}
                  </div>

                  <div>
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
                      📷 PNG, JPG, JPEG up to 5MB • {getPreviewDimensions()}
                    </p>
                  </div>

                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="btn-secondary text-sm"
                    >
                      ✕ Remove Image
                    </button>
                  )}
                </div>
              )}

              {/* External URL */}
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
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the full URL of the banner image
                    </p>
                  </div>

                  {imagePreview && (
                    <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-contain"
                        unoptimized
                        onError={() => {
                          showToast.error('Failed to load image from URL');
                          setImagePreview(null);
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
                    Lower numbers appear first (1 = highest priority)
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
                      actionValue: '', // Reset value when type changes
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
                      placeholder="Enter product ID (e.g., prod_abc123)"
                      value={formData.actionValue}
                      onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Find product ID in Inventory → View Product
                    </p>
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
                      placeholder="e.g., Shop Now, Learn More, View Offer"
                      value={formData.actionText}
                      onChange={(e) => setFormData({ ...formData, actionText: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to use default text based on action type
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Preview & Actions */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">👁️ Preview</h2>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {/* Image Preview */}
                <div className={`bg-gray-100 rounded-lg overflow-hidden mb-3 ${
                  formData.position === BannerPosition.HOME_HERO ? 'h-40' : 'h-32'
                }`}>
                  {imagePreview ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">
                      🖼️
                    </div>
                  )}
                </div>

                {/* Text Overlay Preview */}
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-1">
                    {formData.title || 'Banner Title'}
                  </h3>
                  {formData.description && (
                    <p className="text-xs text-gray-600 mb-2">
                      {formData.description}
                    </p>
                  )}
                  {formData.actionType !== BannerActionType.NONE && (
                    <button
                      type="button"
                      className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      {formData.actionText || 'Click Here'}
                    </button>
                  )}
                </div>

                {/* Meta Info */}
                <div className="mt-3 space-y-1 text-xs text-gray-600">
                  <p>📍 {formData.position === BannerPosition.HOME_HERO ? 'Hero Banner' : 'Promo Card'}</p>
                  <p>
                    {formData.platform === BannerPlatform.BOTH ? '🌐📱 Web & Mobile' :
                     formData.platform === BannerPlatform.WEB ? '🌐 Web Only' :
                     '📱 Mobile Only'}
                  </p>
                  <p>#{formData.displayOrder} Display Order</p>
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
                    <span>Creating...</span>
                  </span>
                ) : (
                  '✅ Create Banner'
                )}
              </button>
              <Link
                href="/dashboard/banners"
                className="block text-center btn-secondary w-full"
              >
                Cancel
              </Link>
            </div>

            {/* Help */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Tips</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Use high-quality images for better engagement</li>
                <li>• Hero banners should be wide (16:9 ratio)</li>
                {/* <li>• Promo cards work best as squares or 4:3</li> */}
                <li>• Dimention: 375x200px (Mobile) or 1920x600px (Web) for hero banners</li>
                <li>• Dimention: 400x300px for promo cards</li> 
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}