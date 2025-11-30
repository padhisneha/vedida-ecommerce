import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirebaseStorage } from './firebase-config';

/**
 * Upload image to Firebase Storage
 * @param file - File or Blob to upload
 * @param path - Storage path (e.g., 'products/product-id.jpg')
 * @returns Download URL
 */
export const uploadImage = async (file: Blob | File, path: string): Promise<string> => {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, path);

  try {
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    console.log('✅ Image uploaded:', snapshot.metadata.fullPath);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
};

/**
 * Delete image from Firebase Storage
 * @param imageUrl - Full download URL of the image
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  if (!imageUrl) return;

  try {
    const storage = getFirebaseStorage();
    
    // Extract path from URL
    const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/';
    if (!imageUrl.startsWith(baseUrl)) {
      console.warn('Invalid Firebase Storage URL');
      return;
    }

    // Parse the path from URL
    const pathStart = imageUrl.indexOf('/o/') + 3;
    const pathEnd = imageUrl.indexOf('?');
    const encodedPath = imageUrl.substring(pathStart, pathEnd);
    const path = decodeURIComponent(encodedPath);

    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    console.log('✅ Image deleted:', path);
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw - image might already be deleted
  }
};

/**
 * Generate unique file path for product images
 */
export const generateProductImagePath = (productId: string, filename: string): string => {
  const extension = filename.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  return `products/${productId}_${timestamp}.${extension}`;
};

/**
 * Generate banner image path
 */
export const generateBannerImagePath = (bannerId: string, fileName: string): string => {
  const timestamp = Date.now();
  const extension = fileName.split('.').pop();
  return `banners/${bannerId}/banner_${timestamp}.${extension}`;
};

/**
 * Upload banner image
 */
export const uploadBannerImage = async (
  file: File,
  path: string
): Promise<string> => {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, path);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  console.log('✅ Banner image uploaded:', downloadURL);
  return downloadURL;
};

/**
 * Delete banner image
 */
export const deleteBannerImage = async (imageUrl: string): Promise<void> => {
  try {
    const storage = getFirebaseStorage();
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
    console.log('✅ Banner image deleted');
  } catch (error) {
    console.error('Error deleting banner image:', error);
    // Don't throw - image might already be deleted
  }
};