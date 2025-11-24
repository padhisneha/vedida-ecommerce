import { UPI_CONFIG } from '../constants';

/**
 * Generate UPI payment string for QR code
 */
export const generateUPIString = (
  amount: number,
  orderId: string,
  customerName?: string
): string => {
  const { upiId, merchantName } = UPI_CONFIG;
  
  // UPI intent format
  const params = {
    pa: upiId,                                    // Payee VPA
    pn: encodeURIComponent(merchantName),        // Payee Name
    am: amount.toFixed(2),                       // Amount
    cu: 'INR',                                    // Currency
    tn: encodeURIComponent(`Order ${orderId}`),  // Transaction Note
  };
  
  // Build UPI string
  const upiString = `upi://pay?pa=${params.pa}&pn=${params.pn}&am=${params.am}&cu=${params.cu}&tn=${params.tn}`;
  
  return upiString;
};

/**
 * Generate transaction reference for tracking
 */
export const generateTransactionRef = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `UPI-${timestamp}-${random}`;
};