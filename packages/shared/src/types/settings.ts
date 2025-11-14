export interface DeliveryArea {
  id: string;
  name: string;
  pincode: string;
  active: boolean;
}

export interface AppSettings {
  id: string; // Will be 'app_settings' (single doc)
  
  // Fee Configuration
  platformFee: number;
  deliveryFee: number;
  minimumOrderAmount: number;
  
  // Delivery Settings
  maxDeliveryDistance: number; // in km
  deliveryAreas: DeliveryArea[];
  
  // Support Contact
  supportEmail: string;
  supportPhone: string;
  supportWhatsApp: string;
  
  updatedAt: any; // Timestamp
}

export const DEFAULT_SETTINGS: Omit<AppSettings, 'id' | 'updatedAt'> = {
  platformFee: 5,
  deliveryFee: 0,
  minimumOrderAmount: 0,
  maxDeliveryDistance: 10,
  deliveryAreas: [],
  supportEmail: 'support@dairyfresh.com',
  supportPhone: '+919876543210',
  supportWhatsApp: '919876543210',
};