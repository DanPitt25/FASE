import { NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

const COLLECTION_NAME = 'mga-rendezvous-sponsors';

// CORS headers for cross-origin requests from MGA Rendezvous site
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET - List active MGA Rendezvous sponsors (public, no auth required)
export async function GET() {
  try {
    const db = adminDb;
    const sponsorsSnapshot = await db.collection(COLLECTION_NAME)
      .where('isActive', '==', true)
      .get();

    const sponsors = sponsorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort by tier priority and order
    const tierOrder: Record<string, number> = { platinum: 1, gold: 2, silver: 3 };
    sponsors.sort((a: any, b: any) => {
      const tierDiff = (tierOrder[a.tier] || 4) - (tierOrder[b.tier] || 4);
      if (tierDiff !== 0) return tierDiff;
      return (a.order || 0) - (b.order || 0);
    });

    return NextResponse.json({ success: true, sponsors }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error fetching MGA Rendezvous sponsors:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}
