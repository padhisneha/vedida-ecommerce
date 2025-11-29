import { DeliverySlot } from '../types';

/**
 * Platform fee charged per order (in rupees)
 */
export const PLATFORM_FEE = 5;

/**
 * Delivery fee (currently free)
 */
export const DELIVERY_FEE = 0;

/**
 * Razorpay configuration
 * Get your keys from: https://dashboard.razorpay.com/app/keys
 */
export const RAZORPAY_CONFIG = {
  keyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxxxx',
  keySecret: process.env.EXPO_PUBLIC_RAZORPAY_KEY_SECRET || '', // Keep secret, don't expose in app
  businessName: 'Vedida Farms',
  businessLogo: 'https://your-logo-url.com/logo.png', // Optional
  themeColor: '#4CAF50',
};

/**
 * UPI Payment configuration
 */
export const UPI_CONFIG = {
  upiId: 'vedidafarms@paytm',  // Replace with actual UPI ID
  merchantName: 'Vedida Farms',
  merchantCode: 'VEDIDA',
};

/**
 * Support contact details
 */
export const SUPPORT_CONTACT = {
  email: 'vedidafarms@gmail.com',
  phone: '+918247099516',
  phoneDisplay: '+91 82470 99516',
  whatsapp: '8247099516', // Without + sign for WhatsApp
  businessName: 'Vedida Farms Support',
  workingHours: 'Mon-Sat: 7 AM - 8 PM',
};

/**
 * Delivery Slot Labels
 */
export const DELIVERY_SLOT_LABELS = {
  [DeliverySlot.MORNING]: 'Morning (6 AM - 12 PM)',
  [DeliverySlot.EVENING]: 'Evening (4 PM - 8 PM)',
  [DeliverySlot.FLEXIBLE]: 'Flexible Delivery (Any Time)',
};

/**
 * Delivery Slot icons
 */
export const DELIVERY_SLOT_ICONS = {
  [DeliverySlot.MORNING]: '🌅',
  [DeliverySlot.EVENING]: '🌆',
  [DeliverySlot.FLEXIBLE]: '🕐',
};

/**
 * Calculate CGST amount
 */
export const calculateCGST = (priceExcludingTax: number, cgstPercent: number): number => {
  return (priceExcludingTax * cgstPercent) / 100;
};

/**
 * Calculate SGST amount
 */
export const calculateSGST = (priceExcludingTax: number, sgstPercent: number): number => {
  return (priceExcludingTax * sgstPercent) / 100;
};

/**
 * Calculate total tax (CGST + SGST)
 */
export const calculateTotalTax = (
  priceExcludingTax: number,
  cgstPercent: number,
  sgstPercent: number
): number => {
  return calculateCGST(priceExcludingTax, cgstPercent) + calculateSGST(priceExcludingTax, sgstPercent);
};

/**
 * Calculate price including tax
 */
export const calculatePriceWithTax = (
  priceExcludingTax: number,
  cgstPercent: number,
  sgstPercent: number
): number => {
  return priceExcludingTax + calculateTotalTax(priceExcludingTax, cgstPercent, sgstPercent);
};