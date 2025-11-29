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
  Timestamp,
  or,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase-config';
import { Order, OrderStatus, OrderType, COLLECTIONS, PaymentStatus, DeliverySlot } from '../types';
import { DELIVERY_SLOT_LABELS } from '../constants';
import { getCurrentTimestamp } from '../utils';
import { getProductById } from './products';
import { reduceStockForOrder, checkStockAvailability, restoreStockForOrder } from './stock';

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

  // STEP 1: Validate stock availability BEFORE creating order
  const stockCheck = await checkStockAvailability(orderData.items);
  
  if (!stockCheck.available) {
    const insufficientList = stockCheck.insufficientItems
      .map(item => `${item.productName}: Need ${item.required}, Available ${item.available}`)
      .join(', ');
    
    throw new Error(
      `Insufficient stock for: ${insufficientList}`
    );
  }

  // STEP 2: Create the order
  const timestamp = getCurrentTimestamp();
  const orderNumber = await generateOrderNumber();

  const newOrder = {
    ...orderData,
    orderNumber,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const docRef = await addDoc(collection(db, COLLECTIONS.ORDERS), newOrder);
  const orderId = docRef.id;

  // STEP 3: Reduce stock for all items
  try {
    await reduceStockForOrder(orderId, orderNumber, orderData.items);
    console.log(`✅ Order created and stock reduced: ${orderNumber}`);
  } catch (stockError) {
    console.error('Stock reduction failed after order creation:', stockError);
    // Order is created but stock not reduced - admin needs to handle manually
    // Could implement compensation logic here if needed
  }

  return orderId;
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
 * Get all orders with populated product details (Admin)
 */
export const getAllOrdersWithProducts = async (): Promise<Order[]> => {
  const db = getFirebaseFirestore();
  const q = query(collection(db, COLLECTIONS.ORDERS), orderBy('createdAt', 'desc'));
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
  newStatus: OrderStatus
): Promise<void> => {
  const db = getFirebaseFirestore();

  // If cancelling, need to restore stock
  if (newStatus === OrderStatus.CANCELLED) {
    // Get order details first
    const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      throw new Error('Order not found');
    }
    
    const order = orderDoc.data() as Order;
    
    // Don't restore stock if already delivered
    if (order.status === OrderStatus.DELIVERED) {
      throw new Error('Cannot cancel delivered orders');
    }
    
    // Only restore stock if order was confirmed (meaning stock was already reduced)
    if (
      order.status === OrderStatus.PENDING ||
      order.status === OrderStatus.CONFIRMED ||
      order.status === OrderStatus.OUT_FOR_DELIVERY
    ) {
      try {
        // Prepare items with product names for better logging
        const itemsWithNames = order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          productName: item.product?.name,
        }));
        
        await restoreStockForOrder(
          orderId,
          order.orderNumber,
          itemsWithNames,
          'system',
          'System'
        );
        
        console.log(`✅ Stock restored for cancelled order ${order.orderNumber}`);
      } catch (stockError) {
        console.error('Stock restoration failed:', stockError);
        // Still proceed with cancellation, but log the error
        // Admin can manually adjust stock if needed
      }
    }
  }

  // Update order status
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
  await updateDoc(orderRef, {
    status: newStatus,
    updatedAt: getCurrentTimestamp(),
    ...(newStatus === OrderStatus.DELIVERED && { deliveredAt: getCurrentTimestamp() }),
  });

  console.log(`✅ Order status updated to ${newStatus}`);
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

/**
 * Check if order already exists for subscription on a given date
 */
