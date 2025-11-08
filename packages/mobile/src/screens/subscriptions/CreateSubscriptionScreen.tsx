import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  useAuthStore,
  getSubscriptionProducts,
  createSubscription,
  Product,
  SubscriptionFrequency,
  SubscriptionStatus,
  UserAddress,
  formatCurrency,
  dateToTimestamp,
} from '@ecommerce/shared';

interface SubscriptionItem {
  product: Product;
  quantity: number;
}

export const CreateSubscriptionScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<SubscriptionItem[]>([]);
  const [frequency, setFrequency] = useState<SubscriptionFrequency>(
    SubscriptionFrequency.DAILY
  );
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  
  // Date states
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(() => {
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 30);
    return defaultEnd;
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProducts();
    
    // Auto-select default address
    if (user && user.addresses.length > 0) {
      const defaultAddr = user.addresses.find((addr) => addr.isDefault);
      setSelectedAddress(defaultAddr || user.addresses[0]);
    }
  }, [user]);

  const loadProducts = async () => {
    try {
      const data = await getSubscriptionProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    const existingIndex = selectedItems.findIndex(
      (item) => item.product.id === product.id
    );

    if (existingIndex >= 0) {
      setSelectedItems(selectedItems.filter((_, index) => index !== existingIndex));
    } else {
      setSelectedItems([...selectedItems, { product, quantity: 1 }]);
    }
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    setSelectedItems(
      selectedItems.map((item) => {
        if (item.product.id === productId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const isProductSelected = (productId: string) => {
    return selectedItems.some((item) => item.product.id === productId);
  };

  const getProductQuantity = (productId: string) => {
    const item = selectedItems.find((item) => item.product.id === productId);
    return item?.quantity || 0;
  };

  const calculatePerDeliveryTotal = () => {
    return selectedItems.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  };

  const calculateTotalDeliveries = () => {
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff <= 0) return 0;

    switch (frequency) {
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

  const calculateTotalAmount = () => {
    const perDelivery = calculatePerDeliveryTotal();
    const deliveries = calculateTotalDeliveries();
    return perDelivery * deliveries;
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    
    if (selectedDate) {
      setStartDate(selectedDate);
      
      // If end date is before new start date, adjust it
      if (selectedDate >= endDate) {
        const newEndDate = new Date(selectedDate);
        newEndDate.setDate(newEndDate.getDate() + 30);
        setEndDate(newEndDate);
      }
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    
    if (selectedDate) {
      if (selectedDate <= startDate) {
        Alert.alert('Invalid Date', 'End date must be after start date');
        return;
      }
      setEndDate(selectedDate);
    }
  };

  const handleCreateSubscription = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login to create subscription');
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one product');
      return;
    }

    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    const totalAmount = calculateTotalAmount();
    const deliveries = calculateTotalDeliveries();

    if (deliveries === 0) {
      Alert.alert('Error', 'Invalid subscription duration');
      return;
    }

    Alert.alert(
      'Confirm Subscription',
      `📦 Total Deliveries: ${deliveries}\n💰 Total Amount: ${formatCurrency(totalAmount)}\n📅 Start: ${startDate.toLocaleDateString('en-IN')}\n📅 End: ${endDate.toLocaleDateString('en-IN')}\n\n✅ Payment will be collected upfront.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Pay',
          onPress: async () => {
            setCreating(true);
            try {
              const subscriptionItems = selectedItems.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
              }));

              await createSubscription({
                userId: user.id,
                items: subscriptionItems,
                frequency,
                status: SubscriptionStatus.ACTIVE,
                deliveryAddressId: selectedAddress.id,
                startDate: dateToTimestamp(startDate),
                endDate: dateToTimestamp(endDate),
              });

              Alert.alert(
                'Subscription Created! 🎉',
                `Your subscription is now active!\n\n📦 Deliveries: ${deliveries}\n💰 Total Paid: ${formatCurrency(totalAmount)}\n📅 First delivery: ${startDate.toLocaleDateString('en-IN')}`,
                [
                  {
                    text: 'View Subscriptions',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error: any) {
              console.error('Error creating subscription:', error);
              Alert.alert('Error', error.message || 'Failed to create subscription');
            } finally {
              setCreating(false);
            }
          },
        },
      ]
    );
  };

  const frequencies = [
    { value: SubscriptionFrequency.DAILY, label: 'Daily', icon: '📅' },
    { value: SubscriptionFrequency.ALTERNATE_DAYS, label: 'Alternate Days', icon: '📆' },
    { value: SubscriptionFrequency.WEEKLY, label: 'Weekly', icon: '🗓️' },
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const perDeliveryTotal = calculatePerDeliveryTotal();
  const totalDeliveries = calculateTotalDeliveries();
  const totalAmount = calculateTotalAmount();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Duration Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Subscription Duration</Text>
          
          {/* Start Date Picker */}
          <View style={styles.datePickerContainer}>
            <Text style={styles.dateLabel}>Start Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateIcon}>📅</Text>
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateText}>
                  {startDate.toLocaleDateString('en-IN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.dateSubtext}>Tap to change</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* End Date Picker */}
          <View style={styles.datePickerContainer}>
            <Text style={styles.dateLabel}>End Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateIcon}>📅</Text>
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateText}>
                  {endDate.toLocaleDateString('en-IN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.dateSubtext}>Tap to change</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Date Pickers */}
          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onStartDateChange}
              minimumDate={new Date()}
            />
          )}

          {showEndDatePicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onEndDateChange}
              minimumDate={new Date(startDate.getTime() + 24 * 60 * 60 * 1000)}
            />
          )}

          {/* Duration Info */}
          <View style={styles.durationInfo}>
            <Text style={styles.durationText}>
              📦 Total Deliveries: {totalDeliveries}
            </Text>
            <Text style={styles.durationSubtext}>
              ({Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days)
            </Text>
          </View>
        </View>

        {/* Frequency Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Delivery Frequency</Text>
          <View style={styles.frequencyContainer}>
            {frequencies.map((freq) => (
              <TouchableOpacity
                key={freq.value}
                style={[
                  styles.frequencyButton,
                  frequency === freq.value && styles.frequencyButtonActive,
                ]}
                onPress={() => setFrequency(freq.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.frequencyIcon}>{freq.icon}</Text>
                <Text
                  style={[
                    styles.frequencyLabel,
                    frequency === freq.value && styles.frequencyLabelActive,
                  ]}
                >
                  {freq.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Product Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🥛 Select Products</Text>
          {products.map((product) => {
            const selected = isProductSelected(product.id);
            const quantity = getProductQuantity(product.id);

            return (
              <View key={product.id} style={styles.productCard}>
                <TouchableOpacity
                  style={styles.productInfo}
                  onPress={() => handleProductSelect(product)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      selected && styles.checkboxActive,
                    ]}
                  >
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.productDetails}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productPrice}>
                      {formatCurrency(product.price)} / {product.quantity}{' '}
                      {product.unit}
                    </Text>
                  </View>
                </TouchableOpacity>

                {selected && (
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => handleQuantityChange(product.id, -1)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quantityButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => handleQuantityChange(product.id, 1)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Delivery Address</Text>
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
            <Text style={styles.noAddressText}>
              No address available. Please add an address in your profile.
            </Text>
          )}
        </View>

        {/* Payment Summary */}
        {selectedItems.length > 0 && totalDeliveries > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Payment Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Per Delivery</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(perDeliveryTotal)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Number of Deliveries</Text>
                <Text style={styles.summaryValue}>{totalDeliveries}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Frequency</Text>
                <Text style={styles.summaryValue}>
                  {frequencies.find((f) => f.value === frequency)?.label}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalSubtext}>(Upfront Payment)</Text>
                </View>
                <Text style={styles.totalValue}>
                  {formatCurrency(totalAmount)}
                </Text>
              </View>
              <View style={styles.paymentNote}>
                <Text style={styles.paymentNoteIcon}>💳</Text>
                <Text style={styles.paymentNoteText}>
                  Full payment will be collected in advance. You can pause or cancel anytime.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Create Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            (selectedItems.length === 0 || !selectedAddress || totalDeliveries === 0 || creating) &&
              styles.buttonDisabled,
          ]}
          onPress={handleCreateSubscription}
          disabled={selectedItems.length === 0 || !selectedAddress || totalDeliveries === 0 || creating}
          activeOpacity={0.8}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.buttonContent}>
              <Text style={styles.createButtonText}>
                Pay {formatCurrency(totalAmount)} & Subscribe
              </Text>
              <Text style={styles.createButtonSubtext}>
                {totalDeliveries} deliveries • {frequencies.find((f) => f.value === frequency)?.label}
              </Text>
            </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  dateIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  dateTextContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  dateSubtext: {
    fontSize: 12,
    color: '#999',
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
  },
  durationInfo: {
    backgroundColor: '#e8f5e9',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 15,
    color: '#2e7d32',
    fontWeight: '600',
  },
  durationSubtext: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  frequencyButton: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  frequencyButtonActive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  frequencyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  frequencyLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  frequencyLabelActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 4,
    fontWeight: '500',
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 2,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  quantityButtonText: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: '600',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginHorizontal: 14,
    minWidth: 20,
    textAlign: 'center',
  },
  addressCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
  noAddressText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
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
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  totalSubtext: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  paymentNote: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentNoteIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  paymentNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#2e7d32',
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 120,
  },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 20,
    paddingBottom: 30,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    height: 64,
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
  },
  buttonContent: {
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  createButtonSubtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
});