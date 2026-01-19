import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// Initialize Firebase Admin
const initAdmin = () => {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
  return getFirestore();
};

export async function POST(request: NextRequest) {
  try {
    const { registrationId, confirmationPhrase, invoiceNumber } = await request.json();

    // Safety check - require explicit confirmation phrase
    if (confirmationPhrase !== 'DELETE') {
      return NextResponse.json(
        { error: 'Invalid confirmation phrase. Type "DELETE" to confirm.' },
        { status: 400 }
      );
    }

    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      );
    }

    const db = initAdmin();

    // Find the registration document by registrationId field
    const registrationsRef = db.collection('rendezvous-registrations');
    const snapshot = await registrationsRef.where('registrationId', '==', registrationId).get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Get the document
    const doc = snapshot.docs[0];
    const registrationData = doc.data();

    // Double-check invoice number matches for extra safety
    if (invoiceNumber && registrationData.invoiceNumber !== invoiceNumber) {
      return NextResponse.json(
        { error: 'Invoice number mismatch - registration not deleted for safety' },
        { status: 400 }
      );
    }

    // Store info for response before deletion
    const deletedInfo = {
      registrationId: registrationData.registrationId,
      invoiceNumber: registrationData.invoiceNumber,
      company: registrationData.billingInfo?.company || 'Unknown',
      attendeeCount: registrationData.attendees?.length || 0,
      totalPrice: registrationData.totalPrice || 0
    };

    // Delete the registration
    await doc.ref.delete();

    console.log(`Deleted rendezvous registration: ${registrationId} (${deletedInfo.company})`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted registration for ${deletedInfo.company}`,
      details: deletedInfo
    });

  } catch (error: any) {
    console.error('Error deleting rendezvous registration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete registration' },
      { status: 500 }
    );
  }
}
