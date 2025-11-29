'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getOrderByIdWithProducts,
  updateOrderStatus,
  getUsersByRole,
  Order,
  OrderStatus,
  formatCurrency,
  formatDate,
  formatDateTime,
  PLATFORM_FEE,
  DELIVERY_FEE,
  NotificationType,
  createNotification,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';
import { generateOrderInvoicePDF } from '@/lib/invoice-generator';
import { useAuth } from '@/contexts/AuthContext';
import { User, UserRole, getUserById } from '@ecommerce/shared';

export default function DeliveryOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [customer, setCustomer] = useState<User | null>(null);

  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();

  useEffect(() => {
    loadCurrentUserAndOrder();
  }, [params.id]);

  const loadCurrentUserAndOrder = async () => {
    try {

      if (!user || user.role !== UserRole.DELIVERY_PARTNER) {
        showToast.error('Access denied');
        router.push('/delivery');
        return;
      }

      // Load order
      const data = await getOrderByIdWithProducts(params.id);
      
      // Check if order is assigned to this delivery partner
      if (data && data.deliveryPartnerId !== user.id) {
        showToast.error('This order is not assigned to you');
        router.push('/delivery');
        return;
      }
      
      setOrder(data);
      console.log('✅ Loaded order:', data);

      // Load customer details
      if (data) {
        const customerData = await getUserById(data.userId);
        setCustomer(customerData || null);
      }

    } catch (error) {
      console.error('Error loading order:', error);
      showToast.error('Failed to load order details');
      router.push('/delivery');
    } finally {
      setLoading(false);
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

      // Notify customer
      if (newStatus === OrderStatus.CONFIRMED) {
        await createNotification(
          order.userId,
          NotificationType.ORDER_CONFIRMED,
          'Order Confirmed',
          `Your order ${order.orderNumber} has been confirmed`,
          { orderId: order.id, metadata: { orderNumber: order.orderNumber } }
        );
      }
      
      // Notify customer
      if (newStatus === OrderStatus.OUT_FOR_DELIVERY) {
        await createNotification(
          order.userId,
          NotificationType.ORDER_OUT_FOR_DELIVERY,
          'Order Out for Delivery',
          `Your order ${order.orderNumber} is out for delivery`,
          { orderId: order.id, metadata: { orderNumber: order.orderNumber } }
        );
      }
      
      // Notify customer and admin
      if (newStatus === OrderStatus.DELIVERED) {
        
        // Notify customer
        await createNotification(
          order.userId,
          NotificationType.ORDER_DELIVERED,
          'Order Delivered',
          `Your order ${order.orderNumber} has been delivered`,
          { orderId: order.id, metadata: { orderNumber: order.orderNumber } }
        );

        // Notify admin
        const admins = await getUsersByRole(UserRole.ADMIN);
        for (const admin of admins) {
          await createNotification(
            admin.id,
            NotificationType.ORDER_DELIVERED,
            'Order Delivered',
            `${order.orderNumber} delivered by ${order.deliveryPartnerName}`,
            { orderId: order.id, metadata: { orderNumber: order.orderNumber } }
          );
        }
      }

      showToast.dismiss(toastId);
      showToast.success('Order status updated successfully!');
      await loadCurrentUserAndOrder();
    } catch (error) {
      console.error('Error updating order status:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to update order status');
    } finally {
      setUpdating(false);
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

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    if (currentStatus === OrderStatus.PENDING) return OrderStatus.CONFIRMED;
    if (currentStatus === OrderStatus.CONFIRMED) return OrderStatus.OUT_FOR_DELIVERY;
    if (currentStatus === OrderStatus.OUT_FOR_DELIVERY) return OrderStatus.DELIVERED;
    return null;
  };

  const getNextStatusLabel = (currentStatus: OrderStatus): string => {
    const next = getNextStatus(currentStatus);
    if (!next) return '';
    const labels = {
      [OrderStatus.CONFIRMED]: 'Confirm Order',
      [OrderStatus.OUT_FOR_DELIVERY]: 'Mark Out for Delivery',
      [OrderStatus.DELIVERED]: 'Mark as Delivered',
    };
    return labels[next] || '';
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
          <Link href="/delivery" className="btn-primary">
            ← Back to My Deliveries
          </Link>
        </div>
      </div>
    );
  }

  const taxBreakdown = calculateTax();
  const nextStatus = getNextStatus(order.status);
  const canUpdateStatus = nextStatus && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/delivery"
          className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-4 inline-flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to My Deliveries</span>
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
              📍 Order Status
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
                        {item.product?.name || 'Product'} ({item.product?.quantity} {item.product?.unit})
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

          {/* Delivery Slot */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                🕐 Delivery Slot
              </h2>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
              <div className="flex items-center gap-3">
                <span className="text-4xl">
                  {order.deliverySlot === 'morning' ? '🌅' : '🌆'}
                </span>
                <div>
                  <p className="font-semibold text-gray-900 text-lg">
                    {order.deliverySlotLabel || 'Not specified'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    All deliveries arrive during this time
                  </p>
                </div>
              </div>
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

          {/* Delivery Notes */}
          {order.deliveryNotes && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                📝 Delivery Notes
              </h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-gray-900">{order.deliveryNotes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Actions & Summary */}
        <div className="space-y-6">
          {/* Quick Actions */}
          {canUpdateStatus && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                ⚡ Update Status
              </h2>
              <button
                onClick={() => handleStatusUpdate(nextStatus)}
                disabled={updating}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <span>✅</span>
                <span>{updating ? 'Updating...' : getNextStatusLabel(order.status)}</span>
              </button>
            </div>
          )}

          {order.status === OrderStatus.DELIVERED && (
            <div className="card bg-green-50 border border-green-200">
              <div className="text-center py-4">
                <div className="text-4xl mb-2">✅</div>
                <p className="font-semibold text-green-900 mb-1">Order Delivered</p>
                <p className="text-sm text-green-700">
                  {formatDateTime(order.deliveredAt!)}
                </p>
              </div>
            </div>
          )}

          {/* Delivery Information */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              🚚 Delivery Info
            </h2>
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Scheduled Date</p>
                <p className="font-semibold text-gray-900">
                  {formatDate(order.scheduledDeliveryDate)}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Order Type</p>
                <p className="font-semibold text-gray-900">
                  {order.type === 'one_time' ? 'One-Time Order' : 'Subscription'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                <p className="font-semibold text-gray-900">
                  {order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : 
                   order.paymentMethod === 'online' ? '💳 Online Payment' : 
                   order.paymentMethod === 'upi' ? '🔳 UPI Payment' : 
                   '💵 Cash on Delivery'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                <div className="mt-1">
                  {(() => {
                    const status = order.paymentStatus || 'pending';
                    const styles: Record<string, string> = {
                      pending: 'bg-yellow-100 text-yellow-800',
                      pending_verification: 'bg-yellow-100 text-yellow-800',
                      paid: 'bg-green-100 text-green-800',
                      failed: 'bg-red-100 text-red-800',
                    };
                    const labels: Record<string, string> = {
                      pending: '⏳ Pending',
                      pending_verification: '⏳ Pending Verification',
                      paid: '✅ Paid',
                      failed: '❌ Failed',
                    };
                    return (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
                        {labels[status]}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div> 

          {/* Price Summary */}
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
                  <span className="font-bold text-green-600 text-2xl">
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
        </div>
      </div>
    </div>
  );
}