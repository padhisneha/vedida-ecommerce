import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase-config';
import { Product, ProductCategory, COLLECTIONS } from '../types';
import { getCurrentTimestamp } from '../utils';

/**
 * Create a new product (Admin only)
 */
export const createProduct = async (
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const db = getFirebaseFirestore();
  const timestamp = getCurrentTimestamp();

  const newProduct = {
    ...productData,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const docRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), newProduct);
  return docRef.id;
};

/**
 * Get all products
 */
export const getAllProducts = async (): Promise<Product[]> => {
  const db = getFirebaseFirestore();
  const q = query(collection(db, COLLECTIONS.PRODUCTS), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Product[];
};

/**
 * Get products by category
 */
export const getProductsByCategory = async (
  category: ProductCategory
): Promise<Product[]> => {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, COLLECTIONS.PRODUCTS),
    where('category', '==', category),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Product[];
};

/**
 * Get in-stock products
 */
export const getInStockProducts = async (): Promise<Product[]> => {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, COLLECTIONS.PRODUCTS),
    where('inStock', '==', true),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Product[];
};

/**
 * Get product by ID
 */
export const getProductById = async (productId: string): Promise<Product | null> => {
  const db = getFirebaseFirestore();
  const productDoc = await getDoc(doc(db, COLLECTIONS.PRODUCTS, productId));

  if (!productDoc.exists()) {
    return null;
  }

  return {
    id: productDoc.id,
    ...productDoc.data(),
  } as Product;
};

/**
 * Update product (Admin only)
 */
export const updateProduct = async (
  productId: string,
  updates: Partial<Omit<Product, 'id' | 'createdAt'>>
): Promise<void> => {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, COLLECTIONS.PRODUCTS, productId), {
    ...updates,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Delete product (Admin only)
 */
export const deleteProduct = async (productId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
};

/**
 * Get products that support subscription
 */
export const getSubscriptionProducts = async (): Promise<Product[]> => {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, COLLECTIONS.PRODUCTS),
    where('allowSubscription', '==', true),
    where('inStock', '==', true),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Product[];
};