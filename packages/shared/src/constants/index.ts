/**
 * Platform fee charged per order (in rupees)
 */
export const PLATFORM_FEE = 5;

/**
 * Delivery fee (currently free)
 */
export const DELIVERY_FEE = 0;

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