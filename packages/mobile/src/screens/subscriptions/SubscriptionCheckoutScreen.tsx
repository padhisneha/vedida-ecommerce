// SubscriptionCheckoutScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import RazorpayCheckout from 'react-native-razorpay';
import {
  useAuthStore,
  formatCurrency,
  createSubscription,
  UserAddress,
  DeliverySlot,
  getDeliveryAreaByName,
  getAvailableSlotsForSubscription,
  getDefaultSlotForSubscription,
  getDeliverySlotLabel,
  DELIVERY_SLOT_ICONS,
  DeliveryArea,
  SubscriptionFrequency,
  SubscriptionStatus,
  SubscriptionItem,
  dateToTimestamp,
  formatDate,
  UserRole,
  createNotification,
  NotificationType,
  getUsersByRole,
  getSubscriptionById,
  getApplicableCoupons,
  Offer,
  ProductCategory,
  calculateOfferDiscount,
  generateUPIString, 
  generateTransactionRef,
  PaymentMethod,
  PaymentStatus,
  RAZORPAY_CONFIG,
  UPI_CONFIG,
  TaxBreakdown,
  calculateOrderTotal,
} from '@ecommerce/shared';
import { showToast } from '../../utils/toast';

interface CheckoutItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  priceExcludingTax: number;
  taxCGST: number;
  taxSGST: number;
}

