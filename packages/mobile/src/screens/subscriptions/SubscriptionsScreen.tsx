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
  getUserSubscriptionsWithProducts,
  Subscription,
  SubscriptionStatus,
  formatCurrency,
  formatDate,
  updateSubscriptionStatus,
} from '@ecommerce/shared';

type TabType = 'active' | 'closed';

export const SubscriptionsScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('active');

  useEffect(() => {
    if (user) {
      loadSubscriptions();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Reload when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user) {
        loadSubscriptions();
      }
    });

    return unsubscribe;
  }, [navigation, user]);

  const loadSubscriptions = async () => {
    if (!user) return;

    try {
      const data = await getUserSubscriptionsWithProducts(user.id); // Changed
      setSubscriptions(data);
      console.log('✅ Loaded subscriptions with products:', data.length);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      Alert.alert('Error', 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSubscriptions = () => {
    if (activeTab === 'active') {
      // Active tab: Show PENDING, ACTIVE and PAUSED subscriptions
      return subscriptions.filter(
        (sub) =>
          sub.status === SubscriptionStatus.PENDING ||
          sub.status === SubscriptionStatus.ACTIVE ||
          sub.status === SubscriptionStatus.PAUSED
      );
    } else {
      // Closed tab: Show COMPLETED and CANCELLED subscriptions
      return subscriptions.filter(
        (sub) =>
          sub.status === SubscriptionStatus.COMPLETED ||
          sub.status === SubscriptionStatus.CANCELLED
      );
    }
  };

  const getActiveCount = () => {
    return subscriptions.filter(
      (sub) =>
        sub.status === SubscriptionStatus.PENDING ||
        sub.status === SubscriptionStatus.ACTIVE ||
        sub.status === SubscriptionStatus.PAUSED
    ).length;
  };

  const getClosedCount = () => {
    return subscriptions.filter(
      (sub) =>
        sub.status === SubscriptionStatus.COMPLETED ||
        sub.status === SubscriptionStatus.CANCELLED
    ).length;
  };

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.PENDING:
        return '#FFC107'; // Yellow for pending
      case SubscriptionStatus.ACTIVE:
        return '#4CAF50';
      case SubscriptionStatus.PAUSED:
        return '#FF9800';
      case SubscriptionStatus.COMPLETED:
        return '#2196F3';
      case SubscriptionStatus.CANCELLED:
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getStatusText = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.PENDING:
        return 'Pending';
      case SubscriptionStatus.ACTIVE:
        return 'Active';
      case SubscriptionStatus.PAUSED:
        return 'Paused';
      case SubscriptionStatus.COMPLETED:
        return 'Completed';
      case SubscriptionStatus.CANCELLED:
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case 'daily':
        return 'Daily';
      case 'alternate_days':
        return 'Alternate Days';
      case 'weekly':
        return 'Weekly';
      default:
        return frequency;
    }
  };

  const calculateTotalAmount = (subscription: Subscription) => {
    return subscription.items.reduce((total, item) => {
      if (item.product) {
        return total + item.product.price * item.quantity;
      }
      return total;
    }, 0);
  };

  const renderSubscription = ({ item }: { item: Subscription }) => {
    const statusColor = getStatusColor(item.status);
    const totalAmount = calculateTotalAmount(item);
    const hasProductData = item.items.every((i) => i.product);

    return (
      <TouchableOpacity
        style={styles.subscriptionCard}
        onPress={() => navigation.navigate('SubscriptionDetail', { subscriptionId: item.id })}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.subscriptionId}>#{item.id.slice(0, 8)}</Text>
            <Text style={styles.frequency}>{getFrequencyText(item.frequency)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.itemsContainer}>
          {!hasProductData ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <>
              {item.items.slice(0, 2).map((subItem, index) => (
                <Text key={index} style={styles.itemText}>
                  • {subItem.product?.name || 'Product'} × {subItem.quantity}
                </Text>
              ))}
              {item.items.length > 2 && (
                <Text style={styles.moreItems}>+{item.items.length - 2} more</Text>
              )}
            </>
          )}
        </View>

        {/* Dates & Amount */}
        <View style={styles.footer}>
          <View style={styles.datesContainer}>
            <Text style={styles.dateLabel}>
              Start: {formatDate(item.startDate)}
            </Text>
            {item.endDate && (
              <Text style={styles.dateLabel}>
                End: {formatDate(item.endDate)}
              </Text>
            )}
            {item.pausedUntil && item.status === SubscriptionStatus.PAUSED && (
              <Text style={styles.pausedText}>
                Paused until: {formatDate(item.pausedUntil)}
              </Text>
            )}
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Per delivery</Text>
            <Text style={styles.amountValue}>{formatCurrency(totalAmount)}</Text>
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
          Please login to view your subscriptions
        </Text>
      </View>
    );
  }

  const filteredSubscriptions = getFilteredSubscriptions();
  const activeCount = getActiveCount();
  const closedCount = getClosedCount();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Subscriptions</Text>
        {/* <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateSubscription')}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity> */}
      </View>

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

      {/* Subscriptions List */}
      {filteredSubscriptions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>
            {activeTab === 'active' ? '📅' : '📋'}
          </Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'active' ? 'No Active Subscriptions' : 'No Closed Subscriptions'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'active'
              ? 'Subscribe to get daily deliveries of your favorite products'
              : 'Cancelled subscriptions will appear here'}
          </Text>
          {activeTab === 'active' && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateSubscription')}
            >
              <Text style={styles.createButtonText}>+ Create Subscription</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <FlatList
            data={filteredSubscriptions}
            renderItem={renderSubscription}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Floating Add Button - Only show on Active tab */}
          {activeTab === 'active' && (
            <TouchableOpacity
              style={styles.floatingAddButton}
              onPress={() => navigation.navigate('CreateSubscription')}
            >
              <Text style={styles.floatingAddIcon}>+</Text>
              <Text style={styles.floatingAddText}>New Subscription</Text>
            </TouchableOpacity>
          )}
        </>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  subscriptionCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 24,
  },
  subscriptionId: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  frequency: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  itemsContainer: {
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  moreItems: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 24,
  },
  datesContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  pausedText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  amountValue: {
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
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingAddIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 8,
  },
  floatingAddText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});