'use client';

import { useState, useEffect } from 'react';
import {
  getAllOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
  Offer,
  formatDate,
  ProductCategory,
  OfferApplicability,
  getProductEmoji,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';
import { off } from 'process';

export default function OffersManagementPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discountPercentage: '',
    couponCode: '',
    backgroundColor: '#FEF3C7',
    textColor: '#92400E',
    startDate: '',
    endDate: '',
    isActive: true,
    showOnHomepage: true,
    displayOrder: 1,
    minOrderAmount: '',
    maxDiscount: '',
    applicableCategories: [] as ProductCategory[],
    includesFreeDelivery: false,
    applicability: OfferApplicability.BOTH as OfferApplicability,
  });

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const data = await getAllOffers();
      setOffers(data);
      console.log('✅ Loaded offers:', data.length);
    } catch (error) {
      console.error('Error loading offers:', error);
      showToast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      discountPercentage: '',
      couponCode: '',
      backgroundColor: '#FEF3C7',
      textColor: '#92400E',
      startDate: '',
      endDate: '',
      isActive: true,
      showOnHomepage: true,
      displayOrder: 1,
      minOrderAmount: '',
      maxDiscount: '',
      applicableCategories: [],
      includesFreeDelivery: false,
      applicability: OfferApplicability.BOTH,
    });
    setEditingOffer(null);
    setShowForm(false);
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description,
      discountPercentage: offer.discountPercentage?.toString() || '',
      couponCode: offer.couponCode || '',
      backgroundColor: offer.backgroundColor,
      textColor: offer.textColor,
      startDate: offer.startDate.toDate().toISOString().split('T')[0],
      endDate: offer.endDate.toDate().toISOString().split('T')[0],
      isActive: offer.isActive,
      showOnHomepage: offer.showOnHomepage,
      displayOrder: offer.displayOrder,
      minOrderAmount: offer.minOrderAmount?.toString() || '',
      maxDiscount: offer.maxDiscount?.toString() || '',
      applicableCategories: offer.applicableCategories || [],
      includesFreeDelivery: offer.includesFreeDelivery || false,
      applicability: offer.applicability || OfferApplicability.BOTH,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.startDate || !formData.endDate) {
      showToast.error('Please fill all required fields');
      return;
    }

    setSaving(true);
    const toastId = showToast.loading(editingOffer ? 'Updating offer...' : 'Creating offer...');

    try {
      const offerData: any = {
        title: formData.title,
        description: formData.description,
        backgroundColor: formData.backgroundColor,
        textColor: formData.textColor,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        isActive: formData.isActive,
        showOnHomepage: formData.showOnHomepage,
        displayOrder: formData.displayOrder,
        applicableCategories: formData.applicableCategories,
        includesFreeDelivery: formData.includesFreeDelivery,
        applicability: formData.applicability,
      };

      if (formData.discountPercentage) {
        offerData.discountPercentage = parseFloat(formData.discountPercentage);
      }
      if (formData.couponCode) {
        offerData.couponCode = formData.couponCode.toUpperCase();
      }
      if (formData.minOrderAmount) {
        offerData.minOrderAmount = parseFloat(formData.minOrderAmount);
      }
      if (formData.maxDiscount) {
        offerData.maxDiscount = parseFloat(formData.maxDiscount);
      }

      if (editingOffer) {
        await updateOffer(editingOffer.id, offerData);
        showToast.dismiss(toastId);
        showToast.success('Offer updated successfully!');
      } else {
        await createOffer(offerData);
        showToast.dismiss(toastId);
        showToast.success('Offer created successfully!');
      }

      resetForm();
      await loadOffers();
    } catch (error) {
      console.error('Error saving offer:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to save offer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;

    const toastId = showToast.loading('Deleting offer...');
    try {
      await deleteOffer(offerId);
      showToast.dismiss(toastId);
      showToast.success('Offer deleted successfully!');
      await loadOffers();
    } catch (error) {
      console.error('Error deleting offer:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to delete offer');
    }
  };

  const handleToggleStatus = async (offerId: string, currentStatus: boolean) => {
    try {
      await toggleOfferStatus(offerId, !currentStatus);
      showToast.success(`Offer ${!currentStatus ? 'activated' : 'deactivated'}`);
      await loadOffers();
    } catch (error) {
      console.error('Error toggling status:', error);
      showToast.error('Failed to update status');
    }
  };

  const colorPresets = [
    { bg: '#FEF3C7', text: '#92400E', name: 'Yellow' },
    { bg: '#DBEAFE', text: '#1E40AF', name: 'Blue' },
    { bg: '#D1FAE5', text: '#065F46', name: 'Green' },
    { bg: '#FCE7F3', text: '#9F1239', name: 'Pink' },
    { bg: '#E0E7FF', text: '#3730A3', name: 'Indigo' },
    { bg: '#FED7AA', text: '#9A3412', name: 'Orange' },
  ];

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">✨</div>
          <div className="text-lg text-gray-600">Loading offers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Offers Management</h1>
          <p className="text-gray-600 mt-2">Manage promotional offers and banners</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <span>➕</span>
          <span>Create New Offer</span>
        </button>
      </div>

      {/* Offers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="card"
          >
            {/* Preview */}
            <div
              className="rounded-lg p-6 mb-4"
              style={{
                backgroundColor: offer.backgroundColor,
                color: offer.textColor,
              }}
            >
              <h3 className="text-2xl font-bold mb-2">{offer.title}</h3>
              <p className="mb-3">{offer.description}</p>
              {offer.couponCode && (
                <div className="inline-block bg-white bg-opacity-30 rounded px-3 py-1">
                  <span className="font-mono font-bold">{offer.couponCode}</span>
                </div>
              )}
            </div>

            {offer.applicableCategories && offer.applicableCategories.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Applicable To:</span>
                <span className="font-medium">
                  {offer.applicableCategories.map(cat => getProductEmoji(cat)).join(' ')}
                  {' '}
                  {offer.applicableCategories.join(', ')}
                </span>
              </div>
            )}
            
            {offer.includesFreeDelivery && (
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                  🚚 Free Delivery Included
                </span>
              </div>
            )}

            {/* Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Valid From:</span>
                <span className="font-medium">{formatDate(offer.startDate)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Valid Till:</span>
                <span className="font-medium">{formatDate(offer.endDate)}</span>
              </div>
              {offer.discountPercentage && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium">{offer.discountPercentage}%</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Display Order:</span>
                <span className="font-medium">#{offer.displayOrder}</span>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex gap-2 mb-4">
              <span className={`text-xs px-2 py-1 rounded-full ${
                offer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {offer.isActive ? '✅ Active' : '❌ Inactive'}
              </span>
              {offer.showOnHomepage && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                  🏠 On Homepage
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(offer)}
                className="btn-secondary flex-1"
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => handleToggleStatus(offer.id, offer.isActive)}
                className={offer.isActive ? 'btn-danger flex-1' : 'btn-primary flex-1'}
              >
                {offer.isActive ? '⏸️ Deactivate' : '✅ Activate'}
              </button>
              <button
                onClick={() => handleDelete(offer.id)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}

        {offers.length === 0 && (
          <div className="col-span-2 card text-center py-12">
            <div className="text-5xl mb-4">✨</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No offers yet</h3>
            <p className="text-gray-600 mb-4">Create your first promotional offer</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              ➕ Create Offer
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingOffer ? 'Edit Offer' : 'Create New Offer'}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <label className="label">Title *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="✨ Welcome Offer - 20% OFF"
                />
              </div>

              <div>
                <label className="label">Description *</label>
                <textarea
                  className="input"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Get 20% off on your first subscription"
                />
              </div>

              {/* Discount Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Discount Percentage</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                    placeholder="20"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="label">Coupon Code</label>
                  <input
                    type="text"
                    className="input uppercase"
                    value={formData.couponCode}
                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                    placeholder="VEDIDA20"
                  />
                </div>
              </div>

              {/* Applicable Categories */}
              <div>
                <label className="label">Applicable Categories (leave empty for all products)</label>
                <div className="space-y-2">
                  {Object.values(ProductCategory).map((category) => (
                    <label key={category} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.applicableCategories?.includes(category) || false}
                        onChange={(e) => {
                          const current = formData.applicableCategories || [];
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              applicableCategories: [...current, category],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              applicableCategories: current.filter(c => c !== category),
                            });
                          }
                        }}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {getProductEmoji(category)} {category}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  If no categories selected, offer applies to all products
                </p>
              </div>

              {/* Applicability - Orders vs Subscriptions */}
              <div className="pt-4 border-t border-gray-200">
                <label className="label">Applicable To</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="radio"
                      name="applicability"
                      checked={formData.applicability === OfferApplicability.ORDERS_ONLY}
                      onChange={() => setFormData({ ...formData, applicability: OfferApplicability.ORDERS_ONLY })}
                      className="w-4 h-4 text-green-600"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">📦 One-Time Orders Only</span>
                      <p className="text-xs text-gray-600">This coupon can only be used for regular orders</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="radio"
                      name="applicability"
                      checked={formData.applicability === OfferApplicability.SUBSCRIPTIONS_ONLY}
                      onChange={() => setFormData({ ...formData, applicability: OfferApplicability.SUBSCRIPTIONS_ONLY })}
                      className="w-4 h-4 text-green-600"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">📅 Subscriptions Only</span>
                      <p className="text-xs text-gray-600">This coupon can only be used for subscriptions</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="radio"
                      name="applicability"
                      checked={formData.applicability === OfferApplicability.BOTH}
                      onChange={() => setFormData({ ...formData, applicability: OfferApplicability.BOTH })}
                      className="w-4 h-4 text-green-600"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">🎯 Both Orders & Subscriptions</span>
                      <p className="text-xs text-gray-600">Can be used for any purchase type</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Free Delivery Option */}
              <div className="pt-4 border-t border-gray-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.includesFreeDelivery}
                    onChange={(e) => setFormData({ ...formData, includesFreeDelivery: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Includes Free Delivery
                    </span>
                    <p className="text-xs text-gray-500">
                      This offer also provides free delivery to the customer
                    </p>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    placeholder="500"
                  />
                </div>

                <div>
                  <label className="label">Max Discount (₹)</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    placeholder="200"
                  />
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="label">Color Theme</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-3">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setFormData({ 
                        ...formData, 
                        backgroundColor: preset.bg,
                        textColor: preset.text,
                      })}
                      className={`h-16 rounded-lg border-2 transition-all ${
                        formData.backgroundColor === preset.bg 
                          ? 'border-green-600 ring-2 ring-green-200' 
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: preset.bg }}
                    >
                      <div className="text-xs font-medium" style={{ color: preset.text }}>
                        {preset.name}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600">Background</label>
                    <input
                      type="color"
                      className="w-full h-10 rounded cursor-pointer"
                      value={formData.backgroundColor}
                      onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Text</label>
                    <input
                      type="color"
                      className="w-full h-10 rounded cursor-pointer"
                      value={formData.textColor}
                      onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="label">Preview</label>
                <div
                  className="rounded-lg p-6"
                  style={{
                    backgroundColor: formData.backgroundColor,
                    color: formData.textColor,
                  }}
                >
                  <h3 className="text-2xl font-bold mb-2">{formData.title || 'Offer Title'}</h3>
                  <p className="mb-3">{formData.description || 'Offer description'}</p>
                  {formData.couponCode && (
                    <div className="inline-block bg-white bg-opacity-30 rounded px-3 py-1">
                      <span className="font-mono font-bold">{formData.couponCode}</span>
                    </div>
                  )}

                  {formData.applicability === OfferApplicability.ORDERS_ONLY && (
                    <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                      📦 Orders Only
                    </span>
                  )}
                  {formData.applicability === OfferApplicability.SUBSCRIPTIONS_ONLY && (
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">
                      📅 Subscriptions Only
                    </span>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">End Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate}
                  />
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-3">
                <div>
                  <label className="label">Display Order</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })}
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower numbers appear first in carousel</p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Active (visible to users)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showOnHomepage}
                    onChange={(e) => setFormData({ ...formData, showOnHomepage: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Show on Homepage</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={resetForm}
                disabled={saving}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? 'Saving...' : editingOffer ? '💾 Update Offer' : '➕ Create Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}