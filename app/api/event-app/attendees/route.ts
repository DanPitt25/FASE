import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

export async function GET(request: NextRequest) {
  try {
    const db = initAdmin();

    // Fetch all confirmed registrations
    const registrationsSnapshot = await db
      .collection('rendezvous-registrations')
      .where('paymentStatus', 'in', ['paid', 'confirmed'])
      .get();

    const attendees: any[] = [];

    registrationsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const company = data.billingInfo?.company || 'Unknown';
      const organizationType = data.billingInfo?.organizationType || 'other';
      const country = data.billingInfo?.country || 'Unknown';

      (data.attendees || []).forEach((attendee: any) => {
        attendees.push({
          id: `${doc.id}-${attendee.email}`,
          name: `${attendee.firstName} ${attendee.lastName}`,
          company,
          jobTitle: attendee.jobTitle || 'Attendee',
          organizationType,
          country,
        });
      });
    });

    // Sort by company name
    attendees.sort((a, b) => a.company.localeCompare(b.company));

    return NextResponse.json(attendees);
  } catch (error: any) {
    console.error('Error fetching attendees:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attendees' },
      { status: 500 }
    );
  }
}
