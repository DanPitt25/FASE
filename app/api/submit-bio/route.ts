import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '../../../lib/firebase-admin';
import { verifyAuthToken, logSecurityEvent, getClientInfo, AuthError } from '../../../lib/auth-security';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const clientInfo = getClientInfo(request);

  try {
    const authResult = await verifyAuthToken(request);
    const userUid = authResult.uid;

    const body = await request.json();
    const { accountId, bioText, action, website } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Website update action
    if (action === 'update_website') {
      const db = adminDb;

      // Verify user has access to this account
      const accountDoc = await db.collection('accounts').doc(accountId).get();
      if (!accountDoc.exists) {
        return NextResponse.json(
          { error: 'Account not found' },
          { status: 404 }
        );
      }

      // Check if user is a member of this account
      const memberDoc = await db.collection('accounts').doc(accountId).collection('members').doc(userUid).get();
      if (!memberDoc.exists) {
        return NextResponse.json(
          { error: 'Not authorized to update this account' },
          { status: 403 }
        );
      }

      // Auto-prepend https:// if missing
      let url = website?.trim() || '';
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      await db.collection('accounts').doc(accountId).update({
        website: url || null,
        updatedAt: FieldValue.serverTimestamp()
      });

      return NextResponse.json({
        success: true,
        message: 'Website saved successfully',
        website: url || null
      });
    }

    if (!bioText && action !== 'draft') {
      return NextResponse.json(
        { error: 'Bio text is required' },
        { status: 400 }
      );
    }

    if (bioText && bioText.length > 500) {
      return NextResponse.json(
        { error: 'Bio must be 500 characters or less' },
        { status: 400 }
      );
    }

    const db = adminDb;

    // Verify user has access to this account
    const accountDoc = await db.collection('accounts').doc(accountId).get();
    if (!accountDoc.exists) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Check if user is a member of this account
    const memberDoc = await db.collection('accounts').doc(accountId).collection('members').doc(userUid).get();
    if (!memberDoc.exists) {
      await logSecurityEvent({
        type: 'auth_failure',
        userId: userUid,
        details: { error: 'User not authorized for this account', accountId },
        severity: 'high',
        ...clientInfo
      });

      return NextResponse.json(
        { error: 'Not authorized to update this account' },
        { status: 403 }
      );
    }

    // Update based on action
    if (action === 'draft') {
      await db.collection('accounts').doc(accountId).update({
        'companySummary.text': bioText?.trim() || '',
        'companySummary.status': 'draft',
        updatedAt: FieldValue.serverTimestamp()
      });

      await logSecurityEvent({
        type: 'auth_success',
        userId: userUid,
        email: authResult.email,
        details: { action: 'bio_draft_saved', accountId },
        severity: 'low',
        ...clientInfo
      });

      return NextResponse.json({
        success: true,
        message: 'Draft saved successfully',
        status: 'draft'
      });
    } else {
      // Submit for review
      await db.collection('accounts').doc(accountId).update({
        'companySummary.text': bioText.trim(),
        'companySummary.status': 'pending_review',
        'companySummary.submittedAt': FieldValue.serverTimestamp(),
        'companySummary.reviewedAt': null,
        'companySummary.reviewedBy': null,
        'companySummary.rejectionReason': null,
        updatedAt: FieldValue.serverTimestamp()
      });

      await logSecurityEvent({
        type: 'auth_success',
        userId: userUid,
        email: authResult.email,
        details: { action: 'bio_submitted_for_review', accountId },
        severity: 'low',
        ...clientInfo
      });

      return NextResponse.json({
        success: true,
        message: 'Bio submitted for review',
        status: 'pending_review'
      });
    }
  } catch (error: any) {
    console.error('Bio submission error:', error);

    if (error instanceof AuthError) {
      await logSecurityEvent({
        type: 'auth_failure',
        details: { error: error.message, action: 'bio_submission' },
        severity: 'medium',
        ...clientInfo
      });

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to submit bio' },
      { status: 500 }
    );
  }
}
