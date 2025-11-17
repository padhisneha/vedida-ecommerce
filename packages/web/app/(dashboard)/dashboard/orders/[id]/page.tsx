'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getOrderByIdWithProducts,
  updateOrderStatus,
  assignDeliveryPartner,
  updateOrderNotes,
  updateScheduledDeliveryDate,
  updatePaymentMethod,
  updatePaymentStatus,
  getUsersByRole,
  Order,
  OrderStatus,
  UserRole,
  User,
  getUserById,
  formatCurrency,
  formatDate,
  formatDateTime,
  PLATFORM_FEE,
  DELIVERY_FEE,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';
import { generateOrderInvoicePDF } from '@/lib/invoice-generator';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [deliveryPartners, setDeliveryPartners] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [customer, setCustomer] = useState<User | null>(null);

  // New states for editable fields
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState('');
  const [savingDate, setSavingDate] = useState(false);

  const [editingPayment, setEditingPayment] = useState(false);
  const [paymentMethodValue, setPaymentMethodValue] = useState<'cod' | 'online' | 'upi'>('cod');
  const [paymentStatusValue, setPaymentStatusValue] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    loadOrder();
    loadDeliveryPartners();
  }, [params.id]);

  const loadOrder = async () => {
    try {
      const data = await getOrderByIdWithProducts(params.id);
      setOrder(data);
      setSelectedPartner(data.deliveryPartnerId || '');

      // Load customer details
      if (data) {
        const customerData = await getUserById(data.userId);
        setCustomer(customerData || null);
      }

      console.log('✅ Loaded order:', data);
    } catch (error) {
      console.error('Error loading order:', error);
      showToast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveryPartners = async () => {
    setLoadingPartners(true);
    try {
      const partners = await getUsersByRole(UserRole.DELIVERY_PARTNER);
      // Filter only active delivery partners
      const activePartners = partners.filter(partner => partner.isActive !== false);
      setDeliveryPartners(activePartners);
      console.log('✅ Loaded delivery partners:', activePartners);
    } catch (error) {
      console.error('Error loading delivery partners:', error);
      showToast.error('Failed to load delivery partners');
    } finally {
      setLoadingPartners(false);
    }
  };

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!order) return;

    const statusLabels = {
      [OrderStatus.PENDING]: 'Pending',
      [OrderStatus.CONFIRMED]: 'Confirmed',
      [OrderStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
      [OrderStatus.DELIVERED]: 'Delivered',
      [OrderStatus.CANCELLED]: 'Cancelled',
    };

    if (!confirm(`Update order status to "${statusLabels[newStatus]}"?`)) {
      return;
    }

    setUpdating(true);
    const toastId = showToast.loading('Updating order status...');

    try {
      await updateOrderStatus(order.id, newStatus);
      showToast.dismiss(toastId);
      showToast.success('Order status updated successfully!');
      await loadOrder();
    } catch (error) {
      console.error('Error updating order status:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignPartner = async () => {
    if (!order || !selectedPartner) {
      showToast.error('Please select a delivery partner');
      return;
    }

    const partner = deliveryPartners.find(p => p.id === selectedPartner);
    if (!partner) return;

    const partnerName = partner.name || partner.phoneNumber;
    
    if (!confirm(`Assign ${partnerName} to this order?`)) {
      return;
    }

    setAssigning(true);
    const toastId = showToast.loading('Assigning delivery partner...');

    try {
      await assignDeliveryPartner(order.id, partner.id, partnerName);
      showToast.dismiss(toastId);
      showToast.success(`${partnerName} has been assigned to this order!`);
      await loadOrder();
    } catch (error) {
      console.error('Error assigning delivery partner:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to assign delivery partner');
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!order) return;

    setSavingNotes(true);
    const toastId = showToast.loading('Saving delivery notes...');

    try {
      await updateOrderNotes(order.id, notesValue.trim());
      showToast.dismiss(toastId);
      showToast.success('Delivery notes updated successfully!');
      setEditingNotes(false);
      await loadOrder();
    } catch (error) {
      console.error('Error updating notes:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to update delivery notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveDate = async () => {
    if (!order) return;

    const newDate = new Date(dateValue);
    const orderDate = order.createdAt.toDate();
    
    // Validate: new date should not be earlier than order date
    if (newDate < orderDate) {
      showToast.error('Delivery date cannot be earlier than order date');
      return;
    }

    if (!confirm(`Change delivery date to ${formatDate(newDate)}?`)) {
      return;
    }

    setSavingDate(true);
    const toastId = showToast.loading('Updating delivery date...');

    try {
      await updateScheduledDeliveryDate(order.id, newDate);
      showToast.dismiss(toastId);
      showToast.success('Delivery date updated successfully!');
      setEditingDate(false);
      await loadOrder();
    } catch (error) {
      console.error('Error updating date:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to update delivery date');
    } finally {
      setSavingDate(false);
    }
  };

  const handleSavePayment = async () => {
    if (!order) return;

    if (!confirm('Update payment information?')) {
      return;
    }

    setSavingPayment(true);
    const toastId = showToast.loading('Updating payment information...');

    try {
      // Update both method and status
      await updatePaymentMethod(order.id, paymentMethodValue);
      await updatePaymentStatus(order.id, paymentStatusValue);

      showToast.dismiss(toastId);
      showToast.success('Payment information updated successfully!');
      setEditingPayment(false);
      await loadOrder();
    } catch (error) {
      console.error('Error updating payment:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to update payment information');
    } finally {
      setSavingPayment(false);
    }
  };

  const calculateTax = () => {
    if (!order) return { subtotal: 0, cgst: 0, sgst: 0, totalTax: 0 };

    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;

    order.items.forEach((item) => {
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

  const getStatusColor = (status: OrderStatus) => {
    const colors = {
      [OrderStatus.PENDING]: 'bg-yellow-500',
      [OrderStatus.CONFIRMED]: 'bg-blue-500',
      [OrderStatus.OUT_FOR_DELIVERY]: 'bg-purple-500',
      [OrderStatus.DELIVERED]: 'bg-green-500',
      [OrderStatus.CANCELLED]: 'bg-red-500',
    };
    return colors[status];
  };

  const getStatusIcon = (status: OrderStatus) => {
    const icons = {
      [OrderStatus.PENDING]: '⏳',
      [OrderStatus.CONFIRMED]: '✅',
      [OrderStatus.OUT_FOR_DELIVERY]: '🚚',
      [OrderStatus.DELIVERED]: '📦',
      [OrderStatus.CANCELLED]: '❌',
    };
    return icons[status];
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">📦</div>
          <div className="text-lg text-gray-600">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h2>
          <Link href="/dashboard/orders" className="btn-primary">
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const taxBreakdown = calculateTax();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/orders"
          className="text-primary-600 hover:text-primary-700 font-medium text-sm mb-4 inline-flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to Orders</span>
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mt-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {order.orderNumber}
              </h1>
              <span className={`${getStatusColor(order.status)} text-white px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1`}>
                <span>{getStatusIcon(order.status)}</span>
                <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}</span>
              </span>
            </div>
            <p className="text-gray-600 mt-2">
              Placed on {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Timeline */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              📍 Order Timeline
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    ✓
                  </div>
                  {order.status !== OrderStatus.CANCELLED && (
                    <div className="w-0.5 h-12 bg-gray-300"></div>
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <p className="font-semibold text-gray-900">Order Placed</p>
                  <p className="text-sm text-gray-600">{formatDateTime(order.createdAt)}</p>
                </div>
              </div>

              {order.status !== OrderStatus.CANCELLED && (
                <>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        order.status === OrderStatus.CONFIRMED || 
                        order.status === OrderStatus.OUT_FOR_DELIVERY || 
                        order.status === OrderStatus.DELIVERED
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {order.status === OrderStatus.CONFIRMED || 
                         order.status === OrderStatus.OUT_FOR_DELIVERY || 
                         order.status === OrderStatus.DELIVERED ? '✓' : '2'}
                      </div>
                      <div className="w-0.5 h-12 bg-gray-300"></div>
                    </div>
                    <div className="flex-1 pb-8">
                      <p className="font-semibold text-gray-900">Order Confirmed</p>
                      <p className="text-sm text-gray-600">
                        {order.status === OrderStatus.PENDING ? 'Awaiting confirmation' : 'Confirmed'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        order.status === OrderStatus.OUT_FOR_DELIVERY || 
                        order.status === OrderStatus.DELIVERED
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {order.status === OrderStatus.OUT_FOR_DELIVERY || 
                         order.status === OrderStatus.DELIVERED ? '✓' : '3'}
                      </div>
                      <div className="w-0.5 h-12 bg-gray-300"></div>
                    </div>
                    <div className="flex-1 pb-8">
                      <p className="font-semibold text-gray-900">Out for Delivery</p>
                      <p className="text-sm text-gray-600">
                        {order.status === OrderStatus.OUT_FOR_DELIVERY 
                          ? 'On the way' 
                          : order.status === OrderStatus.DELIVERED 
                          ? 'Completed' 
                          : 'Not yet dispatched'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        order.status === OrderStatus.DELIVERED
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {order.status === OrderStatus.DELIVERED ? '✓' : '4'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Delivered</p>
                      <p className="text-sm text-gray-600">
                        {order.deliveredAt
                          ? formatDateTime(order.deliveredAt)
                          : `Expected: ${formatDate(order.scheduledDeliveryDate)}`}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {order.status === OrderStatus.CANCELLED && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                      ✕
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Order Cancelled</p>
                    <p className="text-sm text-gray-600">This order was cancelled</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              📦 Order Items ({order.items.length})
            </h2>
            <div className="space-y-3">
              {order.items.map((item, index) => (
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
                        Quantity: {item.quantity}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(item.price)} per item
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 text-lg">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
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
                  {order.deliveryAddress.label}
                </p>
                <p className="text-gray-700">
                  {order.deliveryAddress.apartment && `${order.deliveryAddress.apartment}, `}
                  {order.deliveryAddress.street}
                </p>
                <p className="text-gray-700">
                  {order.deliveryAddress.city}, {order.deliveryAddress.state} -{' '}
                  {order.deliveryAddress.pincode}
                </p>
                {order.deliveryAddress.landmark && (
                  <p className="text-gray-600 text-sm mt-2">
                    📍 Landmark: {order.deliveryAddress.landmark}
                  </p>
                )}
              </div>
              
              {/* Map/Directions Link */}
              <div className="mt-3">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.pincode}`
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

          {/* Delivery Notes Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                📝 Delivery Notes
              </h2>
              {!editingNotes && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  ✏️ Edit
                </button>
              )}
            </div>

            {editingNotes ? (
              <div>
                <textarea
                  className="input min-h-[100px]"
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Add delivery instructions or special notes..."
                  disabled={savingNotes}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="btn-primary flex items-center gap-2"
                  >
                    <span>💾</span>
                    <span>{savingNotes ? 'Saving...' : 'Save Notes'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotes(false);
                      setNotesValue(order.deliveryNotes || '');
                    }}
                    disabled={savingNotes}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 min-h-[60px]">
                {order.deliveryNotes ? (
                  <p className="text-gray-900 whitespace-pre-wrap">{order.deliveryNotes}</p>
                ) : (
                  <p className="text-gray-500 italic">No delivery notes added</p>
                )}
              </div>
            )}
          </div>

          {/* Delivery Information with Editable Date and Payment */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              🚚 Delivery Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Editable Scheduled Delivery Date */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Scheduled Delivery</p>
                  {!editingDate && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && (
                    <button
                      onClick={() => setEditingDate(true)}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      📅 Change
                    </button>
                  )}
                </div>
                
                {editingDate ? (
                  <div>
                    <input
                      type="date"
                      className="input text-sm"
                      value={dateValue}
                      onChange={(e) => setDateValue(e.target.value)}
                      min={order.createdAt.toDate().toISOString().split('T')[0]}
                      disabled={savingDate}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleSaveDate}
                        disabled={savingDate}
                        className="text-xs px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50"
                      >
                        {savingDate ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingDate(false);
                          const date = order.scheduledDeliveryDate.toDate();
                          setDateValue(date.toISOString().split('T')[0]);
                        }}
                        disabled={savingDate}
                        className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="font-semibold text-gray-900">
                    {formatDate(order.scheduledDeliveryDate)}
                  </p>
                )}
              </div>

              {order.deliveredAt && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 mb-1">Delivered On</p>
                  <p className="font-semibold text-green-900">
                    {formatDateTime(order.deliveredAt)}
                  </p>
                </div>
              )}
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Order Type</p>
                <p className="font-semibold text-gray-900">
                  {order.type === 'one_time' ? 'One-Time Order' : 'Subscription'}
                </p>
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
                          setPaymentMethodValue(order.paymentMethod || 'cod');
                          setPaymentStatusValue(order.paymentStatus || 'pending');
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
                      {getPaymentMethodLabel(order.paymentMethod)}
                    </p>
                    <div className="mt-2">
                      {getPaymentStatusBadge(order.paymentStatus)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Actions & Summary */}
        <div className="space-y-6">
          {/* Quick Actions */}
          {order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                ⚡ Quick Actions
              </h2>
              <div className="space-y-2">
                {order.status === OrderStatus.PENDING && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(OrderStatus.CONFIRMED)}
                      disabled={updating}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <span>✅</span>
                      <span>{updating ? 'Updating...' : 'Confirm Order'}</span>
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(OrderStatus.CANCELLED)}
                      disabled={updating}
                      className="btn-danger w-full flex items-center justify-center gap-2"
                    >
                      <span>❌</span>
                      <span>Cancel Order</span>
                    </button>
                  </>
                )}

                {order.status === OrderStatus.CONFIRMED && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(OrderStatus.OUT_FOR_DELIVERY)}
                      disabled={updating}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <span>🚚</span>
                      <span>{updating ? 'Updating...' : 'Mark Out for Delivery'}</span>
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(OrderStatus.CANCELLED)}
                      disabled={updating}
                      className="btn-danger w-full flex items-center justify-center gap-2"
                    >
                      <span>❌</span>
                      <span>Cancel Order</span>
                    </button>
                  </>
                )}

                {order.status === OrderStatus.OUT_FOR_DELIVERY && (
                  <button
                    onClick={() => handleStatusUpdate(OrderStatus.DELIVERED)}
                    disabled={updating}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <span>✅</span>
                    <span>{updating ? 'Updating...' : 'Mark as Delivered'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Delivery Partner Assignment */}
          {order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                👤 Delivery Partner
              </h2>
              
              {order.deliveryPartnerName ? (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">✅</span>
                    <p className="font-semibold text-green-900">Assigned</p>
                  </div>
                  <p className="text-lg font-bold text-green-800">
                    {order.deliveryPartnerName}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    ID: {order.deliveryPartnerId?.slice(0, 12)}...
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
                    {deliveryPartners.map((partner) => {
                      const assignedPartner = deliveryPartners.find(p => p.id === partner.id);
                      return (
                        <option key={partner.id} value={partner.id}>
                          {getVehicleIcon(partner.vehicleType)} {getPartnerDisplayName(partner)}
                          {partner.totalDeliveries ? ` (${partner.totalDeliveries} deliveries)` : ''}
                        </option>
                      );
                    })}
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
                        : order.deliveryPartnerName 
                        ? 'Reassign Partner' 
                        : 'Assign Partner'}
                    </span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Show delivery partner info for completed orders */}
          {(order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) && 
           order.deliveryPartnerName && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                👤 Delivery Partner
              </h2>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Assigned To</p>
                <p className="text-lg font-bold text-gray-900">
                  {order.deliveryPartnerName}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ID: {order.deliveryPartnerId?.slice(0, 12)}...
                </p>
              </div>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              💰 Price Breakdown
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal (excl. tax)</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(taxBreakdown.subtotal)}
                </span>
              </div>

              {taxBreakdown.cgst > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">CGST</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(taxBreakdown.cgst)}
                  </span>
                </div>
              )}

              {taxBreakdown.sgst > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">SGST</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(taxBreakdown.sgst)}
                  </span>
                </div>
              )}

              {taxBreakdown.totalTax > 0 && (
                <div className="flex justify-between text-sm bg-gray-50 -mx-6 px-6 py-2">
                  <span className="text-gray-700 font-medium">Total Tax</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(taxBreakdown.totalTax)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Platform Fee</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(PLATFORM_FEE)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Charges</span>
                <span className="font-medium text-green-600">
                  {DELIVERY_FEE === 0 ? 'FREE' : formatCurrency(DELIVERY_FEE)}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-lg">Total Amount</span>
                  <span className="font-bold text-primary-600 text-2xl">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={async () => {
                    try {
                      await generateOrderInvoicePDF(order, taxBreakdown);
                      showToast.success('Invoice downloaded successfully!');
                    } catch (error) {
                      console.error('Error generating invoice:', error);
                      showToast.error('Failed to generate invoice PDF');
                    }
                  }}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <span>📄</span>
                  <span>Download Invoice PDF</span>
                </button>
              </div>

            </div>
          </div>

          {/* Order Info */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              📋 Order Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Order ID</p>
                <p className="font-mono text-sm text-gray-900">{order.id.slice(0, 12)}...</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Customer ID</p>
                <p className="font-mono text-sm text-gray-900">{order.userId.slice(0, 12)}...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}