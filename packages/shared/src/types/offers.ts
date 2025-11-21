import { Timestamp } from 'firebase/firestore';

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
  applicableProducts?: string[]; // Product IDs
  minOrderAmount?: number;
  maxDiscount?: number;
  
  // Display
  displayOrder: number; // For carousel ordering
  showOnHomepage: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}