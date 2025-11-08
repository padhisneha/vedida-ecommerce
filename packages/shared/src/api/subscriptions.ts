import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase-config';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionItem,
  COLLECTIONS,
} from '../types';
import { getCurrentTimestamp } from '../utils';
import { getProductById } from './products';

/**
 * Create a new subscription
 */
export const createSubscription = async (
  subscriptionData: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const db = getFirebaseFirestore();
  const timestamp = getCurrentTimestamp();

  // Validate all products exist and support subscription
  for (const item of subscriptionData.items) {
    const product = await getProductById(item.productId);
    if (!product) {
      throw new Error(`Product ${item.productId} not found`);
    }
    if (!product.allowSubscription) {
      throw new Error(`Product ${product.name} does not support subscription`);
    }
    if (!product.inStock) {
      throw new Error(`Product ${product.name} is out of stock`);
    }
  }

  const newSubscription = {
    ...subscriptionData,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const docRef = await addDoc(
    collection(db, COLLECTIONS.SUBSCRIPTIONS),
    newSubscription
  );
  return docRef.id;
};

/**
 * Get user's subscriptions
 */
export const getUserSubscriptions = async (userId: string): Promise<Subscription[]> => {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, COLLECTIONS.SUBSCRIPTIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Subscription[];
};

/**
 * Get active user subscriptions
 */
export const getActiveUserSubscriptions = async (
  userId: string
): Promise<Subscription[]> => {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, COLLECTIONS.SUBSCRIPTIONS),
    where('userId', '==', userId),
    where('status', '==', SubscriptionStatus.ACTIVE),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Subscription[];
};

/**
 * Get subscription by ID
 */
export const getSubscriptionById = async (
  subscriptionId: string
): Promise<Subscription | null> => {
  const db = getFirebaseFirestore();
  const subDoc = await getDoc(doc(db, COLLECTIONS.SUBSCRIPTIONS, subscriptionId));

  if (!subDoc.exists()) {
    return null;
  }

  return {
    id: subDoc.id,
    ...subDoc.data(),
  } as Subscription;
};

/**
 * Update subscription status
 */
export const updateSubscriptionStatus = async (
  subscriptionId: string,
  status: SubscriptionStatus,
  pausedUntil?: Date
): Promise<void> => {
  const db = getFirebaseFirestore();
  const updates: any = {
    status,
    updatedAt: getCurrentTimestamp(),
  };

  if (status === SubscriptionStatus.PAUSED && pausedUntil) {
    updates.pausedUntil = pausedUntil;
  } else if (status === SubscriptionStatus.ACTIVE) {
    updates.pausedUntil = null;
  }

  await updateDoc(doc(db, COLLECTIONS.SUBSCRIPTIONS, subscriptionId), updates);
};

/**
 * Update subscription items
 */
export const updateSubscriptionItems = async (
  subscriptionId: string,
  items: SubscriptionItem[]
): Promise<void> => {
  const db = getFirebaseFirestore();

  // Validate all products
  for (const item of items) {
    const product = await getProductById(item.productId);
    if (!product) {
      throw new Error(`Product ${item.productId} not found`);
    }
    if (!product.allowSubscription) {
      throw new Error(`Product ${product.name} does not support subscription`);
    }
  }

  await updateDoc(doc(db, COLLECTIONS.SUBSCRIPTIONS, subscriptionId), {
    items,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (subscriptionId: string): Promise<void> => {
  await updateSubscriptionStatus(subscriptionId, SubscriptionStatus.CANCELLED);
};

/**
 * Get subscription with populated product details
 */
export const getSubscriptionWithProducts = async (
  subscriptionId: string
): Promise<Subscription | null> => {
  const subscription = await getSubscriptionById(subscriptionId);

  if (!subscription) {
    return null;
  }

  // Fetch product details for each subscription item
  const itemsWithProducts = await Promise.all(
    subscription.items.map(async (item) => {
      const product = await getProductById(item.productId);
      return {
        ...item,
        product: product || undefined,
      };
    })
  );

  return {
    ...subscription,
    items: itemsWithProducts,
  };
};