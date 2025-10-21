// Client-side auth API that works with ad blockers
import { auth } from './firebase';
import { signInWithCustomToken } from 'firebase/auth';

// Account creation function removed - accounts are only created after payment via createAccountAndMembership

export async function sendVerificationCodeViaAPI(email: string) {
  const response = await fetch('/api/auth/send-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send verification code');
  }

  return response.json();
}

export async function verifyCodeViaAPI(email: string, code: string) {
  const response = await fetch('/api/auth/verify-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to verify code');
  }

  return response.json();
}

// Check if Firebase is blocked
export function isFirebaseBlocked(): boolean {
  // Check if we have a fallback token but no Firebase user
  return !!(localStorage.getItem('fase_auth_token') && !auth.currentUser);
}

// Get current user info from localStorage if Firebase is blocked
export function getFallbackUser() {
  const uid = localStorage.getItem('fase_user_uid');
  const token = localStorage.getItem('fase_auth_token');
  
  if (uid && token) {
    return { uid, token };
  }
  
  return null;
}

// Get auth headers for API requests
export async function getAuthHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Try to get Firebase ID token first
  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
    } catch (error) {
      console.warn('Failed to get ID token:', error);
    }
  }

  // Fallback to custom token if Firebase is blocked
  const fallbackToken = localStorage.getItem('fase_auth_token');
  if (fallbackToken && !headers['Authorization']) {
    headers['X-Auth-Token'] = fallbackToken;
  }

  return headers;
}

// Upload logo via API (works with ad blockers)
export async function uploadLogoViaAPI(file: File, identifier: string) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('identifier', identifier);

    const response = await fetch('/api/upload-logo', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload logo');
    }

    return response.json();
  } catch (error) {
    throw error;
  }
}

// Create membership application via API (works with ad blockers)
export async function createMembershipViaAPI(membershipData: any) {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch('/api/create-membership', {
      method: 'POST',
      headers,
      body: JSON.stringify(membershipData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create membership application');
    }

    return response.json();
  } catch (error) {
    throw error;
  }
}