// packages/web/components/inventory/AddStockModal.tsx
'use client';

import { useState } from 'react';
import { addStock } from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  currentStock: number;
  adminId: string;
  adminName: string;
  onSuccess: () => void;
}

export default function AddStockModal({
  isOpen,
  onClose,
  productId,
  productName,
  currentStock,
  adminId,
  adminName,
  onSuccess,
}: AddStockModalProps) {
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const quantityNum = parseInt(quantity);

    // Validations
    if (!quantity || isNaN(quantityNum)) {
      showToast.error('Please enter a valid quantity');
      return;
    }

    if (quantityNum <= 0) {
      showToast.error('Quantity must be greater than 0');
      return;
    }

    if (quantityNum > 10000) {
      showToast.error('Quantity cannot exceed 10,000 units in single operation');
      return;
    }

    if (!reason.trim()) {
      showToast.error('Please enter a reason for adding stock');
      return;
    }

    if (reason.trim().length < 5) {
      showToast.error('Reason must be at least 5 characters');
      return;
    }

    setSaving(true);
    const toastId = showToast.loading('Adding stock...');

    try {
      await addStock(productId, quantityNum, adminId, adminName, reason.trim());

      showToast.dismiss(toastId);
      showToast.success(`Successfully added ${quantityNum} units to stock!`);

      // Reset form
      setQuantity('');
      setReason('');
      
      // Notify parent
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding stock:', error);
      showToast.dismiss(toastId);
      showToast.error(error.message || 'Failed to add stock');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setQuantity('');
    setReason('');
    onClose();
  };

  const newStock = currentStock + (parseInt(quantity) || 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add Stock</h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current Stock Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-700">Current Stock:</span>
              <span className="text-xl font-bold text-blue-900">
                {currentStock} units
              </span>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="label">Quantity to Add *</label>
            <input
              type="number"
              className="input"
              placeholder="e.g., 50"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              max="10000"
              step="1"
              required
              autoFocus
              disabled={saving}
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum: 10,000 units per operation
            </p>
          </div>

          {/* Reason Input */}
          <div>
            <label className="label">Reason *</label>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g., New stock received from supplier, Production batch #123"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              required
              disabled={saving}
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">
                Minimum 5 characters
              </p>
              <p className="text-xs text-gray-400">
                {reason.length}/200
              </p>
            </div>
          </div>

          {/* Preview */}
          {quantity && parseInt(quantity) > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">New Stock:</span>
                <div className="text-right">
                  <span className="text-xs text-gray-600 mr-2">
                    {currentStock} + {parseInt(quantity)} =
                  </span>
                  <span className="text-xl font-bold text-green-900">
                    {newStock} units
                  </span>
                </div>
              </div>
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
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <span>✅</span>
                  <span>Add Stock</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}