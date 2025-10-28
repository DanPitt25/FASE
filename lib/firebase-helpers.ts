/**
 * Firebase Helper Functions
 * 
 * These helpers ensure we use the correct SDK syntax everywhere
 * and provide type safety to prevent common mistakes.
 */

// Type guards for Firebase SDK detection
export const isClientSDK = (doc: any): boolean => {
  return typeof doc?.exists === 'function';
};

export const isAdminSDK = (doc: any): boolean => {
  return typeof doc?.exists === 'boolean';
};

/**
 * Safe document exists check - works with both SDKs
 */
export const docExists = (doc: any): boolean => {
  if (isClientSDK(doc)) {
    return doc.exists();
  }
  if (isAdminSDK(doc)) {
    return doc.exists;
  }
  throw new Error('Invalid Firebase document object');
};

/**
 * Safe document data extraction - works with both SDKs
 */
export const docData = (doc: any): any => {
  if (!docExists(doc)) {
    return null;
  }
  return doc.data();
};

/**
 * Environment detection
 */
export const isServerSide = (): boolean => {
  return typeof window === 'undefined';
};

export const isClientSide = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * SDK validation - throws error if wrong SDK is used in wrong context
 */
export const validateSDKContext = (doc: any, context: 'client' | 'server'): void => {
  if (context === 'client' && !isClientSDK(doc)) {
    throw new Error('❌ FIREBASE ERROR: Use Client SDK in frontend components! Import from "../lib/firebase"');
  }
  if (context === 'server' && !isAdminSDK(doc)) {
    throw new Error('❌ FIREBASE ERROR: Use Admin SDK in API routes! Import "firebase-admin"');
  }
};

/**
 * Safe wrapper functions with automatic SDK detection
 */
export const safeDocExists = (doc: any): boolean => {
  try {
    return docExists(doc);
  } catch (error) {
    console.error('Firebase SDK mismatch:', error);
    throw error;
  }
};

export const safeDocData = (doc: any): any => {
  try {
    return docData(doc);
  } catch (error) {
    console.error('Firebase SDK mismatch:', error);
    throw error;
  }
};