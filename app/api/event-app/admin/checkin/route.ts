import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

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
    const db = initAdmin();
    const body = await request.json();

    const { registrationId } = body;

    if (!registrationId) {
      return NextResponse.json(
        { success: false, error: 'Registration ID is required' },
        { status: 400 }
      );
    }

    // Try to find by registrationId field first
    let registrationDoc = null;
    let registrationRef = null;

    const byIdSnapshot = await db
      .collection('rendezvous-registrations')
      .where('registrationId', '==', registrationId)
      .limit(1)
      .get();

    if (!byIdSnapshot.empty) {
      registrationDoc = byIdSnapshot.docs[0];
      registrationRef = registrationDoc.ref;
    } else {
      // Try by document ID
      const docRef = db.collection('rendezvous-registrations').doc(registrationId);
      const doc = await docRef.get();
      if (doc.exists) {
        registrationDoc = doc;
        registrationRef = docRef;
      }
    }

    if (!registrationDoc || !registrationRef) {
      return NextResponse.json({
        success: false,
        error: 'Registration not found',
      });
    }

    const data = registrationDoc.data();

    // Check if payment is confirmed
    if (!['paid', 'confirmed'].includes(data?.paymentStatus)) {
      return NextResponse.json({
        success: false,
        error: 'Payment not confirmed for this registration',
      });
    }

    // Get first attendee info for display
    const firstAttendee = data?.attendees?.[0];
    const attendeeInfo = {
      name: firstAttendee
        ? `${firstAttendee.firstName} ${firstAttendee.lastName}`
        : 'Unknown',
      company: data?.billingInfo?.company || 'Unknown',
      email: firstAttendee?.email || data?.billingInfo?.billingEmail || '',
      ticketType: data?.billingInfo?.organizationType || 'Attendee',
      alreadyCheckedIn: !!data?.checkedInAt,
      checkedInAt: data?.checkedInAt?.toDate?.()?.toISOString() || data?.checkedInAt,
    };

    // If not already checked in, mark as checked in
    if (!data?.checkedInAt) {
      await registrationRef.update({
        checkedInAt: FieldValue.serverTimestamp(),
        checkedInCount: data?.attendees?.length || 1,
      });
    }

    return NextResponse.json({
      success: true,
      attendee: attendeeInfo,
    });
  } catch (error: any) {
    console.error('Error during check-in:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Check-in failed' },
      { status: 500 }
    );
  }
}
