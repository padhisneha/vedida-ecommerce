'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createProduct,
  ProductCategory,
  ProductUnit,
  formatCurrency,
} from '@ecommerce/shared';

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: ProductCategory.MILK,
    priceExcludingTax: 0,
    taxCGST: 0,
    taxSGST: 0,
    unit: ProductUnit.LITER,
    quantity: 1,
    inStock: true,
    allowSubscription: false,
  });

  const calculatePriceWithTax = () => {
    const tax = (formData.priceExcludingTax * (formData.taxCGST + formData.taxSGST)) / 100;
    return formData.priceExcludingTax + tax;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter product name');
      return;
    }

    if (formData.priceExcludingTax <= 0) {
      alert('Please enter a valid price');
      return;
    }

    if (formData.quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    setSaving(true);
    try {
      const calculatedPrice = calculatePriceWithTax();

      const productId = await createProduct({
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priceExcludingTax: formData.priceExcludingTax,
        taxCGST: formData.taxCGST,
        taxSGST: formData.taxSGST,
        price: calculatedPrice,
        unit: formData.unit,
        quantity: formData.quantity,
        inStock: formData.inStock,
        allowSubscription: formData.allowSubscription,
      });

      alert('✅ Product created successfully!');
      router.push(`/dashboard/inventory/${productId}`);
    } catch (error) {
      console.error('Error creating product:', error);
      alert('❌ Failed to create product');
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/inventory"
          className="text-primary-600 hover:text-primary-700 font-medium text-sm mb-4 inline-flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to Inventory</span>
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Add New Product</h1>
        <p className="text-gray-600 mt-2">Create a new product in your inventory</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                📝 Basic Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Product Name *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Fresh Milk, Thick Curd"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Description *</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Describe the product..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Category *</label>
                    <select
                      className="input"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                    >
                      <option value={ProductCategory.MILK}>🥛 Milk</option>
                      <option value={ProductCategory.CURD}>🥣 Curd</option>
                      <option value={ProductCategory.GHEE}>🧈 Ghee</option>
                      <option value={ProductCategory.PANEER}>🧀 Paneer</option>
                      <option value={ProductCategory.BUTTER}>🧈 Butter</option>
                      <option value={ProductCategory.BUTTERMILK}>🥤 Buttermilk</option>
                      <option value={ProductCategory.OTHER}>📦 Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Unit *</label>
                    <select
                      className="input"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value as ProductUnit })}
                    >
                      <option value={ProductUnit.LITER}>Liter</option>
                      <option value={ProductUnit.ML}>ML</option>
                      <option value={ProductUnit.KG}>KG</option>
                      <option value={ProductUnit.GRAM}>Gram</option>
                      <option value={ProductUnit.PIECE}>Piece</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Quantity *</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g., 1 for 1 liter, 500 for 500 grams"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The quantity per unit (e.g., 1 for 1 liter, 500 for 500 grams)
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing & Tax */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                💰 Pricing & Tax
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Price (Excluding Tax) *</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g., 57.14"
                    value={formData.priceExcludingTax || ''}
                    onChange={(e) => setFormData({ ...formData, priceExcludingTax: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">CGST (%)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="e.g., 2.5"
                      value={formData.taxCGST || ''}
                      onChange={(e) => setFormData({ ...formData, taxCGST: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="label">SGST (%)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="e.g., 2.5"
                      value={formData.taxSGST || ''}
                      onChange={(e) => setFormData({ ...formData, taxSGST: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-primary-900">
                      Final Price (Including Tax)
                    </span>
                    <span className="text-2xl font-bold text-primary-700">
                      {formatCurrency(calculatePriceWithTax())}
                    </span>
                  </div>
                  {(formData.taxCGST > 0 || formData.taxSGST > 0) && (
                    <p className="text-xs text-primary-700">
                      Tax Amount: {formatCurrency(calculatePriceWithTax() - formData.priceExcludingTax)} 
                      ({formData.taxCGST + formData.taxSGST}%)
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Tip:</strong> The final price (including tax) will be automatically calculated and displayed to customers.
                  </p>
                </div>
              </div>
            </div>

            {/* Product Options */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                ⚙️ Product Options
              </h2>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-0.5"
                    checked={formData.inStock}
                    onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                  />
                  <div>
                    <p className="font-medium text-gray-900">In Stock</p>
                    <p className="text-sm text-gray-600">Product is available for purchase</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-0.5"
                    checked={formData.allowSubscription}
                    onChange={(e) => setFormData({ ...formData, allowSubscription: e.target.checked })}
                  />
                  <div>
                    <p className="font-medium text-gray-900">Allow Subscription</p>
                    <p className="text-sm text-gray-600">
                      Customers can subscribe to this product for recurring deliveries
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Preview & Actions */}
          <div className="space-y-6">
            {/* Product Preview */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                👁️ Preview
              </h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                  <div className="text-6xl">📦</div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {formData.name || 'Product Name'}
                </h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {formData.description || 'Product description...'}
                </p>
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-bold text-primary-600">
                    {formatCurrency(calculatePriceWithTax())}
                  </p>
                  <p className="text-xs text-gray-500">
                    per {formData.quantity} {formData.unit}
                  </p>
                </div>
                {formData.allowSubscription && (
                  <div className="mt-2 bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded inline-block">
                    📅 Subscription Available
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                💾 Save Product
              </h2>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={saving}
                className="btn-primary w-full mb-3"
              >
                {saving ? 'Creating Product...' : '✅ Create Product'}
              </button>
              <Link
                href="/dashboard/inventory"
                className="block text-center btn-secondary w-full"
              >
                Cancel
              </Link>
            </div>

            {/* Help */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Quick Tips</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Use clear, descriptive product names</li>
                <li>• Add detailed descriptions for better customer understanding</li>
                <li>• Set appropriate tax rates (CGST + SGST)</li>
                <li>• Enable subscriptions for regularly ordered items</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}