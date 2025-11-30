// packages/shared/src/api/notifications.ts
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase-config';
import { Notification, NotificationType } from '../types/notifications';
import { COLLECTIONS } from '../types';

/**
 * Create a notification
 */
export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  options?: {
    orderId?: string;
    subscriptionId?: string;
    deliveryPartnerId?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> => {
  const db = getFirebaseFirestore();

  const notificationData = {
    userId,
    type,
    title,
    message,
    metadata: options?.metadata || {},
    isRead: false,
    isArchived: false,
    createdAt: Timestamp.now(),
    ...(options?.orderId && { orderId: options.orderId }),
    ...(options?.subscriptionId && { subscriptionId: options.subscriptionId }),
    ...(options?.deliveryPartnerId && { deliveryPartnerId: options.deliveryPartnerId }),
  };
  
  await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), notificationData);
};

/**
 * Get unread notifications for a user
 */
export const getUnreadNotifications = async (
  userId: string,
  limitCount: number = 10
): Promise<Notification[]> => {
  const db = getFirebaseFirestore();
  
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    where('isRead', '==', false),
    where('isArchived', '==', false),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Notification[];
};

/**
 * Get all notifications for a user
 */
export const getAllNotifications = async (
  userId: string,
  limitCount: number = 50
): Promise<Notification[]> => {
  const db = getFirebaseFirestore();
  
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    where('isArchived', '==', false),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Notification[];
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  const db = getFirebaseFirestore();
  
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    where('isRead', '==', false),
    where('isArchived', '==', false)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.size;
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  
  await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
    isRead: true,
    readAt: Timestamp.now(),
  });
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId: string): Promise<void> => {
  const notifications = await getUnreadNotifications(userId, 100);
  
  const promises = notifications.map(notification =>
    markAsRead(notification.id)
  );
  
  await Promise.all(promises);
};

/**
 * Archive notification
 */
export const archiveNotification = async (notificationId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  
  await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
    isArchived: true,
  });
};