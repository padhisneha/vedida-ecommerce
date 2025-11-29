// shared/src/services/deliverySlots.ts

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase-config';
import { DeliverySlot, DeliveryArea, AppSettings } from '../types';
import { DELIVERY_SLOT_LABELS } from '../constants';

/**
 * Get all delivery areas
 */
export const getAllDeliveryAreas = async (): Promise<DeliveryArea[]> => {
  const db = getFirebaseFirestore();
  try {
    const areasRef = collection(db, 'deliveryAreas');
    const q = query(areasRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DeliveryArea[];
  } catch (error) {
    console.error('Error getting delivery areas:', error);
    throw error;
  }
};

/**
 * Get active delivery areas only
 */
export const getActiveDeliveryAreas = async (): Promise<DeliveryArea[]> => {
  const db = getFirebaseFirestore();
  try {
    const areasRef = collection(db, 'deliveryAreas');
    const q = query(
      areasRef,
      where('active', '==', true),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DeliveryArea[];
  } catch (error) {
    console.error('Error getting active delivery areas:', error);
    throw error;
  }
};

/**
 * Get delivery area by name
 */
export const getDeliveryAreaByName = async (
  name: string
): Promise<DeliveryArea | null> => {
  const db = getFirebaseFirestore();
  try {
    const areasRef = collection(db, 'deliveryAreas');
    const q = query(areasRef, where('name', '==', name));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as DeliveryArea;
  } catch (error) {
    console.error('Error getting delivery area by name:', error);
    throw error;
  }
};

/**
 * Add a new delivery area
 */
export const addDeliveryArea = async (area: {
  name: string;
  pincode: string;
}): Promise<string> => {
  const db = getFirebaseFirestore();
  try {
    const areasRef = collection(db, 'deliveryAreas');
    
    // Check if area already exists
    const existingQuery = query(areasRef, where('name', '==', area.name));
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      throw new Error('A delivery area with this name already exists');
    }
    
    const newArea = {
      name: area.name.trim(),
      pincode: area.pincode.trim(),
      active: true,
      slots: {
        morning: { enabled: true },
        evening: { enabled: true },
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(areasRef, newArea);
    console.log('✅ Delivery area added:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding delivery area:', error);
    throw error;
  }
};

/**
 * Update delivery area slots
 */
export const updateDeliveryAreaSlots = async (
  areaId: string,
  slots: {
    morning: { enabled: boolean };
    evening: { enabled: boolean };
  }
): Promise<void> => {
  const db = getFirebaseFirestore();
  try {
    const areaRef = doc(db, 'deliveryAreas', areaId);
    
    await updateDoc(areaRef, {
      slots,
      updatedAt: Timestamp.now(),
    });
    
    console.log('✅ Delivery slots updated for area:', areaId);
  } catch (error) {
    console.error('Error updating delivery area slots:', error);
    throw error;
  }
};

/**
 * Toggle delivery area active status
 */
export const toggleDeliveryArea = async (areaId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  try {
    const areaRef = doc(db, 'deliveryAreas', areaId);
    const areaDoc = await getDoc(areaRef);
    
    if (!areaDoc.exists()) {
      throw new Error('Delivery area not found');
    }
    
    const currentStatus = areaDoc.data().active;
    
    await updateDoc(areaRef, {
      active: !currentStatus,
      updatedAt: Timestamp.now(),
    });
    
    console.log('✅ Delivery area status toggled:', areaId);
  } catch (error) {
    console.error('Error toggling delivery area:', error);
    throw error;
  }
};

/**
 * Delete delivery area
 */
export const deleteDeliveryArea = async (areaId: string): Promise<void> => {
  const db = getFirebaseFirestore();
  try {
    const areaRef = doc(db, 'deliveryAreas', areaId);
    await deleteDoc(areaRef);
    console.log('✅ Delivery area deleted:', areaId);
  } catch (error) {
    console.error('Error deleting delivery area:', error);
    throw error;
  }
};

/**
 * Get available delivery slots for an area
 */
export const getAvailableSlotsForArea = (
  area: DeliveryArea
): DeliverySlot[] => {
  const availableSlots: DeliverySlot[] = [];
  
  if (area.slots.morning.enabled) {
    availableSlots.push(DeliverySlot.MORNING);
  }
  
  if (area.slots.evening.enabled) {
    availableSlots.push(DeliverySlot.EVENING);
  }
  
  return availableSlots;
};

/**
 * Check if a slot is available for an area
 */
export const isSlotAvailableForArea = (
  area: DeliveryArea,
  slot: DeliverySlot
): boolean => {
  if (slot === DeliverySlot.MORNING) {
    return area.slots.morning.enabled;
  }
  if (slot === DeliverySlot.EVENING) {
    return area.slots.evening.enabled;
  }
  return false;
};

/**
 * Get available delivery slots for an area (for one-time orders)
 * Includes FLEXIBLE option
 */
export const getAvailableSlotsForOrder = (
  area: DeliveryArea | null
): DeliverySlot[] => {
  const slots: DeliverySlot[] = [];
  
  if (area) {
    if (area.slots.morning.enabled) {
      slots.push(DeliverySlot.MORNING);
    }
    if (area.slots.evening.enabled) {
      slots.push(DeliverySlot.EVENING);
    }
  }
  
  // Always include FLEXIBLE option for one-time orders
  slots.push(DeliverySlot.FLEXIBLE);
  
  return slots;
};

/**
 * Get available delivery slots for subscription (no FLEXIBLE option)
 */
export const getAvailableSlotsForSubscription = (
  area: DeliveryArea | null
): DeliverySlot[] => {
  const slots: DeliverySlot[] = [];
  
  if (!area) {
    return slots;
  }
  
  if (area.slots.morning.enabled) {
    slots.push(DeliverySlot.MORNING);
  }
  if (area.slots.evening.enabled) {
    slots.push(DeliverySlot.EVENING);
  }
  
  return slots;
};

/**
 * Get default slot for one-time orders
 * Returns FLEXIBLE by default, or auto-selects if only one slot available
 */
export const getDefaultSlotForOrder = (
  availableSlots: DeliverySlot[]
): DeliverySlot => {
  // Filter out FLEXIBLE to check actual slots
  const actualSlots = availableSlots.filter(s => s !== DeliverySlot.FLEXIBLE);
  
  // If only one actual slot available, auto-select it
  if (actualSlots.length === 1) {
    return actualSlots[0];
  }
  
  // Otherwise, default to FLEXIBLE
  return DeliverySlot.FLEXIBLE;
};

/**
 * Get default slot for subscriptions
 * Auto-selects first available slot
 */
export const getDefaultSlotForSubscription = (
  availableSlots: DeliverySlot[]
): DeliverySlot | null => {
  return availableSlots.length > 0 ? availableSlots[0] : null;
};

/**
 * Get delivery slot label
 */
export const getDeliverySlotLabel = (slot: DeliverySlot): string => {
  return DELIVERY_SLOT_LABELS[slot];
};

/**
 * Check if slots are configured for an area
 */
export const hasSlotsConfigured = (area: DeliveryArea | null): boolean => {
  if (!area) return false;
  return area.slots.morning.enabled || area.slots.evening.enabled;
};