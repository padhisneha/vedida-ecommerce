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
import { RAZORPAY_CONFIG } from '@ecommerce/shared';
import {
  useAuthStore,
  formatCurrency,
  createSubscription,
  UserAddress,
  SubscriptionFrequency,
  SubscriptionStatus,
  SubscriptionItem,
  dateToTimestamp,
  formatDate,
} from '@ecommerce/shared';

type PaymentMethod = 'cod' | 'online';

interface CheckoutItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export const SubscriptionCheckoutScreen = ({ route, navigation }: any) => {
  const {
    items,
    frequency,
    startDate,
    endDate,
    totalDeliveries,
    perDeliveryTotal,
    totalAmount,
  } = route.params;

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
            onPress: () =>
              navigation.navigate('ProfileTab', {
                screen: 'AddAddress',
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

  const getFrequencyText = (freq: SubscriptionFrequency) => {
    switch (freq) {
      case SubscriptionFrequency.DAILY:
        return 'Daily';
      case SubscriptionFrequency.ALTERNATE_DAYS:
        return 'Alternate Days';
      case SubscriptionFrequency.WEEKLY:
        return 'Weekly';
      default:
        return freq;
    }
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
      description: `Dairy Fresh Subscription - ${getFrequencyText(frequency)}`,
      image: RAZORPAY_CONFIG.businessLogo,
      currency: 'INR',
      key: RAZORPAY_CONFIG.keyId,
      amount: Math.round(totalAmount * 100), // Amount in paise
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
      
      if (error.code === RazorpayCheckout.PAYMENT_CANCELLED) {
        throw new Error('Payment cancelled by user');
      } else {
        throw new Error(error.description || 'Payment failed');
      }
    }
  };

  const handleCreateSubscription = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login to create subscription');
      return;
    }

    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      handleSelectAddress();
      return;
    }

    setLoading(true);
    try {
      const subscriptionItems: SubscriptionItem[] = items.map((item: CheckoutItem) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      if (paymentMethod === 'online') {
        // Process online payment first
        try {
          const paymentResult = await handleRazorpayPayment();
          
          // Payment successful, create subscription
          await createSubscription({
            userId: user.id,
            items: subscriptionItems,
            frequency,
            status: SubscriptionStatus.ACTIVE,
            deliveryAddress: selectedAddress,
            startDate: dateToTimestamp(startDate),
            endDate: dateToTimestamp(endDate),
          });

          Alert.alert(
            'Subscription Created! 🎉',
            `Payment Successful!\n\n📦 Deliveries: ${totalDeliveries}\n💰 Amount Paid: ${formatCurrency(totalAmount)}\n📅 First delivery: ${formatDate(dateToTimestamp(startDate))}\n\nPayment ID: ${paymentResult.paymentId.slice(0, 12)}...`,
            [
              {
                text: 'View Subscriptions',
                onPress: () => navigation.navigate('SubscriptionsTab', {
                  screen: 'SubscriptionsList',
                }),
              },
              {
                text: 'Continue Shopping',
                onPress: () => navigation.navigate('HomeTab'),
              },
            ]
          );
        } catch (paymentError: any) {
          Alert.alert(
            'Payment Failed',
            paymentError.message || 'Unable to process payment. Please try again.'
          );
          setLoading(false);
          return;
        }
      } else {
        // Cash on Delivery
        await createSubscription({
          userId: user.id,
          items: subscriptionItems,
          frequency,
          status: SubscriptionStatus.ACTIVE,
          deliveryAddress: selectedAddress,
          startDate: dateToTimestamp(startDate),
          endDate: dateToTimestamp(endDate),
        });

        Alert.alert(
          'Subscription Created! 🎉',
          `Your subscription is now active!\n\n📦 Deliveries: ${totalDeliveries}\n💰 Total Amount: ${formatCurrency(totalAmount)}\n💵 Payment: Cash on Delivery\n📅 First delivery: ${formatDate(dateToTimestamp(startDate))}`,
          [
            {
              text: 'View Subscriptions',
              onPress: () => navigation.navigate('SubscriptionsTab', {
                screen: 'SubscriptionsList',
              }),
            },
            {
              text: 'Continue Shopping',
              onPress: () => navigation.navigate('HomeTab'),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      Alert.alert('Error', error.message || 'Failed to create subscription');
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
                {selectedAddress.city}, {selectedAddress.state} -{' '}
                {selectedAddress.pincode}
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
                  Pay upfront amount in cash
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
                  UPI, Cards, Wallets (Coming Soon)
                </Text>
              </View>
            </View>
            <Text style={styles.paymentOptionIcon}>💳</Text>
          </TouchableOpacity>
        </View>

        {/* Subscription Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Subscription Details</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Frequency</Text>
              <Text style={styles.detailValue}>{getFrequencyText(frequency)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Start Date</Text>
              <Text style={styles.detailValue}>
                {formatDate(dateToTimestamp(startDate))}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>End Date</Text>
              <Text style={styles.detailValue}>
                {formatDate(dateToTimestamp(endDate))}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Deliveries</Text>
              <Text style={styles.detailValue}>{totalDeliveries}</Text>
            </View>
          </View>
        </View>

        {/* Subscription Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Items ({items.length})</Text>
          {items.map((item: CheckoutItem, index: number) => (
            <View key={index} style={styles.orderItem}>
              <View style={styles.orderItemDetails}>
                <Text style={styles.orderItemName}>{item.productName}</Text>
                <Text style={styles.orderItemQuantity}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.orderItemPrice}>
                {formatCurrency(item.price * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        {/* Price Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Payment Summary</Text>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Per Delivery</Text>
              <Text style={styles.priceValue}>
                {formatCurrency(perDeliveryTotal)}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Number of Deliveries</Text>
              <Text style={styles.priceValue}>{totalDeliveries}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Charges</Text>
              <Text style={styles.priceFree}>FREE</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total Amount (Upfront)</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
            </View>
            <View style={styles.paymentNote}>
              <Text style={styles.paymentNoteText}>
                💳 Full payment collected in advance
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Create Subscription Button */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerPrice}>{formatCurrency(totalAmount)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.createButton,
            (!selectedAddress || loading) && styles.buttonDisabled,
          ]}
          onPress={handleCreateSubscription}
          disabled={!selectedAddress || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>
              {paymentMethod === 'cod'
                ? `Pay ${formatCurrency(totalAmount)} (COD)`
                : 'Proceed to Payment'}
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
  detailCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  paymentNote: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  paymentNoteText: {
    fontSize: 12,
    color: '#2e7d32',
    textAlign: 'center',
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
  createButton: {
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
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
});