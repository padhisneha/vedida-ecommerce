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
  getUserSubscriptions,
  Subscription,
  SubscriptionStatus,
  formatCurrency,
  formatDate,
  updateSubscriptionStatus,
} from '@ecommerce/shared';

export const SubscriptionsScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
      const data = await getUserSubscriptions(user.id);
      setSubscriptions(data);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      Alert.alert('Error', 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseSubscription = async (subscriptionId: string) => {
    Alert.alert(
      'Pause Subscription',
      'How long do you want to pause?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '1 Week',
          onPress: () => pauseSubscription(subscriptionId, 7),
        },
        {
          text: '2 Weeks',
          onPress: () => pauseSubscription(subscriptionId, 14),
        },
        {
          text: '1 Month',
          onPress: () => pauseSubscription(subscriptionId, 30),
        },
      ]
    );
  };

  const pauseSubscription = async (subscriptionId: string, days: number) => {
    setActionLoading(subscriptionId);
    try {
      const pauseUntil = new Date();
      pauseUntil.setDate(pauseUntil.getDate() + days);

      await updateSubscriptionStatus(
        subscriptionId,
        SubscriptionStatus.PAUSED,
        pauseUntil
      );

      Alert.alert('Success', `Subscription paused for ${days} days`);
      await loadSubscriptions();
    } catch (error) {
      console.error('Error pausing subscription:', error);
      Alert.alert('Error', 'Failed to pause subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeSubscription = async (subscriptionId: string) => {
    setActionLoading(subscriptionId);
    try {
      await updateSubscriptionStatus(subscriptionId, SubscriptionStatus.ACTIVE);
      Alert.alert('Success', 'Subscription resumed successfully');
      await loadSubscriptions();
    } catch (error) {
      console.error('Error resuming subscription:', error);
      Alert.alert('Error', 'Failed to resume subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel this subscription? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(subscriptionId);
            try {
              await updateSubscriptionStatus(
                subscriptionId,
                SubscriptionStatus.CANCELLED
              );
              Alert.alert('Success', 'Subscription cancelled');
              await loadSubscriptions();
            } catch (error) {
              console.error('Error cancelling subscription:', error);
              Alert.alert('Error', 'Failed to cancel subscription');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return '#4CAF50';
      case SubscriptionStatus.PAUSED:
        return '#FF9800';
      case SubscriptionStatus.CANCELLED:
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getStatusText = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return 'Active';
      case SubscriptionStatus.PAUSED:
        return 'Paused';
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

  const renderSubscription = ({ item }: { item: Subscription }) => {
    const isActionLoading = actionLoading === item.id;
    const statusColor = getStatusColor(item.status);

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
          {item.items.map((subItem, index) => (
            <Text key={index} style={styles.itemText}>
              • {subItem.product?.name || 'Product'} × {subItem.quantity}
            </Text>
          ))}
        </View>

        {/* Dates */}
        <View style={styles.datesContainer}>
          <Text style={styles.dateLabel}>
            Started: {formatDate(item.startDate)}
          </Text>
          {item.pausedUntil && item.status === SubscriptionStatus.PAUSED && (
            <Text style={styles.pausedText}>
              Paused until: {formatDate(item.pausedUntil)}
            </Text>
          )}
        </View>

        {/* Actions */}
        {item.status !== SubscriptionStatus.CANCELLED && (
          <View style={styles.actionsContainer}>
            {item.status === SubscriptionStatus.ACTIVE && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.pauseButton]}
                  onPress={() => handlePauseSubscription(item.id)}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? (
                    <ActivityIndicator size="small" color="#FF9800" />
                  ) : (
                    <Text style={styles.pauseButtonText}>Pause</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => handleCancelSubscription(item.id)}
                  disabled={isActionLoading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {item.status === SubscriptionStatus.PAUSED && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.resumeButton]}
                  onPress={() => handleResumeSubscription(item.id)}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? (
                    <ActivityIndicator size="small" color="#4CAF50" />
                  ) : (
                    <Text style={styles.resumeButtonText}>Resume</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => handleCancelSubscription(item.id)}
                  disabled={isActionLoading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
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

  if (subscriptions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Subscriptions</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>📅</Text>
          <Text style={styles.emptyTitle}>No Subscriptions Yet</Text>
          <Text style={styles.emptySubtitle}>
            Subscribe to get daily deliveries of your favorite products
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateSubscription')}
          >
            <Text style={styles.createButtonText}>Create Subscription</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Subscriptions</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateSubscription')}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Subscriptions List */}
      <FlatList
        data={subscriptions}
        renderItem={renderSubscription}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
  datesContainer: {
    marginBottom: 12,
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
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  pauseButton: {
    borderColor: '#FF9800',
    backgroundColor: '#fff',
  },
  pauseButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  resumeButton: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  resumeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    borderColor: '#f44336',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
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
});