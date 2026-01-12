import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Fetch all rendezvous registrations
    const registrationsSnapshot = await db
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
