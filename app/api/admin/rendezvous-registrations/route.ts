import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Fetch all rendezvous registrations
    const registrationsSnapshot = await adminDb
      .collection('rendezvous-registrations')
      .orderBy('createdAt', 'desc')
      .get();

    const registrations = registrationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
    }));

    return NextResponse.json({
      success: true,
      registrations
    });
  } catch (error: any) {
    console.error('Error fetching rendezvous registrations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const {
      billingInfo,
      attendees,
      additionalInfo,
      totalPrice,
      subtotal,
      numberOfAttendees,
      companyIsFaseMember,
      isAsaseMember,
      membershipType,
      discount,
      paymentMethod,
      paymentStatus,
    } = data;

    // Validate required fields
    if (!billingInfo?.company || !billingInfo?.billingEmail || !billingInfo?.country) {
      return NextResponse.json(
        { error: 'Missing required billing information' },
        { status: 400 }
      );
    }

    if (!attendees || attendees.length === 0) {
      return NextResponse.json(
        { error: 'At least one attendee is required' },
        { status: 400 }
      );
    }

    const registrationId = `mga_admin_${Date.now()}`;

    // Build registration document
    const registration = {
      registrationId,
      billingInfo: {
        company: billingInfo.company,
        billingEmail: billingInfo.billingEmail,
        country: billingInfo.country,
        address: billingInfo.address || '',
        organizationType: billingInfo.organizationType || 'mga',
      },
      attendees: attendees.map((a: any, index: number) => ({
        id: `attendee_${index + 1}`,
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        jobTitle: a.jobTitle,
      })),
      additionalInfo: {
        specialRequests: additionalInfo?.specialRequests || '',
      },
      totalPrice: totalPrice || 0,
      subtotal: subtotal || totalPrice || 0,
      vatAmount: 0,
      vatRate: 0,
      currency: 'EUR',
      numberOfAttendees: numberOfAttendees || attendees.length,
      companyIsFaseMember: companyIsFaseMember || false,
      isAsaseMember: isAsaseMember || false,
      membershipType: membershipType || 'none',
      discount: discount || 0,
      paymentMethod: paymentMethod || 'admin_manual',
      paymentStatus: paymentStatus || 'confirmed',
      status: 'confirmed',
      source: 'admin-portal',
      createdAt: FieldValue.serverTimestamp(),
    };

    // Save to Firestore
    await adminDb.collection('rendezvous-registrations').doc(registrationId).set(registration);

    console.log(`✅ Admin created registration: ${registrationId}`);

    return NextResponse.json({
      success: true,
      registrationId,
      registration: {
        ...registration,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error creating registration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create registration' },
      { status: 500 }
    );
  }
}
