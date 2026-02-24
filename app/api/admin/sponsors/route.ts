import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, FieldValue } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

// Helper to verify admin access
async function verifyAdminAccess(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return { userId: decodedToken.uid };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { error: 'Invalid token', status: 401 };
  }
}

// GET - List all sponsors
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const db = adminDb;
    const sponsorsSnapshot = await db.collection('sponsors').get();

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

    return NextResponse.json({ success: true, sponsors });
  } catch (error: any) {
    console.error('Error fetching sponsors:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create a new sponsor
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { name, tier, logoUrl, websiteUrl, bio, order, isActive } = body;

    if (!name || !websiteUrl || !logoUrl) {
      return NextResponse.json({ error: 'name, websiteUrl, and logoUrl are required' }, { status: 400 });
    }

    const db = adminDb;

    const sponsorData = {
      name,
      tier: tier || 'silver',
      logoUrl,
      websiteUrl,
      bio: bio || { en: '', fr: '', de: '', es: '', it: '', nl: '' },
      order: order || 1,
      isActive: isActive !== false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('sponsors').add(sponsorData);

    return NextResponse.json({
      success: true,
      sponsor: { id: docRef.id, ...sponsorData }
    });
  } catch (error: any) {
    console.error('Error creating sponsor:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH - Update a sponsor
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { sponsorId, name, tier, logoUrl, websiteUrl, bio, order, isActive } = body;

    if (!sponsorId) {
      return NextResponse.json({ error: 'sponsorId is required' }, { status: 400 });
    }

    const db = adminDb;

    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp()
    };

    if (name !== undefined) updateData.name = name;
    if (tier !== undefined) updateData.tier = tier;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl;
    if (bio !== undefined) updateData.bio = bio;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    await db.collection('sponsors').doc(sponsorId).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating sponsor:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a sponsor
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const sponsorId = searchParams.get('sponsorId');

    if (!sponsorId) {
      return NextResponse.json({ error: 'sponsorId is required' }, { status: 400 });
    }

    const db = adminDb;
    await db.collection('sponsors').doc(sponsorId).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting sponsor:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
