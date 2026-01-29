'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { getUnreadCount, getAllNotifications, markAsRead, markAllAsRead } from '@ecommerce/shared';
import MobileSidebar from './MobileSidebar';
import DeliveryMobileSidebar from './DeliveryMobileSidebar';
import Image from 'next/image';
import Link from 'next/link';
import { UserRole } from '@ecommerce/shared';

export default function Header() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const isDeliveryPartner = user?.role === UserRole.DELIVERY_PARTNER;
  const roleLabel = isDeliveryPartner ? 'Delivery Partner' : 'Administrator';

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const [count, notifs] = await Promise.all([
        getUnreadCount(user.id),
        getAllNotifications(user.id, 10),
      ]);

      setUnreadCount(count);
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Initial load
    loadNotifications();

    // Poll every 30 seconds
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, loadNotifications]);


  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    
    try {
      await markAllAsRead(user.id);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      order_placed: '🆕',
      order_confirmed: '✅',
      order_assigned: '📦',
      order_out_for_delivery: '🚚',
      order_delivered: '✅',
      order_cancelled: '❌',
      subscription_created: '📅',
      subscription_activated: '✅',
      subscription_assigned: '📅',
      payment_received: '💰',
      payment_failed: '⚠️',
      cod_collected: '💵',
      delivery_partner_registered: '👤',
      system_alert: '⚠️',
    };
    return icons[type] || '🔔';
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
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Mobile menu + Logo */}
          <div className="flex items-center gap-4">
            {isDeliveryPartner ? <DeliveryMobileSidebar /> : <MobileSidebar />}
            
            {/* Mobile logo */}
            <div className="flex items-center md:hidden">
              <div className="text-2xl mr-2">
                <Image src="/logo.png" width={80} height={80} className="object-cover" alt="Logo" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Vedida Farms</h1>
              </div>
            </div>
          </div>

          {/* Right: User menu */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors relative"
              >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowNotifications(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-[500px] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto flex-1">
                      {notifications.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="text-4xl mb-2">🔔</div>
                          <p className="text-gray-500 text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() => {
                                if (!notification.isRead) {
                                  handleMarkAsRead(notification.id);
                                }
                                // Navigate to relevant page
                                if (notification.orderId) {
                                  window.location.href = isDeliveryPartner 
                                    ? `/delivery/orders/${notification.orderId}`
                                    : `/dashboard/orders/${notification.orderId}`;
                                } else if (notification.subscriptionId) {
                                  window.location.href = `/dashboard/subscriptions/${notification.subscriptionId}`;
                                }
                                setShowNotifications(false);
                              }}
                              className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                !notification.isRead ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="text-2xl flex-shrink-0">
                                  {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                      {notification.title}
                                    </p>
                                    {!notification.isRead && (
                                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-2">
                                    {getRelativeTime(notification.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="px-4 py-3 border-t border-gray-200 text-center">
                        <Link
                          href={isDeliveryPartner ? '/delivery/notifications' : '/dashboard/notifications'}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                          onClick={() => setShowNotifications(false)}
                        >
                          View all notifications →
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* User dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  isDeliveryPartner ? 'bg-blue-500' : 'bg-primary-500'
                }`}>
                  <span className="text-white font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || (isDeliveryPartner ? 'D' : 'A')}
                  </span>
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name || (isDeliveryPartner ? 'Partner' : 'Admin')}
                  </p>
                  <p className="text-xs text-gray-500">{roleLabel}</p>
                </div>
                <svg
                  className="w-4 h-4 text-gray-400 hidden sm:block"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown menu */}
              {showDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowDropdown(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.name || (isDeliveryPartner ? 'Delivery Partner' : 'Admin User')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {user?.email || user?.phoneNumber}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {roleLabel}
                      </p>
                    </div>

                    <div className="py-2">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <span>🚪</span>
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}