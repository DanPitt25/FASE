import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  getMetadata
} from 'firebase/storage';
import { storage } from './firebase';

// Simple cache for logo URLs
interface CacheEntry {
  url: string | null;
  timestamp: number;
}

let logoCache: Map<string, CacheEntry> | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCache = () => {
  if (!logoCache) {
    logoCache = new Map<string, CacheEntry>();
  }
  return logoCache;
};

export interface UploadResult {
  downloadURL: string;
  filePath: string;
  fileName: string;
}

/**
 * Upload an organization logo to Firebase Storage
 * @param file - The file to upload
 * @param organizationName - The organization name (sanitized for file path)
 * @returns Promise with download URL and file info
 */
export async function uploadOrganizationLogo(
  file: File, 
  organizationName: string
): Promise<UploadResult> {
  // Sanitize organization name for file path
  const sanitizedOrgName = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Get file extension
  const fileExtension = file.name.split('.').pop() || 'png';
  const fileName = `${sanitizedOrgName}-logo.${fileExtension}`;
  
  // Create reference to the file location
  const filePath = `graphics/logos/${fileName}`;
  const fileRef = ref(storage, filePath);
  
  try {
    // Upload the file
    const snapshot = await uploadBytes(fileRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Invalidate cache for this organization
    const cacheKey = sanitizedOrgName;
    getCache().set(cacheKey, { url: downloadURL, timestamp: Date.now() });
    
    return {
      downloadURL,
      filePath,
      fileName
    };
  } catch (error) {
    console.error('Error uploading logo:', error);
    throw new Error('Failed to upload logo. Please try again.');
  }
}

/**
 * Get the download URL for an organization's logo (with caching)
 * @param organizationName - The organization name
 * @returns Promise with download URL or null if not found
 */
export async function getOrganizationLogoURL(organizationName: string): Promise<string | null> {
  const sanitizedOrgName = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Check cache first
  const cacheKey = sanitizedOrgName;
  const cached = getCache().get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.url;
  }

  try {
    // Try common file extensions
    const extensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    
    for (const ext of extensions) {
      try {
        const fileName = `${sanitizedOrgName}-logo.${ext}`;
        const fileRef = ref(storage, `graphics/logos/${fileName}`);
        
        // First check if file exists by getting metadata
        await getMetadata(fileRef);
        
        // If no error, get the download URL
        const downloadURL = await getDownloadURL(fileRef);
        
        // Cache the result
        getCache().set(cacheKey, { url: downloadURL, timestamp: now });
        return downloadURL;
      } catch (error: any) {
        // If it's a 'not found' error, continue to next extension
        if (error?.code === 'storage/object-not-found') {
          continue;
        }
        // For other errors (like CORS), also continue
        console.warn(`Error checking ${fileName}:`, error);
        continue;
      }
    }
    
    // Cache the null result to avoid repeated failed lookups
    getCache().set(cacheKey, { url: null, timestamp: now });
    return null;
  } catch (error) {
    console.error('Error getting logo URL:', error);
    // Cache the null result even on error
    getCache().set(cacheKey, { url: null, timestamp: now });
    return null;
  }
}

/**
 * Delete an organization's logo
 * @param organizationName - The organization name
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteOrganizationLogo(organizationName: string): Promise<void> {
  try {
    const sanitizedOrgName = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Try to delete all possible logo files
    const extensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    
    for (const ext of extensions) {
      try {
        const fileName = `${sanitizedOrgName}-logo.${ext}`;
        const fileRef = ref(storage, `graphics/logos/${fileName}`);
        await deleteObject(fileRef);
      } catch {
        // File might not exist, continue
      }
    }
  } catch (error) {
    console.error('Error deleting logo:', error);
    throw new Error('Failed to delete logo.');
  }
}

/**
 * Upload a member logo to Firebase Storage using member UID
 * @param file - The file to upload
 * @param memberUid - The member's UID
 * @returns Promise with download URL and file info
 */
export async function uploadMemberLogo(
  file: File, 
  memberUid: string
): Promise<UploadResult> {
  // Get file extension
  const fileExtension = file.name.split('.').pop() || 'png';
  const fileName = `${memberUid}-logo.${fileExtension}`;
  
  // Create reference to the file location
  const filePath = `graphics/logos/${fileName}`;
  const fileRef = ref(storage, filePath);
  
  try {
    // Upload the file
    const snapshot = await uploadBytes(fileRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Cache the result
    const cacheKey = memberUid;
    getCache().set(cacheKey, { url: downloadURL, timestamp: Date.now() });
    
    return {
      downloadURL,
      filePath,
      fileName
    };
  } catch (error) {
    console.error('Error uploading member logo:', error);
    throw new Error('Failed to upload logo. Please try again.');
  }
}

/**
 * Get the download URL for a member's logo by UID
 * @param memberUid - The member's UID
 * @returns Promise with download URL or null if not found
 */
export async function getMemberLogoURL(memberUid: string): Promise<string | null> {
  // Check cache first
  const cacheKey = memberUid;
  const cached = getCache().get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.url;
  }

  try {
    // Try common file extensions
    const extensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    
    for (const ext of extensions) {
      try {
        const fileName = `${memberUid}-logo.${ext}`;
        const fileRef = ref(storage, `graphics/logos/${fileName}`);
        
        // First check if file exists by getting metadata
        await getMetadata(fileRef);
        
        // If no error, get the download URL
        const downloadURL = await getDownloadURL(fileRef);
        
        // Cache the result
        getCache().set(cacheKey, { url: downloadURL, timestamp: now });
        return downloadURL;
      } catch (error: any) {
        // If it's a 'not found' error, continue to next extension
        if (error?.code === 'storage/object-not-found') {
          continue;
        }
        // For other errors (like CORS), also continue
        console.warn(`Error checking ${fileName}:`, error);
        continue;
      }
    }
    
    // Cache the null result to avoid repeated failed lookups
    getCache().set(cacheKey, { url: null, timestamp: now });
    return null;
  } catch (error) {
    console.error('Error getting member logo URL:', error);
    // Cache the null result even on error
    getCache().set(cacheKey, { url: null, timestamp: now });
    return null;
  }
}

/**
 * Delete a member's logo by UID
 * @param memberUid - The member's UID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteMemberLogo(memberUid: string): Promise<void> {
  try {
    // Try to delete all possible logo files
    const extensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    
    for (const ext of extensions) {
      try {
        const fileName = `${memberUid}-logo.${ext}`;
        const fileRef = ref(storage, `graphics/logos/${fileName}`);
        await deleteObject(fileRef);
      } catch {
        // File might not exist, continue
      }
    }
    
    // Clear from cache
    getCache().delete(memberUid);
  } catch (error) {
    console.error('Error deleting member logo:', error);
    throw new Error('Failed to delete logo.');
  }
}

/**
 * Validate file for logo upload
 * @param file - The file to validate
 * @returns True if valid, throws error if invalid
 */
export function validateLogoFile(file: File): boolean {
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 5MB');
  }
  
  // Check file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('File must be PNG, JPG, SVG, or WebP format');
  }
  
  return true;
}