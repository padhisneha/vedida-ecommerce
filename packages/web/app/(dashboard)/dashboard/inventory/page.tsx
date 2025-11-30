// packages/web/app/(dashboard)/dashboard/inventory/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getAllProducts,
  Product,
  ProductCategory,
  formatCurrency,
  getProductEmoji,
  initialCapital,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock'| 'out_of_stock'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await getAllProducts();
      setProducts(data);
      console.log('✅ Loaded products:', data.length);
    } catch (error) {
      console.error('Error loading products:', error);
      showToast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProducts = () => {
    let filtered = [...products];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((product) => product.category === categoryFilter);
    }

    // Filter by stock status
    if (stockFilter === 'in_stock') {
      filtered = filtered.filter((product) => product.availableStock > 0);
    } else if (stockFilter === 'low_stock') {
      filtered = filtered.filter((product) => product.availableStock > 0 && product.availableStock <= product.lowStockThreshold);
    } else if (stockFilter === 'out_of_stock') {
      filtered = filtered.filter((product) => product.availableStock <= 0);
    }

    // Sort by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    return filtered;
  };

  const getPaginatedProducts = () => {
    const filtered = getFilteredProducts();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(getFilteredProducts().length / itemsPerPage);
  };

  const getInStockProducts = () => {
    return products.filter((p) => p.availableStock > 0).length;
  };

  const getLowStockProducts = () => {
    return products.filter((p) => p.availableStock > 0 && p.availableStock <= p.lowStockThreshold).length;
  };

  const getOutOfStockProducts = () => {
    return products.filter((p) => p.availableStock === 0).length;
  };

  const getSubscriptionProducts = () => {
    return products.filter((p) => p.allowSubscription).length;
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, stockFilter]);

  const paginatedProducts = getPaginatedProducts();
  const totalPages = getTotalPages();
  const filteredCount = getFilteredProducts().length;

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">🏪</div>
          <div className="text-lg text-gray-600">Loading inventory...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-2">Manage products and stock levels</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/inventory/sync" className="btn-secondary flex items-center gap-2">
            <span>🔄</span>
            <span>Reconcile Stock</span>
          </Link>
          <Link href="/dashboard/inventory/new" className="btn-primary flex items-center gap-2">
            <span>➕</span>
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Total Products</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {products.length}
              </p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">In Stock</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {getInStockProducts()}
              </p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">Low Stock Alert</p>
              <p className="text-3xl font-bold text-yellow-900 mt-1">
                {getLowStockProducts()}
              </p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800">Out of Stock</p>
              <p className="text-3xl font-bold text-red-900 mt-1">
                {getOutOfStockProducts()}
              </p>
            </div>
            <div className="text-4xl">❌</div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-800">Subscription Items</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">
                {getSubscriptionProducts()}
              </p>
            </div>
            <div className="text-4xl">📅</div>
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
              placeholder="Search products..."
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

        {/* Category Filter */}
        <select
          className="input w-full sm:w-48"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ProductCategory | 'all')}
        >
          <option value="all">All Categories</option>
          {Object.values(ProductCategory).map((cat) => (
            <option key={cat} value={cat}>
                {initialCapital(cat).replace('_', ' ')}
            </option>
          ))}
        </select>

        {/* Stock Filter */}
        <select
          className="input w-full sm:w-48"
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as 'all' | 'in_stock' | 'low_stock' | 'out_of_stock')}
        >
          <option value="all">All Stock Status</option>
          <option value="in_stock">✅ In Stock</option>
          <option value="low_stock">⚠️ Low Stock</option>
          <option value="out_of_stock">❌ Out of Stock</option>
        </select>
      </div>

      {/* Products Grid */}
      {paginatedProducts.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No products found
          </h3>
          <p className="text-gray-600">
            {searchQuery || categoryFilter !== 'all' || stockFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Start by adding your first product'}
          </p>
          {(searchQuery || categoryFilter !== 'all' || stockFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setStockFilter('all');
              }}
              className="btn-secondary mt-4"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Results count */}
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredCount} product{filteredCount !== 1 ? 's' : ''}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedProducts.map((product) => (
              <Link
                key={product.id}
                href={`/dashboard/inventory/${product.id}`}
                className="card hover:shadow-md transition-shadow p-0 overflow-hidden group"
              >
                {/* Product Image */}
                <div className="h-48 bg-gray-100 flex items-center justify-center relative">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-6xl"> {getProductEmoji(product.category)}</div>
                  )}
                  {/* Stock Badges - UPDATE THIS SECTION */}
                  {product.availableStock === 0 ? (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                      Out of Stock
                    </div>
                  ) : product.availableStock <= product.lowStockThreshold ? (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                      ⚠️ Low Stock
                    </div>
                  ) : null}
                  {product.allowSubscription && (
                    <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                      📅 Subscription
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary-600">
                        {formatCurrency(product.price)} &nbsp;&nbsp;
                        {(product.taxCGST > 0 || product.taxSGST > 0) && (
                          <span className="mt-2 text-xs text-gray-500">
                            Incl. {product.taxCGST + product.taxSGST}% GST
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        &nbsp;
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs uppercase font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {product.quantity} {product.unit}
                      </span>
                    </div>
                  </div>

                  {/* Stock Info Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="text-xs text-gray-600">In Stock:</span>
                    <span className={`text-xs font-semibold ${
                      product.availableStock === 0 ? 'text-red-600' :
                      product.availableStock <= product.lowStockThreshold ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {product.availableStock} units
                    </span>
                  </div>

                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
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
                products
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