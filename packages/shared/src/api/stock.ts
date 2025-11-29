// packages/shared/src/api/stock.ts
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase-config';
import { StockMovement, StockMovementType, Product, UserRole, NotificationType } from '../types';
import { createNotification } from './notifications';
import { getUsersByRole } from './users';

const COLLECTIONS = {
  STOCK_MOVEMENTS: 'stockMovements',
  PRODUCTS: 'products',
};

/**
 * Add stock to a product
 * Uses transaction to ensure consistency
 */
export const addStock = async (
  productId: string,
  quantityToAdd: number,
  adminId: string,
  adminName: string,
  reason: string = 'New stock added'
): Promise<void> => {
  if (quantityToAdd <= 0) {
    throw new Error('Quantity to add must be positive');
  }

  const db = getFirebaseFirestore();

  await runTransaction(db, async (transaction) => {
    const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    const productDoc = await transaction.get(productRef);

    if (!productDoc.exists()) {
      throw new Error('Product not found');
    }

    const product = productDoc.data() as Product;
    const previousStock = product.availableStock || 0;
    const newStock = previousStock + quantityToAdd;

    // Update product stock
    transaction.update(productRef, {
      availableStock: newStock,
      inStock: newStock > 0,
      updatedAt: Timestamp.now(),
    });

    // Record stock movement
    const movementRef = doc(collection(db, COLLECTIONS.STOCK_MOVEMENTS));
    transaction.set(movementRef, {
      productId,
      productName: product.name,
      type: StockMovementType.IN,
      quantity: quantityToAdd,
      previousStock,
      newStock,
      reason,
      referenceType: 'manual',
      createdBy: adminId,
      createdByName: adminName,
      createdAt: Timestamp.now(),
    });
  });

  console.log(`✅ Added ${quantityToAdd} units to product ${productId}`);
};

/**
 * Reduce stock for order items
 * Uses transaction to prevent overselling
 */
