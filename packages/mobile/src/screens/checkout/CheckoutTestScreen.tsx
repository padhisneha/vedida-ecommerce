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
  RAZORPAY_CONFIG,
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
} from '@ecommerce/shared';

export const CheckoutScreen = ({ route, navigation }: any) => {
  const { cartItems, taxBreakdown: initialTaxBreakdown, platformFee, deliveryFee: baseDeliveryFee, total: initialTotal } = route.params;
  const { user } = useAuthStore();
  
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.COD);
  const [loading, setLoading] = useState(false);
  
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

  useEffect(() => {
    if (user) {
      loadApplicableCoupons();
    }
  }, [user, cartItems]);

  useEffect(() => {
    recalculatePrices();
  }, [appliedCoupons]);

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
        console.log('✅ Auto-applied FREEDELIVERY coupon');
      }
    } catch (error) {
      console.error('Error loading coupons:', error);
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
      Alert.alert('Info', 'This coupon is already applied');
      return;
    }
    
    // Validate coupon
    const validation = calculateOfferDiscount(cartItems, coupon, initialTaxBreakdown.subtotal);
    
    if (!validation.isValid) {
      Alert.alert('Cannot Apply Coupon', validation.reason || 'This coupon is not applicable');
      return;
    }
    
    // Check clubbing rules
    const hasNonFreeDeliveryCoupon = appliedCoupons.some(c => c.couponCode !== 'FREEDELIVERY');
    const isFreeDeliveryCoupon = coupon.couponCode === 'FREEDELIVERY';
    
    if (hasNonFreeDeliveryCoupon && !isFreeDeliveryCoupon) {
      Alert.alert(
        'Cannot Apply Multiple Coupons',
        'You can only apply one discount coupon. FREEDELIVERY can be combined with one other coupon.'
      );
      return;
    }
    
    if (!isFreeDeliveryCoupon && hasNonFreeDeliveryCoupon) {
      Alert.alert(
        'Cannot Apply Multiple Coupons',
        'You already have a discount coupon applied. Remove it first to apply this coupon.'
      );
      return;
    }
    
    // Apply coupon
    setAppliedCoupons([...appliedCoupons, coupon]);
    setShowCouponModal(false);
    
    Alert.alert(
      'Coupon Applied! 🎉',
      `${coupon.title}\nYou saved ${formatCurrency(validation.discountAmount)}${validation.freeDeliveryApplied ? ' + Free Delivery' : ''}`
    );
  };

  const handleRemoveCoupon = (couponId: string) => {
    setAppliedCoupons(appliedCoupons.filter(c => c.id !== couponId));
  };

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
    deliveryDate.setHours(7, 0, 0, 0);

    const orderData = {
      userId: user.id,
      type: OrderType.ONE_TIME,
      items: orderItems,
      totalAmount: finalPrices.total,
      deliveryAddress: selectedAddress,
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === PaymentMethod.COD ? PaymentStatus.PENDING : PaymentStatus.PAID,
      status: OrderStatus.PENDING,
      scheduledDeliveryDate: dateToTimestamp(deliveryDate),
      // Coupon data
      appliedCoupons: appliedCoupons.map(c => c.couponCode).filter(Boolean) as string[],
      discountAmount: finalPrices.discount,
      freeDeliveryApplied: finalPrices.freeDeliveryApplied,
    };

    console.log('=== Order Creation Debug ===');
    console.log('Applied Coupons:', orderData.appliedCoupons);
    console.log('Discount Amount:', orderData.discountAmount);
    console.log('Total Amount:', orderData.totalAmount);
    console.log('========================');

    try {
      const orderId = await createOrder(orderData);

      // Notify all admins
      const admins = await getUsersByRole(UserRole.ADMIN);
      const order = await getOrderById(orderId);
      for (const admin of admins) {
        await createNotification(
          admin.id,
          NotificationType.ORDER_PLACED,
          'New Order Received',
          `Order ${order?.orderNumber} placed for ${formatCurrency(finalPrices.total)}`,
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
      description: 'Vedida Farms Order',
      image: RAZORPAY_CONFIG.businessLogo,
      currency: 'INR',
      key: RAZORPAY_CONFIG.keyId,
      amount: Math.round(finalPrices.total * 100),
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
          Alert.alert(
            'Payment Failed',
            paymentError.message || 'Unable to process payment. Please try again.'
          );
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
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
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
              {appliedCoupons.map((coupon) => (
                <View
                  key={coupon.id}
                  style={[styles.appliedCouponCard, { backgroundColor: coupon.backgroundColor }]}
                >
                  <View style={styles.appliedCouponContent}>
                    <Text style={[styles.appliedCouponTitle, { color: coupon.textColor }]}>
                      ✅ {coupon.title}
                    </Text>
                    <Text style={[styles.appliedCouponCode, { color: coupon.textColor }]}>
                      {coupon.couponCode}
                    </Text>
                    <Text style={[styles.appliedCouponSavings, { color: coupon.textColor }]}>
                      {getCouponSavingsText(coupon)}
                    </Text>
                  </View>
                  {coupon.couponCode !== 'FREEDELIVERY' && (
                    <TouchableOpacity
                      onPress={() => handleRemoveCoupon(coupon.id)}
                      style={styles.removeCouponButton}
                    >
                      <Text style={styles.removeCouponText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {availableCoupons.length > appliedCoupons.length && (
                <TouchableOpacity
                  style={styles.browseCouponsButton}
                  onPress={() => setShowCouponModal(true)}
                >
                  <Text style={styles.browseCouponsText}>
                    + Browse {availableCoupons.length - appliedCoupons.length} more coupon{availableCoupons.length - appliedCoupons.length > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
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
                  🎉 You're saving {formatCurrency(finalPrices.discount)}!
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
              {paymentMethod === 'cod' ? 'Place Order (COD)' : `Pay ${formatCurrency(finalPrices.total)}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>

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
  appliedCouponsContainer: {
    gap: 12,
  },
  appliedCouponCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  couponDashedBorder: {
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
  couponDashedBorder1: {
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
  // ... rest of existing styles from original file ...
});