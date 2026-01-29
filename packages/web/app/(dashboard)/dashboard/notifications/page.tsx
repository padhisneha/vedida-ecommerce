'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  Notification,
  NotificationType,
  formatDateTime,
  formatCurrency,
} from '@ecommerce/shared';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/lib/toast';

type FilterType = 'all' | 'unread' | 'read';

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState('');

  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        if (!user || (user.role !== 'admin' && user.role !== 'operator')) {
          showToast.error('Access denied');
          router.push('/dashboard');
          return;
        }
        setCurrentUserId(user.id);
      } catch (error) {
        console.error('Error loading user:', error);
        showToast.error('Failed to load user');
      }
    };

    loadCurrentUser();
  }, []);


  const loadNotifications = useCallback(async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getAllNotifications(currentUserId, 100),
        getUnreadCount(currentUserId),
      ]);

      setNotifications(notifs);
      setUnreadCount(count);
      console.log('✅ Loaded notifications:', notifs.length);
    } catch (error) {
      console.error('Error loading notifications:', error);
      showToast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      loadNotifications();
    }
  }, [currentUserId, activeFilter, loadNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
      showToast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUserId || unreadCount === 0) return;
    
    const toastId = showToast.loading('Marking all as read...');
    try {
      await markAllAsRead(currentUserId);
      showToast.dismiss(toastId);
      showToast.success('All notifications marked as read');
      await loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
      showToast.dismiss(toastId);
      showToast.error('Failed to mark all as read');
    }
  };

  const handleArchive = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Archive this notification?')) return;
    
    try {
      await archiveNotification(notificationId);
      showToast.success('Notification archived');
      await loadNotifications();
    } catch (error) {
      console.error('Error archiving notification:', error);
      showToast.error('Failed to archive notification');
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    const icons: Record<string, string> = {
      [NotificationType.ORDER_PLACED]: '🆕',
      [NotificationType.ORDER_CONFIRMED]: '✅',
      [NotificationType.ORDER_ASSIGNED]: '📦',
      [NotificationType.ORDER_OUT_FOR_DELIVERY]: '🚚',
      [NotificationType.ORDER_DELIVERED]: '✅',
      [NotificationType.ORDER_CANCELLED]: '❌',
      [NotificationType.SUBSCRIPTION_CREATED]: '📅',
      [NotificationType.SUBSCRIPTION_ACTIVATED]: '✅',
      [NotificationType.SUBSCRIPTION_ASSIGNED]: '📅',
      [NotificationType.SUBSCRIPTION_PAUSED]: '⏸️',
      [NotificationType.SUBSCRIPTION_ENDING_SOON]: '⏰',
      [NotificationType.PAYMENT_RECEIVED]: '💰',
      [NotificationType.PAYMENT_FAILED]: '⚠️',
      [NotificationType.COD_COLLECTED]: '💵',
      [NotificationType.DELIVERY_PARTNER_REGISTERED]: '👤',
      [NotificationType.SYSTEM_ALERT]: '⚠️',
    };
    return icons[type] || '🔔';
  };

  const getNotificationColor = (type: NotificationType) => {
    if (type.includes('cancelled') || type.includes('failed')) return 'border-red-200 bg-red-50';
    if (type.includes('delivered') || type.includes('paid') || type.includes('collected')) return 'border-green-200 bg-green-50';
    if (type.includes('assigned') || type.includes('confirmed')) return 'border-blue-200 bg-blue-50';
    if (type.includes('alert') || type.includes('ending')) return 'border-yellow-200 bg-yellow-50';
    return 'border-gray-200 bg-white';
  };

  const getRelativeTime = (timestamp: any) => {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDateTime(timestamp);
  };

  const getNavigationLink = (notification: Notification) => {
    if (notification.orderId) return `/dashboard/orders/${notification.orderId}`;
    if (notification.subscriptionId) return `/dashboard/subscriptions/${notification.subscriptionId}`;
    if (notification.deliveryPartnerId) return `/dashboard/delivery-partners/${notification.deliveryPartnerId}`;
    return null;
  };

  const getFilteredNotifications = () => {
    if (activeFilter === 'unread') {
      return notifications.filter(n => !n.isRead);
    }
    if (activeFilter === 'read') {
      return notifications.filter(n => n.isRead);
    }
    return notifications;
  };

  const filteredNotifications = getFilteredNotifications();

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">🔔</div>
          <div className="text-lg text-gray-600">Loading notifications...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-2">Stay updated with all activities</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn-secondary flex items-center gap-2"
            >
              <span>✅</span>
              <span>Mark All Read ({unreadCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Unread</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{unreadCount}</p>
            </div>
            <div className="text-3xl">🔔</div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Read</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {notifications.filter(n => n.isRead).length}
              </p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Total</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{notifications.length}</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveFilter('all')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeFilter === 'all'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Notifications
            <span className="ml-2 bg-gray-200 text-gray-600 py-0.5 px-2 rounded-full text-xs font-semibold">
              {notifications.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('unread')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeFilter === 'unread'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 py-0.5 px-2 rounded-full text-xs font-semibold">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFilter('read')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeFilter === 'read'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Read
            <span className="ml-2 bg-gray-200 text-gray-600 py-0.5 px-2 rounded-full text-xs font-semibold">
              {notifications.filter(n => n.isRead).length}
            </span>
          </button>
        </nav>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🔔</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No {activeFilter !== 'all' && activeFilter} notifications
          </h3>
          <p className="text-gray-600">
            {activeFilter === 'unread' 
              ? "You're all caught up! No unread notifications."
              : "No notifications to display"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const navigationLink = getNavigationLink(notification);
            
            return (
              <div
                key={notification.id}
                className={`card hover:shadow-md transition-shadow cursor-pointer ${
                  !notification.isRead ? 'border-l-4 border-l-primary-500' : ''
                } ${getNotificationColor(notification.type)}`}
                onClick={() => {
                  if (!notification.isRead) {
                    handleMarkAsRead(notification.id);
                  }
                  if (navigationLink) {
                    router.push(navigationLink);
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="text-3xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`text-base ${
                        !notification.isRead ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'
                      }`}>
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="w-2.5 h-2.5 bg-primary-500 rounded-full flex-shrink-0 mt-1.5"></span>
                      )}
                    </div>

                    <p className="text-gray-600 text-sm mb-2">
                      {notification.message}
                    </p>

                    {/* Metadata Display */}
                    {notification.metadata && (
                      <div className="flex flex-wrap gap-3 mb-2">
                        {notification.metadata.orderNumber && (
                          <span className="text-xs bg-white px-2 py-1 rounded border border-gray-300">
                            📦 {notification.metadata.orderNumber}
                          </span>
                        )}
                        {notification.metadata.subscriptionNumber && (
                          <span className="text-xs bg-white px-2 py-1 rounded border border-gray-300">
                            📅 {notification.metadata.subscriptionNumber}
                          </span>
                        )}
                        {notification.metadata.amount && (
                          <span className="text-xs bg-white px-2 py-1 rounded border border-gray-300">
                            💰 {formatCurrency(notification.metadata.amount)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                      <span className="text-xs text-gray-500">
                        {getRelativeTime(notification.createdAt)}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          onClick={(e) => handleArchive(notification.id, e)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Archive
                        </button>
                        {navigationLink && (
                          <span className="text-xs text-gray-400">
                            View →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}