export const reduceStockForOrder = async (
  orderId: string,
  orderNumber: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<void> => {
  const db = getFirebaseFirestore();

  await runTransaction(db, async (transaction) => {
    // Check stock availability for all items first
    for (const item of items) {
      const productRef = doc(db, COLLECTIONS.PRODUCTS, item.productId);
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists()) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const product = productDoc.data() as Product;
      const availableStock = product.availableStock || 0;

      if (availableStock < item.quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}. Available: ${availableStock}, Required: ${item.quantity}`
        );
      }
    }

    // All items have sufficient stock, proceed with reduction
    for (const item of items) {
      const productRef = doc(db, COLLECTIONS.PRODUCTS, item.productId);
      const productDoc = await transaction.get(productRef);
      const product = productDoc.data() as Product;

      const previousStock = product.availableStock || 0;
      const newStock = previousStock - item.quantity;

      // Update product stock
      transaction.update(productRef, {
        availableStock: newStock,
        inStock: newStock > 0,
        updatedAt: Timestamp.now(),
      });

      // Record stock movement
      const movementRef = doc(collection(db, COLLECTIONS.STOCK_MOVEMENTS));
      transaction.set(movementRef, {
        productId: item.productId,
        productName: product.name,
        type: StockMovementType.OUT,
        quantity: -item.quantity,
        previousStock,
        newStock,
        reason: `Order ${orderNumber}`,
        referenceId: orderId,
        referenceType: 'order',
        createdBy: 'system',
        createdByName: 'System',
        createdAt: Timestamp.now(),
      });
    }
  });

  // Check and notify for low stock
  for (const item of items) {
    await checkAndNotifyLowStock(item.productId);
  }

  console.log(`✅ Stock reduced for order ${orderNumber}`);
};

/**
 * Restore stock when order is cancelled
 */
export const restoreStockForOrder = async (
  orderId: string,
  orderNumber: string,
  items: Array<{ productId: string; quantity: number; productName?: string }>,
  adminId: string,
  adminName: string
): Promise<void> => {
  const db = getFirebaseFirestore();

  await runTransaction(db, async (transaction) => {
    for (const item of items) {
      const productRef = doc(db, COLLECTIONS.PRODUCTS, item.productId);
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists()) {
        console.warn(`Product ${item.productId} not found, skipping stock restoration`);
        continue;
      }

      const product = productDoc.data() as Product;
      const previousStock = product.availableStock || 0;
      const newStock = previousStock + item.quantity;

      // Restore product stock
      transaction.update(productRef, {
        availableStock: newStock,
        inStock: newStock > 0,
        updatedAt: Timestamp.now(),
      });

      // Record stock movement
      const movementRef = doc(collection(db, COLLECTIONS.STOCK_MOVEMENTS));
      transaction.set(movementRef, {
        productId: item.productId,
        productName: item.productName || product.name,
        type: StockMovementType.IN,
        quantity: item.quantity,
        previousStock,
        newStock,
        reason: `Stock restored - Order ${orderNumber} cancelled`,
        referenceId: orderId,
        referenceType: 'order',
        createdBy: adminId,
        createdByName: adminName,
        createdAt: Timestamp.now(),
      });
    }
  });

  console.log(`✅ Stock restored for order ${orderNumber}`);
};

/**
 * Manual stock adjustment
 */
export const adjustStock = async (
  productId: string,
  newStock: number,
  adminId: string,
  adminName: string,
  reason: string
): Promise<void> => {
  if (newStock < 0) {
    throw new Error('Stock cannot be negative');
  }

  const db = getFirebaseFirestore();

  await runTransaction(db, async (transaction) => {
    const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    const productDoc = await transaction.get(productRef);

    if (!productDoc.exists()) {
      throw new Error('Product not found');
    }

    const product = productDoc.data() as Product;
    const previousStock = product.availableStock || 0;
    const difference = newStock - previousStock;

    transaction.update(productRef, {
      availableStock: newStock,
      inStock: newStock > 0,
      updatedAt: Timestamp.now(),
    });

    const movementRef = doc(collection(db, COLLECTIONS.STOCK_MOVEMENTS));
    transaction.set(movementRef, {
      productId,
      productName: product.name,
      type: StockMovementType.ADJUSTMENT,
      quantity: difference,
      previousStock,
      newStock,
      reason,
      referenceType: 'manual',
      createdBy: adminId,
      createdByName: adminName,
      createdAt: Timestamp.now(),
    });
  });

  console.log(`✅ Stock adjusted for product ${productId}`);
};

/**
 * Get stock movements for a specific product
 */
export const getStockMovementsByProduct = async (
  productId: string,
  limitCount: number = 50
): Promise<StockMovement[]> => {
  const db = getFirebaseFirestore();

  const q = query(
    collection(db, COLLECTIONS.STOCK_MOVEMENTS),
    where('productId', '==', productId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StockMovement[];
};

/**
 * Get all stock movements (for admin reports)
 */
export const getAllStockMovements = async (
  limitCount: number = 100
): Promise<StockMovement[]> => {
  const db = getFirebaseFirestore();

  const q = query(
    collection(db, COLLECTIONS.STOCK_MOVEMENTS),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StockMovement[];
};

/**
 * Get recent stock movements (last 24 hours)
 */
export const getRecentStockMovements = async (
  limitCount: number = 50
): Promise<StockMovement[]> => {
  const db = getFirebaseFirestore();

  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);

  const q = query(
    collection(db, COLLECTIONS.STOCK_MOVEMENTS),
    where('createdAt', '>=', Timestamp.fromDate(oneDayAgo)),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StockMovement[];
};

/**
 * Get low stock products
 */
export const getLowStockProducts = async (): Promise<Product[]> => {
  const db = getFirebaseFirestore();

  const productsRef = collection(db, COLLECTIONS.PRODUCTS);
  const snapshot = await getDocs(productsRef);

  const products = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Product[];

  // Filter products where stock is below or at threshold (and not zero)
  return products.filter(
    (product) => 
      product.availableStock > 0 && 
      product.availableStock <= product.lowStockThreshold
  );
};

/**
 * Get out of stock products
 */
export const getOutOfStockProducts = async (): Promise<Product[]> => {
  const db = getFirebaseFirestore();

  const productsRef = collection(db, COLLECTIONS.PRODUCTS);
  const snapshot = await getDocs(productsRef);

  const products = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Product[];

  return products.filter((product) => product.availableStock === 0);
};

/**
 * Check stock availability for multiple items
 */
export const checkStockAvailability = async (
  items: Array<{ productId: string; quantity: number }>
): Promise<{
  available: boolean;
  insufficientItems: Array<{ productId: string; productName: string; available: number; required: number }>;
}> => {
  const db = getFirebaseFirestore();
  const insufficientItems: Array<{ productId: string; productName: string; available: number; required: number }> = [];

  for (const item of items) {
    const productRef = doc(db, COLLECTIONS.PRODUCTS, item.productId);
    const productDoc = await getDoc(productRef);

    if (!productDoc.exists()) {
      insufficientItems.push({
        productId: item.productId,
        productName: 'Unknown Product',
        available: 0,
        required: item.quantity,
      });
      continue;
    }

    const product = productDoc.data() as Product;
    const availableStock = product.availableStock || 0;

    if (availableStock < item.quantity) {
      insufficientItems.push({
        productId: item.productId,
        productName: product.name,
        available: availableStock,
        required: item.quantity,
      });
    }
  }

  return {
    available: insufficientItems.length === 0,
    insufficientItems,
  };
};

/**
 * Get stock summary for all products
 */
export const getStockSummary = async (): Promise<{
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalStockValue: number;
}> => {
  const db = getFirebaseFirestore();

  const productsRef = collection(db, COLLECTIONS.PRODUCTS);
  const snapshot = await getDocs(productsRef);

  const products = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Product[];

  const summary = {
    totalProducts: products.length,
    inStock: products.filter((p) => p.availableStock > p.lowStockThreshold).length,
    lowStock: products.filter((p) => p.availableStock > 0 && p.availableStock <= p.lowStockThreshold).length,
    outOfStock: products.filter((p) => p.availableStock === 0).length,
    totalStockValue: products.reduce(
      (total, product) => total + (product.availableStock * product.price),
      0
    ),
  };

  return summary;
};

/**
 * Get stock movements by type
 */
export const getStockMovementsByType = async (
  type: StockMovementType,
  limitCount: number = 50
): Promise<StockMovement[]> => {
  const db = getFirebaseFirestore();

  const q = query(
    collection(db, COLLECTIONS.STOCK_MOVEMENTS),
    where('type', '==', type),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StockMovement[];
};

/**
 * Get stock movements by date range
 */
export const getStockMovementsByDateRange = async (
  startDate: Date,
  endDate: Date,
  productId?: string
): Promise<StockMovement[]> => {
  const db = getFirebaseFirestore();

  let q;
  if (productId) {
    q = query(
      collection(db, COLLECTIONS.STOCK_MOVEMENTS),
      where('productId', '==', productId),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('createdAt', 'desc')
    );
  } else {
    q = query(
      collection(db, COLLECTIONS.STOCK_MOVEMENTS),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('createdAt', 'desc')
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StockMovement[];
};

/**
 * Calculate total stock in/out for a product
 */
export const getProductStockStats = async (
  productId: string
): Promise<{
  totalIn: number;
  totalOut: number;
  totalAdjustments: number;
  currentStock: number;
}> => {
  const db = getFirebaseFirestore();

  // Get product current stock
  const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
  const productDoc = await getDoc(productRef);
  
  if (!productDoc.exists()) {
    throw new Error('Product not found');
  }

  const product = productDoc.data() as Product;

  // Get all movements for this product
  const q = query(
    collection(db, COLLECTIONS.STOCK_MOVEMENTS),
    where('productId', '==', productId)
  );

  const snapshot = await getDocs(q);
  const movements = snapshot.docs.map((doc) => doc.data()) as StockMovement[];

  const stats = movements.reduce(
    (acc, movement) => {
      if (movement.type === StockMovementType.IN) {
        acc.totalIn += movement.quantity;
      } else if (movement.type === StockMovementType.OUT) {
        acc.totalOut += Math.abs(movement.quantity);
      } else if (movement.type === StockMovementType.ADJUSTMENT) {
        acc.totalAdjustments += movement.quantity;
      }
      return acc;
    },
    { totalIn: 0, totalOut: 0, totalAdjustments: 0, currentStock: product.availableStock || 0 }
  );

  return stats;
};

/**
 * Bulk stock update (for initial migration or bulk operations)
 */
export const bulkUpdateStock = async (
  updates: Array<{
    productId: string;
    availableStock: number;
    lowStockThreshold?: number;
  }>,
  adminId: string,
  adminName: string
): Promise<void> => {
  const db = getFirebaseFirestore();

  await runTransaction(db, async (transaction) => {
    for (const update of updates) {
      const productRef = doc(db, COLLECTIONS.PRODUCTS, update.productId);
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists()) {
        console.warn(`Product ${update.productId} not found, skipping`);
        continue;
      }

      const product = productDoc.data() as Product;
      const previousStock = product.availableStock || 0;

      const updateData: any = {
        availableStock: update.availableStock,
        inStock: update.availableStock > 0,
        updatedAt: Timestamp.now(),
      };

      if (update.lowStockThreshold !== undefined) {
        updateData.lowStockThreshold = update.lowStockThreshold;
      }

      transaction.update(productRef, updateData);

      // Record movement only if stock changed
      if (previousStock !== update.availableStock) {
        const movementRef = doc(collection(db, COLLECTIONS.STOCK_MOVEMENTS));
        transaction.set(movementRef, {
          productId: update.productId,
          productName: product.name,
          type: StockMovementType.ADJUSTMENT,
          quantity: update.availableStock - previousStock,
          previousStock,
          newStock: update.availableStock,
          reason: 'Bulk stock update',
          referenceType: 'manual',
          createdBy: adminId,
          createdByName: adminName,
          createdAt: Timestamp.now(),
        });
      }
    }
  });

  console.log(`✅ Bulk stock update completed for ${updates.length} products`);
};

/**
 * Check low stock and notify admins
 * Call this after stock reduction
 */
export const checkAndNotifyLowStock = async (productId: string): Promise<void> => {
  const db = getFirebaseFirestore();

  try {
    const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
    const productDoc = await getDoc(productRef);

    if (!productDoc.exists()) return;

    const product = productDoc.data() as Product;

    // Check if stock just fell below threshold
    if (
      product.availableStock > 0 &&
      product.availableStock <= product.lowStockThreshold
    ) {
      // Get all admins
      const admins = await getUsersByRole(UserRole.ADMIN);

      // Notify each admin
      for (const admin of admins) {
        await createNotification(
          admin.id,
          NotificationType.LOW_STOCK_ALERT,
          `⚠️ Low Stock Alert: ${product.name}`,
          `Stock is running low. Only ${product.availableStock} units remaining (threshold: ${product.lowStockThreshold})`,
          {
            metadata: {
              productId: product.id,
              productName: product.name,
              currentStock: product.availableStock,
              threshold: product.lowStockThreshold,
            },
          }
        );
      }

      console.log(`⚠️ Low stock notification sent for ${product.name}`);
    }

    // Notify if out of stock
    if (product.availableStock === 0) {
      const admins = await getUsersByRole(UserRole.ADMIN);

      for (const admin of admins) {
        await createNotification(
          admin.id,
          NotificationType.OUT_OF_STOCK_ALERT,
          `❌ Out of Stock: ${product.name}`,
          `This product is now out of stock. Please restock immediately.`,
          {
            metadata: {
              productId: product.id,
              productName: product.name,
            },
          }
        );
      }

      console.log(`❌ Out of stock notification sent for ${product.name}`);
    }
  } catch (error) {
    console.error('Error checking low stock:', error);
    // Don't throw - this is a background notification task
  }
};