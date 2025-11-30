// packages/shared/src/types/banners.ts

import { Timestamp } from 'firebase/firestore';

export enum BannerPlatform {
  WEB = 'web',
  MOBILE = 'mobile',
  BOTH = 'both',
}

export enum BannerPosition {
  HOME_HERO = 'home_hero',       // Top carousel/hero section
  HOME_PROMO = 'home_promo',     // Promotional cards
}

export enum BannerActionType {
  NONE = 'none',
  CATEGORY = 'category',
  PRODUCT = 'product',
  SUBSCRIPTIONS = 'subscriptions',
  OFFERS = 'offers',
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}

export enum BannerImageSource {
  UPLOAD = 'upload',    // Image uploaded to Firebase Storage
  URL = 'url',          // External image URL
}

export interface Banner {
  id: string;
  title: string;
  description?: string;         // Optional subtitle
  
  // Image
  imageSource: BannerImageSource;
  imageUrl: string;             // Either uploaded URL or external URL
  
  // Display
  platform: BannerPlatform;
  position: BannerPosition;
  displayOrder: number;         // Sort order (lower = higher priority)
  
  // Action/Navigation
  actionType: BannerActionType;
  actionValue?: string;         // productId, category name, or URL
  actionText?: string;          // Button text like "Shop Now", "Learn More"
  
  // Status
  isActive: boolean;
  
  // Analytics
  impressions: number;
  clicks: number;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  createdByName: string;
}