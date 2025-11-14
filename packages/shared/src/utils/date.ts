import { Timestamp } from 'firebase/firestore';

/**
 * Convert Firebase Timestamp to JavaScript Date
 */
export const timestampToDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
};

/**
 * Convert JavaScript Date to Firebase Timestamp
 */
export const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

/**
 * Get current timestamp
 */
export const getCurrentTimestamp = (): Timestamp => {
  return Timestamp.now();
};

/**
 * Format date for display
 * Handles both Timestamp and number (milliseconds)
 */
export const formatDate = (
  timestamp: Timestamp | number,
  locale: string = 'en-IN'
): string => {
  let date: Date;
  
  if (typeof timestamp === 'number') {
    // Handle milliseconds
    date = new Date(timestamp);
  } else if (timestamp && typeof timestamp.toDate === 'function') {
    // Handle Firestore Timestamp
    date = timestamp.toDate();
  } else {
    // Fallback
    console.error('Invalid timestamp format:', timestamp);
    return 'Invalid Date';
  }
  
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format date and time for display
 * Handles both Timestamp and number (milliseconds)
 */
export const formatDateTime = (
  timestamp: Timestamp | number,
  locale: string = 'en-IN'
): string => {
  let date: Date;
  
  if (typeof timestamp === 'number') {
    // Handle milliseconds
    date = new Date(timestamp);
  } else if (timestamp && typeof timestamp.toDate === 'function') {
    // Handle Firestore Timestamp
    date = timestamp.toDate();
  } else {
    // Fallback
    console.error('Invalid timestamp format:', timestamp);
    return 'Invalid DateTime';
  }
  
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};