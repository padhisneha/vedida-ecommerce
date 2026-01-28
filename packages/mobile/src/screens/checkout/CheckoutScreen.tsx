// CheckoutScreen.tsx
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
  createOrder,
  clearCart,
  UserAddress,
  OrderType,
  OrderStatus,
  CartItem,
  dateToTimestamp,
  RAZORPAY_CONFIG,
  UPI_CONFIG,
  PaymentMethod, 
  PaymentStatus,
  UserRole,
  getUsersByRole,
  NotificationType,
  createNotification,
  getOrderById,
  getApplicableCoupons,
  Offer,
  ProductCategory,
  calculateOfferDiscount,
  generateUPIString,
  generateTransactionRef,
  DeliverySlot,
  getDeliveryAreaByName,
  getAvailableSlotsForOrder,
  getDefaultSlotForOrder,
  getDeliverySlotLabel,
  DELIVERY_SLOT_ICONS,
  DeliveryArea,
  checkStockAvailability,
} from '@ecommerce/shared';
import { showToast } from '../../utils/toast';

export const CheckoutScreen = ({ route, navigation }: any) => {
  const { cartItems, taxBreakdown: initialTaxBreakdown, platformFee, deliveryFee: baseDeliveryFee, total: initialTotal } = route.params;
  const { user } = useAuthStore();
  
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.COD);
  const [loading, setLoading] = useState(false);
  const [submittingUPI, setSubmittingUPI] = useState(false); // For UPI submission only

  // Delivery slot state
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea | null>(null);
  const [availableSlots, setAvailableSlots] = useState<DeliverySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

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
    total: initialTotal,
    freeDeliveryApplied: false,
  });

  useEffect(() => {
    // Auto-select default address or first address
    if (user && user.addresses.length > 0) {
      const defaultAddr = user.addresses.find((addr) => addr.isDefault);
      setSelectedAddress(defaultAddr || user.addresses[0]);
    }
  }, [user]);

  // Load slots when address changes
  useEffect(() => {
    if (selectedAddress) {
      loadDeliverySlots();
    } else {
      setDeliveryArea(null);
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  }, [selectedAddress]);

  useEffect(() => {
    if (user) {
      loadApplicableCoupons();
    }
  }, [user, cartItems]);

  useEffect(() => {
    recalculatePrices();
  }, [appliedCoupons]);

  const loadDeliverySlots = async () => {
    if (!selectedAddress || !selectedAddress.location) {
      console.log('⚠️ No location in selected address');
      // Default to FLEXIBLE if no location
      setAvailableSlots([DeliverySlot.FLEXIBLE]);
      setSelectedSlot(DeliverySlot.FLEXIBLE);
      return;
    }
    
    setLoadingSlots(true);
    try {
      // Fetch delivery area by exact name match
      const area = await getDeliveryAreaByName(selectedAddress.location);
      setDeliveryArea(area);
      
      // Get available slots (includes FLEXIBLE)
      const slots = getAvailableSlotsForOrder(area);
      setAvailableSlots(slots);
      
      // Auto-select default slot
      const defaultSlot = getDefaultSlotForOrder(slots);
      setSelectedSlot(defaultSlot);
      
      console.log('✅ Loaded delivery slots:', slots);
      console.log('✅ Auto-selected slot:', defaultSlot);
    } catch (error) {
      console.error('Error loading delivery slots:', error);
      // Fallback to FLEXIBLE only
      setAvailableSlots([DeliverySlot.FLEXIBLE]);
      setSelectedSlot(DeliverySlot.FLEXIBLE);
    } finally {
      setLoadingSlots(false);
    }
  };

  const loadApplicableCoupons = async () => {
    if (!user) return;
    
    setLoadingCoupons(true);
    try {
      const coupons = await getApplicableCoupons(cartItems, initialTaxBreakdown.subtotal);
      setAvailableCoupons(coupons);
      console.log('✅ Loaded applicable coupons:', coupons.length);
      
      // Auto-apply free delivery if eligible
      const freeDeliveryCoupon = coupons.find(c => 
        c.couponCode === 'FREEDELIVERY' && 
        (!c.minOrderAmount || initialTaxBreakdown.subtotal >= c.minOrderAmount)
      );
      
      if (freeDeliveryCoupon) {
        setAppliedCoupons([freeDeliveryCoupon]);
        showToast.success('Free delivery applied automatically! 🎉');
        console.log('✅ Auto-applied FREEDELIVERY coupon');
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
    appliedCoupons.forEach(coupon => {
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
    // Assuming tax rates from original breakdown
    const taxRate = subtotal > 0 ? (initialTaxBreakdown.totalTax / subtotal) * 100 : 0;
    const newTotalTax = (subtotalAfterDiscount * taxRate) / 100;
    const newCgst = newTotalTax / 2;
    const newSgst = newTotalTax / 2;
    
    // Apply delivery fee
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
    if (appliedCoupons.some(c => c.id === coupon.id)) {
      showToast.error('This coupon is already applied');
      return;
    }
    
    // Validate coupon
    const validation = calculateOfferDiscount(cartItems, coupon, initialTaxBreakdown.subtotal);
    
    if (!validation.isValid) {
      showToast.error(validation.reason || 'This coupon is not applicable');
      return;
    }
    
    // Check clubbing rules
    const hasNonFreeDeliveryCoupon = appliedCoupons.some(c => c.couponCode !== 'FREEDELIVERY');
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
    
    const savingsText = `You saved ${formatCurrency(validation.discountAmount)}${validation.freeDeliveryApplied ? ' + Free Delivery' : ''}`;
    showToast.success(`${coupon.title}\n${savingsText}`);
  };

  const handleRemoveCoupon = (couponId: string) => {
    const coupon = appliedCoupons.find(c => c.id === couponId);
    setAppliedCoupons(appliedCoupons.filter(c => c.id !== couponId));
    
    if (coupon) {
      showToast.success(`${coupon.couponCode} removed`);
    }
  };

  // const handleRemoveCoupon = (couponId: string) => {
  //   setAppliedCoupons(appliedCoupons.filter(c => c.id !== couponId));
  // };

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

  const createOrderInDatabase = async (transactionRef?: string) => {
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
    deliveryDate.setHours(7, 0, 0, 0);

    const orderData = {
      userId: user.id,
      type: OrderType.ONE_TIME,
      items: orderItems,
      totalAmount: finalPrices.total,
      deliveryAddress: selectedAddress,
      paymentMethod: paymentMethod,
      paymentStatus: 
        paymentMethod === PaymentMethod.COD ? PaymentStatus.PENDING :
        paymentMethod === PaymentMethod.UPI ? PaymentStatus.PENDING_VERIFICATION :
        PaymentStatus.PAID,
      status: OrderStatus.PENDING,
      scheduledDeliveryDate: dateToTimestamp(deliveryDate),
      deliverySlot: selectedSlot || DeliverySlot.FLEXIBLE,
      deliverySlotLabel: selectedSlot ? getDeliverySlotLabel(selectedSlot) : 'Flexible Delivery',
      // Coupon data
      appliedCoupons: appliedCoupons.map(c => c.couponCode).filter(Boolean) as string[],
      discountAmount: finalPrices.discount,
      freeDeliveryApplied: finalPrices.freeDeliveryApplied,
    };

    // transaction reference
    if(transactionRef) {
      (orderData as any).transactionId = transactionRef;
    }

    console.log('=== Order Creation Debug ===');
    console.log(orderData);
    console.log('========================');

    try {
      const orderId = await createOrder(orderData);

      // Notify all admins
      const admins = await getUsersByRole(UserRole.ADMIN);
      const order = await getOrderById(orderId);

      for (const admin of admins) {
        const notificationTitle = 
          paymentMethod === PaymentMethod.UPI 
            ? '⏳ UPI Payment Verification Required'
            : 'New Order Received';
            
        const notificationMessage = 
          paymentMethod === PaymentMethod.UPI
            ? `Order ${order?.orderNumber} - Customer claims UPI payment of ${formatCurrency(finalPrices.total)}. Please verify.`
            : `Order ${order?.orderNumber} placed for ${formatCurrency(finalPrices.total)}`;
        
        await createNotification(
          admin.id,
          NotificationType.ORDER_PLACED,
          notificationTitle,
          notificationMessage,
          { orderId, metadata: { orderNumber: order?.orderNumber, amount: finalPrices.total } }
        );
      }

      console.log('✅ Order created successfully:', orderId);
      return orderId;
    } catch (error: any) {
      console.error('❌ Order creation failed:', error);
      throw error;
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
      key: RAZORPAY_CONFIG.keyId,
      amount: Math.round(finalPrices.total * 100),
      currency: 'INR',
      name: RAZORPAY_CONFIG.businessName,
      description: 'Vedida Farms Order',
      //image: RAZORPAY_CONFIG.businessLogo,
      prefill: {
        email: user.email || '',
        contact: user.phoneNumber || '',
        name: user.name || '',
      },
      theme: { color: RAZORPAY_CONFIG.themeColor },
    };

    console.log('Opening Razorpay with options:', options);

    try {
      const data = await RazorpayCheckout.open(options);
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

  const handlePlaceOrder = async () => {
    if (!user) {
      showToast.error('Please login to place an order');
      return;
    }

    if (!selectedAddress) {
      showToast.error('Please select a delivery address');
      handleSelectAddress();
      return;
    }

    // Validate stock availability
    try {
      const stockCheck = await checkStockAvailability(
        cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        }))
      );
      
      if (!stockCheck.available) {
        setLoading(false);
        
        const insufficientItems = stockCheck.insufficientItems
          .map(item => `${item.productName}: Need ${item.required}, Only ${item.available} available`)
          .join('\n');
        
        Alert.alert(
          'Insufficient Stock',
          `Some items in your cart are out of stock or low:\n\n${insufficientItems}\n\nPlease update your cart quantities.`,
          [{ text: 'OK' }]
        );
        return;
      }
    } catch (error) {
      setLoading(false);
      console.error('Error checking stock:', error);
      showToast.error('Failed to verify stock availability');
      return;
    }

    // Handle UPI QR payment flow
    if (paymentMethod === PaymentMethod.UPI) {
      const tempOrderId = `TEMP-${Date.now()}`;
      const txnRef = generateTransactionRef();
      const upiStr = generateUPIString(finalPrices.total, tempOrderId, user.name);
      
      setTransactionRef(txnRef);
      setUpiString(upiStr);
      setShowUPIModal(true);
      return;
    }

    setLoading(true);
    try {
      let orderId: string;

      if (paymentMethod === PaymentMethod.ONLINE) {
        try {
          const paymentResult = await handleRazorpayPayment();
          orderId = await createOrderInDatabase();
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
          showToast.error(paymentError.message || 'Unable to process payment');
          setLoading(false);
          return;
        }
      } else {
        orderId = await createOrderInDatabase();
        await clearCart(user.id);

        const savingsMessage = finalPrices.discount > 0 
          ? `\n\nYou saved ${formatCurrency(finalPrices.discount)}!`
          : '';

        Alert.alert(
          'Order Placed Successfully! 🎉',
          `Your order will be delivered tomorrow at 7 AM.\n\nOrder ID: ${orderId.slice(0, 8)}\nPayment: Cash on Delivery${savingsMessage}`,
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
    } catch (error: any) {
      console.error('Error placing order:', error);

      // Check if it's a stock error
      if (error.message?.includes('Insufficient stock')) {
        showToast.error('Some items are out of stock. Please refresh your cart and try again.');
      } else if (error.message?.includes('Product') && error.message?.includes('not found')) {
        showToast.error('Some products in your cart are no longer available. Please refresh your cart and try again.');
      } else {
        showToast.error('Failed to place order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUPIPaymentDone = async () => {
    if (!user) {
      showToast.error('Please login to place an order');
      return;
    }

    if (!selectedAddress) {
      showToast.error('Please select a delivery address');
      handleSelectAddress();
      return;
    }

    if (!upiPaymentAcknowledged) {
      showToast.error('Please confirm that you have completed the payment');
      return;
    }

    setSubmittingUPI(true); // Use separate state
    setShowUPIModal(false);

    try {
      const orderId = await createOrderInDatabase(transactionRef);
      await clearCart(user.id);

      const savingsMessage = finalPrices.discount > 0 
        ? `\n\nYou saved ${formatCurrency(finalPrices.discount)}!`
        : '';

      Alert.alert(
        'Order Submitted! ⏳',
        `Your order has been submitted and is awaiting payment verification.\n\nOrder ID: ${orderId.slice(0, 8)}\nTransaction Ref: ${transactionRef}\n\nYour order will be confirmed once admin verifies the payment.${savingsMessage}`,
        [
          {
            text: 'View Orders',
            onPress: () => navigation.navigate('ProfileTab', {
              screen: 'OrderHistory',
            }),
          },
          {
            text: 'OK',
            onPress: () => navigation.navigate('HomeTab'),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating order:', error);
      showToast.error('Failed to create order. Please try again.');
    } finally {
      setSubmittingUPI(false);
      setUpiPaymentAcknowledged(false);
    }
  };

  const handleOpenUPIApp = () => {
    Linking.openURL(upiString).catch(err => {
      console.error('Error opening UPI app:', err);
      showToast.error('Unable to open UPI app. Please scan the QR code manually.');
    });
  };

  const getCouponSavingsText = (coupon: Offer) => {
    const validation = calculateOfferDiscount(cartItems, coupon, initialTaxBreakdown.subtotal);
    
    if (!validation.isValid) return '';
    
    let text = `Save ${formatCurrency(validation.discountAmount)}`;
    if (validation.freeDeliveryApplied || coupon.includesFreeDelivery) {
      text += ' + Free Delivery';
    }
    return text;
  };

  const isCouponApplied = (couponId: string) => {
    return appliedCoupons.some(c => c.id === couponId);
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

        {/* Delivery Slot Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🕐 Delivery Slot</Text>
            <Text style={styles.optionalBadge}>Optional</Text>
          </View>
          
          {loadingSlots ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading available slots...</Text>
            </View>
          ) : availableSlots.length > 0 ? (
            <View style={styles.slotsContainer}>
              {availableSlots.map((slot) => {
                const isOnlySlot = availableSlots.length === 2 && slot !== DeliverySlot.FLEXIBLE;
                const isSelected = selectedSlot === slot;
                
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
                            <View style={styles.autoSelectedBadge}>
                              <Text style={styles.autoSelectedText}>Auto-selected</Text>
                            </View>
                          )}
                        </View>
                        {slot === DeliverySlot.FLEXIBLE && (
                          <Text style={styles.slotSubtext}>
                            Our team will coordinate the best delivery time
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={styles.slotIcon}>
                      {DELIVERY_SLOT_ICONS[slot]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              
              {/* Info message if no slots configured */}
              {availableSlots.length === 1 && availableSlots[0] === DeliverySlot.FLEXIBLE && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoIcon}>ℹ️</Text>
                  <Text style={styles.infoText}>
                    Delivery time slots are not configured for this area yet. 
                    Our team will coordinate the delivery time with you.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noSlotsCard}>
              <Text style={styles.noSlotsText}>
                Unable to load delivery slots
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
                  Pay when you receive your order
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
                {formatCurrency(finalPrices.subtotal)}
              </Text>
            </View>
            
            {finalPrices.discount > 0 && (
              <View style={[styles.priceRow, styles.discountRow]}>
                <Text style={styles.discountLabel}>Coupon Discount</Text>
                <Text style={styles.discountValue}>
                  - {formatCurrency(finalPrices.discount)}
                </Text>
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
                <Text style={styles.priceValue}>
                  {formatCurrency(finalPrices.cgst)}
                </Text>
              </View>
            )}
            
            {finalPrices.sgst > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>SGST</Text>
                <Text style={styles.priceValue}>
                  {formatCurrency(finalPrices.sgst)}
                </Text>
              </View>
            )}
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Platform Fee</Text>
              <Text style={styles.priceValue}>{formatCurrency(finalPrices.platformFee)}</Text>
            </View>
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Charges</Text>
              {finalPrices.freeDeliveryApplied ? (
                <View style={styles.freeDeliveryContainer}>
                  <Text style={styles.strikethrough}>
                    {formatCurrency(baseDeliveryFee)}
                  </Text>
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
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>{formatCurrency(finalPrices.total)}</Text>
            </View>
            
            {finalPrices.discount > 0 && (
              <View style={styles.savingsCard}>
                <Text style={styles.savingsText}>
                  You're saving {formatCurrency(finalPrices.discount)}!
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <View>
            <Text style={styles.footerLabel}>Total</Text>
            {finalPrices.discount > 0 && (
              <Text style={styles.footerSavings}>
                Saved {formatCurrency(finalPrices.discount)}
              </Text>
            )}
          </View>
          <Text style={styles.footerPrice}>{formatCurrency(finalPrices.total)}</Text>
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
              {paymentMethod === PaymentMethod.COD 
                ? 'Place Order (COD)' 
                : paymentMethod === PaymentMethod.UPI
                ? `Pay ${formatCurrency(finalPrices.total)} via UPI`
                : `Pay ${formatCurrency(finalPrices.total)}`}
            </Text>
          )}
        </TouchableOpacity>
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
                <Text style={styles.upiAmountLabel}>Amount to Pay</Text>
                <Text style={styles.upiAmount}>{formatCurrency(finalPrices.total)}</Text>
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
                  <Text style={styles.instructionItem}>4️⃣ Click "Submit Order" button</Text>
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
                  ⚠️ Your order will be confirmed after admin verifies the payment. This usually takes 5-10 minutes during business hours.
                </Text>
              </View>
            </ScrollView>

            {/* Submit Button */}
            <View style={styles.upiModalFooter}>
              <TouchableOpacity
                style={[
                  styles.submitUPIButton,
                  (!upiPaymentAcknowledged || submittingUPI) && styles.submitUPIButtonDisabled,
                ]}
                onPress={handleUPIPaymentDone}
                disabled={!upiPaymentAcknowledged || submittingUPI}
              >
                {submittingUPI ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitUPIButtonText}>
                    ✅ Submit Order
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
                const validation = calculateOfferDiscount(cartItems, coupon, initialTaxBreakdown.subtotal);
                
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
                          
                          {validation.isValid && (
                            <Text style={[styles.savingsText2, { color: coupon.textColor }]}>
                              💰 {getCouponSavingsText(coupon)}
                            </Text>
                          )}
                          
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
  viewAllText: {
    fontSize: 13,
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
  appliedCouponsContainer1: {
    gap: 12,
  },
  appliedCouponCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  couponDashedBorder1: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 12,
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
  infoCard1: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
  },
  infoText1: {
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
  discountRow: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
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
    marginBottom: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
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
  upiModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
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
  optionalBadge: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
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
  slotDetails: {
    flex: 1,
  },
  slotLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  slotLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  autoSelectedBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  autoSelectedText: {
    fontSize: 10,
    color: '#856404',
    fontWeight: '600',
  },
  slotSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    lineHeight: 16,
  },
  slotIcon: {
    fontSize: 28,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
    marginTop: 4,
    gap: 8,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1565C0',
    lineHeight: 18,
  },
  noSlotsCard: {
    padding: 16,
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  noSlotsText: {
    fontSize: 14,
    color: '#f57f17',
    textAlign: 'center',
  },
});