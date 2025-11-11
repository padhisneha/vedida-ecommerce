import { Timestamp } from 'firebase/firestore';

// ============================================================================
// User Types
// ============================================================================

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
}

export interface UserAddress {
  id: string;
  label: string; // e.g., "Home", "Office"
  street: string;
  apartment?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault: boolean;
}

export interface User {
  id: string; // Firebase Auth UID
  phoneNumber: string;
  name?: string;
  email?: string;
  role: UserRole;
  addresses: UserAddress[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// Product Types
// ============================================================================

export enum ProductCategory {
  MILK = 'milk',
  CURD = 'curd',
  GHEE = 'ghee',
  PANEER = 'paneer',
  BUTTER = 'butter',
  BUTTERMILK = 'buttermilk',
  OTHER = 'other',
}

export enum ProductUnit {
  LITER = 'liter',
  ML = 'ml',
  KG = 'kg',
  GRAM = 'gram',
  PIECE = 'piece',
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  priceExcludingTax: number; // Base price without tax
  taxCGST: number; // CGST percentage (e.g., 2.5 for 2.5%)
  taxSGST: number; // SGST percentage (e.g., 2.5 for 2.5%)
  price: number; // Final price including tax (for display)
  unit: ProductUnit;
  quantity: number; // e.g., 500 for 500ml
  imageUrl?: string;
  inStock: boolean;
  allowSubscription: boolean; // Can this product be subscribed?
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// Cart Types
// ============================================================================

export interface CartItem {
  productId: string;
  product?: Product; // Populated from products collection
  quantity: number;
  addedAt: Timestamp;
}

export interface Cart {
  id: string; // userId
  items: CartItem[];
  updatedAt: Timestamp;
}

// ============================================================================
// Subscription Types
// ============================================================================

export enum SubscriptionFrequency {
  DAILY = 'daily',
  ALTERNATE_DAYS = 'alternate_days',
  WEEKLY = 'weekly',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface SubscriptionItem {
  productId: string;
  product?: Product;
  quantity: number;
}

export interface Subscription {
  id: string;
  userId: string;
  items: SubscriptionItem[];
  frequency: SubscriptionFrequency;
  status: SubscriptionStatus;
  deliveryAddress: UserAddress; 
  startDate: Timestamp;
  endDate?: Timestamp;
  pausedUntil?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// Order Types
// ============================================================================

export enum OrderType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface OrderItem {
  productId: string;
  product?: Product;
  quantity: number;
  price: number; // Price at the time of order
}

export interface Order {
  id: string;
  userId: string;
  orderNumber: string; // e.g., "ORD-2024-00001"
  type: OrderType;
  subscriptionId?: string; // If order is from subscription
  items: OrderItem[];
  totalAmount: number;
  deliveryAddress: UserAddress;
  status: OrderStatus;
  scheduledDeliveryDate: Timestamp;
  deliveredAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// Firestore Collection Names (Constants)
// ============================================================================

export const COLLECTIONS = {
  USERS: 'users',
  PRODUCTS: 'products',
  CARTS: 'carts',
  SUBSCRIPTIONS: 'subscriptions',
  ORDERS: 'orders',
} as const;