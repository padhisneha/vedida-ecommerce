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
import { Order, OrderStatus, OrderType, COLLECTIONS } from '../types';
import { getCurrentTimestamp } from '../utils';
import { getProductById } from './products';

/**
 * Generate order number
 */
const generateOrderNumber = async (): Promise<string> => {
  const db = getFirebaseFirestore();
  const year = new Date().getFullYear();

  // Get the last order to determine the next sequence number
  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const snapshot = await getDocs(q);

  let sequence = 1;
  if (!snapshot.empty) {
    const lastOrder = snapshot.docs[0].data() as Order;
    const lastOrderNumber = lastOrder.orderNumber;
    // Extract sequence from format: ORD-YYYY-XXXXX
    const lastSequence = parseInt(lastOrderNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `ORD-${year}-${sequence.toString().padStart(5, '0')}`;
};

/**
 * Create a new order
 */
export const createOrder = async (
  orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const db = getFirebaseFirestore();
  const timestamp = getCurrentTimestamp();
  const orderNumber = await generateOrderNumber();

  const newOrder = {
    ...orderData,
    orderNumber,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const docRef = await addDoc(collection(db, COLLECTIONS.ORDERS), newOrder);
  return docRef.id;
};

/**
 * Get user's orders
 */
export const getUserOrders = async (userId: string): Promise<Order[]> => {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Order[];
};

/**
 * Get user's orders with populated product details
 */
export const getUserOrdersWithProducts = async (userId: string): Promise<Order[]> => {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  // Fetch orders with populated products
  const ordersWithProducts = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();

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
      } as Order;
    })
  );

  return ordersWithProducts;
};

/**
 * Get all orders (Admin)
 */
export const getAllOrders = async (): Promise<Order[]> => {
  const db = getFirebaseFirestore();
  const q = query(collection(db, COLLECTIONS.ORDERS), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Order[];
};

/**
 * Get orders by status (Admin)
 */
export const getOrdersByStatus = async (status: OrderStatus): Promise<Order[]> => {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    where('status', '==', status),
    orderBy('scheduledDeliveryDate', 'asc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Order[];
};

/**
 * Get order by ID
 */
export const getOrderById = async (orderId: string): Promise<Order | null> => {
  const db = getFirebaseFirestore();
  const orderDoc = await getDoc(doc(db, COLLECTIONS.ORDERS, orderId));

  if (!orderDoc.exists()) {
    return null;
  }

  return {
    id: orderDoc.id,
    ...orderDoc.data(),
  } as Order;
};

/**
 * Get order by ID with populated product details
 */
export const getOrderByIdWithProducts = async (orderId: string): Promise<Order | null> => {
  const db = getFirebaseFirestore();
  const orderDoc = await getDoc(doc(db, COLLECTIONS.ORDERS, orderId));

  if (!orderDoc.exists()) {
    return null;
  }

  const data = orderDoc.data();

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
    id: orderDoc.id,
    ...data,
    items: itemsWithProducts,
  } as Order;
};

/**
 * Update order status
 */
export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus
): Promise<void> => {
  const db = getFirebaseFirestore();
  const updates: any = {
    status,
    updatedAt: getCurrentTimestamp(),
  };

  if (status === OrderStatus.DELIVERED) {
    updates.deliveredAt = getCurrentTimestamp();
  }

  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), updates);
};

/**
 * Get today's orders for delivery
 */
export const getTodaysOrders = async (): Promise<Order[]> => {
  const db = getFirebaseFirestore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    where('scheduledDeliveryDate', '>=', today),
    where('scheduledDeliveryDate', '<', tomorrow),
    orderBy('scheduledDeliveryDate', 'asc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Order[];
};