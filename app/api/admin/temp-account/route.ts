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

// POST - Create a temporary account
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { organizationName, personalName, organizationType, carrierType, country, website } = body;

    if (!organizationName || !organizationType || !country) {
      return NextResponse.json({
        error: 'organizationName, organizationType, and country are required'
      }, { status: 400 });
    }

    if (organizationType === 'carrier' && !carrierType) {
      return NextResponse.json({
        error: 'carrierType is required for carrier organizations'
      }, { status: 400 });
    }

    const db = adminDb;

    // Generate a unique ID for the temporary account
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const tempAccountData: Record<string, any> = {
      id: tempId,
      organizationName,
      personalName: personalName || organizationName,
      organizationType,
      status: 'approved', // Make visible in directory
      registeredAddress: {
        country
      },
      isTemporaryAccount: true,
      tempAccountNote: 'Temporary directory entry - not a full member account',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    if (website) {
      tempAccountData.website = website;
    }

    if (organizationType === 'carrier' && carrierType) {
      tempAccountData.carrierInfo = {
        organizationType: carrierType
      };
    }

    await db.collection('accounts').doc(tempId).set(tempAccountData);

    return NextResponse.json({
      success: true,
      accountId: tempId
    });
  } catch (error: any) {
    console.error('Error creating temporary account:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
