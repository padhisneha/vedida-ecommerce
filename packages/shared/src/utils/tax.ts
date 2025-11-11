import { CartItem, Product } from '../types';

export interface TaxBreakdown {
  subtotal: number; // Total excluding tax
  cgst: number; // Total CGST
  sgst: number; // Total SGST
  totalTax: number; // CGST + SGST
  totalBeforeFees: number; // Subtotal + Tax
}

/**
 * Calculate tax breakdown for cart items
 */
export const calculateCartTax = (items: CartItem[]): TaxBreakdown => {
  let subtotal = 0;
  let cgst = 0;
  let sgst = 0;

  items.forEach((item) => {
    if (item.product) {
      const itemSubtotal = item.product.priceExcludingTax * item.quantity;
      const itemCGST = (itemSubtotal * item.product.taxCGST) / 100;
      const itemSGST = (itemSubtotal * item.product.taxSGST) / 100;

      subtotal += itemSubtotal;
      cgst += itemCGST;
      sgst += itemSGST;
    }
  });

  const totalTax = cgst + sgst;
  const totalBeforeFees = subtotal + totalTax;

  return {
    subtotal,
    cgst,
    sgst,
    totalTax,
    totalBeforeFees,
  };
};

/**
 * Calculate final order total including all fees
 */
export const calculateOrderTotal = (
  taxBreakdown: TaxBreakdown,
  platformFee: number,
  deliveryFee: number
): number => {
  return taxBreakdown.totalBeforeFees + platformFee + deliveryFee;
};