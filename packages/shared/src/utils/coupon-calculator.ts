import { Offer, CartItem, ProductCategory } from '../types';

export interface CouponValidationResult {
  isValid: boolean;
  reason?: string;
  discountAmount: number;
  freeDeliveryApplied: boolean;
  applicableItems: string[]; // Product IDs that discount applies to
}

export interface DiscountBreakdown {
  subtotal: number;
  discount: number;
  subtotalAfterDiscount: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  platformFee: number;
  deliveryFee: number;
  total: number;
  appliedCoupons: string[];
  freeDeliveryApplied: boolean;
}

/**
 * Check if offer is currently valid
 */
export const isOfferValid = (offer: Offer, currentDate: Date = new Date()): boolean => {
  if (!offer.isActive) return false;
  
  const start = offer.startDate.toDate();
  const end = offer.endDate.toDate();
  
  return currentDate >= start && currentDate <= end;
};

/**
 * Check if cart items match offer categories
 */
export const hasApplicableProducts = (
  cartItems: CartItem[],
  offer: Offer
): boolean => {
  // If no categories specified, applies to all
  if (!offer.applicableCategories || offer.applicableCategories.length === 0) {
    return true;
  }
  
  // Check if any cart item matches the categories
  return cartItems.some(item => 
    item.product && offer.applicableCategories!.includes(item.product.category)
  );
};

/**
 * Calculate discount for a specific offer
 */
export const calculateOfferDiscount = (
  cartItems: CartItem[],
  offer: Offer,
  subtotal: number
): CouponValidationResult => {
  // Validate date range
  if (!isOfferValid(offer)) {
    return {
      isValid: false,
      reason: 'This offer has expired',
      discountAmount: 0,
      freeDeliveryApplied: false,
      applicableItems: [],
    };
  }
  
  // Validate minimum order amount
  if (offer.minOrderAmount && subtotal < offer.minOrderAmount) {
    return {
      isValid: false,
      reason: `Minimum order amount ₹${offer.minOrderAmount} required`,
      discountAmount: 0,
      freeDeliveryApplied: false,
      applicableItems: [],
    };
  }
  
  // Check if cart has applicable products
  if (!hasApplicableProducts(cartItems, offer)) {
    return {
      isValid: false,
      reason: 'This offer is not applicable to items in your cart',
      discountAmount: 0,
      freeDeliveryApplied: false,
      applicableItems: [],
    };
  }
  
  // Calculate discount
  let discountAmount = 0;
  const applicableItems: string[] = [];
  
  if (offer.discountPercentage && offer.discountPercentage > 0) {
    // Filter items by category
    const applicableCartItems = cartItems.filter(item => {
      if (!item.product) return false;
      
      // If no categories specified, all items are applicable
      if (!offer.applicableCategories || offer.applicableCategories.length === 0) {
        return true;
      }
      
      // Check if item category matches
      return offer.applicableCategories.includes(item.product.category);
    });
    
    // Calculate discount only on applicable items
    const applicableSubtotal = applicableCartItems.reduce((sum, item) => {
      if (!item.product) return sum;
      applicableItems.push(item.productId);
      return sum + (item.product.priceExcludingTax * item.quantity);
    }, 0);
    
    discountAmount = (applicableSubtotal * offer.discountPercentage) / 100;
    
    // Apply max discount cap
    if (offer.maxDiscount && discountAmount > offer.maxDiscount) {
      discountAmount = offer.maxDiscount;
    }
  }
  
  return {
    isValid: true,
    discountAmount,
    freeDeliveryApplied: offer.includesFreeDelivery || false,
    applicableItems,
  };
};

/**
 * Calculate final price with applied coupons
 */
export const calculateFinalPrice = (
  cartItems: CartItem[],
  appliedOffers: Offer[],
  platformFee: number,
  baseDeliveryFee: number,
  taxRates: { cgst: number; sgst: number }
): DiscountBreakdown => {
  // Calculate subtotal
  const subtotal = cartItems.reduce((sum, item) => {
    if (!item.product) return sum;
    return sum + (item.product.priceExcludingTax * item.quantity);
  }, 0);
  
  // Calculate total discount from all offers
  let totalDiscount = 0;
  let freeDeliveryApplied = false;
  const appliedCoupons: string[] = [];
  
  appliedOffers.forEach(offer => {
    const result = calculateOfferDiscount(cartItems, offer, subtotal);
    if (result.isValid) {
      totalDiscount += result.discountAmount;
      if (result.freeDeliveryApplied) {
        freeDeliveryApplied = true;
      }
      if (offer.couponCode) {
        appliedCoupons.push(offer.couponCode);
      }
    }
  });
  
  // Calculate subtotal after discount
  const subtotalAfterDiscount = Math.max(0, subtotal - totalDiscount);
  
  // Calculate tax on discounted amount
  const cgst = (subtotalAfterDiscount * taxRates.cgst) / 100;
  const sgst = (subtotalAfterDiscount * taxRates.sgst) / 100;
  const totalTax = cgst + sgst;
  
  // Apply delivery fee
  const deliveryFee = freeDeliveryApplied ? 0 : baseDeliveryFee;
  
  // Calculate final total
  const total = subtotalAfterDiscount + totalTax + platformFee + deliveryFee;
  
  return {
    subtotal,
    discount: totalDiscount,
    subtotalAfterDiscount,
    cgst,
    sgst,
    totalTax,
    platformFee,
    deliveryFee,
    total,
    appliedCoupons,
    freeDeliveryApplied,
  };
};