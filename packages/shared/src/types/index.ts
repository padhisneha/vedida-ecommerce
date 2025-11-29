import { Timestamp } from 'firebase/firestore';

// ============================================================================
// User Types
// ============================================================================

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  DELIVERY_PARTNER = 'delivery_partner',
  OPERATOR = 'operator',
}

export interface UserAddress {
  id: string;
  location: string; // e.g. Janapriya NileValley Block 1, Ameenpur
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

  // Delivery Partner specific fields
  vehicleType?: string; // 'bike', 'car', 'bicycle'
  vehicleNumber?: string;
  isActive?: boolean; // For suspending delivery partners
  totalDeliveries?: number; // Track completed deliveries

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
  availableStock: number;        // Current stock in units
  lowStockThreshold: number;     // Alert when stock falls below this
  inStock: boolean;              // Auto-calculated based on availableStock > 0
  allowSubscription: boolean; // Can this product be subscribed?
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Stock Movement tracking
export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number;              // Positive for IN, negative for OUT
  previousStock: number;
  newStock: number;
  reason: string;
  referenceId?: string;          // orderId or subscriptionId
  referenceType?: 'order' | 'subscription' | 'manual';
  createdBy: string;             // userId of the admin/operator
  createdByName?: string;
  createdAt: Timestamp;
}

export enum StockMovementType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment',
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
// Payment Types
// ============================================================================

export enum PaymentMethod {
  COD = 'cod',
  ONLINE = 'online',
  UPI = 'upi', // Unified Payments Interface - Manual verification required
}

export enum PaymentStatus {
  PENDING = 'pending',
  PENDING_VERIFICATION = 'pending_verification',
  PAID = 'paid',
  FAILED = 'failed',
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
  PENDING = 'pending',     // Added - waiting for admin acceptance
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
  subscriptionNumber: string; // Added - e.g., "SUB-2024-00001"
  userId: string;
  items: SubscriptionItem[];
  frequency: SubscriptionFrequency;
  status: SubscriptionStatus;
  deliveryAddress: UserAddress; 
  startDate: Timestamp;
  endDate?: Timestamp;
  pausedUntil?: Timestamp;

  // Payment fields
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  transactionId?: string;

  // Coupon fields
  appliedCoupons?: string[];
  discountAmount?: number;
  freeDeliveryApplied?: boolean;

  // Delivery Slot
  deliverySlot: DeliverySlot;  // Selected delivery slot
  deliverySlotLabel: string;   // e.g., "Morning (6 AM - 12 PM)"

  // Delivery Partner fields
  deliveryPartnerId?: string;
  deliveryPartnerName?: string;

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

  // Coupon/Discount fields
  appliedCoupons?: string[]; // Array of coupon codes applied
  discountAmount?: number;   // Total discount given
  freeDeliveryApplied?: boolean;

  // Payment fields
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  transactionId?: string;

  // Delivery Slot
  deliverySlot?: DeliverySlot;  // Optional for one-time orders
  deliverySlotLabel?: string;   // e.g., "Morning (6 AM - 12 PM)"

  // Delivery Partner fields
  deliveryPartnerId?: string;
  deliveryPartnerName?: string; // Denormalized for quick display
  deliveryNotes?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// Delivery Types
// ============================================================================

export enum DeliverySlot {
  MORNING = 'morning',    // e.g., 6 AM - 12 PM
  EVENING = 'evening',    // e.g., 4 PM - 8 PM
  FLEXIBLE = 'flexible',  // e.g., Any time during the day, For one-time orders only
}

export interface DeliveryArea {
  id: string;
  name: string;  // e.g., "Janapriya Nile Valley Block 1, Ameenpur"
  pincode: string;
  active: boolean;
  // Delivery slot configuration
  slots: {
    morning: {
      enabled: boolean;
    };
    evening: {
      enabled: boolean;
    };
  };
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
  DELIVERY_SLOT_CONFIGS: 'deliverySlotConfigs',
} as const;


export * from './settings';
export * from './notifications';
export * from './offers';