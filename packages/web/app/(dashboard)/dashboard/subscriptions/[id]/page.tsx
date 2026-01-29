// packages/web/app/%28dashboard%29/dashboard/subscriptions/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getSubscriptionWithProducts,
  updateSubscriptionStatus,
  updateSubscriptionPaymentMethod,
  updateSubscriptionPaymentStatus,
  assignDeliveryPartnerToSubscription,
  getUsersByRole,
  Subscription,
  SubscriptionStatus,
  SubscriptionFrequency,
  UserRole,
  User,
  getUserById,
  formatCurrency,
  formatDate,
  formatDateTime,
  updateSubscriptionDeliverySlot,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';
import { generateSubscriptionInvoicePDF } from '@/lib/invoice-generator';

export default function SubscriptionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [deliveryPartners, setDeliveryPartners] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [customer, setCustomer] = useState<User | null>(null);

  const [editingPayment, setEditingPayment] = useState(false);
  const [paymentMethodValue, setPaymentMethodValue] = useState<'cod' | 'online' | 'upi'>('cod');
  const [paymentStatusValue, setPaymentStatusValue] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [savingPayment, setSavingPayment] = useState(false);

  const [editingSlot, setEditingSlot] = useState(false);
  const [slotValue, setSlotValue] = useState<'morning' | 'evening'>('morning');
  const [savingSlot, setSavingSlot] = useState(false);

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);

      const data = await getSubscriptionWithProducts(params.id);
      setSubscription(data);
      setSelectedPartner(data.deliveryPartnerId || '');

      // Load customer details
      if (data) {
        const customerData = await getUserById(data.userId);
        setCustomer(customerData || null);
      }

      console.log('✅ Loaded subscription:', data);
    } catch (error) {
      console.error('Error loading subscription:', error);
      showToast.error('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const loadDeliveryPartners = useCallback(async () => {
    setLoadingPartners(true);
    try {
      const partners = await getUsersByRole(UserRole.DELIVERY_PARTNER);

      // Filter only active delivery partners
      const activePartners = partners.filter(
        partner => partner.isActive !== false
      );

      setDeliveryPartners(activePartners);
      console.log('✅ Loaded delivery partners:', activePartners);
    } catch (error) {
      console.error('Error loading delivery partners:', error);
      showToast.error('Failed to load delivery partners');
    } finally {
      setLoadingPartners(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
    loadDeliveryPartners();
  }, [loadSubscription, loadDeliveryPartners]);

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

  const handleAssignPartner = async () => {
    if (!subscription || !selectedPartner) {
      showToast.error('Please select a delivery partner');
      return;
    }

    const partner = deliveryPartners.find(p => p.id === selectedPartner);
    if (!partner) return;

    const partnerName = partner.name || partner.phoneNumber;
    
    if (!confirm(`Assign ${partnerName} to this subscription?`)) {
      return;
    }

    setAssigning(true);
    const toastId = showToast.loading('Assigning delivery partner...');

    try {
      await assignDeliveryPartnerToSubscription(subscription.id, partner.id, partnerName);
      showToast.dismiss(toastId);
      showToast.success(`${partnerName} has been assigned to this subscription!`);
      await loadSubscription();
    } catch (error) {
      console.error('Error assigning delivery partner:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to assign delivery partner');
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveSlot = async () => {
    if (!subscription) return;

    if (!confirm('Update delivery slot for this subscription?')) {
      return;
    }

    setSavingSlot(true);
    const toastId = showToast.loading('Updating delivery slot...');

    try {
      await updateSubscriptionDeliverySlot(subscription.id, slotValue);
      showToast.dismiss(toastId);
      showToast.success('Delivery slot updated successfully!');
      setEditingSlot(false);
      await loadSubscription();
    } catch (error) {
      console.error('Error updating delivery slot:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to update delivery slot');
    } finally {
      setSavingSlot(false);
    }
  };

  const handleSavePayment = async () => {
    if (!subscription) return;

    if (!confirm('Update payment information?')) {
    return;
    }

    setSavingPayment(true);
    const toastId = showToast.loading('Updating payment information...');

    try {
        // Update both method and status
        await updateSubscriptionPaymentMethod(subscription.id, paymentMethodValue);
        await updateSubscriptionPaymentStatus(subscription.id, paymentStatusValue);

        showToast.dismiss(toastId);
        showToast.success('Payment information updated successfully!');
        setEditingPayment(false);
        await loadSubscription();
    } catch (error) {
        console.error('Error updating payment:', error);
        showToast.dismiss(toastId);
        showToast.error('Failed to update payment information');
    } finally {
        setSavingPayment(false);
    }
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

  const getPartnerDisplayName = (partner: User) => {
    return partner.name || partner.phoneNumber;
  };

  const getVehicleIcon = (vehicleType?: string) => {
    const icons: Record<string, string> = {
      bike: '🏍️',
      car: '🚗',
      bicycle: '🚲',
    };
    return vehicleType ? icons[vehicleType] || '🚚' : '🚚';
  };

  const getPaymentMethodLabel = (method?: string) => {
    const labels: Record<string, string> = {
      cod: '💵 Cash on Delivery',
      online: '💳 Online Payment',
      upi: '🔳 UPI Payment',
    };
    return labels[method || 'cod'] || '💵 Cash on Delivery';
  };

  const getPaymentStatusBadge = (status?: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    
    const labels: Record<string, string> = {
      pending: '⏳ Pending',
      paid: '✅ Paid',
      failed: '❌ Failed',
    };
    
    const statusKey = status || 'pending';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[statusKey]}`}>
        {labels[statusKey]}
      </span>
    );
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

  const calculateTax = () => {
    if (!subscription) return { subtotal: 0, cgst: 0, sgst: 0, totalTax: 0 };

    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;

    subscription.items.forEach((item) => {
      if (item.product) {
        const itemSubtotal = item.product.priceExcludingTax * item.quantity;
        const itemCGST = (itemSubtotal * item.product.taxCGST) / 100;
        const itemSGST = (itemSubtotal * item.product.taxSGST) / 100;

        subtotal += itemSubtotal;
        cgst += itemCGST;
        sgst += itemSGST;
      }
    });

    return {
      subtotal,
      cgst,
      sgst,
      totalTax: cgst + sgst,
    };
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
              📍  Customer & Delivery Address
            </h2>

            {/* Customer Information */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Customer Details</p>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-lg">
                    {customer?.name || 'Customer'}
                  </p>
                  <p className="text-gray-600 flex items-center gap-2 mt-1">
                    <span>📱</span>
                    <a 
                      href={`tel:${customer?.phoneNumber}`}
                      className="hover:text-primary-600 transition-colors"
                    >
                      {customer?.phoneNumber}
                    </a>
                  </p>
                  {customer?.email && (
                    <p className="text-gray-600 flex items-center gap-2 mt-1">
                      <span>📧</span>
                      <a 
                        href={`mailto:${customer.email}`}
                        className="hover:text-primary-600 transition-colors"
                      >
                        {customer.email}
                      </a>
                    </p>
                  )}
                </div>
                {/* Quick call button for delivery partners */}
                <a
                  href={`tel:${customer?.phoneNumber}`}
                  className="btn-secondary text-sm px-3 py-1.5"
                >
                  📞 Call
                </a>
              </div>
            </div>

            {/* Delivery Address */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Delivery Address</p>
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
              
              {/* Map/Directions Link */}
              <div className="mt-3">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${subscription.deliveryAddress.street}, ${subscription.deliveryAddress.city}, ${subscription.deliveryAddress.state} ${subscription.deliveryAddress.pincode}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <span>🗺️</span>
                  <span>Open in Google Maps</span>
                </a>
              </div>
            </div>
          </div>

          {/* Delivery Slot */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                🕐 Delivery Slot
              </h2>
              {!editingSlot && subscription.status === SubscriptionStatus.ACTIVE && (
                <button
                  onClick={() => {
                    setEditingSlot(true);
                    setSlotValue(subscription.deliverySlot || 'morning');
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  ✏️ Edit
                </button>
              )}
            </div>

            {editingSlot ? (
              <div>
                <select
                  className="input mb-3"
                  value={slotValue}
                  onChange={(e) => setSlotValue(e.target.value as 'morning' | 'evening')}
                  disabled={savingSlot}
                >
                  <option value="morning">🌅 Morning (6 AM - 12 PM)</option>
                  <option value="evening">🌆 Evening (4 PM - 8 PM)</option>
                </select>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-blue-800">
                    ℹ️ This will change the delivery slot for all future deliveries of this subscription.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSlot}
                    disabled={savingSlot}
                    className="btn-primary flex items-center gap-2"
                  >
                    <span>💾</span>
                    <span>{savingSlot ? 'Saving...' : 'Save Slot'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingSlot(false);
                      setSlotValue(subscription.deliverySlot || 'morning');
                    }}
                    disabled={savingSlot}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">
                    {subscription.deliverySlot === 'morning' ? '🌅' : '🌆'}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">
                      {subscription.deliverySlotLabel || 'Not specified'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      All deliveries arrive during this time
                    </p>
                  </div>
                </div>
              </div>
            )}
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
              
              {subscription.deliveryPartnerName ? (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">✅</span>
                    <p className="font-semibold text-green-900">Assigned</p>
                  </div>
                  <p className="text-lg font-bold text-green-800">
                    {subscription.deliveryPartnerName}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    ID: {subscription.deliveryPartnerId?.slice(0, 12)}...
                  </p>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ No delivery partner assigned yet
                  </p>
                </div>
              )}

              {loadingPartners ? (
                <div className="text-center py-4">
                  <div className="text-sm text-gray-600">Loading partners...</div>
                </div>
              ) : deliveryPartners.length === 0 ? (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    ❌ No active delivery partners available
                  </p>
                </div>
              ) : (
                <>
                  <select 
                    className="input mb-3"
                    value={selectedPartner}
                    onChange={(e) => setSelectedPartner(e.target.value)}
                    disabled={assigning}
                  >
                    <option value="">Select delivery partner...</option>
                    {deliveryPartners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {getVehicleIcon(partner.vehicleType)} {getPartnerDisplayName(partner)}
                        {partner.totalDeliveries ? ` (${partner.totalDeliveries} deliveries)` : ''}
                      </option>
                    ))}
                  </select>
                  
                  {selectedPartner && (() => {
                    const partner = deliveryPartners.find(p => p.id === selectedPartner);
                    return partner ? (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{getVehicleIcon(partner.vehicleType)}</span>
                          <span className="font-semibold text-blue-900">
                            {getPartnerDisplayName(partner)}
                          </span>
                        </div>
                        {partner.phoneNumber && (
                          <p className="text-blue-700">📱 {partner.phoneNumber}</p>
                        )}
                        {partner.vehicleNumber && (
                          <p className="text-blue-700">🚗 {partner.vehicleNumber}</p>
                        )}
                        {partner.totalDeliveries !== undefined && (
                          <p className="text-blue-700">📦 {partner.totalDeliveries} deliveries completed</p>
                        )}
                      </div>
                    ) : null;
                  })()}
                  
                  <button 
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                    onClick={handleAssignPartner}
                    disabled={assigning || !selectedPartner}
                  >
                    <span>💼</span>
                    <span>
                      {assigning 
                        ? 'Assigning...' 
                        : subscription.deliveryPartnerName 
                        ? 'Reassign Partner' 
                        : 'Assign Partner'}
                    </span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Show delivery partner info for completed/cancelled subscriptions */}
          {(subscription.status === SubscriptionStatus.COMPLETED || 
            subscription.status === SubscriptionStatus.CANCELLED) && 
           subscription.deliveryPartnerName && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                👤 Delivery Partner
              </h2>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Assigned To</p>
                <p className="text-lg font-bold text-gray-900">
                  {subscription.deliveryPartnerName}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ID: {subscription.deliveryPartnerId?.slice(0, 12)}...
                </p>
              </div>
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
                      <span className="font-bold text-gray-900">Total Amount </span>
                      <span className="font-bold text-primary-600 text-xl">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      &nbsp;
                    </p>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                     &nbsp; 
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Editable Payment Method */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    
                    <p className="text-sm text-gray-600">Payment Method</p>
                    {!editingPayment && (
                    <button
                        onClick={() => setEditingPayment(true)}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                        ✏️ Edit
                    </button>
                    )}
                </div>
            
                {editingPayment ? (
                <div>
                    <select
                        className="input text-sm mb-2"
                        value={paymentMethodValue}
                        onChange={(e) => setPaymentMethodValue(e.target.value as 'cod' | 'online' | 'upi')}
                        disabled={savingPayment}
                    >
                        <option value="cod">💵 Cash on Delivery</option>
                        <option value="online">💳 Online Payment</option>
                        <option value="upi">🔳 UPI Payment</option>
                    </select>
                    
                    <select
                        className="input text-sm mb-2"
                        value={paymentStatusValue}
                        onChange={(e) => setPaymentStatusValue(e.target.value as 'pending' | 'paid' | 'failed')}
                        disabled={savingPayment}
                    >
                        <option value="pending">⏳ Pending</option>
                        <option value="paid">✅ Paid</option>
                        <option value="failed">❌ Failed</option>
                    </select>
                    
                    <div className="flex gap-2">
                        <button
                        onClick={handleSavePayment}
                        disabled={savingPayment}
                        className="text-xs px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50"
                        >
                        {savingPayment ? 'Saving...' : 'Save'}
                        </button>
                        <button
                        onClick={() => {
                            setEditingPayment(false);
                            setPaymentMethodValue(subscription.paymentMethod || 'cod');
                            setPaymentStatusValue(subscription.paymentStatus || 'pending');
                        }}
                        disabled={savingPayment}
                        className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                        Cancel
                        </button>
                    </div>
                    </div>
                ) : (
                    <div>
                    <p className="font-semibold text-gray-900">
                        {getPaymentMethodLabel(subscription.paymentMethod)}
                    </p>
                    <div className="mt-2">
                        {getPaymentStatusBadge(subscription.paymentStatus)}
                    </div>
                    </div>
                )}
            </div>

            {/* ADD THIS DOWNLOAD BUTTON */}
            <div className="pt-3">
            <button
                onClick={async () => {
                try {
                    const taxBreakdown = calculateTax();
                    await generateSubscriptionInvoicePDF(subscription, taxBreakdown);
                    showToast.success('Subscription invoice downloaded successfully!');
                } catch (error) {
                    console.error('Error generating invoice:', error);
                    showToast.error('Failed to generate invoice PDF');
                }
                }}
                className="btn-secondary w-full flex items-center justify-center gap-2"
            >
                <span>📄</span>
                <span>Download Invoice</span>
            </button>
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