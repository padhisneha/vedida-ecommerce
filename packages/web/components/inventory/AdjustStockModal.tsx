// packages/web/components/inventory/AdjustStockModal.tsx
'use client';

import { useState } from 'react';
import { adjustStock } from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  currentStock: number;
  adminId: string;
  adminName: string;
  onSuccess: () => void;
}

export default function AdjustStockModal({
  isOpen,
  onClose,
  productId,
  productName,
  currentStock,
  adminId,
  adminName,
  onSuccess,
}: AdjustStockModalProps) {
  const [newStock, setNewStock] = useState<string>(currentStock.toString());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newStockNum = parseInt(newStock);

    // Validations
    if (!newStock || isNaN(newStockNum)) {
      showToast.error('Please enter a valid stock quantity');
      return;
    }

    if (newStockNum < 0) {
      showToast.error('Stock cannot be negative');
      return;
    }

    if (newStockNum === currentStock) {
      showToast.error('New stock is same as current stock. No changes made.');
      return;
    }

    if (!reason.trim()) {
      showToast.error('Please enter a reason for stock adjustment');
      return;
    }

    if (reason.trim().length < 10) {
      showToast.error('Reason must be at least 10 characters for audit purposes');
      return;
    }

    // Confirm if large decrease
    const difference = newStockNum - currentStock;
    if (difference < -50) {
      if (!confirm(
        `⚠️ WARNING: You are reducing stock by ${Math.abs(difference)} units.\n\n` +
        `Current: ${currentStock} → New: ${newStockNum}\n\n` +
        `This is a significant decrease. Are you sure?`
      )) {
        return;
      }
    }

    setSaving(true);
    const toastId = showToast.loading('Adjusting stock...');

    try {
      await adjustStock(productId, newStockNum, adminId, adminName, reason.trim());

      showToast.dismiss(toastId);
      
      if (difference > 0) {
        showToast.success(`Stock increased by ${difference} units!`);
      } else {
        showToast.success(`Stock decreased by ${Math.abs(difference)} units!`);
      }

      // Reset form
      setNewStock(currentStock.toString());
      setReason('');
      
      // Notify parent
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      showToast.dismiss(toastId);
      showToast.error(error.message || 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setNewStock(currentStock.toString());
    setReason('');
    onClose();
  };

  const difference = (parseInt(newStock) || 0) - currentStock;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manual Stock Adjustment</h2>
            <p className="text-sm text-gray-600 mt-1">{productName}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-900">
                Use with Caution
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Manual adjustments bypass normal stock flow. Use "Add Stock" for regular stock additions. 
                This should only be used for corrections or inventory audits.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current Stock Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">Current Stock:</span>
              <span className="text-xl font-bold text-gray-900">
                {currentStock} units
              </span>
            </div>
          </div>

          {/* New Stock Input */}
          <div>
            <label className="label">New Stock Quantity *</label>
            <input
              type="number"
              className="input"
              placeholder="Enter new stock quantity"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              min="0"
              step="1"
              required
              autoFocus
              disabled={saving}
            />
            <p className="text-xs text-gray-500 mt-1">
              Set the exact stock quantity you want
            </p>
          </div>

          {/* Reason Input */}
          <div>
            <label className="label">Reason for Adjustment *</label>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g., Physical inventory count correction, Damaged goods removal, System sync"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              required
              disabled={saving}
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">
                Minimum 10 characters required
              </p>
              <p className="text-xs text-gray-400">
                {reason.length}/200
              </p>
            </div>
          </div>

          {/* Difference Preview */}
          {newStock && parseInt(newStock) !== currentStock && (
            <div className={`rounded-lg border-2 p-4 ${
              difference > 0
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${
                  difference > 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  Stock Change:
                </span>
                <div className="text-right">
                  <span className={`text-2xl font-bold ${
                    difference > 0 ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {difference > 0 ? '+' : ''}{difference}
                  </span>
                  <p className="text-xs text-gray-600 mt-1">
                    {currentStock} → {parseInt(newStock)}
                  </p>
                </div>
              </div>
              
              {/* Large decrease warning */}
              {difference < -50 && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <p className="text-xs text-red-700 font-medium">
                    ⚠️ Large Decrease: You're reducing stock by {Math.abs(difference)} units
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || parseInt(newStock) === currentStock}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Adjusting...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Adjust Stock</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}