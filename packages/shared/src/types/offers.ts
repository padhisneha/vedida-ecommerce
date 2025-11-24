import { Timestamp } from 'firebase/firestore';
import { ProductCategory } from './index';

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

  // Special features
  includesFreeDelivery?: boolean; // Can be combined with discount
  
  // Display
  displayOrder: number; // For carousel ordering
  showOnHomepage: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}