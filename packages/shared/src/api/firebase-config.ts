import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration interface
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Singleton instances
let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;

/**
 * Initialize Firebase with the provided configuration
 * This should be called once at app startup from each platform
 */
export const initializeFirebase = (config: FirebaseConfig): FirebaseApp => {
  // Check if already initialized
  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
    return firebaseApp;
  }

  // Initialize Firebase
  firebaseApp = initializeApp(config);
  
  // Initialize services
  auth = getAuth(firebaseApp);
  firestore = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);

  return firebaseApp;
};

/**
 * Get Firebase Auth instance
 */
export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    throw new Error('Firebase not initialized. Call initializeFirebase first.');
  }
  return auth;
};

/**
 * Get Firestore instance
 */
export const getFirebaseFirestore = (): Firestore => {
  if (!firestore) {
    throw new Error('Firebase not initialized. Call initializeFirebase first.');
  }
  return firestore;
};

/**
 * Get Firebase Storage instance
 */
export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storage) {
    throw new Error('Firebase not initialized. Call initializeFirebase first.');
  }
  return storage;
};

/**
 * Get Firebase App instance
 */
export const getFirebaseApp = (): FirebaseApp => {
  if (!firebaseApp) {
    throw new Error('Firebase not initialized. Call initializeFirebase first.');
  }
  return firebaseApp;
};