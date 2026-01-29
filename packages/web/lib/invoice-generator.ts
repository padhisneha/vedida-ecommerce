import { pdf } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/invoice/InvoicePDF';
import { Order, Subscription, SubscriptionFrequency } from '@ecommerce/shared';
import { createElement } from 'react';

/**
 * Convert number to words in Indian style
 */
const numberToWordsIndian = (num: number): string => {
  if (num === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      n = 0;
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result.trim();
  };

  let result = '';
  let crore = Math.floor(num / 10000000);
  num %= 10000000;
  let lakh = Math.floor(num / 100000);
  num %= 100000;
  let thousand = Math.floor(num / 1000);
  num %= 1000;
  let remainder = num;

  if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder > 0) result += convertLessThanThousand(remainder);

  return result.trim();
};

/**
 * Convert currency amount to words (Rupees and Paise)
 */
export const amountToWordsIndian = (amount: number): string => {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let result = '';
  if (rupees > 0) {
    result += numberToWordsIndian(rupees) + ' Rupees';
  } else {
    result += 'Zero Rupees';
  }
  if (paise > 0) {
    result += ' and ' + numberToWordsIndian(paise) + ' Paise';
  }
  return result + ' Only';
};

const calculateTotalDeliveries = (subscription: Subscription) => {
    if (!subscription || !subscription.endDate) return 0;

    const start = subscription.startDate.toDate();
    const end = subscription.endDate.toDate();
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    switch (subscription.frequency) {
      case SubscriptionFrequency.DAILY:
        return daysDiff;
      case SubscriptionFrequency.ALTERNATE_DAYS:
        return Math.ceil(daysDiff / 2);
      case SubscriptionFrequency.WEEKLY:
        return Math.ceil(daysDiff / 7);
      default:
        return 0;
    }
  };

/**
 * Generate and download PDF invoice for Order
 */
export const generateOrderInvoicePDF = async (
  order: Order,
  taxBreakdown: {
    subtotal: number;
    cgst: number;
    sgst: number;
    totalTax: number;
  }
) => {
  try {
    const amount = order.totalAmount;
    const amountInWords = amountToWordsIndian(order.totalAmount);
    const totalDeliveries = 1; // For one-time orders
    
    //const blob = await pdf(
    //  InvoicePDF({ order, taxBreakdown, amount, amountInWords, totalDeliveries })
    //).toBlob();

    const blob = await pdf(
      createElement(InvoicePDF, { 
        order, 
        taxBreakdown, 
        amount, 
        amountInWords, 
        totalDeliveries 
      })
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${order.orderNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating order invoice:', error);
    throw error;
  }
};

/**
 * Generate and download PDF invoice for Subscription
 */
export const generateSubscriptionInvoicePDF = async (
  subscription: Subscription,
  taxBreakdown: {
    subtotal: number;
    cgst: number;
    sgst: number;
    totalTax: number;
  }
) => {
  try {
    const totalDeliveries = calculateTotalDeliveries(subscription);
    const amount = (taxBreakdown.subtotal + taxBreakdown.totalTax)* totalDeliveries;
    const amountInWords = amountToWordsIndian(amount);
    
    //const blob = await pdf(
    //  InvoicePDF({ subscription, taxBreakdown, amount, amountInWords, totalDeliveries })
    //).toBlob();

    const blob = await pdf(
      createElement(InvoicePDF, { 
        subscription, 
        taxBreakdown, 
        amount, 
        amountInWords, 
        totalDeliveries 
      })
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Subscription_Invoice_${subscription.subscriptionNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating subscription invoice:', error);
    throw error;
  }
};

// Legacy function name for backward compatibility
// export const generateInvoicePDF = generateOrderInvoicePDF;