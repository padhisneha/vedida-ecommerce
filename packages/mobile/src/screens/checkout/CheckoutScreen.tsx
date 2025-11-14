import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import {
  useAuthStore,
  formatCurrency,
  createOrder,
  clearCart,
  UserAddress,
  OrderType,
  OrderStatus,
  CartItem,
  dateToTimestamp,
  TaxBreakdown,
  RAZORPAY_CONFIG,
} from '@ecommerce/shared';

type PaymentMethod = 'cod' | 'online';

export const CheckoutScreen = ({ route, navigation }: any) => {
  const { cartItems, taxBreakdown, platformFee, deliveryFee, total } = route.params;
  const { user } = useAuthStore();
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Auto-select default address or first address
    if (user && user.addresses.length > 0) {
      const defaultAddr = user.addresses.find((addr) => addr.isDefault);
      setSelectedAddress(defaultAddr || user.addresses[0]);
    }
  }, [user]);

  const handleSelectAddress = () => {
    if (!user || user.addresses.length === 0) {
      Alert.alert(
        'No Addresses',
        'You need to add a delivery address first.',
        [
          {
            text: 'Add Address',
            onPress: () => navigation.navigate('ProfileTab', {
              screen: 'AddAddress',
              params: { returnTo: 'Checkout' }
            }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    navigation.navigate('SelectAddress', {
      currentAddressId: selectedAddress?.id,
      onSelect: (address: UserAddress) => {
        setSelectedAddress(address);
      },
    });
  };

  const createOrderInDatabase = async () => {
    if (!user || !selectedAddress) {
      throw new Error('User or address not available');
    }

    // Prepare order items
    const orderItems = cartItems.map((item: CartItem) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.product?.price || 0,
    }));

    // Calculate delivery date (next day)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 1);
    deliveryDate.setHours(7, 0, 0, 0); // 7 AM delivery

    // Create order
    const orderId = await createOrder({
      userId: user.id,
      type: OrderType.ONE_TIME,
      items: orderItems,
      totalAmount: total,
      deliveryAddress: selectedAddress,
      status: OrderStatus.PENDING,
      scheduledDeliveryDate: dateToTimestamp(deliveryDate),
    });

    return orderId;
  };

  const handleRazorpayPayment = async (): Promise<{
    success: boolean;
    paymentId: string;
    orderId?: string;
    signature?: string;
  }> => {
    if (!user || !selectedAddress) {
      throw new Error('User or address not available');
    }

    const options = {
      description: 'Vedida Farms Order',
      image: RAZORPAY_CONFIG.businessLogo,
      currency: 'INR',
      key: RAZORPAY_CONFIG.keyId,
      amount: Math.round(total * 100), // Amount in paise (₹1 = 100 paise)
      name: RAZORPAY_CONFIG.businessName,
      prefill: {
        email: user.email || '',
        contact: user.phoneNumber || '',
        name: user.name || '',
      },
      theme: { color: RAZORPAY_CONFIG.themeColor },
    };

    try {
      const data = await RazorpayCheckout.open(options);
      
      // Payment successful
      console.log('✅ Payment Success:', data);
      
      return {
        success: true,
        paymentId: data.razorpay_payment_id,
        orderId: data.razorpay_order_id,
        signature: data.razorpay_signature,
      };
    } catch (error: any) {
      console.log('❌ Payment Error:', error);
      
      // User cancelled or payment failed
      if (error.code === RazorpayCheckout.PAYMENT_CANCELLED) {
        throw new Error('Payment cancelled by user');
      } else {
        throw new Error(error.description || 'Payment failed');
      }
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login to place an order');
      return;
    }

    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      handleSelectAddress();
      return;
    }

    setLoading(true);
    try {
      let orderId: string;

      if (paymentMethod === 'online') {
        // Process online payment first
        try {
          const paymentResult = await handleRazorpayPayment();
          
          // Create order after successful payment
          orderId = await createOrderInDatabase();
          
          // Store payment details
          console.log('Payment ID:', paymentResult.paymentId);
          
          // Clear cart
          await clearCart(user.id);

          Alert.alert(
            'Payment Successful! 🎉',
            `Your order has been placed successfully.\n\nOrder ID: ${orderId.slice(0, 8)}\nPayment ID: ${paymentResult.paymentId.slice(0, 12)}...\n\nDelivery: Tomorrow at 7 AM`,
            [
              {
                text: 'View Orders',
                onPress: () => navigation.navigate('ProfileTab', {
                  screen: 'OrderHistory',
                }),
              },
              {
                text: 'Continue Shopping',
                onPress: () => navigation.navigate('HomeTab'),
              },
            ]
          );
        } catch (paymentError: any) {
          // Payment failed or cancelled
          Alert.alert(
            'Payment Failed',
            paymentError.message || 'Unable to process payment. Please try again.'
          );
          setLoading(false);
          return;
        }
      } else {
        // Cash on Delivery
        orderId = await createOrderInDatabase();
        
        // Clear cart after successful order
        await clearCart(user.id);

        Alert.alert(
          'Order Placed Successfully! 🎉',
          `Your order will be delivered tomorrow at 7 AM.\n\nOrder ID: ${orderId.slice(0, 8)}\nPayment: Cash on Delivery`,
          [
            {
              text: 'View Orders',
              onPress: () => navigation.navigate('ProfileTab', {
                screen: 'OrderHistory',
              }),
            },
            {
              text: 'Continue Shopping',
              onPress: () => navigation.navigate('HomeTab'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Please login to checkout</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Delivery Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📍 Delivery Address</Text>
            <TouchableOpacity onPress={handleSelectAddress}>
              <Text style={styles.changeText}>
                {selectedAddress ? 'Change' : 'Select'}
              </Text>
            </TouchableOpacity>
          </View>

          {selectedAddress ? (
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <Text style={styles.addressLabel}>{selectedAddress.label}</Text>
                {selectedAddress.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>DEFAULT</Text>
                  </View>
                )}
              </View>
              <Text style={styles.addressText}>
                {selectedAddress.apartment && `${selectedAddress.apartment}, `}
                {selectedAddress.street}
              </Text>
              <Text style={styles.addressText}>
                {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
              </Text>
              {selectedAddress.landmark && (
                <Text style={styles.landmarkText}>
                  📍 {selectedAddress.landmark}
                </Text>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addAddressButton}
              onPress={handleSelectAddress}
            >
              <Text style={styles.addAddressText}>+ Add Delivery Address</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Method Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Payment Method</Text>

          {/* Cash on Delivery */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'cod' && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod('cod')}
          >
            <View style={styles.paymentOptionContent}>
              <View style={styles.radioButton}>
                {paymentMethod === 'cod' && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.paymentOptionDetails}>
                <Text style={styles.paymentOptionTitle}>Cash on Delivery</Text>
                <Text style={styles.paymentOptionSubtitle}>
                  Pay when you receive your order
                </Text>
              </View>
            </View>
            <Text style={styles.paymentOptionIcon}>💵</Text>
          </TouchableOpacity>

          {/* Online Payment */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'online' && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod('online')}
          >
            <View style={styles.paymentOptionContent}>
              <View style={styles.radioButton}>
                {paymentMethod === 'online' && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.paymentOptionDetails}>
                <Text style={styles.paymentOptionTitle}>Online Payment</Text>
                <Text style={styles.paymentOptionSubtitle}>
                  UPI, Cards, Wallets via Razorpay
                </Text>
              </View>
            </View>
            <Text style={styles.paymentOptionIcon}>💳</Text>
          </TouchableOpacity>
        </View>

        {/* Order Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Order Items ({cartItems.length})</Text>
          {cartItems.map((item: CartItem, index: number) => (
            <View key={index} style={styles.orderItem}>
              <View style={styles.orderItemDetails}>
                <Text style={styles.orderItemName}>{item.product?.name}</Text>
                <Text style={styles.orderItemQuantity}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.orderItemPrice}>
                {formatCurrency((item.product?.price || 0) * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        {/* Delivery Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚚 Delivery Information</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>📅 Estimated Delivery: Tomorrow at 7 AM</Text>
            <Text style={styles.infoText}>📦 Packaging: Sealed and hygienic</Text>
            <Text style={styles.infoText}>
              💰 Payment: {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
            </Text>
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Price Details</Text>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal (excl. tax)</Text>
              <Text style={styles.priceValue}>
                {formatCurrency(taxBreakdown.subtotal)}
              </Text>
            </View>
            
            {taxBreakdown.cgst > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>CGST</Text>
                <Text style={styles.priceValue}>
                  {formatCurrency(taxBreakdown.cgst)}
                </Text>
              </View>
            )}
            
            {taxBreakdown.sgst > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>SGST</Text>
                <Text style={styles.priceValue}>
                  {formatCurrency(taxBreakdown.sgst)}
                </Text>
              </View>
            )}
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Platform Fee</Text>
              <Text style={styles.priceValue}>{formatCurrency(platformFee)}</Text>
            </View>
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Charges</Text>
              <Text style={styles.priceFree}>
                {deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}
              </Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerPrice}>{formatCurrency(total)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderButton, (!selectedAddress || loading) && styles.buttonDisabled]}
          onPress={handlePlaceOrder}
          disabled={!selectedAddress || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderText}>
              {paymentMethod === 'cod' ? 'Place Order (COD)' : `Pay ${formatCurrency(total)}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  changeText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  addressCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
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
  addAddressButton: {
    backgroundColor: '#f0f9ff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addAddressText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  paymentOptionActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  paymentOptionDetails: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  paymentOptionSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  paymentOptionIcon: {
    fontSize: 28,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orderItemQuantity: {
    fontSize: 14,
    color: '#999',
  },
  orderItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  infoCard: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    marginBottom: 8,
    lineHeight: 20,
  },
  priceCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  priceFree: {
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  bottomSpacer: {
    height: 20,
  },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 20,
    paddingBottom: 30,
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerLabel: {
    fontSize: 16,
    color: '#666',
  },
  footerPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeOrderButton: {
    backgroundColor: '#4CAF50',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
});