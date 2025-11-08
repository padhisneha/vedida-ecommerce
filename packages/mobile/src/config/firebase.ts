import { initializeFirebase, FirebaseConfig } from '@ecommerce/shared';
import { Platform } from 'react-native';

// Firebase configuration from environment variables
const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

// Validate configuration
const validateConfig = () => {
  const requiredFields: (keyof FirebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missingFields = requiredFields.filter(
    (field) => !firebaseConfig[field]
  );

  if (missingFields.length > 0) {
    console.error('Missing Firebase configuration fields:', missingFields);
    console.error('Please check your .env file');
    throw new Error(
      `Missing Firebase config: ${missingFields.join(', ')}`
    );
  }
};

// Initialize Firebase
export const initializeApp = () => {
  try {
    validateConfig();
    initializeFirebase(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
  }
};

export { firebaseConfig };