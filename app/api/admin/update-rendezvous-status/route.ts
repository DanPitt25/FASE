import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { registrationId, status } = await request.json();

    if (!registrationId || !status) {
      return NextResponse.json(
        { error: 'Missing registrationId or status' },
        { status: 400 }
      );
    }

    // Valid statuses
    const validStatuses = ['paid', 'pending_bank_transfer', 'confirmed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Find the registration document
    const registrationsSnapshot = await adminDb
      .collection('rendezvous-registrations')
      .where('registrationId', '==', registrationId)
      .limit(1)
      .get();

    if (registrationsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    const docRef = registrationsSnapshot.docs[0].ref;

    // Update the status
    await docRef.update({
      paymentStatus: status,
      status: status === 'confirmed' || status === 'paid' ? 'confirmed' : 'pending_payment',
      updatedAt: new Date(),
      confirmedAt: status === 'confirmed' ? new Date() : null
    });

    return NextResponse.json({
      success: true,
      message: 'Status updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating rendezvous status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update status' },
      { status: 500 }
    );
  }
}
