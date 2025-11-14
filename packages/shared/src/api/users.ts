import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase-config';
import { User, UserAddress, COLLECTIONS, UserRole, Order, SubscriptionStatus } from '../types';
import { getCurrentTimestamp } from '../utils';

/**
 * Create a new user document
 */
export const createUser = async (
  userId: string,
  phoneNumber: string,
  role: UserRole = UserRole.CUSTOMER
): Promise<User> => {
  const db = getFirebaseFirestore();
  const timestamp = getCurrentTimestamp();

  const newUser: User = {
    id: userId,
    phoneNumber,
    role,
    addresses: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await setDoc(doc(db, COLLECTIONS.USERS, userId), newUser);
  return newUser;
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  const db = getFirebaseFirestore();
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));

  if (!userDoc.exists()) {
    return null;
  }

  return userDoc.data() as User;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  data: Partial<Omit<User, 'id' | 'phoneNumber' | 'role' | 'createdAt'>>
): Promise<void> => {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
    ...data,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Add address to user
 */
export const addUserAddress = async (
  userId: string,
  address: Omit<UserAddress, 'id'>
): Promise<string> => {
  const db = getFirebaseFirestore();
  const user = await getUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const addressId = `addr_${Date.now()}`;
  const newAddress: UserAddress = {
    ...address,
    id: addressId,
  };

  // If this is the first address or marked as default, set all others to non-default
  const updatedAddresses = address.isDefault
    ? [...user.addresses.map((a) => ({ ...a, isDefault: false })), newAddress]
    : [...user.addresses, newAddress];

  await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
    addresses: updatedAddresses,
    updatedAt: getCurrentTimestamp(),
  });

  return addressId;
};

/**
 * Update user address
 */
export const updateUserAddress = async (
  userId: string,
  addressId: string,
  updates: Partial<Omit<UserAddress, 'id'>>
): Promise<void> => {
  const db = getFirebaseFirestore();
  const user = await getUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const updatedAddresses = user.addresses.map((addr) => {
    if (addr.id === addressId) {
      return { ...addr, ...updates };
    }
    // If setting this address as default, unset others
    if (updates.isDefault === true) {
      return { ...addr, isDefault: false };
    }
    return addr;
  });

  await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
    addresses: updatedAddresses,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Delete user address
 */
export const deleteUserAddress = async (
  userId: string,
  addressId: string
): Promise<void> => {
  const db = getFirebaseFirestore();
  const user = await getUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const updatedAddresses = user.addresses.filter((addr) => addr.id !== addressId);

  await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
    addresses: updatedAddresses,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Get all users (Admin only)
 */
export const getAllUsers = async (): Promise<User[]> => {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, COLLECTIONS.USERS),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as User[];
};

/**
 * Get users by role (Admin only)
 */
export const getUsersByRole = async (role: UserRole): Promise<User[]> => {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('role', '==', role),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as User[];
};

/**
 * Get customer stats (Admin only)
 */
export const getCustomerStats = async (userId: string) => {
  const db = getFirebaseFirestore();

  // Get orders count
  const ordersQuery = query(
    collection(db, COLLECTIONS.ORDERS),
    where('userId', '==', userId)
  );
  const ordersSnapshot = await getDocs(ordersQuery);
  const totalOrders = ordersSnapshot.size;

  // Calculate total spent
  const orders = ordersSnapshot.docs.map((doc) => doc.data() as Order);
  const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  // Get subscriptions count
  const subsQuery = query(
    collection(db, COLLECTIONS.SUBSCRIPTIONS),
    where('userId', '==', userId)
  );
  const subsSnapshot = await getDocs(subsQuery);
  const totalSubscriptions = subsSnapshot.size;

  // Get active subscriptions count
  const activeSubscriptions = subsSnapshot.docs.filter(
    (doc) => {
      const data = doc.data();
      return data.status === SubscriptionStatus.ACTIVE || data.status === SubscriptionStatus.PAUSED;
    }
  ).length;

  return {
    totalOrders,
    totalSpent,
    totalSubscriptions,
    activeSubscriptions,
  };
};