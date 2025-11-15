import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase-config';
import { User, UserRole, COLLECTIONS } from '../types';
import { getCurrentTimestamp } from '../utils';
import { createUser } from './users';

/**
 * Get all delivery partners
 */
export const getAllDeliveryPartners = async (): Promise<User[]> => {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('role', '==', UserRole.DELIVERY_PARTNER),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as User[];
};

/**
 * Get active delivery partners only
 */
export const getActiveDeliveryPartners = async (): Promise<User[]> => {
  const allPartners = await getAllDeliveryPartners();
  return allPartners.filter((partner) => partner.isActive !== false);
};

/**
 * Create delivery partner
 */
export const createDeliveryPartner = async (
  phoneNumber: string,
  data: {
    name: string;
    email?: string;
    vehicleType?: string;
    vehicleNumber?: string;
  }
): Promise<User> => {
  // Generate a unique ID for the delivery partner
  const partnerId = `dp_${Date.now()}`;
  
  const user = await createUser(partnerId, phoneNumber, UserRole.DELIVERY_PARTNER);
  
  // Update with additional details
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, COLLECTIONS.USERS, partnerId), {
    name: data.name,
    email: data.email || '',
    vehicleType: data.vehicleType || '',
    vehicleNumber: data.vehicleNumber || '',
    isActive: true,
    totalDeliveries: 0,
    updatedAt: getCurrentTimestamp(),
  });

  return {
    ...user,
    ...data,
    isActive: true,
    totalDeliveries: 0,
  };
};

/**
 * Update delivery partner
 */
export const updateDeliveryPartner = async (
  partnerId: string,
  updates: Partial<Pick<User, 'name' | 'email' | 'vehicleType' | 'vehicleNumber' | 'isActive'>>
): Promise<void> => {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, COLLECTIONS.USERS, partnerId), {
    ...updates,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Suspend/Activate delivery partner
 */
export const toggleDeliveryPartnerStatus = async (
  partnerId: string,
  isActive: boolean
): Promise<void> => {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, COLLECTIONS.USERS, partnerId), {
    isActive,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Get delivery partner stats
 */
export const getDeliveryPartnerStats = async (partnerId: string) => {
  const db = getFirebaseFirestore();

  // Get assigned orders
  const ordersQuery = query(
    collection(db, COLLECTIONS.ORDERS),
    where('deliveryPartnerId', '==', partnerId)
  );
  const ordersSnapshot = await getDocs(ordersQuery);
  
  const orders = ordersSnapshot.docs.map((doc) => doc.data());
  
  const totalAssigned = orders.length;
  const totalDelivered = orders.filter((o: any) => o.status === 'delivered').length;
  const totalRevenue = orders
    .filter((o: any) => o.status === 'delivered')
    .reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

  return {
    totalAssigned,
    totalDelivered,
    totalRevenue,
    successRate: totalAssigned > 0 ? (totalDelivered / totalAssigned) * 100 : 0,
  };
};