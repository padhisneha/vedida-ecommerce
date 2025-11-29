// packages/web/app/(dashboard)/dashboard/inventory/[id]/movements/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getProductById,
  getStockMovementsByProduct,
  getProductStockStats,
  Product,
  StockMovement,
  StockMovementType,
  formatDateTime,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

export default function StockMovementsPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stats, setStats] = useState<{
    totalIn: number;
    totalOut: number;
    totalAdjustments: number;
    currentStock: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | StockMovementType>('all');

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      const [productData, movementsData, statsData] = await Promise.all([
        getProductById(params.id),
        getStockMovementsByProduct(params.id, 100),
        getProductStockStats(params.id),
      ]);

      setProduct(productData);
      setMovements(movementsData);
      setStats(statsData);
      
      console.log('✅ Loaded stock movements:', movementsData.length);
    } catch (error) {
      console.error('Error loading stock movements:', error);
      showToast.error('Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredMovements = () => {
    if (filterType === 'all') {
      return movements;
    }
    return movements.filter((m) => m.type === filterType);
  };

  const getTypeLabel = (type: StockMovementType) => {
    const labels = {
      [StockMovementType.IN]: 'Stock In',
      [StockMovementType.OUT]: 'Stock Out',
      [StockMovementType.ADJUSTMENT]: 'Adjustment',
    };
    return labels[type];
  };

  const getTypeColor = (type: StockMovementType) => {
    const colors = {
      [StockMovementType.IN]: 'text-green-700 bg-green-100',
      [StockMovementType.OUT]: 'text-red-700 bg-red-100',
      [StockMovementType.ADJUSTMENT]: 'text-blue-700 bg-blue-100',
    };
    return colors[type];
  };

  const getTypeIcon = (type: StockMovementType) => {
    const icons = {
      [StockMovementType.IN]: '📥',
      [StockMovementType.OUT]: '📤',
      [StockMovementType.ADJUSTMENT]: '⚙️',
    };
    return icons[type];
  };

  const filteredMovements = getFilteredMovements();

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">📊</div>
          <div className="text-lg text-gray-600">Loading stock movements...</div>
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
          href={`/dashboard/inventory/${params.id}`}
          className="text-primary-600 hover:text-primary-700 font-medium text-sm mb-4 inline-flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to Product</span>
        </Link>
        
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Stock Movement History</h1>
          <p className="text-gray-600 mt-2">{product.name} ({product.quantity} {product.unit})</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 mb-1">Current Stock</p>
            <p className="text-3xl font-bold text-blue-900">{stats.currentStock}</p>
            <p className="text-xs text-blue-600 mt-1">units</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-800 mb-1">Total Stock In</p>
            <p className="text-3xl font-bold text-green-900">+{stats.totalIn}</p>
            <p className="text-xs text-green-600 mt-1">units added</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800 mb-1">Total Stock Out</p>
            <p className="text-3xl font-bold text-red-900">-{stats.totalOut}</p>
            <p className="text-xs text-red-600 mt-1">units sold</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-800 mb-1">Adjustments</p>
            <p className="text-3xl font-bold text-yellow-900">
              {stats.totalAdjustments > 0 ? '+' : ''}{stats.totalAdjustments}
            </p>
            <p className="text-xs text-yellow-600 mt-1">units adjusted</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filter by Type:</label>
        <select
          className="input py-2 px-3 text-sm w-48"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as 'all' | StockMovementType)}
        >
          <option value="all">All Movements</option>
          <option value={StockMovementType.IN}>📥 Stock In</option>
          <option value={StockMovementType.OUT}>📤 Stock Out</option>
          <option value={StockMovementType.ADJUSTMENT}>⚙️ Adjustments</option>
        </select>
        
        {filterType !== 'all' && (
          <button
            onClick={() => setFilterType('all')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            ✕ Clear Filter
          </button>
        )}
      </div>

      {/* Movements List */}
      {filteredMovements.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No stock movements yet
          </h3>
          <p className="text-gray-600">
            {filterType !== 'all' 
              ? `No ${getTypeLabel(filterType)} movements found`
              : 'Stock movements will appear here as they occur'}
          </p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stock Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                    {/* Date & Time */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDateTime(movement.createdAt)}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(movement.type)}`}>
                        <span>{getTypeIcon(movement.type)}</span>
                        <span>{getTypeLabel(movement.type)}</span>
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-lg font-bold ${
                        movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </span>
                    </td>

                    {/* Stock Level */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="text-gray-500">{movement.previousStock}</span>
                        <span className="text-gray-400 mx-1">→</span>
                        <span className="font-semibold text-gray-900">{movement.newStock}</span>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {movement.reason}
                      </div>
                      {movement.referenceId && (
                        <div className="text-xs text-gray-500 mt-1">
                          {movement.referenceType === 'order' && (
                            <Link
                              href={`/dashboard/orders/${movement.referenceId}`}
                              className="text-primary-600 hover:text-primary-700"
                            >
                              View Order →
                            </Link>
                          )}
                          {movement.referenceType === 'subscription' && (
                            <Link
                              href={`/dashboard/subscriptions/${movement.referenceId}`}
                              className="text-primary-600 hover:text-primary-700"
                            >
                              View Subscription →
                            </Link>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Created By */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {movement.createdByName || 'Unknown'}
                      </div>
                      {movement.createdBy !== 'system' && (
                        <div className="text-xs text-gray-500">
                          {movement.createdBy.slice(0, 8)}...
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {filteredMovements.length} movement{filteredMovements.length !== 1 ? 's' : ''}
              {filterType !== 'all' && ` (${getTypeLabel(filterType)} only)`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}