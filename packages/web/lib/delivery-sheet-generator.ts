// packages/web/lib/delivery-sheet-generator.ts
import { createElement } from 'react';
import { pdf } from '@react-pdf/renderer';
//import { saveAs } from 'file-saver';
import DeliverySheetPDF from '@/components/delivery/DeliverySheetPDF';
import { Order } from '@ecommerce/shared';

export const generateDeliverySheetPDF = async (
  orders: Order[],
  filters: {
    deliveryDate?: string;
    deliveryPartner?: string;
    deliveryArea?: string;
    deliverySlot?: string;
  }
): Promise<void> => {
  try {
    // Generate filename based on filters
    const datePart = filters.deliveryDate || new Date().toISOString().split('T')[0];
    const slotPart = filters.deliverySlot && filters.deliverySlot !== 'all' 
      ? `_${filters.deliverySlot}` 
      : '';
    const areaPart = filters.deliveryArea && filters.deliveryArea !== 'all'
      ? `_${filters.deliveryArea.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}`
      : '';
    
    const filename = `Delivery_Sheet_${datePart}${slotPart}${areaPart}.pdf`;

    // Create PDF blob
    const blob = await pdf(
      createElement(DeliverySheetPDF, {
        orders,
        deliveryDate: filters.deliveryDate || new Date().toLocaleDateString('en-IN'),
        deliveryPartner: filters.deliveryPartner,
        deliveryArea: filters.deliveryArea,
        deliverySlot: filters.deliverySlot,
      })
    ).toBlob();

    // Download the PDF
    //saveAs(blob, filename);

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ Delivery sheet PDF generated:', filename);
  } catch (error) {
    console.error('Error generating delivery sheet PDF:', error);
    throw error;
  }
};