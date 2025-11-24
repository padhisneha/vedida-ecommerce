import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  useAuthStore,
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  Notification,
  NotificationType,
  formatDateTime,
  formatDate,
  formatCurrency,
} from '@ecommerce/shared';

type FilterType = 'all' | 'unread';

export const NotificationsScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setLoading(false);
    }
  }, [user, activeFilter]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user && !loading) {
        // Silently refresh without showing loading state
        loadNotifications();
      }
    }, [user, loading])
  );

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const [notifs, count] = await Promise.all([
        getAllNotifications(user.id, 100),
        getUnreadCount(user.id),
      ]);

      setNotifications(notifs);
      setUnreadCount(count);
      console.log('✅ Loaded notifications:', notifs.length);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;

    try {
      await markAllAsRead(user.id);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleArchive = async (notificationId: string) => {
    Alert.alert(
      'Archive Notification',
      'Are you sure you want to archive this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await archiveNotification(notificationId);
              await loadNotifications();
            } catch (error) {
              console.error('Error archiving:', error);
              Alert.alert('Error', 'Failed to archive notification');
            }
          },
        },
      ]
    );
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      //await handleMarkAsRead(notification.id);
    }

    // Optimistic update - mark as read immediately in UI
    if (!notification.isRead) {
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id 
            ? { ...n, isRead: true } 
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Mark as read in database (background)
      markAsRead(notification.id).catch(error => {
        console.error('Error marking as read:', error);
      });
    }

    // Navigate to relevant screen
    if (notification.orderId) {
      navigation.navigate('OrderDetail', { orderId: notification.orderId });
    } else if (notification.subscriptionId) {
      navigation.navigate('SubscriptionDetail', { subscriptionId: notification.subscriptionId });
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    const icons: Record<string, string> = {
      [NotificationType.ORDER_PLACED]: '🆕',
      [NotificationType.ORDER_CONFIRMED]: '✅',
      [NotificationType.ORDER_OUT_FOR_DELIVERY]: '🚚',
      [NotificationType.ORDER_DELIVERED]: '📦',
      [NotificationType.ORDER_CANCELLED]: '❌',
      [NotificationType.SUBSCRIPTION_CREATED]: '📅',
      [NotificationType.SUBSCRIPTION_ACTIVATED]: '✅',
      [NotificationType.SUBSCRIPTION_PAUSED]: '⏸️',
      [NotificationType.PAYMENT_RECEIVED]: '💰',
      [NotificationType.PAYMENT_FAILED]: '⚠️',
      [NotificationType.SYSTEM_ALERT]: '⚠️',
    };
    return icons[type] || '🔔';
  };

  const getNotificationColor = (type: NotificationType) => {
    if (type.includes('cancelled') || type.includes('failed')) return '#FEE2E2';
    if (type.includes('delivered') || type.includes('paid')) return '#D1FAE5';
    if (type.includes('confirmed') || type.includes('activated')) return '#DBEAFE';
    if (type.includes('alert')) return '#FEF3C7';
    return '#F9FAFB';
  };

  const getRelativeTime = (timestamp: any) => {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(timestamp);
  };

  const getFilteredNotifications = () => {
    if (activeFilter === 'unread') {
      return notifications.filter(n => !n.isRead);
    }
    return notifications;
  };

  const groupNotificationsByDate = (notifications: Notification[]) => {
    const groups: { title: string; data: Notification[] }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayNotifs: Notification[] = [];
    const yesterdayNotifs: Notification[] = [];
    const olderNotifs: Notification[] = [];

    notifications.forEach(notif => {
      const notifDate = notif.createdAt.toDate();
      notifDate.setHours(0, 0, 0, 0);

      if (notifDate.getTime() === today.getTime()) {
        todayNotifs.push(notif);
      } else if (notifDate.getTime() === yesterday.getTime()) {
        yesterdayNotifs.push(notif);
      } else {
        olderNotifs.push(notif);
      }
    });

    if (todayNotifs.length > 0) groups.push({ title: 'Today', data: todayNotifs });
    if (yesterdayNotifs.length > 0) groups.push({ title: 'Yesterday', data: yesterdayNotifs });
    if (olderNotifs.length > 0) groups.push({ title: 'Older', data: olderNotifs });

    return groups;
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !item.isRead && styles.unreadCard,
        { backgroundColor: getNotificationColor(item.type) },
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.notificationIcon}>
            {getNotificationIcon(item.type)}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.textContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !item.isRead && styles.titleUnread]}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>

          {/* Metadata */}
          {item.metadata && (
            <View style={styles.metadataRow}>
              {item.metadata.orderNumber && (
                <View style={styles.metadataBadge}>
                  <Text style={styles.metadataText}>
                    📦 {item.metadata.orderNumber}
                  </Text>
                </View>
              )}
              {item.metadata.amount && (
                <View style={styles.metadataBadge}>
                  <Text style={styles.metadataText}>
                    💰 {formatCurrency(item.metadata.amount)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.timestamp}>
              {getRelativeTime(item.createdAt)}
            </Text>
            
            {!item.isRead && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleMarkAsRead(item.id);
                }}
              >
                <Text style={styles.markReadButton}>Mark read</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Archive Button */}
        <TouchableOpacity
          style={styles.archiveButton}
          onPress={(e) => {
            e.stopPropagation();
            handleArchive(item.id);
          }}
        >
          <Text style={styles.archiveIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

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
          Please login to view notifications
        </Text>
      </View>
    );
  }

  const filteredNotifications = getFilteredNotifications();
  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  return (
    <View style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllButton}>Mark all</Text>
          </TouchableOpacity>
        )}
      </View> */}

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeFilter === 'all' && styles.tabActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.tabText, activeFilter === 'all' && styles.tabTextActive]}>
            All
          </Text>
          <View style={styles.tabBadge}>
            <Text style={[styles.tabBadgeText, activeFilter === 'all' && styles.tabBadgeTextActive]}>
              {notifications.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeFilter === 'unread' && styles.tabActive]}
          onPress={() => setActiveFilter('unread')}
        >
          <Text style={[styles.tabText, activeFilter === 'unread' && styles.tabTextActive]}>
            Unread
          </Text>
          {unreadCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={[styles.tabBadgeText, activeFilter === 'unread' && styles.tabBadgeTextActive]}>
                {unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>
            {activeFilter === 'unread' ? '✅' : '🔔'}
          </Text>
          <Text style={styles.emptyTitle}>
            {activeFilter === 'unread' ? "You're All Caught Up!" : 'No Notifications'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter === 'unread'
              ? 'No unread notifications at the moment'
              : 'Your notifications will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedNotifications}
          renderItem={({ item: section }) => (
            <View>
              {renderSectionHeader({ title: section.title })}
              {section.data.map((notification) => (
                <View key={notification.id}>
                  {renderNotification({ item: notification })}
                </View>
              ))}
            </View>
          )}
          keyExtractor={(item) => item.title}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#4CAF50']}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
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
    padding: 4,
  },
  backButtonText: {
    fontSize: 32,
    color: '#4CAF50',
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllButton: {
    fontSize: 14,
    color: '#4CAF50',
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
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabActive: {
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  tabTextActive: {
    fontWeight: '700',
    color: '#4CAF50',
  },
  tabBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  tabBadgeTextActive: {
    backgroundColor: '#4CAF50',
    color: '#fff',
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  notificationCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 14,
  },
  iconContainer: {
    marginRight: 12,
  },
  notificationIcon: {
    fontSize: 32,
  },
  textContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  titleUnread: {
    fontWeight: '700',
    color: '#1a1a1a',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  metadataBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  metadataText: {
    fontSize: 11,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  markReadButton: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  archiveButton: {
    padding: 8,
  },
  archiveIcon: {
    fontSize: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});