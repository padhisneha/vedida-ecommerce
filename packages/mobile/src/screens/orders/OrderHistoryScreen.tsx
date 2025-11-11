import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  useAuthStore,
  getUserOrdersWithProducts,
  Order,
  OrderStatus,
  formatCurrency,
  formatDate,
} from '@ecommerce/shared';

type TabType = 'active' | 'closed';

export const OrderHistoryScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('active');

  useEffect(() => {
    if (user) {
      loadOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      const data = await getUserOrdersWithProducts(user.id); // Changed
      setOrders(data);
      console.log('✅ Loaded orders with products:', data.length);
      
      // Debug: Log first order's items
      if (data.length > 0) {
        console.log('First order items:', data[0].items.map(item => ({
          name: item.product?.name || 'NO PRODUCT',
          quantity: item.quantity,
        })));
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const isOrderOlderThan90Days = (order: Order) => {
    const now = new Date();
    const orderDate = order.createdAt.toDate();
    const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 90;
  };

  const getFilteredOrders = () => {
    if (activeTab === 'active') {
      // Active tab: Show PENDING, CONFIRMED, and OUT_FOR_DELIVERY orders
      return orders.filter(
        (order) =>
          order.status === OrderStatus.PENDING ||
          order.status === OrderStatus.CONFIRMED ||
          order.status === OrderStatus.OUT_FOR_DELIVERY
      );
    } else {
      // Closed tab: Show DELIVERED and CANCELLED orders (only last 90 days)
      return orders.filter(
        (order) =>
          (order.status === OrderStatus.DELIVERED ||
            order.status === OrderStatus.CANCELLED) &&
          !isOrderOlderThan90Days(order)
      );
    }
  };

  const getActiveCount = () => {
    return orders.filter(
      (order) =>
        order.status === OrderStatus.PENDING ||
        order.status === OrderStatus.CONFIRMED ||
        order.status === OrderStatus.OUT_FOR_DELIVERY
    ).length;
  };

  const getClosedCount = () => {
    return orders.filter(
      (order) =>
        (order.status === OrderStatus.DELIVERED ||
          order.status === OrderStatus.CANCELLED) &&
        !isOrderOlderThan90Days(order)
    ).length;
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

  const renderOrder = ({ item }: { item: Order }) => {
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
      >
        {/* Header */}
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.itemsContainer}>
          <Text style={styles.itemsLabel}>Items:</Text>
          {item.items.slice(0, 2).map((orderItem, index) => (
            <Text key={index} style={styles.itemText}>
              • {orderItem.product?.name || 'Product'} × {orderItem.quantity}
            </Text>
          ))}
          {item.items.length > 2 && (
            <Text style={styles.moreItems}>
              +{item.items.length - 2} more item(s)
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.deliveryLabel}>
              {item.status === OrderStatus.DELIVERED ? 'Delivered On' : 'Delivery Date'}
            </Text>
            <Text style={styles.deliveryDate}>
              {item.deliveredAt
                ? formatDate(item.deliveredAt)
                : formatDate(item.scheduledDeliveryDate)}
            </Text>
          </View>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(item.totalAmount)}
            </Text>
          </View>
        </View>

        {/* Chevron */}
        <View style={styles.chevronContainer}>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyEmoji}>🔒</Text>
        <Text style={styles.emptyTitle}>Login Required</Text>
        <Text style={styles.emptySubtitle}>
          Please login to view your order history
        </Text>
      </View>
    );
  }

  const filteredOrders = getFilteredOrders();
  const activeCount = getActiveCount();
  const closedCount = getClosedCount();

  return (
    <View style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={styles.placeholder} />
      </View> */}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active
          </Text>
          {activeCount > 0 && (
            <View style={[styles.badge, activeTab === 'active' && styles.badgeActive]}>
              <Text style={[styles.badgeText, activeTab === 'active' && styles.badgeTextActive]}>
                {activeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'closed' && styles.tabActive]}
          onPress={() => setActiveTab('closed')}
        >
          <Text style={[styles.tabText, activeTab === 'closed' && styles.tabTextActive]}>
            Closed
          </Text>
          {closedCount > 0 && (
            <View style={[styles.badge, activeTab === 'closed' && styles.badgeActive]}>
              <Text style={[styles.badgeText, activeTab === 'closed' && styles.badgeTextActive]}>
                {closedCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>
            {activeTab === 'active' ? '📦' : '📋'}
          </Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'active' ? 'No Active Orders' : 'No Closed Orders'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'active'
              ? 'Your ongoing orders will appear here'
              : 'Delivered and cancelled orders from the last 90 days will appear here'}
          </Text>
          {activeTab === 'active' && (
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => navigation.navigate('HomeTab')}
            >
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  backButton: {
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 8,
  },
  tabActive: {
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
  },
  tabTextActive: {
    fontWeight: '700',
    color: '#4CAF50',
  },
  badge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: '#4CAF50',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  badgeTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 24,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  itemsContainer: {
    marginBottom: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 6,
  },
  itemText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  moreItems: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 24,
  },
  deliveryLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  deliveryDate: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  chevronContainer: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -12,
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  shopButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});