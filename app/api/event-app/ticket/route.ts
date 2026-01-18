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
    const email = request.nextUrl.searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const db = initAdmin();

    // Search for registration by attendee email
    const registrationsSnapshot = await db
      .collection('rendezvous-registrations')
      .where('paymentStatus', 'in', ['paid', 'confirmed'])
      .get();

    let ticketData = null;

    for (const doc of registrationsSnapshot.docs) {
      const data = doc.data();
      const attendees = data.attendees || [];

      const matchingAttendee = attendees.find(
        (a: any) => a.email?.toLowerCase() === email.toLowerCase()
      );

      if (matchingAttendee) {
        ticketData = {
          registrationId: data.registrationId || doc.id,
          company: data.billingInfo?.company || data.company || 'Unknown',
          attendeeName: `${matchingAttendee.firstName} ${matchingAttendee.lastName}`,
          attendeeEmail: matchingAttendee.email,
          ticketType: data.billingInfo?.organizationType || 'Attendee',
          isFaseMember: data.companyIsFaseMember || false,
        };
        break;
      }
    }

    if (!ticketData) {
      return NextResponse.json({ error: 'No registration found' }, { status: 404 });
    }

    return NextResponse.json(ticketData);
  } catch (error: any) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}
