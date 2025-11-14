import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase-config';
import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';
import { getCurrentTimestamp } from '../utils';

const SETTINGS_DOC_ID = 'app_settings';

/**
 * Get app settings
 */
export const getAppSettings = async (): Promise<AppSettings> => {
  const db = getFirebaseFirestore();
  const settingsDoc = await getDoc(doc(db, 'settings', SETTINGS_DOC_ID));

  if (!settingsDoc.exists()) {
    // Create default settings if they don't exist
    const defaultSettings: AppSettings = {
      id: SETTINGS_DOC_ID,
      ...DEFAULT_SETTINGS,
      updatedAt: getCurrentTimestamp(),
    };
    
    await setDoc(doc(db, 'settings', SETTINGS_DOC_ID), defaultSettings);
    return defaultSettings;
  }

  return {
    id: settingsDoc.id,
    ...settingsDoc.data(),
  } as AppSettings;
};

/**
 * Update app settings
 */
export const updateAppSettings = async (
  updates: Partial<Omit<AppSettings, 'id'>>
): Promise<void> => {
  const db = getFirebaseFirestore();
  
  await updateDoc(doc(db, 'settings', SETTINGS_DOC_ID), {
    ...updates,
    updatedAt: getCurrentTimestamp(),
  });
};

/**
 * Add delivery area
 */
export const addDeliveryArea = async (
  area: Omit<DeliveryArea, 'id'>
): Promise<void> => {
  const settings = await getAppSettings();
  
  const newArea: DeliveryArea = {
    ...area,
    id: `area_${Date.now()}`,
  };

  const updatedAreas = [...settings.deliveryAreas, newArea];
  
  await updateAppSettings({ deliveryAreas: updatedAreas });
};

/**
 * Remove delivery area
 */
export const removeDeliveryArea = async (areaId: string): Promise<void> => {
  const settings = await getAppSettings();
  const updatedAreas = settings.deliveryAreas.filter((area) => area.id !== areaId);
  
  await updateAppSettings({ deliveryAreas: updatedAreas });
};

/**
 * Toggle delivery area status
 */
export const toggleDeliveryArea = async (areaId: string): Promise<void> => {
  const settings = await getAppSettings();
  const updatedAreas = settings.deliveryAreas.map((area) =>
    area.id === areaId ? { ...area, active: !area.active } : area
  );
  
  await updateAppSettings({ deliveryAreas: updatedAreas });
};