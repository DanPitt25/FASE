// Firebase Auth error code mappings to user-friendly messages

export const getAuthErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    // Authentication errors
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password. Please check your credentials.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/weak-password': 'Password should be at least 6 characters long.',
    
    // Registration errors
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
    'auth/operation-not-allowed': 'Account creation is currently disabled. Please contact support.',
    
    // Rate limiting
    'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes before trying again.',
    
    // Network errors
    'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
    'auth/timeout': 'Request timed out. Please try again.',
    
    // Email verification
    'auth/invalid-action-code': 'This verification link is invalid or has expired. Please request a new one.',
    'auth/expired-action-code': 'This verification link has expired. Please request a new one.',
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

  return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
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

// Main function to get user-friendly error message from any Firebase error
export const handleAuthError = (error: any): string => {
  const errorCode = getFirebaseErrorCode(error);
  return getAuthErrorMessage(errorCode);
};