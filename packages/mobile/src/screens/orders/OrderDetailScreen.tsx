import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  getOrderByIdWithProducts,
  Order,
  OrderStatus,
  formatCurrency,
  formatDate,
  formatDateTime,
} from '@ecommerce/shared';

export const OrderDetailScreen = ({ route, navigation }: any) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const data = await getOrderByIdWithProducts(orderId); // Changed
      setOrder(data);
      
      if (data) {
        console.log('✅ Loaded order with products:', {
          orderId: data.id,
          itemCount: data.items.length,
          firstProduct: data.items[0]?.product?.name || 'NO PRODUCT',
        });
      }
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  // Add this after the order is loaded
  const calculateOrderTaxBreakdown = () => {
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
    switch (status) {
      case OrderStatus.DELIVERED:
        return '#4CAF50';
      case OrderStatus.OUT_FOR_DELIVERY:
        return '#2196F3';
      case OrderStatus.CONFIRMED:
        return '#FF9800';
      case OrderStatus.PENDING:
        return '#FFC107';
      case OrderStatus.CANCELLED:
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.DELIVERED:
        return 'Delivered';
      case OrderStatus.OUT_FOR_DELIVERY:
        return 'Out for Delivery';
      case OrderStatus.CONFIRMED:
        return 'Confirmed';
      case OrderStatus.PENDING:
        return 'Pending';
      case OrderStatus.CANCELLED:
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.DELIVERED:
        return '✅';
      case OrderStatus.OUT_FOR_DELIVERY:
        return '🚚';
      case OrderStatus.CONFIRMED:
        return '📋';
      case OrderStatus.PENDING:
        return '⏳';
      case OrderStatus.CANCELLED:
        return '❌';
      default:
        return '📦';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorTitle}>Order Not Found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = getStatusColor(order.status);
  const statusIcon = getStatusIcon(order.status);

  return (
    <View style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.placeholder} />
      </View> */}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusIcon}>{statusIcon}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
          </View>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <Text style={styles.orderDate}>
            Placed on {formatDate(order.createdAt)}
          </Text>
        </View>

        {/* Delivery Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Delivery Timeline</Text>
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.timelineDotActive]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Order Placed</Text>
                <Text style={styles.timelineDate}>
                  {formatDateTime(order.createdAt)}
                </Text>
              </View>
            </View>

            {order.status !== OrderStatus.CANCELLED && (
              <>
                <View style={styles.timelineLine} />
                <View style={styles.timelineItem}>
                  <View
                    style={[
                      styles.timelineDot,
                      (order.status === OrderStatus.CONFIRMED ||
                        order.status === OrderStatus.OUT_FOR_DELIVERY ||
                        order.status === OrderStatus.DELIVERED) &&
                        styles.timelineDotActive,
                    ]}
                  />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Confirmed</Text>
                    <Text style={styles.timelineDate}>
                      {order.status === OrderStatus.PENDING
                        ? 'Pending confirmation'
                        : 'Order confirmed'}
                    </Text>
                  </View>
                </View>

                <View style={styles.timelineLine} />
                <View style={styles.timelineItem}>
                  <View
                    style={[
                      styles.timelineDot,
                      (order.status === OrderStatus.OUT_FOR_DELIVERY ||
                        order.status === OrderStatus.DELIVERED) &&
                        styles.timelineDotActive,
                    ]}
                  />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Out for Delivery</Text>
                    <Text style={styles.timelineDate}>
                      {order.status === OrderStatus.OUT_FOR_DELIVERY
                        ? 'On the way'
                        : order.status === OrderStatus.DELIVERED
                        ? 'Delivered'
                        : 'Not yet dispatched'}
                    </Text>
                  </View>
                </View>

                <View style={styles.timelineLine} />
                <View style={styles.timelineItem}>
                  <View
                    style={[
                      styles.timelineDot,
                      order.status === OrderStatus.DELIVERED && styles.timelineDotActive,
                    ]}
                  />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Delivered</Text>
                    <Text style={styles.timelineDate}>
                      {order.deliveredAt
                        ? formatDateTime(order.deliveredAt)
                        : `Expected: ${formatDate(order.scheduledDeliveryDate)}`}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {order.status === OrderStatus.CANCELLED && (
              <>
                <View style={styles.timelineLine} />
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, styles.timelineDotCancelled]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Cancelled</Text>
                    <Text style={styles.timelineDate}>Order was cancelled</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Items ({order.items.length})</Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemPlaceholder}>
                <Text style={styles.itemPlaceholderText}>📦</Text>
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.product?.name || 'Product'}</Text>
                <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
                <Text style={styles.itemPrice}>
                  {formatCurrency(item.price)} × {item.quantity}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                {formatCurrency(item.price * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Delivery Address</Text>
          <View style={styles.addressCard}>
            <Text style={styles.addressLabel}>{order.deliveryAddress.label}</Text>
            <Text style={styles.addressText}>
              {order.deliveryAddress.apartment &&
                `${order.deliveryAddress.apartment}, `}
              {order.deliveryAddress.street}
            </Text>
            <Text style={styles.addressText}>
              {order.deliveryAddress.city}, {order.deliveryAddress.state} -{' '}
              {order.deliveryAddress.pincode}
            </Text>
            {order.deliveryAddress.landmark && (
              <Text style={styles.landmarkText}>
                📍 {order.deliveryAddress.landmark}
              </Text>
            )}
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Payment Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal (excl. tax)</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(calculateOrderTaxBreakdown().subtotal)}
              </Text>
            </View>
            
            {calculateOrderTaxBreakdown().cgst > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>CGST</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(calculateOrderTaxBreakdown().cgst)}
                </Text>
              </View>
            )}
            
            {calculateOrderTaxBreakdown().sgst > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SGST</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(calculateOrderTaxBreakdown().sgst)}
                </Text>
              </View>
            )}
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Fee</Text>
              <Text style={styles.summaryValue}>{formatCurrency(5)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Charges</Text>
              <Text style={styles.summaryFree}>FREE</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(order.totalAmount)}
              </Text>
            </View>
            
            <View style={styles.paymentMethodCard}>
              <Text style={styles.paymentMethodText}>
                💵 Payment Method: Cash on Delivery
              </Text>
            </View>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❓ Need Help?</Text>
          <TouchableOpacity style={styles.helpButton}>
            <Text style={styles.helpButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backIcon: {
    fontSize: 32,
    color: '#4CAF50',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  orderNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginTop: 4,
  },
  timelineDotActive: {
    backgroundColor: '#4CAF50',
  },
  timelineDotCancelled: {
    backgroundColor: '#f44336',
  },
  timelineLine: {
    width: 2,
    height: 30,
    backgroundColor: '#e0e0e0',
    marginLeft: 7,
  },
  timelineContent: {
    marginLeft: 16,
    flex: 1,
    paddingBottom: 8,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 13,
    color: '#666',
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  itemPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemPlaceholderText: {
    fontSize: 24,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 12,
    color: '#999',
  },
  itemTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  addressCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  landmarkText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  summaryFree: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  paymentMethodCard: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '500',
  },
  helpButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
  errorEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});