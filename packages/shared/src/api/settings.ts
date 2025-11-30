import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase-config';
import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';
import { getCurrentTimestamp } from '../utils';
import { COLLECTIONS } from '../types';

const SETTINGS_DOC_ID = 'app_settings';

/**
 * Get app settings
 */
export const getAppSettings = async (): Promise<AppSettings> => {
  const db = getFirebaseFirestore();
  const settingsDoc = await getDoc(doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID));

  if (!settingsDoc.exists()) {
    // Create default settings if they don't exist
    const defaultSettings: AppSettings = {
      id: SETTINGS_DOC_ID,
      ...DEFAULT_SETTINGS,
      updatedAt: getCurrentTimestamp(),
    };
    
    await setDoc(doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID), defaultSettings);
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
  
  await updateDoc(doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID), {
    ...updates,
    updatedAt: getCurrentTimestamp(),
  });
};
