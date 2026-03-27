import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';
import { verifyAdminAccess, isAuthError } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

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

    // Get the registration document first to verify it exists
    const registrationDoc = await adminDb.collection('rendezvous_registrations').doc(registrationId).get();

    if (!registrationDoc.exists) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    const registrationData = registrationDoc.data();
    const deletedInfo = {
      registrationId,
      invoiceNumber: registrationData?.invoiceNumber || invoiceNumber || 'Unknown',
      company: registrationData?.billingInfo?.company || 'Unknown',
      attendees: registrationData?.attendees?.length || 0
    };

    // Delete the registration document
    await adminDb.collection('rendezvous_registrations').doc(registrationId).delete();
    console.log(`Deleted rendezvous registration: ${registrationId} (${deletedInfo.invoiceNumber})`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted registration ${deletedInfo.invoiceNumber}`,
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
