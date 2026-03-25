import { NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

const COLLECTION_NAME = 'mga-rendezvous-sponsors';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://mgarendezvous.com',
  'https://www.mgarendezvous.com',
  'http://localhost:3000',
  'http://localhost:3001',
];

// CORS headers for cross-origin requests from MGA Rendezvous site
const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
};

// Handle CORS preflight
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');
  return NextResponse.json({}, { headers: getCorsHeaders(origin) });
}

// GET - List active MGA Rendezvous sponsors (public, no auth required)
export async function GET(request: Request) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

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
