import { Timestamp } from 'firebase/firestore';

export enum NotificationType {
  // Order related
  ORDER_PLACED = 'order_placed',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_ASSIGNED = 'order_assigned',
  ORDER_OUT_FOR_DELIVERY = 'order_out_for_delivery',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  
  // Subscription related
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_ACTIVATED = 'subscription_activated',
  SUBSCRIPTION_ASSIGNED = 'subscription_assigned',
  SUBSCRIPTION_PAUSED = 'subscription_paused',
  SUBSCRIPTION_ENDING_SOON = 'subscription_ending_soon',
  
  // Payment related
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_FAILED = 'payment_failed',
  COD_COLLECTED = 'cod_collected',
  
  // Delivery Partner related
  DELIVERY_PARTNER_REGISTERED = 'delivery_partner_registered',
  
  // System
  SYSTEM_ALERT = 'system_alert',
}

export interface Notification {
  id: string;
  userId: string; // Recipient user ID
  type: NotificationType;
  title: string;
  message: string;
  
  // Related entities
  orderId?: string;
  subscriptionId?: string;
  deliveryPartnerId?: string;
  
  // Metadata
  metadata?: {
    orderNumber?: string;
    subscriptionNumber?: string;
    amount?: number;
    deliveryDate?: string;
    [key: string]: any;
  };
  
  // Status
  isRead: boolean;
  isArchived: boolean;
  
  // Timestamps
  createdAt: Timestamp;
  readAt?: Timestamp;
}