export const SubscriptionCheckoutScreen = ({ route, navigation }: any) => {
  const {
    items,
    frequency,
    startDate,
    endDate,
    totalDeliveries,
    perDeliveryTotal,
    taxBreakdown: initialTaxBreakdown,
    platformFee,
    deliveryFee: baseDeliveryFee,
    totalAmount: initialTotalAmount,
  } = route.params;

  const { user } = useAuthStore();
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.COD);
  const [loading, setLoading] = useState(false);

  // Delivery Slot State
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea | null>(null);
  const [availableSlots, setAvailableSlots] = useState<DeliverySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  // UPI QR state
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [upiString, setUpiString] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [upiPaymentAcknowledged, setUpiPaymentAcknowledged] = useState(false);

  // Coupon state
  const [availableCoupons, setAvailableCoupons] = useState<Offer[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [appliedCoupons, setAppliedCoupons] = useState<Offer[]>([]);
  const [showCouponModal, setShowCouponModal] = useState(false);

  // Recalculated prices with coupons
  const [finalPrices, setFinalPrices] = useState({
    subtotal: initialTaxBreakdown.subtotal,
    discount: 0,
    subtotalAfterDiscount: initialTaxBreakdown.subtotal,
    cgst: initialTaxBreakdown.cgst,
    sgst: initialTaxBreakdown.sgst,
    totalTax: initialTaxBreakdown.totalTax,
    platformFee,
    deliveryFee: baseDeliveryFee,
    total: initialTotalAmount,
    freeDeliveryApplied: false,
  });

  useEffect(() => {
    // Auto-select default address or first address
    if (user && user.addresses.length > 0) {
      const defaultAddr = user.addresses.find((addr) => addr.isDefault);
      setSelectedAddress(defaultAddr || user.addresses[0]);
    }
  }, [user]);

  useEffect(() => {
    if (user && items.length > 0) {
      loadApplicableCoupons();
    }
  }, [user, items]);

  // Load delivery slots when address changes
  useEffect(() => {
    if (selectedAddress) {
      loadDeliverySlots();
    } else {
      setDeliveryArea(null);
      setAvailableSlots([]);
      setSelectedSlot(null);
      setSlotError(null);
    }
  }, [selectedAddress]);

  const loadDeliverySlots = async () => {
    if (!selectedAddress || !selectedAddress.location) {
      setSlotError('Delivery area not specified in address');
      setAvailableSlots([]);
      setSelectedSlot(null);
      return;
    }
    
    setLoadingSlots(true);
    setSlotError(null);
    try {
      // Fetch delivery area by exact name match
      const area = await getDeliveryAreaByName(selectedAddress.location);
      
      if (!area) {
        setSlotError('Delivery area not found. Please contact support.');
        setDeliveryArea(null);
        setAvailableSlots([]);
        setSelectedSlot(null);
        return;
      }
      
      if (!area.active) {
        setSlotError('Delivery is currently unavailable in this area.');
        setDeliveryArea(area);
        setAvailableSlots([]);
        setSelectedSlot(null);
        return;
      }
      
      setDeliveryArea(area);
      
      // Get available slots (NO FLEXIBLE option for subscriptions)
      const slots = getAvailableSlotsForSubscription(area);
      
      if (slots.length === 0) {
        setSlotError('No delivery slots configured for this area. Please contact support.');
        setAvailableSlots([]);
        setSelectedSlot(null);
        return;
      }
      
      setAvailableSlots(slots);
      
      // Auto-select first available slot
      const defaultSlot = getDefaultSlotForSubscription(slots);
      setSelectedSlot(defaultSlot);
      
      console.log('✅ Loaded delivery slots:', slots);
      console.log('✅ Auto-selected slot:', defaultSlot);
    } catch (error) {
      console.error('Error loading delivery slots:', error);
      setSlotError('Failed to load delivery slots. Please try again.');
      setAvailableSlots([]);
      setSelectedSlot(null);
    } finally {
      setLoadingSlots(false);
    }
  };

  const loadApplicableCoupons = async () => {
    if (!user) return;
    
    setLoadingCoupons(true);
    try {
      // Convert items to have product info for validation
      const itemsWithProducts = items.map((item: CheckoutItem) => ({
        productId: item.productId,
        quantity: item.quantity,
        product: {
          name: item.productName,
          price: item.price,
          priceExcludingTax: item.priceExcludingTax,
          taxCGST: item.taxCGST,
          taxSGST: item.taxSGST,
          //category: 'milk', // You may need to pass this from previous screen
        },
      }));
      
      // For subscriptions, check against total amount (all deliveries)
      const coupons = await getApplicableCoupons(
        items, //itemsWithProducts
        initialTaxBreakdown.subtotal,
        'subscription'
      );
      setAvailableCoupons(coupons);
      console.log('✅ Loaded applicable coupons for subscription:', coupons.length);
      
      // Auto-apply free delivery if eligible
      const freeDeliveryCoupon = coupons.find(c => 
        c.couponCode === 'FREEDELIVERY' && 
        (!c.minOrderAmount || initialTaxBreakdown.subtotal >= c.minOrderAmount)
      );
      
      if (freeDeliveryCoupon && baseDeliveryFee > 0) {
        setAppliedCoupons([freeDeliveryCoupon]);
        showToast.success('Free delivery applied automatically!');
      }
    } catch (error) {
      console.error('Error loading coupons:', error);
      showToast.error('Failed to load coupons');
    } finally {
      setLoadingCoupons(false);
    }
  };

  const recalculatePrices = () => {
    const subtotal = initialTaxBreakdown.subtotal;
    let totalDiscount = 0;
    let freeDeliveryApplied = false;

    // Calculate discount from all applied coupons
    appliedCoupons.forEach((coupon) => {
      // Convert items to cart-like format for validation
      const cartItems = items.map((item: CheckoutItem) => ({
        productId: item.productId,
        quantity: item.quantity,
        product: {
          name: item.productName,
          price: item.price,
          priceExcludingTax: item.priceExcludingTax,
          taxCGST: item.taxCGST,
          taxSGST: item.taxSGST,
        },
      }));

      const result = calculateOfferDiscount(cartItems, coupon, subtotal);

      if (result.isValid) {
        totalDiscount += result.discountAmount;

        if (result.freeDeliveryApplied || coupon.includesFreeDelivery) {
          freeDeliveryApplied = true;
        }
      }
    });

    // Calculate subtotal after discount
    const subtotalAfterDiscount = Math.max(0, subtotal - totalDiscount);

    // Recalculate tax on discounted amount
    const taxRate = subtotal > 0 ? (initialTaxBreakdown.totalTax / subtotal) * 100 : 0;
    const newTotalTax = (subtotalAfterDiscount * taxRate) / 100;
    const newCgst = newTotalTax / 2;
    const newSgst = newTotalTax / 2;

    // Apply delivery fee (though it's 0 for subscriptions)
    const deliveryFee = freeDeliveryApplied ? 0 : baseDeliveryFee;

    // Calculate final total
    const total = subtotalAfterDiscount + newTotalTax + platformFee + deliveryFee;

    setFinalPrices({
      subtotal,
      discount: totalDiscount,
      subtotalAfterDiscount,
      cgst: newCgst,
      sgst: newSgst,
      totalTax: newTotalTax,
      platformFee,
      deliveryFee,
      total,
      freeDeliveryApplied,
    });
  };

  const handleApplyCoupon = (coupon: Offer) => {
    // Check if coupon is already applied
    if (appliedCoupons.some((c) => c.id === coupon.id)) {
      showToast.error('This coupon is already applied');
      return;
    }

    // Validate coupon
    const cartItems = items.map((item: CheckoutItem) => ({
      productId: item.productId,
      quantity: item.quantity,
      product: {
        name: item.productName,
        price: item.price,
        priceExcludingTax: item.priceExcludingTax,
        taxCGST: item.taxCGST,
        taxSGST: item.taxSGST,
      },
    }));

    const validation = calculateOfferDiscount(cartItems, coupon, initialTaxBreakdown.subtotal);

    if (!validation.isValid) {
      showToast.error(validation.reason || 'This coupon is not applicable');
      return;
    }

    // Check clubbing rules
    const hasNonFreeDeliveryCoupon = appliedCoupons.some((c) => c.couponCode !== 'FREEDELIVERY');
    const isFreeDeliveryCoupon = coupon.couponCode === 'FREEDELIVERY';

    if (hasNonFreeDeliveryCoupon && !isFreeDeliveryCoupon) {
      showToast.error('You can only apply one discount coupon. FREEDELIVERY can be combined.');
      return;
    }

    if (!isFreeDeliveryCoupon && hasNonFreeDeliveryCoupon) {
      showToast.error('Remove the existing coupon first to apply this one');
      return;
    }

    // Apply coupon
    setAppliedCoupons([...appliedCoupons, coupon]);
    setShowCouponModal(false);

    const savingsText = `You saved ${formatCurrency(validation.discountAmount)}${
      validation.freeDeliveryApplied ? ' + Free Delivery' : ''
    }`;
    showToast.success(`${coupon.title}\n${savingsText}`);
  };

  const handleRemoveCoupon = (couponId: string) => {
    const coupon = appliedCoupons.find((c) => c.id === couponId);
    setAppliedCoupons(appliedCoupons.filter((c) => c.id !== couponId));

    if (coupon) {
      showToast.success(`${coupon.couponCode} removed`);
    }
  };

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
      description: `Vedida Farms Subscription - ${getFrequencyText(frequency)}`,
      image: RAZORPAY_CONFIG.businessLogo,
      currency: 'INR',
      key: RAZORPAY_CONFIG.keyId,
      amount: Math.round(finalPrices.total * 100), // Amount in paise
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

  const createSubscriptionInDatabase = async (transactionRef?: string) => {
    if (!user || !selectedAddress || !selectedSlot) {
      throw new Error('User, address, or delivery slot not available');
    }

    // Prepare subscription items
    const subscriptionItems: SubscriptionItem[] = items.map((item: CheckoutItem) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    const subscriptionData = {
      userId: user.id,
      items: subscriptionItems,
      frequency,
      paymentMethod: paymentMethod,
      paymentStatus:
        paymentMethod === PaymentMethod.COD
          ? PaymentStatus.PENDING
          : paymentMethod === PaymentMethod.UPI
          ? PaymentStatus.PENDING_VERIFICATION
          : PaymentStatus.PAID,
      status: SubscriptionStatus.PENDING,
      deliveryAddress: selectedAddress,
      startDate: dateToTimestamp(startDate),
      endDate: dateToTimestamp(endDate),
      deliverySlot: selectedSlot,
      deliverySlotLabel: getDeliverySlotLabel(selectedSlot),
      // Coupon data
      appliedCoupons: appliedCoupons.map((c) => c.couponCode).filter(Boolean) as string[],
      discountAmount: finalPrices.discount,
      freeDeliveryApplied: finalPrices.freeDeliveryApplied,
    };

    // transaction reference
    if(transactionRef) {
      (subscriptionData as any).transactionId = transactionRef;
    }

    console.log('=== Subscription Creation Debug ===');
    console.log(subscriptionData);
    console.log('========================');

    try {
      const subscriptionId = await createSubscription(subscriptionData);

      // Notify all admins
      const admins = await getUsersByRole(UserRole.ADMIN);
      const subscription = await getSubscriptionById(subscriptionId);
      for (const admin of admins) {
        const notificationTitle =
          paymentMethod === PaymentMethod.UPI
            ? '⏳ UPI Payment Verification Required (Subscription)'
            : 'New Subscription Received';

        const notificationMessage =
          paymentMethod === PaymentMethod.UPI
            ? `Subscription ${subscription?.subscriptionNumber} - Customer claims UPI payment of ${formatCurrency(
                finalPrices.total
              )}. Please verify.`
            : `Subscription ${subscription?.subscriptionNumber} created for ${formatCurrency(
                finalPrices.total
              )}`;

        await createNotification(
          admin.id,
          NotificationType.SUBSCRIPTION_CREATED,
          notificationTitle,
          notificationMessage,
          { subscriptionId, metadata: { subscriptionNumber: subscription?.subscriptionNumber } }
        );
      }

      console.log('✅ Subscription created successfully:', subscriptionId);
      return subscriptionId;
    } catch (error: any) {
      console.error('❌ Subscription creation failed:', error);
      throw error;
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

    if (!selectedSlot) {
      showToast.error('Please select a delivery slot for your subscription');
      return;
    }

    // Handle UPI QR payment flow
    if (paymentMethod === PaymentMethod.UPI) {
      const tempSubId = `TEMP-SUB-${Date.now()}`;
      const txnRef = generateTransactionRef();
      const upiStr = generateUPIString(finalPrices.total, tempSubId, user.name);

      setTransactionRef(txnRef);
      setUpiString(upiStr);
      setShowUPIModal(true);
      return;
    }

    setLoading(true);
    try {
      if (paymentMethod === 'online') {
        // Process online payment first
        try {
          const paymentResult = await handleRazorpayPayment();

          // Payment successful, create subscription
          const subscriptionId = await createSubscriptionInDatabase();

          const savingsMessage =
            finalPrices.discount > 0 ? `\n\nYou saved ${formatCurrency(finalPrices.discount)}!` : '';

          Alert.alert(
            'Subscription Created! 🎉',
            `Payment Successful!\n\n📦 Deliveries: ${totalDeliveries}\n💰 Amount Paid: ${formatCurrency(
              finalPrices.total
            )}\n📅 First delivery: ${formatDate(
              dateToTimestamp(startDate)
            )}\n\nPayment ID: ${paymentResult.paymentId.slice(0, 12)}...${savingsMessage}`,
            [
              {
                text: 'View Subscriptions',
                onPress: () =>
                  navigation.navigate('SubscriptionsTab', {
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
          showToast.error(paymentError.message || 'Unable to process payment');
          setLoading(false);
          return;
        }
      } else {
        // Cash on Delivery
        const subscriptionId = await createSubscriptionInDatabase();

        const savingsMessage =
          finalPrices.discount > 0 ? `\n\nYou saved ${formatCurrency(finalPrices.discount)}!` : '';

        Alert.alert(
          'Subscription Created! 🎉',
          `📦 Deliveries: ${totalDeliveries}\n💰 Total Amount: ${formatCurrency(
            finalPrices.total
          )}\n💵 Payment: Cash on Delivery\n📅 First delivery: ${formatDate(
            dateToTimestamp(startDate)
          )}${savingsMessage}`,
          [
            {
              text: 'View Subscriptions',
              onPress: () =>
                navigation.navigate('SubscriptionsTab', {
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
      showToast.error(error.message || 'Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleUPIPaymentDone = async () => {
    if (!upiPaymentAcknowledged) {
      showToast.error('Please confirm that you have completed the payment');
      return;
    }

    setLoading(true);
    setShowUPIModal(false);

    try {
      const subscriptionId = await createSubscriptionInDatabase(transactionRef);

      const savingsMessage =
        finalPrices.discount > 0 ? `\n\nYou saved ${formatCurrency(finalPrices.discount)}!` : '';

      Alert.alert(
        'Subscription Submitted! ⏳',
        `Your subscription has been submitted and is awaiting payment verification.\n\nSubscription ID: ${subscriptionId.slice(
          0,
          8
        )}\nTransaction Ref: ${transactionRef}\n\nYour subscription will be activated once admin verifies the payment.${savingsMessage}`,
        [
          {
            text: 'View Subscriptions',
            onPress: () =>
              navigation.navigate('SubscriptionsTab', {
                screen: 'SubscriptionsList',
              }),
          },
          {
            text: 'OK',
            onPress: () => navigation.navigate('HomeTab'),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating subscription:', error);
      showToast.error('Failed to create subscription. Please try again.');
    } finally {
      setLoading(false);
      setUpiPaymentAcknowledged(false);
    }
  };

  const handleOpenUPIApp = () => {
    Linking.openURL(upiString).catch((err) => {
      console.error('Error opening UPI app:', err);
      showToast.error('Unable to open UPI app. Please scan the QR code manually.');
    });
  };

  const getCouponSavingsText = (coupon: Offer) => {
    const cartItems = items.map((item: CheckoutItem) => ({
      productId: item.productId,
      quantity: item.quantity,
      product: {
        name: item.productName,
        price: item.price,
        priceExcludingTax: item.priceExcludingTax,
        taxCGST: item.taxCGST,
        taxSGST: item.taxSGST,
      },
    }));

    const validation = calculateOfferDiscount(cartItems, coupon, initialTaxBreakdown.subtotal);

    if (!validation.isValid) return '';

    let text = `Save ${formatCurrency(validation.discountAmount)}`;
    if (validation.freeDeliveryApplied || coupon.includesFreeDelivery) {
      text += ' + Free Delivery';
    }
    return text;
  };

  const isCouponApplied = (couponId: string) => {
    return appliedCoupons.some((c) => c.id === couponId);
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

        {/* Delivery Slot Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🕐 Delivery Slot</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Required</Text>
            </View>
          </View>
          
          <View style={styles.slotImportanceCard}>
            <Text style={styles.slotImportanceIcon}>📌</Text>
            <Text style={styles.slotImportanceText}>
              Your subscription will be delivered at the same time for all deliveries
            </Text>
          </View>
          
          {loadingSlots ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading available slots...</Text>
            </View>
          ) : slotError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <View style={styles.errorContent}>
                <Text style={styles.errorTitle}>Slot Configuration Issue</Text>
                <Text style={styles.errorText}>{slotError}</Text>
                <TouchableOpacity
                  style={styles.contactSupportButton}
                  onPress={() => {
                    // Navigate to support or show contact info
                    Alert.alert(
                      'Contact Support',
                      'Please contact our support team to enable delivery slots for your area.',
                      [
                        { text: 'OK' },
                      ]
                    );
                  }}
                >
                  <Text style={styles.contactSupportText}>📞 Contact Support</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : availableSlots.length > 0 ? (
            <View style={styles.slotsContainer}>
              {availableSlots.map((slot) => {
                const isSelected = selectedSlot === slot;
                const isOnlySlot = availableSlots.length === 1;
                
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.slotOption,
                      isSelected && styles.slotOptionActive,
                    ]}
                    onPress={() => setSelectedSlot(slot)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.slotOptionContent}>
                      <View style={styles.radioButton}>
                        {isSelected && <View style={styles.radioButtonInner} />}
                      </View>
                      <View style={styles.slotDetails}>
                        <View style={styles.slotLabelRow}>
                          <Text style={styles.slotLabel}>
                            {getDeliverySlotLabel(slot)}
                          </Text>
                          {isOnlySlot && (
                            <View style={styles.onlySlotBadge}>
                              <Text style={styles.onlySlotText}>Only available slot</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.slotSubtext}>
                          Consistent delivery time for all {totalDeliveries} deliveries
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.slotIcon}>
                      {DELIVERY_SLOT_ICONS[slot]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.noSlotsCard}>
              <Text style={styles.noSlotsIcon}>📭</Text>
              <Text style={styles.noSlotsTitle}>No Slots Available</Text>
              <Text style={styles.noSlotsText}>
                Please contact support to set up delivery for this area
              </Text>
            </View>
          )}
        </View>

        {/* Coupons Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎟️ Apply Coupons</Text>
            {!loadingCoupons && availableCoupons.length > 0 && (
              <TouchableOpacity onPress={() => setShowCouponModal(true)}>
                <Text style={styles.viewAllText}>
                  View All ({availableCoupons.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingCoupons ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading coupons...</Text>
            </View>
          ) : appliedCoupons.length > 0 ? (
            <View style={styles.appliedCouponsContainer}>
              <View style={styles.appliedCouponsRow}>
                <View style={styles.appliedCouponsLeft}>
                  <Text style={styles.appliedCouponsLabel}>
                    🎟️ Coupons Applied:
                  </Text>
                  <View style={styles.couponCodesRow}>
                    {appliedCoupons.map((coupon, index) => (
                      <View key={coupon.id} style={styles.couponCodeChip}>
                        <Text style={styles.couponCodeText}>{coupon.couponCode}</Text>
                        {coupon.couponCode !== 'FREEDELIVERY' && (
                          <TouchableOpacity
                            onPress={() => handleRemoveCoupon(coupon.id)}
                            style={styles.removeChipButton}
                          >
                            <Text style={styles.removeChipText}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowCouponModal(true)}>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
              {finalPrices.discount > 0 && (
                <Text style={styles.savingsSmallText}>
                  💰 Saving {formatCurrency(finalPrices.discount)}
                </Text>
              )}
            </View>
          ) : availableCoupons.length > 0 ? (
            <TouchableOpacity
              style={styles.applyCouponButton}
              onPress={() => setShowCouponModal(true)}
            >
              <Text style={styles.applyCouponIcon}>🎟️</Text>
              <Text style={styles.applyCouponText}>
                Apply Coupon ({availableCoupons.length} available)
              </Text>
              <Text style={styles.applyCouponChevron}>›</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noCouponsCard}>
              <Text style={styles.noCouponsText}>
                No coupons available for this order
              </Text>
            </View>
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
            onPress={() => setPaymentMethod(PaymentMethod.COD)}
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

          {/* UPI QR Payment */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === PaymentMethod.UPI && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod(PaymentMethod.UPI)}
          >
            <View style={styles.paymentOptionContent}>
              <View style={styles.radioButton}>
                {paymentMethod === PaymentMethod.UPI && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.paymentOptionDetails}>
                <Text style={styles.paymentOptionTitle}>UPI Payment</Text>
                <Text style={styles.paymentOptionSubtitle}>
                  Pay via GPay, PhonePe, Paytm, etc.
                </Text>
                <View style={styles.savingsTagContainer}>
                  <Text style={styles.savingsTag}>💰 Save 2% (No gateway fees)</Text>
                </View>
              </View>
            </View>
            <Text style={styles.paymentOptionIcon}>📱</Text>
          </TouchableOpacity>

          {/* Online Payment (Razorpay) */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'online' && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod(PaymentMethod.ONLINE)}
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

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Price Breakdown</Text>
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Per Delivery</Text>
              <Text style={styles.priceValue}>
                {formatCurrency(perDeliveryTotal)}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal (excl. tax)</Text>
              <Text style={styles.priceValue}>{formatCurrency(finalPrices.subtotal)}</Text>
            </View>

            {finalPrices.discount > 0 && (
              <View style={[styles.priceRow, styles.discountRow]}>
                <Text style={styles.discountLabel}>Coupon Discount</Text>
                <Text style={styles.discountValue}>- {formatCurrency(finalPrices.discount)}</Text>
              </View>
            )}

            {finalPrices.discount > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal after discount</Text>
                <Text style={styles.priceValue}>
                  {formatCurrency(finalPrices.subtotalAfterDiscount)}
                </Text>
              </View>
            )}

            {finalPrices.cgst > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>CGST</Text>
                <Text style={styles.priceValue}>{formatCurrency(finalPrices.cgst)}</Text>
              </View>
            )}

            {finalPrices.sgst > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>SGST</Text>
                <Text style={styles.priceValue}>{formatCurrency(finalPrices.sgst)}</Text>
              </View>
            )}

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Platform Fee</Text>
              <Text style={styles.priceValue}>{formatCurrency(finalPrices.platformFee)}</Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Charges</Text>
              {finalPrices.freeDeliveryApplied && baseDeliveryFee > 0 ? (
                <View style={styles.freeDeliveryContainer}>
                  <Text style={styles.strikethrough}>{formatCurrency(baseDeliveryFee)}</Text>
                  <Text style={styles.priceFree}>FREE</Text>
                </View>
              ) : (
                <Text style={styles.priceFree}>
                  {finalPrices.deliveryFee === 0 ? 'FREE' : formatCurrency(finalPrices.deliveryFee)}
                </Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total Amount (Upfront)</Text>
              <Text style={styles.totalValue}>{formatCurrency(finalPrices.total)}</Text>
            </View>

            {finalPrices.discount > 0 && (
              <View style={styles.savingsCard}>
                <Text style={styles.savingsText}>
                  You're saving {formatCurrency(finalPrices.discount)}!
                </Text>
              </View>
            )}

            <View style={styles.paymentNote}>
              <Text style={styles.paymentNoteText}>
                💳 Full payment collected in advance for {totalDeliveries} deliveries
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Create Subscription Button */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <View>
            <Text style={styles.footerLabel}>Total</Text>
            {finalPrices.discount > 0 && (
              <Text style={styles.footerSavings}>Saved {formatCurrency(finalPrices.discount)}</Text>
            )}
          </View>
          <Text style={styles.footerPrice}>{formatCurrency(finalPrices.total)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.createButton, 
            (!selectedAddress || !selectedSlot || loading) && styles.buttonDisabled
          ]}
          onPress={handleCreateSubscription}
          disabled={!selectedAddress || !selectedSlot || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>
              {paymentMethod === PaymentMethod.COD
                ? `Pay ${formatCurrency(finalPrices.total)} (COD)`
                : paymentMethod === PaymentMethod.UPI
                ? `Pay ${formatCurrency(finalPrices.total)} via UPI`
                : 'Proceed to Payment'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Show warning if slot not selected */}
        {selectedAddress && !selectedSlot && !loadingSlots && (
          <View style={styles.footerWarning}>
            <Text style={styles.footerWarningText}>
              ⚠️ Please select a delivery slot to continue
            </Text>
          </View>
        )}

      </View>

      {/* UPI QR Payment Modal */}
      <Modal
        visible={showUPIModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!loading) {
            setShowUPIModal(false);
            setUpiPaymentAcknowledged(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.upiModalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pay via UPI</Text>
              {!loading && (
                <TouchableOpacity onPress={() => {
                  setShowUPIModal(false);
                  setUpiPaymentAcknowledged(false);
                }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* UPI Payment Content */}
            <ScrollView style={styles.upiModalScroll} contentContainerStyle={styles.upiModalScrollContent}>
              {/* Amount Display */}
              <View style={styles.upiAmountCard}>
                <Text style={styles.upiAmountLabel}>Subscription Amount</Text>
                <Text style={styles.upiAmount}>{formatCurrency(finalPrices.total)}</Text>
                <Text style={styles.upiAmountNote}>
                  {totalDeliveries} deliveries • {getFrequencyText(frequency)}
                </Text>
              </View>

              {/* QR Code */}
              <View style={styles.qrContainer}>
                <View style={styles.qrCodeWrapper}>
                  {upiString && (
                    <QRCode
                      value={upiString}
                      size={220}
                      backgroundColor="white"
                      color="#1a1a1a"
                    />
                  )}
                </View>
                <Text style={styles.qrInstructions}>
                  Scan this QR code with any UPI app
                </Text>
              </View>

              {/* UPI Apps */}
              <View style={styles.upiAppsContainer}>
                <Text style={styles.upiAppsLabel}>Supported UPI Apps</Text>
                <View style={styles.upiAppsList}>
                  {['GPay', 'PhonePe', 'Paytm', 'BHIM', 'Amazon Pay'].map((app) => (
                    <View key={app} style={styles.upiAppChip}>
                      <Text style={styles.upiAppText}>{app}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* OR Divider */}
              <View style={styles.orDivider}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.orLine} />
              </View>

              {/* Open UPI App Button */}
              <TouchableOpacity
                style={styles.openUPIButton}
                onPress={handleOpenUPIApp}
              >
                <Text style={styles.openUPIButtonText}>📱 Open in UPI App</Text>
              </TouchableOpacity>

              {/* Transaction Reference */}
              <View style={styles.transactionRefCard}>
                <Text style={styles.transactionRefLabel}>Transaction Reference</Text>
                <Text style={styles.transactionRefText}>{transactionRef}</Text>
                <Text style={styles.transactionRefNote}>
                  Save this reference for future queries
                </Text>
              </View>

              {/* Payment Instructions */}
              <View style={styles.instructionsCard}>
                <Text style={styles.instructionsTitle}>Payment Instructions:</Text>
                <View style={styles.instructionsList}>
                  <Text style={styles.instructionItem}>1️⃣ Scan QR code or open in UPI app</Text>
                  <Text style={styles.instructionItem}>2️⃣ Complete payment in your UPI app</Text>
                  <Text style={styles.instructionItem}>3️⃣ Check the confirmation box below</Text>
                  <Text style={styles.instructionItem}>4️⃣ Click "Submit Subscription" button</Text>
                </View>
              </View>

              {/* Payment Confirmation Checkbox */}
              <TouchableOpacity
                style={styles.confirmationCheckbox}
                onPress={() => setUpiPaymentAcknowledged(!upiPaymentAcknowledged)}
                activeOpacity={0.7}
              >
                <View style={styles.checkbox}>
                  {upiPaymentAcknowledged && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.confirmationText}>
                  I have completed the UPI payment of {formatCurrency(finalPrices.total)}
                </Text>
              </TouchableOpacity>

              {/* Warning Note */}
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>
                  ⚠️ Your subscription will be activated after admin verifies the payment. This usually takes 5-10 minutes during business hours.
                </Text>
              </View>
            </ScrollView>

            {/* Submit Button */}
            <View style={styles.upiModalFooter}>
              <TouchableOpacity
                style={[
                  styles.submitUPIButton,
                  (!upiPaymentAcknowledged || loading) && styles.submitUPIButtonDisabled,
                ]}
                onPress={handleUPIPaymentDone}
                disabled={!upiPaymentAcknowledged || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitUPIButtonText}>
                    ✅ Submit Subscription
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Coupon Selection Modal */}
      <Modal
        visible={showCouponModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCouponModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Available Coupons</Text>
              <TouchableOpacity onPress={() => setShowCouponModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Coupons List */}
            <ScrollView style={styles.modalScroll}>
              {availableCoupons.map((coupon) => {
                const isApplied = isCouponApplied(coupon.id);
                //const validation = calculateOfferDiscount(cartItems, coupon, initialTaxBreakdown.subtotal);
                
                return (
                  <View
                    key={coupon.id}
                    style={[
                      styles.couponCard,
                      { 
                        backgroundColor: coupon.backgroundColor,
                        borderColor: isApplied ? '#4CAF50' : 'transparent',
                        borderWidth: isApplied ? 2 : 0,
                      }
                    ]}
                  >
                    <View style={styles.couponDashedBorder}>
                      <View style={styles.couponContent}>
                        <View style={styles.couponLeft}>
                          <Text style={[styles.couponTitle, { color: coupon.textColor }]}>
                            {coupon.title}
                          </Text>
                          <Text style={[styles.couponDescription, { color: coupon.textColor }]}>
                            {coupon.description}
                          </Text>
                          
                          {coupon.couponCode && (
                            <View style={styles.couponCodeContainer}>
                              <Text style={[styles.couponCode, { color: coupon.textColor }]}>
                                {coupon.couponCode}
                              </Text>
                            </View>
                          )}
                          
                          <Text style={[styles.savingsText2, { color: coupon.textColor }]}>
                            💰 {getCouponSavingsText(coupon)}
                          </Text>
                          
                          {/* Applicable categories */}
                          {coupon.applicableCategories && coupon.applicableCategories.length > 0 && (
                            <Text style={[styles.categoryText, { color: coupon.textColor }]}>
                              Valid on: {coupon.applicableCategories.join(', ')}
                            </Text>
                          )}
                        </View>

                        <View style={styles.couponRight}>
                          {isApplied ? (
                            <View style={styles.appliedBadge}>
                              <Text style={styles.appliedBadgeText}>✅</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.applyButton}
                              onPress={() => handleApplyCoupon(coupon)}
                            >
                              <Text style={styles.applyButtonText}>Apply</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  radioButton1: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner1: {
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
  footerSavings: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  upiModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalClose: {
    fontSize: 28,
    color: '#999',
  },
  upiModalScroll: {
    maxHeight: '80%',
  },
  upiModalScrollContent: {
    padding: 20,
  },
  upiAmountCard: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  upiAmountLabel: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 8,
    fontWeight: '600',
  },
  upiAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  upiAmountNote: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 4,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrCodeWrapper: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  qrInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  upiAppsContainer: {
    marginBottom: 24,
  },
  upiAppsLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  upiAppsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  upiAppChip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  upiAppText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  orText: {
    paddingHorizontal: 16,
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
  },
  openUPIButton: {
    backgroundColor: '#5f6368',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  openUPIButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionRefCard: {
    backgroundColor: '#FFF9C4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FBC02D',
  },
  transactionRefLabel: {
    fontSize: 12,
    color: '#F57F17',
    marginBottom: 6,
    fontWeight: '600',
  },
  transactionRefText: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#1a1a1a',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transactionRefNote: {
    fontSize: 11,
    color: '#F57F17',
  },
  instructionsCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 12,
  },
  instructionsList: {
    gap: 8,
  },
  instructionItem: {
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 20,
  },
  confirmationCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  confirmationText: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
    fontWeight: '500',
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB300',
  },
  warningText: {
    fontSize: 12,
    color: '#E65100',
    lineHeight: 18,
  },
  upiModalFooter: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitUPIButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitUPIButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitUPIButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  savingsTagContainer: {
    marginTop: 4,
  },
  savingsTag: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
  },
  appliedCouponContent: {
    flex: 1,
  },
  appliedCouponTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appliedCouponCode: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '600',
    marginBottom: 6,
  },
  appliedCouponSavings: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 11,
    opacity: 0.8,
    marginTop: 4,
  },
  removeCouponButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeCouponText: {
    fontSize: 18,
    color: '#fff',
  },
  browseCouponsButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  browseCouponsText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  applyCouponButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  applyCouponIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  applyCouponText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
  },
  applyCouponChevron: {
    fontSize: 24,
    color: '#4CAF50',
  },
  noCouponsCard: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    alignItems: 'center',
  },
  noCouponsText: {
    fontSize: 14,
    color: '#999',
  },
  modalScroll: {
    padding: 16,
  },
  couponCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  couponDashedBorder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12,
    padding: 14,
  },
  couponContent: {
    flexDirection: 'row',
    gap: 12,
  },
  couponLeft: {
    flex: 1,
  },
  couponRight: {
    justifyContent: 'center',
  },
  couponTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  couponDescription: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  couponCodeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 6,
  },
  couponCode: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  applyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  appliedBadge: {
    backgroundColor: '#4CAF50',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appliedBadgeText: {
    fontSize: 24,
  },
  appliedCouponsContainer: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  appliedCouponsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  appliedCouponsLeft: {
    flex: 1,
  },
  appliedCouponsLabel: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 6,
  },
  couponCodesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  couponCodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  couponCodeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  removeChipButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeChipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  savingsSmallText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  discountRow: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  discountLabel: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  discountValue: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '700',
  },
  freeDeliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  strikethrough: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  savingsCard: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  savingsText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  savingsText2: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  // Delivery Slot Styles
  requiredBadge: {
    backgroundColor: '#FEE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  requiredText: {
    fontSize: 11,
    color: '#D32F2F',
    fontWeight: '700',
  },
  slotImportanceCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginBottom: 12,
    gap: 8,
  },
  slotImportanceIcon: {
    fontSize: 16,
  },
  slotImportanceText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
    fontWeight: '500',
  },
  slotsContainer: {
    gap: 12,
  },
  slotOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  slotOptionActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  slotOptionContent: {
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
  slotDetails: {
    flex: 1,
  },
  slotLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  slotLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  onlySlotBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  onlySlotText: {
    fontSize: 10,
    color: '#1565C0',
    fontWeight: '600',
  },
  slotSubtext: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  slotIcon: {
    fontSize: 32,
  },
  errorCard: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EF5350',
    gap: 12,
  },
  errorIcon: {
    fontSize: 24,
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#C62828',
    marginBottom: 4,
  },
  contactSupportButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  contactSupportText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  noSlotsCard: {
    padding: 24,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFB300',
  },
  noSlotsIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noSlotsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 8,
  },
  noSlotsText: {
    fontSize: 13,
    color: '#F57F17',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerWarning: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  footerWarningText: {
    fontSize: 13,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '600',
  },
});