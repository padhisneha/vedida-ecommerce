// packages/shared/src/api/banners.ts

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase-config';
import { Banner, BannerPlatform, BannerPosition } from '../types/banners';
import { COLLECTIONS } from '../types';

const getCurrentTimestamp = () => Timestamp.now();

/**
 * Get all banners
 */
export const getAllBanners = async (): Promise<Banner[]> => {
  const db = getFirebaseFirestore();
  
  const q = query(
    collection(db, COLLECTIONS.BANNERS),
    orderBy('platform', 'asc'),
    orderBy('position', 'asc'),
    orderBy('displayOrder', 'asc'),
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Banner[];
};

/**
 * Get active banners for a specific platform and position
 */
export const getActiveBanners = async (
  platform: BannerPlatform | 'web' | 'mobile',
  position?: BannerPosition
): Promise<Banner[]> => {
  const db = getFirebaseFirestore();
  
  let q;
  
  if (position) {
    q = query(
      collection(db, COLLECTIONS.BANNERS),
      where('isActive', '==', true),
      where('position', '==', position),
      orderBy('displayOrder', 'asc')
    );
  } else {
    q = query(
      collection(db, COLLECTIONS.BANNERS),
      where('isActive', '==', true),
      orderBy('displayOrder', 'asc')
    );
  }
  
  const snapshot = await getDocs(q);
  const banners = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Banner[];
  
  // Filter by platform
  return banners.filter(
    (banner) => banner.platform === platform || banner.platform === 'both'
  );
};

/**
 * Get banner by ID
 */
export const getBannerById = async (bannerId: string): Promise<Banner | null> => {
  const db = getFirebaseFirestore();
  
  const bannerRef = doc(db, COLLECTIONS.BANNERS, bannerId);
  const bannerDoc = await getDoc(bannerRef);
  
  if (!bannerDoc.exists()) {
    return null;
  }
  
  return {
    id: bannerDoc.id,
    ...bannerDoc.data(),
  } as Banner;
};

/**
 * Create a new banner
 */
export const createBanner = async (
  bannerData: Omit<Banner, 'id' | 'impressions' | 'clicks' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const db = getFirebaseFirestore();
  
  const newBanner = {
    ...bannerData,
    impressions: 0,
    clicks: 0,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };
  
  const docRef = await addDoc(collection(db, COLLECTIONS.BANNERS), newBanner);
  console.log('✅ Banner created:', docRef.id);
  return docRef.id;
};

/**
 * Update banner
 */
export const updateBanner = async (
  bannerId: string,
  updates: Partial<Banner>
): Promise<void> => {
  const db = getFirebaseFirestore();
  
  const bannerRef = doc(db, COLLECTIONS.BANNERS, bannerId);
  await updateDoc(bannerRef, {
    ...updates,
    updatedAt: getCurrentTimestamp(),
  });
  
  console.log('✅ Banner updated:', bannerId);
};

/**
 * Delete banner
 */
export const deleteBanner = async (bannerId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  
  const bannerRef = doc(db, COLLECTIONS.BANNERS, bannerId);
  await deleteDoc(bannerRef);
  
  console.log('✅ Banner deleted:', bannerId);
};

/**
 * Toggle banner active status
 */
export const toggleBannerStatus = async (bannerId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  
  const bannerRef = doc(db, COLLECTIONS.BANNERS, bannerId);
  const bannerDoc = await getDoc(bannerRef);
  
  if (!bannerDoc.exists()) {
    throw new Error('Banner not found');
  }
  
  const currentStatus = bannerDoc.data().isActive;
  
  await updateDoc(bannerRef, {
    isActive: !currentStatus,
    updatedAt: getCurrentTimestamp(),
  });
  
  console.log('✅ Banner status toggled:', bannerId);
};

/**
 * Record banner impression (view)
 */
export const recordBannerImpression = async (bannerId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  
  const bannerRef = doc(db, COLLECTIONS.BANNERS, bannerId);
  const bannerDoc = await getDoc(bannerRef);
  
  if (!bannerDoc.exists()) return;
  
  const currentImpressions = bannerDoc.data().impressions || 0;
  
  await updateDoc(bannerRef, {
    impressions: currentImpressions + 1,
  });
};

/**
 * Record banner click
 */
export const recordBannerClick = async (bannerId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  
  const bannerRef = doc(db, COLLECTIONS.BANNERS, bannerId);
  const bannerDoc = await getDoc(bannerRef);
  
  if (!bannerDoc.exists()) return;
  
  const currentClicks = bannerDoc.data().clicks || 0;
  
  await updateDoc(bannerRef, {
    clicks: currentClicks + 1,
  });
};

/**
 * Update banner display order
 */
export const updateBannerOrder = async (
  bannerId: string,
  newOrder: number
): Promise<void> => {
  const db = getFirebaseFirestore();
  
  const bannerRef = doc(db, COLLECTIONS.BANNERS, bannerId);
  await updateDoc(bannerRef, {
    displayOrder: newOrder,
    updatedAt: getCurrentTimestamp(),
  });
};