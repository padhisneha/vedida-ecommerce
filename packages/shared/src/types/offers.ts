import { Timestamp } from 'firebase/firestore';
import { ProductCategory } from './index';

export enum OfferApplicability {
  ORDERS_ONLY = 'orders_only',
  SUBSCRIPTIONS_ONLY = 'subscriptions_only',
  BOTH = 'both',
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discountPercentage?: number;
  couponCode?: string;
  bannerImage?: string;
  backgroundColor: string;
  textColor: string;
  
  // Validity
  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
  
  // Target
  applicableCategories?: ProductCategory[]; // Product IDs
  minOrderAmount?: number;
  maxDiscount?: number;
  applicability: OfferApplicability; // orders, subscriptions, or both

  // Special features
  includesFreeDelivery?: boolean; // Can be combined with discount
  
  // Display
  displayOrder: number; // For carousel ordering
  showOnHomepage: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}