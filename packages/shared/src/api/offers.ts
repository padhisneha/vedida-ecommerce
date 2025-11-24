import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase-config';
import { Offer, CartItem, SubscriptionItem, OfferApplicability } from '../types';

const COLLECTIONS = {
  OFFERS: 'offers',
};

const getCurrentTimestamp = () => Timestamp.now();

/**
 * Create new offer
 */
export const createOffer = async (offerData: Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const db = getFirebaseFirestore();
  const timestamp = getCurrentTimestamp();

  const docRef = await addDoc(collection(db, COLLECTIONS.OFFERS), {
    ...offerData,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return docRef.id;
};

/**
 * Get all offers
 */
export const getAllOffers = async (): Promise<Offer[]> => {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, COLLECTIONS.OFFERS),
    orderBy('displayOrder', 'asc'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Offer[];
};

/**
 * Get active offers for homepage
 */
export const getActiveOffers = async (): Promise<Offer[]> => {
  const db = getFirebaseFirestore();
  const now = Timestamp.now();

  const q = query(
    collection(db, COLLECTIONS.OFFERS),
    where('isActive', '==', true),
    where('showOnHomepage', '==', true),
    orderBy('displayOrder', 'asc')
  );

  const snapshot = await getDocs(q);
  const offers = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Offer[];

  // Filter by date range
  return offers.filter(offer => {
    const start = offer.startDate.toDate();
    const end = offer.endDate.toDate();
    const current = now.toDate();
    return current >= start && current <= end;
  });
};

/**
 * Get offer by ID
 */
export const getOfferById = async (offerId: string): Promise<Offer | null> => {
  const db = getFirebaseFirestore();
  const offerDoc = await getDoc(doc(db, COLLECTIONS.OFFERS, offerId));

  if (!offerDoc.exists()) {
    return null;
  }

  return {
    id: offerDoc.id,
    ...offerDoc.data(),
  } as Offer;
};

/**
 * Update offer
 */
export const updateOffer = async (
  offerId: string,
  updates: Partial<Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, COLLECTIONS.OFFERS, offerId), {
    ...updates,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Delete offer
 */
export const deleteOffer = async (offerId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  await deleteDoc(doc(db, COLLECTIONS.OFFERS, offerId));
};

/**
 * Toggle offer active status
 */
export const toggleOfferStatus = async (offerId: string, isActive: boolean): Promise<void> => {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, COLLECTIONS.OFFERS, offerId), {
    isActive,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Get applicable coupons for cart/subscription
 */
export const getApplicableCoupons = async (
  cartItems: CartItem[] | SubscriptionItem[],
  subtotal: number,
  type: 'order' | 'subscription' = 'order'
): Promise<Offer[]> => {
  const db = getFirebaseFirestore();
  const now = Timestamp.now();

  // Get all active offers with coupon codes
  const q = query(
    collection(db, COLLECTIONS.OFFERS),
    where('isActive', '==', true),
    where('couponCode', '!=', null),
    orderBy('couponCode'),
    orderBy('displayOrder', 'asc')
  );

  const snapshot = await getDocs(q);
  const offers = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Offer[];

  // Filter by date range, applicability, and type
  return offers.filter(offer => {
    // Check applicability (orders vs subscriptions)
    if (type === 'order' && offer.applicability === OfferApplicability.SUBSCRIPTIONS_ONLY) {
      return false;
    }
    if (type === 'subscription' && offer.applicability === OfferApplicability.ORDERS_ONLY) {
      return false;
    }
    
    // Check date validity
    const start = offer.startDate.toDate();
    const end = offer.endDate.toDate();
    const current = now.toDate();
    if (current < start || current > end) return false;
    
    // Check minimum order amount
    if (offer.minOrderAmount && subtotal < offer.minOrderAmount) return false;
    
    // Check if cart has applicable products
    if (offer.applicableCategories && offer.applicableCategories.length > 0) {
      const hasApplicable = cartItems.some((item: any) => {
        const product = item.product || item; // Handle both CartItem and SubscriptionItem
        return product && offer.applicableCategories!.includes(product.category);
      });
      if (!hasApplicable) return false;
    }
    
    return true;
  });
};