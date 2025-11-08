import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase-config';
import { Cart, CartItem, COLLECTIONS } from '../types';
import { getCurrentTimestamp } from '../utils';
import { getProductById } from './products';

/**
 * Get user's cart
 */
export const getCart = async (userId: string): Promise<Cart> => {
  const db = getFirebaseFirestore();
  const cartDoc = await getDoc(doc(db, COLLECTIONS.CARTS, userId));

  if (!cartDoc.exists()) {
    // Create empty cart if it doesn't exist
    const newCart: Cart = {
      id: userId,
      items: [],
      updatedAt: getCurrentTimestamp(),
    };
    await setDoc(doc(db, COLLECTIONS.CARTS, userId), newCart);
    return newCart;
  }

  return cartDoc.data() as Cart;
};

/**
 * Add item to cart
 */
export const addToCart = async (
  userId: string,
  productId: string,
  quantity: number = 1
): Promise<void> => {
  const db = getFirebaseFirestore();
  const cart = await getCart(userId);

  // Check if product exists and is in stock
  const product = await getProductById(productId);
  if (!product) {
    throw new Error('Product not found');
  }
  if (!product.inStock) {
    throw new Error('Product is out of stock');
  }

  // Check if item already exists in cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId === productId
  );

  let updatedItems: CartItem[];

  if (existingItemIndex >= 0) {
    // Update quantity of existing item
    updatedItems = cart.items.map((item, index) =>
      index === existingItemIndex
        ? { ...item, quantity: item.quantity + quantity }
        : item
    );
  } else {
    // Add new item
    const newItem: CartItem = {
      productId,
      quantity,
      addedAt: getCurrentTimestamp(),
    };
    updatedItems = [...cart.items, newItem];
  }

  await updateDoc(doc(db, COLLECTIONS.CARTS, userId), {
    items: updatedItems,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Update cart item quantity
 */
export const updateCartItemQuantity = async (
  userId: string,
  productId: string,
  quantity: number
): Promise<void> => {
  const db = getFirebaseFirestore();
  const cart = await getCart(userId);

  if (quantity <= 0) {
    // Remove item if quantity is 0 or negative
    await removeFromCart(userId, productId);
    return;
  }

  const updatedItems = cart.items.map((item) =>
    item.productId === productId ? { ...item, quantity } : item
  );

  await updateDoc(doc(db, COLLECTIONS.CARTS, userId), {
    items: updatedItems,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (
  userId: string,
  productId: string
): Promise<void> => {
  const db = getFirebaseFirestore();
  const cart = await getCart(userId);

  const updatedItems = cart.items.filter((item) => item.productId !== productId);

  await updateDoc(doc(db, COLLECTIONS.CARTS, userId), {
    items: updatedItems,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Clear cart
 */
export const clearCart = async (userId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, COLLECTIONS.CARTS, userId), {
    items: [],
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Get cart with populated product details
 */
export const getCartWithProducts = async (userId: string): Promise<Cart> => {
  const cart = await getCart(userId);

  // Fetch product details for each cart item
  const itemsWithProducts = await Promise.all(
    cart.items.map(async (item) => {
      const product = await getProductById(item.productId);
      return {
        ...item,
        product: product || undefined,
      };
    })
  );

  return {
    ...cart,
    items: itemsWithProducts,
  };
};