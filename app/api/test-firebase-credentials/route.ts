import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getGCPCredentials } from '../../../lib/gcp-credentials';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

let testAdmin: any;

const initializeTestFirebase = async () => {
  if (!testAdmin) {
    testAdmin = await import('firebase-admin');
    
    // Use a unique app name for testing to avoid conflicts
    const appName = 'test-firebase-credentials';
    
    // Check if test app already exists
    try {
      return testAdmin.app(appName);
    } catch (error) {
      // App doesn't exist, create it
      const gcpCredentials = getGCPCredentials();
      
      console.log('=== FIREBASE CREDENTIALS TEST ===');
      console.log('GCP_SERVICE_ACCOUNT_EMAIL present:', !!process.env.GCP_SERVICE_ACCOUNT_EMAIL);
      console.log('GCP_PRIVATE_KEY present:', !!process.env.GCP_PRIVATE_KEY);
      console.log('GCP_PROJECT_ID present:', !!process.env.GCP_PROJECT_ID);
      console.log('GCP_PRIVATE_KEY_ID present:', !!process.env.GCP_PRIVATE_KEY_ID);
      console.log('GCP_CLIENT_ID present:', !!process.env.GCP_CLIENT_ID);
      
      if (gcpCredentials.credentials) {
        console.log('Using structured credentials');
        console.log('Private key starts with:', (gcpCredentials.credentials as any).private_key.substring(0, 50) + '...');
        console.log('Client email:', (gcpCredentials.credentials as any).client_email);
        console.log('Project ID:', (gcpCredentials.credentials as any).project_id);
        
        return testAdmin.initializeApp({
          credential: testAdmin.credential.cert(gcpCredentials.credentials),
          projectId: gcpCredentials.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        }, appName);
      } else {
        console.log('Using Application Default Credentials');
        return testAdmin.initializeApp({
          credential: testAdmin.credential.applicationDefault(),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        }, appName);
      }
    }
  }
};

export async function GET(request: NextRequest) {
  try {
    console.log('=== STARTING FIREBASE CREDENTIALS TEST ===');
    
    const app = await initializeTestFirebase();
    console.log('✅ Firebase Admin SDK initialized successfully');
    
    // Test Firestore access
    const db = testAdmin.firestore(app);
    console.log('✅ Firestore instance created');
    
    // Try to access a collection (just get metadata, don't read actual data)
    const accountsRef = db.collection('accounts');
    console.log('✅ Accounts collection reference created');
    
    // Test Auth access
    const auth = testAdmin.auth(app);
    console.log('✅ Auth instance created');
    
    // Test getting auth settings (doesn't require reading user data)
    try {
      const projectConfig = await auth.getProjectConfig();
      console.log('✅ Auth project config accessed successfully');
    } catch (authError: any) {
      console.warn('⚠️ Auth project config access failed (may be permissions issue):', authError.message);
    }
    
    console.log('=== FIREBASE CREDENTIALS TEST COMPLETED SUCCESSFULLY ===');
    
    return NextResponse.json({
      success: true,
      message: 'Firebase credentials are working correctly',
      details: {
        hasStructuredCredentials: !!getGCPCredentials().credentials,
        projectId: getGCPCredentials().projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('=== FIREBASE CREDENTIALS TEST FAILED ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      errorCode: error.code,
      errorType: error.constructor.name,
      details: {
        hasStructuredCredentials: !!getGCPCredentials().credentials,
        envVarsPresent: {
          GCP_SERVICE_ACCOUNT_EMAIL: !!process.env.GCP_SERVICE_ACCOUNT_EMAIL,
          GCP_PRIVATE_KEY: !!process.env.GCP_PRIVATE_KEY,
          GCP_PROJECT_ID: !!process.env.GCP_PROJECT_ID,
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        },
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}