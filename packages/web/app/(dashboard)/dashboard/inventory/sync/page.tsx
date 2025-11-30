// packages/web/app/(dashboard)/dashboard/inventory/sync/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllProducts,
  getStockMovementsByProduct,
  adjustStock,
  Product,
  StockMovement,
  formatCurrency,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

interface ReconciliationResult {
  productId: string;
  productName: string;
  actualStock: number;
  calculatedStock: number;
  difference: number;
  status: 'synced' | 'mismatch' | 'no_movements';
  movementCount: number;
  details: string;
}

export default function StockReconciliationPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [results, setResults] = useState<ReconciliationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingProduct, setAnalyzingProduct] = useState<string | null>(null);
  const [fixing, setFixing] = useState<string | null>(null);
  const [showMismatchOnly, setShowMismatchOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

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

  const analyzeProduct = async (product: Product): Promise<ReconciliationResult> => {
    console.log('\n=== ANALYZING PRODUCT ===');
    console.log('Product ID:', product.id);
    console.log('Product Name:', product.name);
    console.log('Actual Stock (from product):', product.availableStock);
    
    try {
      // Get all stock movements for this product
      const movements = await getStockMovementsByProduct(product.id, 9999);
      
      console.log('Total Movements Found:', movements.length);
      
      if (movements.length === 0) {
        console.log('⚠️ No movements found for this product');
        console.log('This could mean:');
        console.log('  1. Product was created without initial stock movement');
        console.log('  2. Product was created before stock tracking was implemented');
        console.log('Result: Treating current stock as baseline (synced)');
        
        return {
          productId: product.id,
          productName: product.name,
          actualStock: product.availableStock || 0,
          calculatedStock: product.availableStock || 0,
          difference: 0,
          status: 'no_movements',
          movementCount: 0,
          details: 'No movements recorded - baseline stock',
        };
      }
      
      console.log('\nMovement Breakdown:');
      console.log('-------------------');
      
      let runningTotal = 0;
      const movementDetails: string[] = [];
      
      // Process movements in chronological order (oldest first) for better understanding
      const chronologicalMovements = [...movements].reverse();
      
      chronologicalMovements.forEach((movement, index) => {
        const qty = typeof movement.quantity === 'number' ? movement.quantity : 0;
        runningTotal += qty;
        
        console.log(`${index + 1}. ${movement.type.toUpperCase()}`);
        console.log(`   Quantity: ${qty > 0 ? '+' : ''}${qty}`);
        console.log(`   Reason: ${movement.reason}`);
        console.log(`   Previous: ${movement.previousStock} → New: ${movement.newStock}`);
        console.log(`   Running Total: ${runningTotal}`);
        console.log(`   Timestamp: ${movement.createdAt.toDate().toLocaleString()}`);
        
        movementDetails.push(
          `${movement.type}: ${qty > 0 ? '+' : ''}${qty} (${movement.reason})`
        );
      });
      
      const calculatedStock = runningTotal;
      const actualStock = product.availableStock || 0;
      const difference = actualStock - calculatedStock;
      
      console.log('\n=== CALCULATION SUMMARY ===');
      console.log('Sum of all movements:', calculatedStock);
      console.log('Actual stock in product:', actualStock);
      console.log('Difference:', difference);
      
      if (difference !== 0) {
        console.log('⚠️ MISMATCH DETECTED!');
        if (difference > 0) {
          console.log(`  → Actual is ${difference} units HIGHER than calculated`);
          console.log('  Possible causes:');
          console.log('    - Stock added without recording movement');
          console.log('    - Movement quantity recorded incorrectly');
        } else {
          console.log(`  → Actual is ${Math.abs(difference)} units LOWER than calculated`);
          console.log('  Possible causes:');
          console.log('    - Stock removed without recording movement');
          console.log('    - Order created but stock reduction failed');
          console.log('    - Physical loss not recorded');
        }
      } else {
        console.log('✅ Stock is in sync!');
      }
      
      console.log('========================\n');

      return {
        productId: product.id,
        productName: product.name,
        actualStock,
        calculatedStock,
        difference,
        status: difference === 0 ? 'synced' : 'mismatch',
        movementCount: movements.length,
        details: movementDetails.slice(0, 3).join('; ') + 
                (movementDetails.length > 3 ? `... +${movementDetails.length - 3} more` : ''),
      };
    } catch (error: any) {
      console.error(`❌ Error analyzing ${product.name}:`, error);
      console.error('Error details:', error.message);
      
      return {
        productId: product.id,
        productName: product.name,
        actualStock: product.availableStock || 0,
        calculatedStock: 0,
        difference: product.availableStock || 0,
        status: 'mismatch',
        movementCount: 0,
        details: `Error: ${error.message}`,
      };
    }
  };

  const analyzeAllProducts = async () => {
    if (products.length === 0) {
      showToast.error('No products to analyze');
      return;
    }

    setAnalyzing(true);
    const toastId = showToast.loading(`Analyzing ${products.length} products...`);
    
    try {
      const reconciliationResults: ReconciliationResult[] = [];

      for (const product of products) {
        const result = await analyzeProduct(product);
        reconciliationResults.push(result);
      }

      setResults(reconciliationResults);
      
      const mismatchCount = reconciliationResults.filter(r => r.status === 'mismatch').length;
      const noMovementCount = reconciliationResults.filter(r => r.status === 'no_movements').length;
      
      showToast.dismiss(toastId);
      
      console.log('\n=== ANALYSIS COMPLETE ===');
      console.log('Total Products:', reconciliationResults.length);
      console.log('In Sync:', reconciliationResults.filter(r => r.status === 'synced').length);
      console.log('Mismatches:', mismatchCount);
      console.log('No Movements:', noMovementCount);
      console.log('========================\n');
      
      if (mismatchCount === 0) {
        showToast.success(`✅ All products are in sync! ${noMovementCount > 0 ? `(${noMovementCount} with no movements)` : ''}`);
      } else {
        showToast.error(`⚠️ Found ${mismatchCount} product(s) with stock mismatch`);
      }
    } catch (error) {
      console.error('Error analyzing products:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to analyze stock');
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeSingleProduct = async () => {
    if (selectedProduct === 'all') {
      showToast.error('Please select a specific product');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) {
      showToast.error('Product not found');
      return;
    }

    setAnalyzingProduct(selectedProduct);
    const toastId = showToast.loading(`Analyzing ${product.name}...`);

    try {
      const result = await analyzeProduct(product);
      
      // Update or add result
      setResults(prevResults => {
        const existingIndex = prevResults.findIndex(r => r.productId === product.id);
        if (existingIndex >= 0) {
          const newResults = [...prevResults];
          newResults[existingIndex] = result;
          return newResults;
        } else {
          return [...prevResults, result];
        }
      });

      showToast.dismiss(toastId);
      
      if (result.status === 'synced' || result.status === 'no_movements') {
        showToast.success(`✅ ${product.name} is in sync!`);
      } else {
        showToast.error(`⚠️ Mismatch found: Difference of ${result.difference} units`);
      }
    } catch (error) {
      console.error('Error analyzing product:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to analyze product');
    } finally {
      setAnalyzingProduct(null);
    }
  };

  const handleFix = async (result: ReconciliationResult) => {
    if (!user?.id || !user?.name) {
      showToast.error('Admin user information not available');
      return;
    }

    const confirmMessage = result.difference > 0
      ? `Stock Adjustment Required\n\n` +
        `Product: ${result.productName}\n` +
        `Current Stock: ${result.actualStock} units\n` +
        `Expected Stock: ${result.calculatedStock} units\n` +
        `Difference: +${result.difference} units (EXCESS)\n\n` +
        `This will REDUCE stock by ${result.difference} units to match movement history.\n\n` +
        `Are you sure?`
      : `Stock Adjustment Required\n\n` +
        `Product: ${result.productName}\n` +
        `Current Stock: ${result.actualStock} units\n` +
        `Expected Stock: ${result.calculatedStock} units\n` +
        `Difference: ${result.difference} units (SHORTAGE)\n\n` +
        `This will ADD ${Math.abs(result.difference)} units to match movement history.\n\n` +
        `Are you sure?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setFixing(result.productId);
    const toastId = showToast.loading('Fixing stock mismatch...');

    try {
      await adjustStock(
        result.productId,
        result.calculatedStock,
        user.id,
        user.name,
        `Automatic reconciliation - Fixed stock mismatch. Previous: ${result.actualStock}, Calculated from movements: ${result.calculatedStock}, Difference: ${result.difference}`
      );

      showToast.dismiss(toastId);
      showToast.success(`✅ Stock fixed for ${result.productName}`);

      // Reload products and re-analyze this product
      await loadProducts();
      
      // Find and re-analyze the fixed product
      const product = products.find(p => p.id === result.productId);
      if (product) {
        const updatedResult = await analyzeProduct(product);
        setResults(prevResults => 
          prevResults.map(r => r.productId === result.productId ? updatedResult : r)
        );
      }
    } catch (error: any) {
      console.error('Error fixing stock:', error);
      showToast.dismiss(toastId);
      showToast.error(error.message || 'Failed to fix stock');
    } finally {
      setFixing(null);
    }
  };

  const handleFixAll = async () => {
    if (!user?.id || !user?.name) {
      showToast.error('Admin user information not available');
      return;
    }

    const mismatches = results.filter(r => r.status === 'mismatch');
    
    if (mismatches.length === 0) {
      showToast.error('No mismatches to fix');
      return;
    }

    const totalAdjustments = mismatches.reduce((sum, r) => sum + Math.abs(r.difference), 0);

    if (!confirm(
      `Fix All Stock Mismatches?\n\n` +
      `This will adjust ${mismatches.length} product(s).\n` +
      `Total adjustments: ${totalAdjustments} units\n\n` +
      `This action cannot be undone. Continue?`
    )) {
      return;
    }

    setAnalyzing(true);
    const toastId = showToast.loading(`Fixing ${mismatches.length} products...`);

    let fixed = 0;
    let failed = 0;

    for (const result of mismatches) {
      try {
        await adjustStock(
          result.productId,
          result.calculatedStock,
          user.id,
          user.name,
          `Bulk reconciliation - Fixed stock mismatch. Previous: ${result.actualStock}, Calculated: ${result.calculatedStock}`
        );
        fixed++;
      } catch (error) {
        console.error(`Failed to fix ${result.productName}:`, error);
        failed++;
      }
    }

    showToast.dismiss(toastId);
    
    if (failed === 0) {
      showToast.success(`✅ All ${fixed} products fixed successfully!`);
    } else {
      showToast.error(`⚠️ Fixed ${fixed}, Failed ${failed}`);
    }

    // Reload and re-analyze
    await loadProducts();
    await analyzeAllProducts();
    setAnalyzing(false);
  };

  const filteredResults = showMismatchOnly
    ? results.filter(r => r.status === 'mismatch')
    : results;

  const mismatchCount = results.filter(r => r.status === 'mismatch').length;
  const syncedCount = results.filter(r => r.status === 'synced').length;
  const noMovementCount = results.filter(r => r.status === 'no_movements').length;

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">🔄</div>
          <div className="text-lg text-gray-600">Loading...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Stock Reconciliation</h1>
            <p className="text-gray-600 mt-2">
              Verify and fix stock discrepancies across products
            </p>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-3xl">⚠️</span>
          <div className="flex-1">
            <h3 className="font-bold text-yellow-900 mb-2">Admin Tool - Use with Caution</h3>
            <p className="text-sm text-yellow-800 leading-relaxed">
              This tool compares actual stock levels with calculated stock from movement history. 
              Use this only if you suspect stock discrepancies or after system issues. 
              All fixes are logged in stock movement history. Check browser console for detailed logs.
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">📖 How It Works</h2>
        <ol className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="font-bold text-primary-600">1.</span>
            <span>Select a product or choose "All Products"</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary-600">2.</span>
            <span>Click "Analyze" to scan inventory and check console for detailed logs</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary-600">3.</span>
            <span>Review products with mismatches (if any)</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary-600">4.</span>
            <span>Fix individual products or use "Fix All" for bulk correction</span>
          </li>
        </ol>
      </div>

      {/* Product Selection & Analysis */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">🔍 Select & Analyze</h2>
        
        <div className="flex flex-wrap gap-3 items-end">
          {/* Product Selector */}
          <div className="flex-1 min-w-[300px]">
            <label className="label">Select Product</label>
            <select
              className="input"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              disabled={analyzing || analyzingProduct !== null}
            >
              <option value="all">All Products ({products.length})</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} {product.quantity} {product.unit} (Stock: {product.availableStock || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Analyze Button */}
          <button
            onClick={selectedProduct === 'all' ? analyzeAllProducts : analyzeSingleProduct}
            disabled={analyzing || analyzingProduct !== null || products.length === 0}
            className="btn-primary flex items-center gap-2 px-6"
          >
            {(analyzing || analyzingProduct !== null) ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>
                  {selectedProduct === 'all' 
                    ? `Analyze All (${products.length})` 
                    : 'Analyze Selected'}
                </span>
              </>
            )}
          </button>

          {/* Fix All Button */}
          {results.length > 0 && mismatchCount > 0 && (
            <button
              onClick={handleFixAll}
              disabled={analyzing || fixing !== null || analyzingProduct !== null}
              className="btn-danger flex items-center gap-2 px-6"
            >
              <span>🔧</span>
              <span>Fix All Mismatches ({mismatchCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800">Total Analyzed</p>
            <p className="text-3xl font-bold text-blue-900 mt-1">
              {results.length}
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-800">In Sync</p>
            <p className="text-3xl font-bold text-green-900 mt-1">
              {syncedCount}
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800">Mismatches</p>
            <p className="text-3xl font-bold text-red-900 mt-1">
              {mismatchCount}
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-800">No Movements</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {noMovementCount}
            </p>
          </div>
        </div>
      )}

      {/* Filter Toggle */}
      {results.length > 0 && (
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="w-4 h-4 text-primary-600 rounded"
              checked={showMismatchOnly}
              onChange={(e) => setShowMismatchOnly(e.target.checked)}
            />
            <span className="text-sm text-gray-700">Show mismatches only</span>
          </label>
        </div>
      )}

      {/* Results Table */}
      {results.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Ready to Analyze
          </h3>
          <p className="text-gray-600 mb-6">
            Select a product or choose "All Products" and click Analyze
          </p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Mismatches Found
          </h3>
          <p className="text-gray-600">
            {showMismatchOnly 
              ? 'All analyzed products are in sync!' 
              : 'No products to display with current filter'}
          </p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Movements
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actual Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Calculated Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Difference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredResults.map((result) => (
                  <tr 
                    key={result.productId} 
                    className={`transition-colors ${
                      result.status === 'mismatch' ? 'bg-red-50 hover:bg-red-100' : 
                      result.status === 'no_movements' ? 'bg-gray-50 hover:bg-gray-100' :
                      'hover:bg-gray-50'
                    }`}
                  >
                    {/* Product Name */}
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/inventory/${result.productId}`}
                        className="font-medium text-gray-900 hover:text-primary-600"
                      >
                        {result.productName}
                      </Link>
                      {result.details && (
                        <p className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={result.details}>
                          {result.details}
                        </p>
                      )}
                    </td>

                    {/* Movement Count */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {result.movementCount}
                      </span>
                    </td>

                    {/* Actual Stock */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-semibold text-gray-900">
                        {result.actualStock}
                      </span>
                    </td>

                    {/* Calculated Stock */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-semibold text-blue-700">
                        {result.calculatedStock}
                      </span>
                    </td>

                    {/* Difference */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.difference === 0 ? (
                        <span className="text-green-600 font-semibold">0</span>
                      ) : (
                        <div>
                          <span className={`text-xl font-bold ${
                            result.difference > 0 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {result.difference > 0 ? '+' : ''}{result.difference}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {result.difference > 0 ? 'Excess' : 'Shortage'}
                          </p>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.status === 'synced' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <span>✅</span>
                          <span>In Sync</span>
                        </span>
                      ) : result.status === 'no_movements' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <span>ℹ️</span>
                          <span>No Movements</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <span>⚠️</span>
                          <span>Mismatch</span>
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.status === 'mismatch' ? (
                        <button
                          onClick={() => handleFix(result)}
                          disabled={fixing !== null}
                          className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          {fixing === result.productId ? (
                            <span className="flex items-center gap-1">
                              <span className="animate-spin">⏳</span>
                              <span>Fixing...</span>
                            </span>
                          ) : (
                            '🔧 Fix'
                          )}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredResults.length} product{filteredResults.length !== 1 ? 's' : ''}
              {showMismatchOnly && ' with mismatches'}
            </p>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="card mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">❓ Understanding Results</h2>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="font-semibold text-green-900 mb-1">
              ✅ In Sync
            </p>
            <p>
              Actual stock matches the sum of all stock movements. Everything is correct.
            </p>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="font-semibold text-gray-900 mb-1">
              ℹ️ No Movements
            </p>
            <p>
              No stock movements recorded for this product. This is normal for products created before 
              stock tracking was implemented, or if initial stock movement wasn't recorded. 
              Current stock is treated as baseline.
            </p>
          </div>

          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="font-semibold text-orange-900 mb-1">
              Positive Difference (Excess Stock)
            </p>
            <p>
              Actual stock is higher than calculated. Possible causes:
            </p>
            <ul className="list-disc ml-5 mt-1 text-xs">
              <li>Stock was manually added without recording movement</li>
              <li>Order was cancelled but stock wasn't restored</li>
              <li>Initial stock was set incorrectly</li>
            </ul>
          </div>

          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="font-semibold text-red-900 mb-1">
              Negative Difference (Stock Shortage)
            </p>
            <p>
              Actual stock is lower than calculated. Possible causes:
            </p>
            <ul className="list-disc ml-5 mt-1 text-xs">
              <li>Stock was reduced manually without recording</li>
              <li>Physical inventory loss or damage not recorded</li>
              <li>Order was created and stock reduced, but order was then deleted</li>
            </ul>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="font-semibold text-blue-900 mb-1">
              💡 Debugging Tips
            </p>
            <ul className="list-disc ml-5 mt-1 text-xs text-blue-800">
              <li>Open browser console (F12) to see detailed calculation logs</li>
              <li>Check the "View Stock History" link for each product to see all movements</li>
              <li>Run reconciliation weekly to catch issues early</li>
              <li>Always investigate root cause before fixing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}