export const checkSubscriptionOrderExists = async (
  subscriptionId: string,
  deliveryDate: Date
): Promise<boolean> => {
  const db = getFirebaseFirestore();
  
  // Set time to start and end of day
  const startOfDay = new Date(deliveryDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(deliveryDate);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    where('subscriptionId', '==', subscriptionId),
    where('scheduledDeliveryDate', '>=', startOfDay),
    where('scheduledDeliveryDate', '<=', endOfDay)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

// Check if subscription should deliver on this date based on frequency
const shouldDeliverToday = (subscription: any, deliveryDate: Date): boolean => {
  const startDate = subscription.startDate.toDate();
  const daysSinceStart = Math.floor(
    (deliveryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  switch (subscription.frequency) {
    case 'daily':
      return true;
    case 'alternate_days':
      return daysSinceStart % 2 === 0;
    case 'weekly':
      // Deliver on the same day of week as start date
      return deliveryDate.getDay() === startDate.getDay();
    default:
      return true;
  }
};

/**
 * Generate orders from active subscriptions for a given date
 * Returns count of orders created
 */
export const generateSubscriptionOrders = async (
  deliveryDate: Date
): Promise<{ created: number; skipped: number; errors: string[] }> => {
  const db = getFirebaseFirestore();
  
  // Get all active subscriptions
  const subsQuery = query(
    collection(db, COLLECTIONS.SUBSCRIPTIONS),
    where('status', '==', 'active')
  );
  const subsSnapshot = await getDocs(subsQuery);
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const subDoc of subsSnapshot.docs) {
    const subscription = { id: subDoc.id, ...subDoc.data() } as any;
    
    try {
      // Check if subscription should deliver on this date
      const startDate = subscription.startDate.toDate();
      const endDate = subscription.endDate?.toDate();
      
      // Skip if delivery date is before subscription start
      if (deliveryDate < startDate) {
        skipped++;
        continue;
      }
      
      // Skip if delivery date is after subscription end
      if (endDate && deliveryDate > endDate) {
        skipped++;
        continue;
      }
      
      // Check if subscription is paused
      if (subscription.pausedUntil) {
        const pausedUntil = subscription.pausedUntil.toDate();
        if (deliveryDate <= pausedUntil) {
          skipped++;
          continue;
        }
      }
      
      // Check if order already exists
      const exists = await checkSubscriptionOrderExists(subscription.id, deliveryDate);
      if (exists) {
        console.log(`Order already exists for subscription ${subscription.id}`);
        skipped++;
        continue;
      }
      
      // Check frequency
      if (!shouldDeliverToday(subscription, deliveryDate)) {
        skipped++;
        continue;
      }
      
      // Get product details for pricing
      const itemsWithPrices = await Promise.all(
        subscription.items.map(async (item: any) => {
          const product = await getProductById(item.productId);
          return {
            productId: item.productId,
            quantity: item.quantity,
            price: product?.price || 0,
          };
        })
      );

      // Validate stock availability before creating order
      const stockCheck = await checkStockAvailability(itemsWithPrices);
      
      if (!stockCheck.available) {
        const insufficientList = stockCheck.insufficientItems
          .map(item => `${item.productName} (Need: ${item.required}, Available: ${item.available})`)
          .join(', ');
        
        errors.push(
          `Subscription ${subscription.id.slice(0, 8)} - Insufficient stock: ${insufficientList}`
        );
        skipped++;
        continue;
      }
      
      // Calculate total
      const totalAmount = itemsWithPrices.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      
      // Create order
      const orderNumber = await generateOrderNumber();
      const timestamp = getCurrentTimestamp();
      const scheduledDelivery = new Date(deliveryDate);
      scheduledDelivery.setHours(7, 0, 0, 0);
      
      // Prepare order data
      const orderData: any = {
        orderNumber,
        userId: subscription.userId,
        type: 'subscription',
        subscriptionId: subscription.id,
        items: itemsWithPrices,
        totalAmount,
        deliveryAddress: subscription.deliveryAddress,
        DeliverySlot: subscription.deliverySlot,
        deliverySlotLabel: subscription.deliverySlotLabel,
        status: 'pending',
        scheduledDeliveryDate: Timestamp.fromDate(scheduledDelivery),
        paymentMethod: subscription.paymentMethod,
        paymentStatus: subscription.paymentStatus,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      
      // Add delivery partner info if assigned to subscription
      if (subscription.deliveryPartnerId && subscription.deliveryPartnerName) {
        orderData.deliveryPartnerId = subscription.deliveryPartnerId;
        orderData.deliveryPartnerName = subscription.deliveryPartnerName;
      }
      
      const orderDocRef = await addDoc(collection(db, COLLECTIONS.ORDERS), orderData);
      const orderId = orderDocRef.id;

      // Reduce stock for the order
      try {
        await reduceStockForOrder(orderId, orderNumber, itemsWithPrices);
        console.log(`✅ Stock reduced for subscription order ${orderNumber}`);
      } catch (stockError: any) {
        console.error('Stock reduction failed for subscription order:', stockError);
        errors.push(
          `Order ${orderNumber} - Stock reduction failed: ${stockError.message}`
        );
        // Order created but stock not reduced - admin needs to handle manually
        // Send system notification to admin
      }
      
      created++;
      console.log(`✅ Created order for subscription ${subscription.id}`);
    } catch (error: any) {
      console.error(`Error creating order for subscription ${subscription.id}:`, error);
      errors.push(`Subscription ${subscription.id.slice(0, 8)}: ${error.message}`);
    }
  }
  
  return { created, skipped, errors };
};

/**
 * Verify UPI payment and update order status
 */
export const verifyUPIPayment = async (
  orderId: string,
  paymentVerified: boolean,
  adminNotes?: string
): Promise<void> => {
  const db = getFirebaseFirestore();
  
  const updateData: any = {
    paymentStatus: paymentVerified ? PaymentStatus.PAID : PaymentStatus.FAILED,
    updatedAt: getCurrentTimestamp(),
  };
  
  if (paymentVerified) {
    // Also confirm the order
    updateData.status = OrderStatus.CONFIRMED;
  } else {
    // Mark as cancelled if payment failed
    updateData.status = OrderStatus.CANCELLED;
  }
  
  if (adminNotes) {
    updateData.deliveryNotes = adminNotes;
  }
  
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), updateData);
  
  // Send notification to customer
  // const order = await getOrderById(orderId);
  // if (order) {
  //   await createNotification(
  //     order.userId,
  //     paymentVerified ? NotificationType.ORDER_CONFIRMED : NotificationType.ORDER_CANCELLED,
  //     paymentVerified ? 'Payment Verified ✅' : 'Payment Verification Failed ❌',
  //     paymentVerified 
  //       ? `Your UPI payment has been verified. Order ${order.orderNumber} is confirmed!`
  //       : `We couldn't verify your payment for order ${order.orderNumber}. Please contact support.`,
  //     { orderId, metadata: { orderNumber: order.orderNumber } }
  //   );
  // }
};

/**
 * Assign delivery partner to order
 */
export const assignDeliveryPartner = async (
  orderId: string,
  partnerId: string,
  partnerName: string
): Promise<void> => {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    deliveryPartnerId: partnerId,
    deliveryPartnerName: partnerName,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Update order delivery notes
 */
export const updateOrderNotes = async (
  orderId: string, 
  notes: string
): Promise<void> => {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    deliveryNotes: notes,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Update scheduled delivery date
 */
export const updateScheduledDeliveryDate = async (
  orderId: string,
  newDate: Date
): Promise<void> => {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    scheduledDeliveryDate: Timestamp.fromDate(newDate),
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Update payment method
 */
export const updatePaymentMethod = async (
  orderId: string,
  paymentMethod: 'cod' | 'online' | 'upi'
): Promise<void> => {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    paymentMethod: paymentMethod,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (
  orderId: string,
  paymentStatus: 'pending' | 'paid' | 'failed'
): Promise<void> => {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    paymentStatus: paymentStatus,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Update order delivery slot
 */
export const updateOrderDeliverySlot = async (
  orderId: string,
  deliverySlot: DeliverySlot
): Promise<void> => {
  const db = getFirebaseFirestore();
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    await updateDoc(orderRef, {
      deliverySlot,
      deliverySlotLabel: DELIVERY_SLOT_LABELS[deliverySlot],
      updatedAt: Timestamp.now(),
    });
    
    console.log('✅ Order delivery slot updated:', orderId);
  } catch (error) {
    console.error('Error updating order delivery slot:', error);
    throw error;
  }
};

/**
 * Bulk assign delivery partner to multiple orders
 */
export const bulkAssignDeliveryPartner = async (
  orderIds: string[],
  partnerId: string,
  partnerName: string
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const orderId of orderIds) {
    try {
      await assignDeliveryPartner(orderId, partnerId, partnerName);
      success++;
    } catch (error) {
      console.error(`Failed to assign partner to order ${orderId}:`, error);
      failed++;
    }
  }

  return { success, failed };
};

/**
 * Bulk update order status
 */
export const bulkUpdateOrderStatus = async (
  orderIds: string[],
  status: OrderStatus
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const orderId of orderIds) {
    try {
      await updateOrderStatus(orderId, status);
      success++;
    } catch (error) {
      console.error(`Failed to update order ${orderId}:`, error);
      failed++;
    }
  }

  return { success, failed };
};