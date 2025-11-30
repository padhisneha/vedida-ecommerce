/**
 * Format price in Indian Rupees
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format price for Indian Rupees without currency symbol
 */
export const formatCurrencyForPDF = (amount: number): string => {
  return `Rs. ${amount.toFixed(2)}`;
};

/**
 * Calculate total from items
 */
export const calculateTotal = (items: Array<{ price: number; quantity: number }>): number => {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
};

/** 
 * Capitalize first letter of each word in a string separated by underscores
 */
export const initialCapital = (text: string) : string => {
  return text
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}