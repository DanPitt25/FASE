import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

const APP_NAME = 'get-filtered-accounts';

// Initialize Firebase Admin with a named app to avoid conflicts
const initAdmin = () => {
  let app = admin.apps.find(a => a?.name === APP_NAME);

  if (!app) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing');
    }
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    }, APP_NAME);
  }

  return admin.firestore(app);
};

// Normalize organization type to match filter values
const normalizeOrgType = (type: string): string => {
  if (!type) return 'MGA';
  const lower = type.toLowerCase();
  if (lower === 'mga' || lower === 'managing_general_agent') return 'MGA';
  if (lower === 'carrier' || lower === 'insurance_carrier' || lower === 'insurer') return 'carrier';
  if (lower === 'provider' || lower === 'service_provider' || lower === 'insurance_broker' || lower === 'broker') return 'provider';
  return type; // Return original if no match
};

export async function POST(request: NextRequest) {
  try {
    const { organizationTypes, accountStatuses } = await request.json();

    console.log('Mass email filter request:', { organizationTypes, accountStatuses });

    const db = initAdmin();

    // Fetch all accounts from the accounts collection
    const accountsSnapshot = await db.collection('accounts').get();

    console.log(`Found ${accountsSnapshot.docs.length} total accounts in Firestore`);

    const accounts = accountsSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email || data.accountAdministrator?.email || '',
          organizationName: data.organizationName || data.displayName || '',
          organizationType: normalizeOrgType(data.organizationType),
          status: data.status || 'pending',
          contactName: data.accountAdministrator?.name || data.personalName || data.fullName || ''
        };
      })
      .filter(account => {
        // Filter out accounts without email
        if (!account.email) return false;

        // If no filters selected, return all
        if (organizationTypes.length === 0 && accountStatuses.length === 0) {
          return true;
        }

        // Check organization type filter
        const typeMatch = organizationTypes.length === 0 || organizationTypes.includes(account.organizationType);

        // Check status filter
        const statusMatch = accountStatuses.length === 0 || accountStatuses.includes(account.status);

        return typeMatch && statusMatch;
      });

    console.log(`Returning ${accounts.length} filtered accounts`);

    return NextResponse.json({
      success: true,
      accounts
    });
  } catch (error: any) {
    console.error('Error fetching filtered accounts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
