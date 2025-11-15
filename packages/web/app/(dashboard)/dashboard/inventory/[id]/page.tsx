'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getProductById,
  updateProduct,
  deleteProduct,
  Product,
  ProductCategory,
  ProductUnit,
  formatCurrency,
  formatDate,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: ProductCategory.MILK,
    priceExcludingTax: 0,
    taxCGST: 0,
    taxSGST: 0,
    price: 0,
    unit: ProductUnit.LITER,
    quantity: 0,
    inStock: true,
    allowSubscription: false,
  });

  useEffect(() => {
    loadProduct();
  }, [params.id]);

  const loadProduct = async () => {
    try {
      const data = await getProductById(params.id);
      if (data) {
        setProduct(data);
        setFormData({
          name: data.name,
          description: data.description,
          category: data.category,
          priceExcludingTax: data.priceExcludingTax,
          taxCGST: data.taxCGST,
          taxSGST: data.taxSGST,
          price: data.price,
          unit: data.unit,
          quantity: data.quantity,
          inStock: data.inStock,
          allowSubscription: data.allowSubscription,
        });
      }
    } catch (error) {
      console.error('Error loading product:', error);
      showToast.error('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const calculatePriceWithTax = () => {
    const tax = (formData.priceExcludingTax * (formData.taxCGST + formData.taxSGST)) / 100;
    return formData.priceExcludingTax + tax;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) return;

    if (!formData.name.trim()) {
        showToast.error('Please enter product name');
        return;
    }

    setSaving(true);
    const toastId = showToast.loading('Saving product...');
    
    try {
        const calculatedPrice = calculatePriceWithTax();

        // Upload image if new image is selected
        let imageUrl = product.imageUrl;
        if (imageFile) {
        showToast.loading('Uploading image...', { id: toastId });
        const uploadedUrl = await handleImageUpload();
        if (uploadedUrl) {
            imageUrl = uploadedUrl;
        }
        }

        const updateData: any = {
        ...formData,
        price: calculatedPrice,
        };

        if (imageUrl) {
        updateData.imageUrl = imageUrl;
        }

        showToast.loading('Updating product details...', { id: toastId });
        await updateProduct(product.id, updateData);

        showToast.dismiss(toastId);
        showToast.success('Product updated successfully!');
        
        setEditing(false);
        setImageFile(null);
        setImagePreview(null);
        await loadProduct();
    } catch (error: any) {
        console.error('Error updating product:', error);
        showToast.dismiss(toastId);
        showToast.error(`Failed to update product: ${error.message || 'Unknown error'}`);
    } finally {
        setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;

    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
        return;
    }

    setSaving(true);
    const toastId = showToast.loading('Deleting product...');
    
    try {
        // Delete image first if exists
        if (product.imageUrl) {
        const { deleteImage } = await import('@ecommerce/shared');
        await deleteImage(product.imageUrl);
        }
        
        await deleteProduct(product.id);
        showToast.dismiss(toastId);
        showToast.success('Product deleted successfully!');
        router.push('/dashboard/inventory');
    } catch (error: any) {
        console.error('Error deleting product:', error);
        showToast.dismiss(toastId);
        showToast.error('Failed to delete product');
        setSaving(false);
    }
  };

  const handleToggleStock = async () => {
    if (!product) return;

    setSaving(true);
    const toastId = showToast.loading('Updating stock status...');
    
    try {
        await updateProduct(product.id, {
        inStock: !product.inStock,
        });
        
        showToast.dismiss(toastId);
        showToast.success(`Product marked as ${!product.inStock ? 'in stock' : 'out of stock'}!`);
        await loadProduct();
    } catch (error) {
        console.error('Error toggling stock:', error);
        showToast.dismiss(toastId);
        showToast.error('Failed to update stock status');
    } finally {
        setSaving(false);
    }
  };

  const handleImageUpload = async (): Promise<string | null> => {
    if (!imageFile || !product) return null;

    setUploadingImage(true);
    try {
        console.log('📤 Starting image upload...');
        
        const { uploadImage, generateProductImagePath, deleteImage } = await import('@ecommerce/shared');
        
        // Delete old image if exists
        if (product.imageUrl) {
            console.log('🗑️ Deleting old image...');
            try {
                await deleteImage(product.imageUrl);
            } catch (error) {
                console.warn('⚠️ Could not delete old image:', error);
            }
        }

        // Upload new image
        const path = generateProductImagePath(product.id, imageFile.name);
        console.log('Upload path:', path);
        
        const downloadURL = await uploadImage(imageFile, path);
        
        console.log('✅ Image uploaded:', downloadURL);
        return downloadURL;
    } catch (error: any) {
        console.error('❌ Image upload error:', error);
        showToast.error(`Image upload failed: ${error.message}`);
        return null;
    } finally {
        setUploadingImage(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">📦</div>
          <div className="text-lg text-gray-600">Loading product...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h2>
          <Link href="/dashboard/inventory" className="btn-primary">
            ← Back to Inventory
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
          href="/dashboard/inventory"
          className="text-primary-600 hover:text-primary-700 font-medium text-sm mb-4 inline-flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to Inventory</span>
        </Link>
        
        <div className="flex items-start justify-between mt-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600 mt-2">
              Added on {formatDate(product.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <span>✏️</span>
                  <span>Edit Product</span>
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="btn-danger"
                >
                  🗑️
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
                      name: product.name,
                      description: product.description,
                      category: product.category,
                      priceExcludingTax: product.priceExcludingTax,
                      taxCGST: product.taxCGST,
                      taxSGST: product.taxSGST,
                      price: product.price,
                      unit: product.unit,
                      quantity: product.quantity,
                      inStock: product.inStock,
                      allowSubscription: product.allowSubscription,
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product Details */}
        <div className="lg:col-span-2 space-y-6">
          {editing ? (
            /* Edit Form */
            <form onSubmit={handleSave} className="space-y-6">
              {/* Basic Info */}
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
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Category *</label>
                      <select
                        className="input"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                      >
                        <option value={ProductCategory.MILK}>Milk</option>
                        <option value={ProductCategory.CURD}>Curd</option>
                        <option value={ProductCategory.GHEE}>Ghee</option>
                        <option value={ProductCategory.PANEER}>Paneer</option>
                        <option value={ProductCategory.BUTTER}>Butter</option>
                        <option value={ProductCategory.BUTTERMILK}>Buttermilk</option>
                        <option value={ProductCategory.OTHER}>Other</option>
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
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      e.g., 1 for 1 liter, 500 for 500 grams
                    </p>
                  </div>
                </div>
              </div>

              {/* Product Image Upload */}
              <div className="card">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                    🖼️ Product Image
                </h2>
                <div className="space-y-4">
                    {/* Image Preview */}
                    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {imagePreview ? (
                        <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        />
                    ) : product.imageUrl ? (
                        <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-8xl">📦</div>
                    )}
                    </div>

                    {/* File Input */}
                    <div>
                    <label className="label">Upload New Image</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary-50 file:text-primary-700
                        hover:file:bg-primary-100
                        cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, JPEG up to 5MB
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
                        ✕ Remove Selected Image
                    </button>
                    )}
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
                      value={formData.priceExcludingTax}
                      onChange={(e) => setFormData({ ...formData, priceExcludingTax: parseFloat(e.target.value) })}
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
                        value={formData.taxCGST}
                        onChange={(e) => setFormData({ ...formData, taxCGST: parseFloat(e.target.value) })}
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
                        value={formData.taxSGST}
                        onChange={(e) => setFormData({ ...formData, taxSGST: parseFloat(e.target.value) })}
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-primary-900">
                        Final Price (Including Tax)
                      </span>
                      <span className="text-2xl font-bold text-primary-700">
                        {formatCurrency(calculatePriceWithTax())}
                      </span>
                    </div>
                    <p className="text-xs text-primary-700 mt-2">
                      Tax: {formatCurrency(calculatePriceWithTax() - formData.priceExcludingTax)} 
                      ({formData.taxCGST + formData.taxSGST}%)
                    </p>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="card">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  ⚙️ Product Options
                </h2>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      checked={formData.inStock}
                      onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                    />
                    <div>
                      <p className="font-medium text-gray-900">In Stock</p>
                      <p className="text-sm text-gray-600">Product is available for purchase</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      checked={formData.allowSubscription}
                      onChange={(e) => setFormData({ ...formData, allowSubscription: e.target.checked })}
                    />
                    <div>
                      <p className="font-medium text-gray-900">Allow Subscription</p>
                      <p className="text-sm text-gray-600">Customers can subscribe to this product</p>
                    </div>
                  </label>
                </div>
              </div>
            </form>
          ) : (
            /* View Mode */
            <>
              {/* Product Image */}
              <div className="card">
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-8xl">📦</div>
                  )}
                </div>
              </div>

              {/* Product Details */}
              <div className="card">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  📝 Product Details
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Description</p>
                    <p className="text-gray-900">{product.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Category</p>
                      <p className="text-gray-900 capitalize">{product.category}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Unit</p>
                      <p className="text-gray-900">
                        {product.quantity} {product.unit}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="card">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  💰 Pricing Details
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price (Excl. Tax)</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(product.priceExcludingTax)}
                    </span>
                  </div>
                  {product.taxCGST > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">CGST ({product.taxCGST}%)</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency((product.priceExcludingTax * product.taxCGST) / 100)}
                      </span>
                    </div>
                  )}
                  {product.taxSGST > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">SGST ({product.taxSGST}%)</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency((product.priceExcludingTax * product.taxSGST) / 100)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">Final Price (Incl. Tax)</span>
                      <span className="font-bold text-primary-600 text-2xl">
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Quick Actions & Info */}
        <div className="space-y-6">
          {!editing && (
            <>
              {/* Stock Status */}
              <div className="card">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  📊 Stock Status
                </h2>
                <div className={`p-4 rounded-lg border-2 mb-4 ${
                  product.inStock
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="text-center">
                    <div className="text-4xl mb-2">
                      {product.inStock ? '✅' : '❌'}
                    </div>
                    <p className={`font-semibold ${
                      product.inStock ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {product.inStock ? 'In Stock' : 'Out of Stock'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleStock}
                  disabled={saving}
                  className={`w-full ${
                    product.inStock ? 'btn-danger' : 'btn-primary'
                  }`}
                >
                  {saving
                    ? 'Updating...'
                    : product.inStock
                    ? '❌ Mark Out of Stock'
                    : '✅ Mark In Stock'}
                </button>
              </div>

              {/* Product Options */}
              <div className="card">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  ⚙️ Product Options
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      Subscription Enabled
                    </span>
                    <span className={`text-lg ${
                      product.allowSubscription ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {product.allowSubscription ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product ID */}
              <div className="card">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  🔑 Product Info
                </h2>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-600">Product ID</p>
                    <p className="text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded">
                      {product.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Created</p>
                    <p className="text-sm text-gray-900">
                      {formatDate(product.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Last Updated</p>
                    <p className="text-sm text-gray-900">
                      {formatDate(product.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}