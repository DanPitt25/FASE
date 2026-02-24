import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initAdmin } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

// Helper to verify admin access
async function verifyAdminAccess(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    initAdmin();
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    return { userId: decodedToken.uid };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { error: 'Invalid token', status: 401 };
  }
}

// GET - List all accounts (for search) or pending reviews
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'pending';

    const db = getFirestore();
    const accountsSnapshot = await db.collection('accounts').get();

    if (type === 'all') {
      // Return all accounts for search
      const accounts = accountsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          organizationName: data.organizationName,
          organizationType: data.organizationType,
          logoURL: data.logoURL,
          companySummary: data.companySummary
        };
      });
      accounts.sort((a, b) => (a.organizationName || '').localeCompare(b.organizationName || ''));
      return NextResponse.json({ success: true, accounts });
    }

    // Return pending reviews
    const pendingItems: any[] = [];
    accountsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const hasPendingBio = data.companySummary?.status === 'pending_review';
      const hasPendingLogo = data.logoStatus?.status === 'pending_review';
      const hasUnreviewedLogo = !!(data.logoURL && (!data.logoStatus || !data.logoStatus.status));

      if (hasPendingBio || hasPendingLogo || hasUnreviewedLogo) {
        pendingItems.push({
          id: doc.id,
          organizationName: data.organizationName,
          organizationType: data.organizationType,
          hasPendingBio,
          hasPendingLogo: hasPendingLogo || hasUnreviewedLogo,
          bioStatus: data.companySummary?.status,
          bioText: data.companySummary?.text,
          bioSubmittedAt: data.companySummary?.submittedAt,
          pendingLogoURL: data.logoStatus?.pendingURL || (hasUnreviewedLogo ? data.logoURL : undefined),
          logoSubmittedAt: data.logoStatus?.submittedAt,
          companySummary: data.companySummary,
          logoURL: data.logoURL,
          logoStatus: data.logoStatus
        });
      }
    });

    return NextResponse.json({ success: true, pendingItems });
  } catch (error: any) {
    console.error('Error fetching bio review data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Review bio or logo, or save new bio/logo
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { action, companyId, reviewType } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const db = getFirestore();
    const accountRef = db.collection('accounts').doc(companyId);

    if (action === 'review_bio') {
      const { reviewAction, reason, editedBioText, translations } = body;

      const updateData: Record<string, any> = {
        'companySummary.reviewedAt': FieldValue.serverTimestamp(),
        'companySummary.reviewedBy': authResult.userId,
        updatedAt: FieldValue.serverTimestamp()
      };

      if (reviewAction === 'edit') {
        updateData['companySummary.text'] = editedBioText;
        updateData['companySummary.status'] = 'approved';

        if (translations && Object.keys(translations).length > 0) {
          const bioTranslations: Record<string, string> = {};
          Object.entries(translations).forEach(([lang, text]) => {
            if ((text as string).trim()) {
              bioTranslations[lang] = text as string;
            }
          });
          if (Object.keys(bioTranslations).length > 0) {
            updateData['companySummary.translations'] = bioTranslations;
          }
        }
      } else {
        updateData['companySummary.status'] = reviewAction === 'approve' ? 'approved' : 'rejected';
        if (reviewAction === 'reject' && reason) {
          updateData['companySummary.rejectionReason'] = reason;
        }
      }

      await accountRef.update(updateData);
      return NextResponse.json({ success: true });
    }

    if (action === 'review_logo') {
      const { reviewAction, reason, pendingLogoURL } = body;

      const updateData: Record<string, any> = {
        'logoStatus.reviewedAt': FieldValue.serverTimestamp(),
        'logoStatus.reviewedBy': authResult.userId,
        'logoStatus.status': reviewAction === 'approve' ? 'approved' : 'rejected',
        updatedAt: FieldValue.serverTimestamp()
      };

      if (reviewAction === 'approve' && pendingLogoURL) {
        updateData['logoURL'] = pendingLogoURL;
      }

      if (reviewAction === 'reject' && reason) {
        updateData['logoStatus.rejectionReason'] = reason;
      }

      await accountRef.update(updateData);
      return NextResponse.json({ success: true });
    }

    if (action === 'save_new' || action === 'save_edit') {
      const { bioText, translations, logoURL } = body;

      const updateData: Record<string, any> = {
        updatedAt: FieldValue.serverTimestamp()
      };

      if (bioText?.trim()) {
        const bioTranslations: Record<string, string> = {};
        if (translations) {
          Object.entries(translations).forEach(([lang, text]) => {
            if ((text as string).trim()) {
              bioTranslations[lang] = text as string;
            }
          });
        }

        updateData['companySummary.text'] = bioText.trim();
        updateData['companySummary.status'] = 'approved';
        updateData['companySummary.reviewedAt'] = FieldValue.serverTimestamp();
        updateData['companySummary.reviewedBy'] = authResult.userId;
        updateData['companySummary.submittedAt'] = FieldValue.serverTimestamp();

        if (Object.keys(bioTranslations).length > 0) {
          updateData['companySummary.translations'] = bioTranslations;
        }
      }

      if (logoURL) {
        updateData['logoURL'] = logoURL;
        updateData['logoStatus.status'] = 'approved';
        updateData['logoStatus.pendingURL'] = null;
        updateData['logoStatus.reviewedAt'] = FieldValue.serverTimestamp();
        updateData['logoStatus.reviewedBy'] = authResult.userId;
        updateData['logoStatus.submittedAt'] = FieldValue.serverTimestamp();
      }

      await accountRef.update(updateData);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in bio review action:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
