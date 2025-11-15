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
  limit,
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
 * Generate subscription number
 */
const generateSubscriptionNumber = async (): Promise<string> => {
  const db = getFirebaseFirestore();
  const year = new Date().getFullYear();

  // Get the last subscription to determine the next sequence number
  const q = query(
    collection(db, COLLECTIONS.SUBSCRIPTIONS),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const snapshot = await getDocs(q);

  let sequence = 1;
  if (!snapshot.empty) {
    const lastSub = snapshot.docs[0].data() as Subscription;
    if (lastSub.subscriptionNumber) {
      // Extract sequence from format: SUB-YYYY-XXXXX
      const lastSequence = parseInt(lastSub.subscriptionNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }
  }

  return `SUB-${year}-${sequence.toString().padStart(5, '0')}`;
};

/**
 * Create a new subscription
 */
export const createSubscription = async (
  subscriptionData: Omit<Subscription, 'id' | 'subscriptionNumber' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const db = getFirebaseFirestore();
  const timestamp = getCurrentTimestamp();
  const subscriptionNumber = await generateSubscriptionNumber();

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
    subscriptionNumber,
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
 * Get user's subscriptions with populated product details
 */
export const getUserSubscriptionsWithProducts = async (userId: string): Promise<Subscription[]> => {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, COLLECTIONS.SUBSCRIPTIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  // Fetch subscriptions with populated products
  const subscriptionsWithProducts = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      
      // Handle old schema with deliveryAddressId
      if (!data.deliveryAddress && data.deliveryAddressId) {
        data.deliveryAddress = {
          id: data.deliveryAddressId,
          label: 'Address',
          street: 'Address details not available',
          city: '-',
          state: '-',
          pincode: '000000',
          isDefault: false,
        };
      }

      // Populate product details for each item
      const itemsWithProducts = await Promise.all(
        (data.items || []).map(async (item: any) => {
          const product = await getProductById(item.productId);
          return {
            ...item,
            product: product || undefined,
          };
        })
      );

      return {
        id: doc.id,
        ...data,
        items: itemsWithProducts,
      } as Subscription;
    })
  );

  return subscriptionsWithProducts;
};

/**
 * Get all subscriptions (Admin only)
 */
export const getAllSubscriptions = async (): Promise<Subscription[]> => {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, COLLECTIONS.SUBSCRIPTIONS),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Subscription[];
};

/**
 * Get all subscriptions with populated product details (Admin only)
 */
export const getAllSubscriptionsWithProducts = async (): Promise<Subscription[]> => {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, COLLECTIONS.SUBSCRIPTIONS),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  // Fetch subscriptions with populated products
  const subscriptionsWithProducts = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();

      // Handle old schema with deliveryAddressId
      if (!data.deliveryAddress && data.deliveryAddressId) {
        data.deliveryAddress = {
          id: data.deliveryAddressId,
          label: 'Address',
          street: 'Address details not available',
          city: '-',
          state: '-',
          pincode: '000000',
          isDefault: false,
        };
      }

      // Populate product details for each item
      const itemsWithProducts = await Promise.all(
        (data.items || []).map(async (item: any) => {
          const product = await getProductById(item.productId);
          return {
            ...item,
            product: product || undefined,
          };
        })
      );

      return {
        id: doc.id,
        ...data,
        items: itemsWithProducts,
      } as Subscription;
    })
  );

  return subscriptionsWithProducts;
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

/**
 * Assign delivery partner to subscription
 */
export const assignDeliveryPartnerToSubscription = async (
  subscriptionId: string,
  partnerId: string,
  partnerName: string
): Promise<void> => {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, COLLECTIONS.SUBSCRIPTIONS, subscriptionId), {
    deliveryPartnerId: partnerId,
    deliveryPartnerName: partnerName,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Bulk accept pending subscriptions
 */
export const bulkAcceptSubscriptions = async (
  subscriptionIds: string[]
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const subscriptionId of subscriptionIds) {
    try {
      await updateSubscriptionStatus(subscriptionId, SubscriptionStatus.ACTIVE);
      success++;
    } catch (error) {
      console.error(`Failed to accept subscription ${subscriptionId}:`, error);
      failed++;
    }
  }

  return { success, failed };
};

/**
 * Bulk assign delivery partner to subscriptions
 */
export const bulkAssignDeliveryPartnerToSubscriptions = async (
  subscriptionIds: string[],
  partnerId: string,
  partnerName: string
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const subscriptionId of subscriptionIds) {
    try {
      await assignDeliveryPartnerToSubscription(subscriptionId, partnerId, partnerName);
      success++;
    } catch (error) {
      console.error(`Failed to assign partner to subscription ${subscriptionId}:`, error);
      failed++;
    }
  }

  return { success, failed };
};