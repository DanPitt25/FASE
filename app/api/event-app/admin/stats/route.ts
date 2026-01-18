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
    const detailed = request.nextUrl.searchParams.get('detailed') === 'true';

    // Fetch all registrations
    const registrationsSnapshot = await db
      .collection('rendezvous-registrations')
      .get();

    let totalRegistrations = 0;
    let totalAttendees = 0;
    let checkedIn = 0;
    let pendingPayment = 0;
    let revenue = 0;
    const byOrganizationType: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const recentRegistrations: any[] = [];

    registrationsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      totalRegistrations++;

      const attendeeCount = data.attendees?.length || 0;
      totalAttendees += attendeeCount;

      // Check payment status
      if (data.paymentStatus === 'paid' || data.paymentStatus === 'confirmed') {
        revenue += data.totalPrice || 0;
      } else if (data.paymentStatus === 'pending_bank_transfer') {
        pendingPayment++;
      }

      // Count checked in attendees
      if (data.checkedInAt) {
        checkedIn += data.checkedInCount || attendeeCount;
      }

      // Detailed stats
      if (detailed) {
        const orgType = data.billingInfo?.organizationType || 'other';
        byOrganizationType[orgType] = (byOrganizationType[orgType] || 0) + attendeeCount;

        const country = data.billingInfo?.country || 'Unknown';
        byCountry[country] = (byCountry[country] || 0) + attendeeCount;

        // Recent registrations (last 10)
        if (recentRegistrations.length < 10) {
          recentRegistrations.push({
            id: doc.id,
            company: data.billingInfo?.company || 'Unknown',
            attendeeCount,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          });
        }
      }
    });

    // Sort recent registrations by date
    recentRegistrations.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const stats = {
      totalRegistrations,
      totalAttendees,
      checkedIn,
      pendingPayment,
      revenue,
      ...(detailed && {
        byOrganizationType,
        byCountry,
        recentRegistrations,
      }),
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
