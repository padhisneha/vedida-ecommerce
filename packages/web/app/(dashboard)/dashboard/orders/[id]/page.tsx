'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getOrderByIdWithProducts,
  updateOrderStatus,
  Order,
  OrderStatus,
  formatCurrency,
  formatDate,
  formatDateTime,
  PLATFORM_FEE,
  DELIVERY_FEE,
} from '@ecommerce/shared';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [params.id]);

  const loadOrder = async () => {
    try {
      const data = await getOrderByIdWithProducts(params.id);
      setOrder(data);
      console.log('✅ Loaded order:', data);
    } catch (error) {
      console.error('Error loading order:', error);
      alert('Failed to load order details');
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
    try {
      await updateOrderStatus(order.id, newStatus);
      alert('✅ Order status updated successfully!');
      await loadOrder();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('❌ Failed to update order status');
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
              📍 Delivery Address
            </h2>
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
          </div>

          {/* Delivery Information */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              🚚 Delivery Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Scheduled Delivery</p>
                <p className="font-semibold text-gray-900">
                  {formatDate(order.scheduledDeliveryDate)}
                </p>
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
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                <p className="font-semibold text-gray-900">💵 Cash on Delivery</p>
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
                <p className="text-xs text-gray-500 mt-1 text-right">
                  Payment: Cash on Delivery
                </p>
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