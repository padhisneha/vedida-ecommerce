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
 */
export const formatDate = (timestamp: Timestamp, locale: string = 'en-IN'): string => {
  return timestamp.toDate().toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Format date and time for display
 */
export const formatDateTime = (timestamp: Timestamp, locale: string = 'en-IN'): string => {
  return timestamp.toDate().toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};