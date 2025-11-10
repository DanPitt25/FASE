// Firebase Auth error code mappings to translation keys
import { AccountPendingError, AccountNotApprovedError, AccountInvoicePendingError, AccountNotFoundError } from './auth';

// Function that returns translation key for auth errors
export const getAuthErrorTranslationKey = (errorCode: string): string => {
  const errorKeyMap: Record<string, string> = {
    // Authentication errors
    'auth/user-not-found': 'auth_user_not_found',
    'auth/wrong-password': 'auth_wrong_password',
    'auth/invalid-credential': 'auth_invalid_credential',
    'auth/invalid-login-credentials': 'auth_invalid_login_credentials',
    'auth/invalid-email': 'auth_invalid_email',
    'auth/user-disabled': 'auth_user_disabled',
    'auth/weak-password': 'auth_weak_password',
    'auth/account-exists-with-different-credential': 'auth_account_exists_with_different_credential',
    
    // Registration errors
    'auth/email-already-in-use': 'auth_email_already_in_use',
    'auth/operation-not-allowed': 'auth_operation_not_allowed',
    
    // Rate limiting
    'auth/too-many-requests': 'auth_too_many_requests',
    'auth/quota-exceeded': 'auth_quota_exceeded',
    
    // Network errors
    'auth/network-request-failed': 'auth_network_request_failed',
    'auth/timeout': 'auth_timeout',
    'auth/user-token-expired': 'auth_user_token_expired',
    
    // Password reset
    'auth/invalid-continue-uri': 'auth_invalid_continue_uri',
    'auth/missing-continue-uri': 'auth_missing_continue_uri',
    
    // General errors
    'auth/internal-error': 'auth_internal_error',
    'auth/cancelled-popup-request': 'auth_cancelled_popup_request',
    'auth/popup-blocked': 'auth_popup_blocked',
    'auth/popup-closed-by-user': 'auth_popup_closed_by_user',
    
    // Custom validation errors
    'auth/missing-password': 'auth_missing_password',
    'auth/missing-email': 'auth_missing_email',
    'auth/passwords-do-not-match': 'auth_passwords_do_not_match'
  };

  return errorKeyMap[errorCode] || 'default_error';
};

// Legacy function for backwards compatibility with hardcoded messages
export const getAuthErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    // Authentication errors
    'auth/user-not-found': 'Invalid email or password.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/invalid-login-credentials': 'Invalid email or password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/weak-password': 'Invalid email or password.',
    'auth/account-exists-with-different-credential': 'Invalid email or password.',
    
    // Registration errors
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
    'auth/operation-not-allowed': 'Account creation is currently disabled. Please contact support.',
    
    // Rate limiting
    'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes before trying again.',
    'auth/quota-exceeded': 'Too many requests. Please try again later.',
    
    // Network errors
    'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
    'auth/timeout': 'Request timed out. Please try again.',
    
    'auth/user-token-expired': 'Your session has expired. Please sign in again.',
    
    // Password reset
    'auth/invalid-continue-uri': 'Invalid reset link. Please try again.',
    'auth/missing-continue-uri': 'Missing reset information. Please try again.',
    
    // General errors
    'auth/internal-error': 'An unexpected error occurred. Please try again.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
    'auth/popup-blocked': 'Pop-up was blocked by your browser. Please allow pop-ups and try again.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
    
    // Custom validation errors
    'auth/missing-password': 'Please enter a password.',
    'auth/missing-email': 'Please enter an email address.',
    'auth/passwords-do-not-match': 'Passwords do not match. Please try again.'
  };

  return errorMessages[errorCode] || 'An unexpected error occurred. Please contact help@fasemga.com for assistance.';
};

// Helper function to extract error code from Firebase error
export const getFirebaseErrorCode = (error: any): string => {
  if (error?.code) {
    return error.code;
  }
  
  // Check for Firebase REST API error format
  if (error?.error?.message) {
    const message = error.error.message;
    if (message === 'EMAIL_EXISTS') return 'auth/email-already-in-use';
    if (message === 'EMAIL_NOT_FOUND') return 'auth/user-not-found';
    if (message === 'INVALID_PASSWORD') return 'auth/wrong-password';
    if (message === 'USER_DISABLED') return 'auth/user-disabled';
    if (message === 'TOO_MANY_ATTEMPTS_TRY_LATER') return 'auth/too-many-requests';
    if (message === 'OPERATION_NOT_ALLOWED') return 'auth/operation-not-allowed';
  }
  
  // Check if it's a string error message that contains a code
  if (typeof error === 'string' && error.includes('auth/')) {
    const match = error.match(/auth\/[\w-]+/);
    return match ? match[0] : 'auth/unknown-error';
  }
  
  
  return 'auth/unknown-error';
};

// Function to get translation key for auth errors with fallback to custom errors
export const getAuthErrorKey = (error: any): string => {
  // Handle our custom account status errors - these are already translated
  if (error instanceof AccountPendingError) {
    return 'account_pending';
  }
  if (error instanceof AccountNotApprovedError) {
    return 'account_not_approved';
  }
  if (error instanceof AccountInvoicePendingError) {
    return 'account_invoice_pending';
  }
  if (error instanceof AccountNotFoundError) {
    return 'account_not_found';
  }
  
  const errorCode = getFirebaseErrorCode(error);
  return getAuthErrorTranslationKey(errorCode);
};

// Main function to get user-friendly error message from any Firebase error (legacy)
export const handleAuthError = (error: any): string => {
  // Handle our custom account status errors
  if (error instanceof AccountPendingError || 
      error instanceof AccountNotApprovedError ||
      error instanceof AccountInvoicePendingError ||
      error instanceof AccountNotFoundError) {
    return error.message;
  }
  
  const errorCode = getFirebaseErrorCode(error);
  return getAuthErrorMessage(errorCode);
};