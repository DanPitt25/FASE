// Safe Firebase wrapper that works with ad blockers
import { initializeApp, getApps } from "firebase/app";

// Flag to track if Firebase is blocked
let firebaseBlocked = false;
let blockCheckPromise: Promise<boolean> | null = null;

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB3T8X5QNU5iYG89u5XWyGhrIdKjnb2be0",
  authDomain: "fase-site.firebaseapp.com",
  projectId: "fase-site",
  storageBucket: "fase-site.firebasestorage.app",
  messagingSenderId: "1031442839092",
  appId: "1:1031442839092:web:57238d8824182cbbda7c61",
  measurementId: "G-MPQWL4XJYH"
};

// Test if Firebase connections are blocked
async function testFirebaseConnectivity(): Promise<boolean> {
  if (blockCheckPromise) {
    return blockCheckPromise;
  }

  blockCheckPromise = new Promise(async (resolve) => {
    try {
      // Try to make a simple request to Firebase
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(
        'https://firestore.googleapis.com/v1/projects/fase-site/databases/(default)/documents',
        {
          method: 'GET',
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      
      // If we get here, Firebase is not blocked
      firebaseBlocked = false;
      resolve(false);
    } catch (error: any) {
      // If request fails or is blocked, Firebase is not accessible
      firebaseBlocked = true;
      console.warn('Firebase connectivity blocked, using API fallbacks only');
      resolve(true);
    }
  });

  return blockCheckPromise;
}

// Safe Firebase initialization
export async function initFirebaseSafe() {
  // Check if Firebase is blocked first
  const isBlocked = await testFirebaseConnectivity();
  
  if (isBlocked) {
    console.log('Firebase blocked, skipping initialization');
    return {
      app: null,
      auth: null,
      db: null,
      storage: null,
      functions: null,
      isBlocked: true
    };
  }

  try {
    // Initialize Firebase if not blocked
    let app;
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    const { getAuth } = await import("firebase/auth");
    const { getFirestore } = await import("firebase/firestore");
    const { getStorage } = await import("firebase/storage");
    const { getFunctions } = await import("firebase/functions");

    return {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
      storage: getStorage(app),
      functions: getFunctions(app),
      isBlocked: false
    };
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    firebaseBlocked = true;
    return {
      app: null,
      auth: null,
      db: null,
      storage: null,
      functions: null,
      isBlocked: true
    };
  }
}

// Check if Firebase is blocked (synchronous after first check)
export function isFirebaseBlocked(): boolean {
  return firebaseBlocked;
}

// Get current user via API when Firebase is blocked
export async function getCurrentUserSafe(): Promise<any> {
  if (firebaseBlocked) {
    // Use localStorage fallback
    const uid = localStorage.getItem('fase_user_uid');
    const token = localStorage.getItem('fase_auth_token');
    
    if (uid && token) {
      return {
        uid,
        email: localStorage.getItem('fase_user_email'),
        displayName: localStorage.getItem('fase_user_displayName'),
        emailVerified: localStorage.getItem('fase_user_emailVerified') === 'true'
      };
    }
    return null;
  }

  // Use Firebase auth if available
  try {
    const firebase = await initFirebaseSafe();
    return firebase.auth?.currentUser || null;
  } catch (error) {
    return null;
  }
}

// Safe auth state listener
export async function onAuthStateChangeSafe(callback: (user: any) => void) {
  const isBlocked = await testFirebaseConnectivity();
  
  if (isBlocked) {
    // Use localStorage polling for auth state when Firebase is blocked
    let lastUser: any = null;
    
    const checkAuthState = () => {
      const uid = localStorage.getItem('fase_user_uid');
      const currentUser = uid ? {
        uid,
        email: localStorage.getItem('fase_user_email'),
        displayName: localStorage.getItem('fase_user_displayName'),
        emailVerified: localStorage.getItem('fase_user_emailVerified') === 'true'
      } : null;
      
      if (JSON.stringify(currentUser) !== JSON.stringify(lastUser)) {
        lastUser = currentUser;
        callback(currentUser);
      }
    };
    
    // Initial check
    checkAuthState();
    
    // Poll every 1 second for changes
    const interval = setInterval(checkAuthState, 1000);
    
    return () => clearInterval(interval);
  } else {
    // Use Firebase auth listener
    const firebase = await initFirebaseSafe();
    if (firebase.auth) {
      const { onAuthStateChanged } = await import("firebase/auth");
      return onAuthStateChanged(firebase.auth, callback);
    }
    return () => {};
  }
}