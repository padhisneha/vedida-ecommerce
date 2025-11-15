'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getSubscriptionWithProducts,
  updateSubscriptionStatus,
  Subscription,
  SubscriptionStatus,
  SubscriptionFrequency,
  formatCurrency,
  formatDate,
  formatDateTime,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

export default function SubscriptionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, [params.id]);

  const loadSubscription = async () => {
    try {
      const data = await getSubscriptionWithProducts(params.id);
      setSubscription(data);
      console.log('✅ Loaded subscription:', data);
    } catch (error) {
      console.error('Error loading subscription:', error);
      showToast.error('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: SubscriptionStatus, pauseUntil?: Date) => {
    if (!subscription) return;

    const statusLabels = {
      [SubscriptionStatus.ACTIVE]: 'Active',
      [SubscriptionStatus.PAUSED]: 'Paused',
      [SubscriptionStatus.COMPLETED]: 'Completed',
      [SubscriptionStatus.CANCELLED]: 'Cancelled',
    };

    if (!confirm(`Update subscription status to "${statusLabels[newStatus]}"?`)) {
      return;
    }

    setUpdating(true);
    try {
      await updateSubscriptionStatus(params.id, newStatus, pauseUntil);
      showToast.success('Subscription status updated successfully!');
      await loadSubscription();
    } catch (error) {
      console.error('Error updating subscription status:', error);
      showToast.error('Failed to update subscription status');
    } finally {
      setUpdating(false);
    }
  };

  const handlePauseSubscription = () => {
    const days = prompt('How many days to pause? (e.g., 7, 14, 30)');
    if (!days) return;

    const pauseDays = parseInt(days);
    if (isNaN(pauseDays) || pauseDays <= 0) {
      showToast.error('Please enter a valid number of days');
      return;
    }

    const pauseUntil = new Date();
    pauseUntil.setDate(pauseUntil.getDate() + pauseDays);

    handleStatusUpdate(SubscriptionStatus.PAUSED, pauseUntil);
  };

  const getStatusColor = (status: SubscriptionStatus) => {
    const colors = {
        [SubscriptionStatus.PENDING]: 'bg-yellow-500',
        [SubscriptionStatus.ACTIVE]: 'bg-green-500',
        [SubscriptionStatus.PAUSED]: 'bg-orange-500',
        [SubscriptionStatus.COMPLETED]: 'bg-blue-500',
        [SubscriptionStatus.CANCELLED]: 'bg-red-500',
    };
    return colors[status];
  };

  const getStatusIcon = (status: SubscriptionStatus) => {
    const icons = {
        [SubscriptionStatus.PENDING]: '⏳',
        [SubscriptionStatus.ACTIVE]: '✅',
        [SubscriptionStatus.PAUSED]: '⏸️',
        [SubscriptionStatus.COMPLETED]: '🎉',
        [SubscriptionStatus.CANCELLED]: '❌',
    };
    return icons[status];
  };

  const getFrequencyText = (frequency: SubscriptionFrequency) => {
    const labels = {
      [SubscriptionFrequency.DAILY]: 'Daily',
      [SubscriptionFrequency.ALTERNATE_DAYS]: 'Alternate Days',
      [SubscriptionFrequency.WEEKLY]: 'Weekly',
    };
    return labels[frequency];
  };

  const calculatePerDeliveryAmount = () => {
    if (!subscription) return 0;
    return subscription.items.reduce((total, item) => {
      if (item.product) {
        return total + item.product.price * item.quantity;
      }
      return total;
    }, 0);
  };

  const calculateTotalDeliveries = () => {
    if (!subscription || !subscription.endDate) return 0;

    const start = subscription.startDate.toDate();
    const end = subscription.endDate.toDate();
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    switch (subscription.frequency) {
      case SubscriptionFrequency.DAILY:
        return daysDiff;
      case SubscriptionFrequency.ALTERNATE_DAYS:
        return Math.ceil(daysDiff / 2);
      case SubscriptionFrequency.WEEKLY:
        return Math.ceil(daysDiff / 7);
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">📅</div>
          <div className="text-lg text-gray-600">Loading subscription details...</div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Subscription Not Found</h2>
          <Link href="/dashboard/subscriptions" className="btn-primary">
            ← Back to Subscriptions
          </Link>
        </div>
      </div>
    );
  }

  const perDeliveryAmount = calculatePerDeliveryAmount();
  const totalDeliveries = calculateTotalDeliveries();
  const totalAmount = perDeliveryAmount * totalDeliveries;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/subscriptions"
          className="text-primary-600 hover:text-primary-700 font-medium text-sm mb-4 inline-flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to Subscriptions</span>
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mt-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {subscription.subscriptionNumber || `SUB-${subscription.id.slice(0, 8)}`}
              </h1>
              <span className={`${getStatusColor(subscription.status)} text-white px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1`}>
                <span>{getStatusIcon(subscription.status)}</span>
                <span>{subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}</span>
              </span>
            </div>
            <p className="text-gray-600 mt-2">
              Created on {formatDateTime(subscription.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Subscription Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription Information */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              📋 Subscription Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Frequency</p>
                <p className="font-semibold text-gray-900 text-lg">
                  {getFrequencyText(subscription.frequency)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Per Delivery</p>
                <p className="font-semibold text-primary-600 text-lg">
                  {formatCurrency(perDeliveryAmount)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Start Date</p>
                <p className="font-semibold text-gray-900">
                  {formatDate(subscription.startDate)}
                </p>
              </div>
              {subscription.endDate && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">End Date</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(subscription.endDate)}
                  </p>
                </div>
              )}
              {subscription.endDate && (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700 mb-1">Total Deliveries</p>
                    <p className="font-bold text-blue-900 text-lg">
                      {totalDeliveries}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 mb-1">Total Amount Paid</p>
                    <p className="font-bold text-green-900 text-lg">
                      {formatCurrency(totalAmount)}
                    </p>
                  </div>
                </>
              )}
              {subscription.pausedUntil && subscription.status === SubscriptionStatus.PAUSED && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 sm:col-span-2">
                  <p className="text-sm text-yellow-700 mb-1">Paused Until</p>
                  <p className="font-semibold text-yellow-900">
                    {formatDate(subscription.pausedUntil)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Subscription Items */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              📦 Subscription Items ({subscription.items.length})
            </h2>
            <div className="space-y-3">
              {subscription.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-3xl">
                      📦
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-lg">
                        {item.product?.name || 'Product'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity} per delivery
                      </p>
                      {item.product && (
                        <p className="text-xs text-gray-500">
                          {formatCurrency(item.product.price)} per {item.product.quantity} {item.product.unit}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 text-lg">
                      {item.product ? formatCurrency(item.product.price * item.quantity) : '-'}
                    </p>
                    <p className="text-xs text-gray-500">per delivery</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              📍 Delivery Address
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="font-semibold text-gray-900 mb-2 text-lg">
                {subscription.deliveryAddress.label}
              </p>
              <p className="text-gray-700">
                {subscription.deliveryAddress.apartment && `${subscription.deliveryAddress.apartment}, `}
                {subscription.deliveryAddress.street}
              </p>
              <p className="text-gray-700">
                {subscription.deliveryAddress.city}, {subscription.deliveryAddress.state} -{' '}
                {subscription.deliveryAddress.pincode}
              </p>
              {subscription.deliveryAddress.landmark && (
                <p className="text-gray-600 text-sm mt-2">
                  📍 Landmark: {subscription.deliveryAddress.landmark}
                </p>
              )}
            </div>
          </div>

          {/* Subscription Info */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              📋 Subscription Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Subscription ID</p>
                <p className="font-mono text-sm text-gray-900">{subscription.id.slice(0, 20)}...</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Customer ID</p>
                <p className="font-mono text-sm text-gray-900">{subscription.userId.slice(0, 20)}...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Actions */}
        <div className="space-y-6">

        {/* Quick Actions */}
        {subscription.status !== SubscriptionStatus.COMPLETED && 
        subscription.status !== SubscriptionStatus.CANCELLED && (
        <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
            ⚡ Quick Actions
            </h2>
            <div className="space-y-2">
            {subscription.status === SubscriptionStatus.PENDING && (
                <>
                <button
                    onClick={() => handleStatusUpdate(SubscriptionStatus.ACTIVE)}
                    disabled={updating}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    <span>✅</span>
                    <span>{updating ? 'Updating...' : 'Accept Subscription'}</span>
                </button>
                <button
                    onClick={() => handleStatusUpdate(SubscriptionStatus.CANCELLED)}
                    disabled={updating}
                    className="btn-danger w-full flex items-center justify-center gap-2"
                >
                    <span>❌</span>
                    <span>Reject Subscription</span>
                </button>
                </>
            )}

            {subscription.status === SubscriptionStatus.ACTIVE && (
                <>
                <button
                    onClick={handlePauseSubscription}
                    disabled={updating}
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                    <span>⏸️</span>
                    <span>{updating ? 'Updating...' : 'Pause Subscription'}</span>
                </button>
                <button
                    onClick={() => handleStatusUpdate(SubscriptionStatus.CANCELLED)}
                    disabled={updating}
                    className="btn-danger w-full flex items-center justify-center gap-2"
                >
                    <span>❌</span>
                    <span>Cancel Subscription</span>
                </button>
                </>
            )}

            {subscription.status === SubscriptionStatus.PAUSED && (
                <>
                <button
                    onClick={() => handleStatusUpdate(SubscriptionStatus.ACTIVE)}
                    disabled={updating}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    <span>▶️</span>
                    <span>{updating ? 'Updating...' : 'Resume Subscription'}</span>
                </button>
                <button
                    onClick={() => handleStatusUpdate(SubscriptionStatus.CANCELLED)}
                    disabled={updating}
                    className="btn-danger w-full flex items-center justify-center gap-2"
                >
                    <span>❌</span>
                    <span>Cancel Subscription</span>
                </button>
                </>
            )}
            </div>
        </div>
        )}

        {/* Show info for pending subscriptions */}
        {subscription.status === SubscriptionStatus.PENDING && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-center">
            <div className="text-4xl mb-2">⏳</div>
            <p className="font-semibold text-yellow-900 mb-1">
                Awaiting Approval
            </p>
            <p className="text-sm text-yellow-700">
                This subscription is waiting for admin acceptance
            </p>
            </div>
        </div>
        )}

          {/* Delivery Partner Assignment */}
          {subscription.status === SubscriptionStatus.ACTIVE && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                👤 Delivery Partner
              </h2>
              <select className="input mb-3" disabled>
                <option>Assign delivery partner...</option>
                <option>Rajesh Kumar</option>
                <option>Amit Sharma</option>
                <option>Priya Patel</option>
              </select>
              <button className="btn-secondary w-full" disabled>
                💼 Assign Partner (Coming Soon)
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Delivery partner management will be available soon
              </p>
            </div>
          )}

          {/* Payment Summary */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              💰 Payment Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Per Delivery Amount</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(perDeliveryAmount)}
                </span>
              </div>

              {subscription.endDate && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Deliveries</span>
                    <span className="font-medium text-gray-900">
                      {totalDeliveries}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">Total Amount Paid</span>
                      <span className="font-bold text-primary-600 text-xl">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      Upfront payment
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Status Info Cards */}
          {subscription.status === SubscriptionStatus.COMPLETED && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-center">
                <div className="text-4xl mb-2">🎉</div>
                <p className="font-semibold text-blue-900 mb-1">
                  Subscription Completed
                </p>
                <p className="text-sm text-blue-700">
                  This subscription has ended as per the scheduled end date
                </p>
              </div>
            </div>
          )}

          {subscription.status === SubscriptionStatus.CANCELLED && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-center">
                <div className="text-4xl mb-2">❌</div>
                <p className="font-semibold text-red-900 mb-1">
                  Subscription Cancelled
                </p>
                <p className="text-sm text-red-700">
                  This subscription was cancelled and is no longer active
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}