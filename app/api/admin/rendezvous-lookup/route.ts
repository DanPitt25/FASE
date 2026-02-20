import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

const APP_NAME = 'rendezvous-lookup';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const company = searchParams.get('company');

    if (!email && !company) {
      return NextResponse.json({ registration: null });
    }

    const db = initAdmin();

    // Look for pending registration by billing email or company name
    const registrationsRef = db.collection('rendezvous-registrations');

    // Try email match first
    if (email) {
      const emailSnapshot = await registrationsRef
        .where('billingInfo.billingEmail', '==', email)
        .get();

      // Filter out paid registrations in code
      const unpaidDoc = emailSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.paymentStatus !== 'paid' && data.status !== 'confirmed';
      });

      if (unpaidDoc) {
        return NextResponse.json({
          registration: {
            id: unpaidDoc.id,
            ...unpaidDoc.data()
          }
        });
      }
    }

    // Try company name match
    if (company) {
      const companySnapshot = await registrationsRef
        .where('billingInfo.company', '==', company)
        .get();

      // Filter out paid registrations in code
      const unpaidDoc = companySnapshot.docs.find(doc => {
        const data = doc.data();
        return data.paymentStatus !== 'paid' && data.status !== 'confirmed';
      });

      if (unpaidDoc) {
        return NextResponse.json({
          registration: {
            id: unpaidDoc.id,
            ...unpaidDoc.data()
          }
        });
      }
    }

    return NextResponse.json({ registration: null });
  } catch (error: any) {
    console.error('Error looking up rendezvous registration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to lookup registration' },
      { status: 500 }
    );
  }
}
