import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, FieldValue } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NOTIFICATION_RECIPIENT = 'daniel.pitt@fasemga.com';

// Send notification email to admin
async function sendNotificationEmail(submission: {
  organizationName: string;
  contactName: string;
  contactEmail: string;
  entries: Array<{
    lineOfBusiness: string;
    country: string;
    gwp2025: number;
    targetYear1: number;
    targetYear2: number;
    targetYear3: number;
    notes: string;
  }>;
}) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('RESEND_API_KEY not configured - skipping notification email');
    return;
  }

  const entriesHtml = submission.entries.map((entry, i) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${entry.lineOfBusiness}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${entry.country}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">€${entry.gwp2025.toLocaleString()}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">€${entry.targetYear1.toLocaleString()}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">€${entry.targetYear2.toLocaleString()}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">€${entry.targetYear3.toLocaleString()}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${entry.notes || '-'}</td>
    </tr>
  `).join('');

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #2D5574; border-bottom: 2px solid #2D5574; padding-bottom: 10px;">
        New Capacity Matching Submission
      </h1>

      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Company:</strong> ${submission.organizationName}</p>
        <p style="margin: 4px 0;"><strong>Contact:</strong> ${submission.contactName}</p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${submission.contactEmail}</p>
        <p style="margin: 4px 0;"><strong>Entries:</strong> ${submission.entries.length}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
        <thead>
          <tr style="background-color: #2D5574; color: white;">
            <th style="padding: 10px; text-align: left;">Line of Business</th>
            <th style="padding: 10px; text-align: left;">Country</th>
            <th style="padding: 10px; text-align: right;">GWP 2025</th>
            <th style="padding: 10px; text-align: right;">Year 1</th>
            <th style="padding: 10px; text-align: right;">Year 2</th>
            <th style="padding: 10px; text-align: right;">Year 3</th>
            <th style="padding: 10px; text-align: left;">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${entriesHtml}
        </tbody>
      </table>

      <p style="color: #6b7280; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        View all submissions in the <a href="https://fasemga.com/admin-portal" style="color: #2D5574;">Admin Portal</a>.
      </p>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FASE <notifications@fasemga.com>',
        to: NOTIFICATION_RECIPIENT,
        subject: `[Capacity Matching] New submission from ${submission.organizationName}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send notification email:', await response.text());
    }
  } catch (error) {
    console.error('Error sending notification email:', error);
  }
}

// Helper to verify authentication (just checks valid Firebase token)
async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return {
      userId: decodedToken.uid,
      email: decodedToken.email || '',
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { error: 'Invalid token', status: 401 };
  }
}

// GET - Get user's own submissions
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { userId } = authResult;

    // Get submissions for this user
    const submissionsSnapshot = await adminDb
      .collection('capacity-matching')
      .where('memberId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const submissions = submissionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({ success: true, submissions });
  } catch (error: any) {
    console.error('Error fetching capacity matching submissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Submit new capacity matching questionnaire
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { userId, email } = authResult;
    const body = await request.json();
    const { entries, contactName, contactEmail, companyName } = body;

    // Validate entries
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'At least one entry is required' }, { status: 400 });
    }

    // Validate each entry has required fields
    for (const entry of entries) {
      if (!entry.lineOfBusiness || !entry.country) {
        return NextResponse.json({ error: 'Each entry must have a line of business and country' }, { status: 400 });
      }
    }

    const submission = {
      memberId: userId,
      memberEmail: email,
      organizationName: companyName || '',
      contactName: contactName || '',
      contactEmail: contactEmail || email,
      entries: entries.map((entry: any) => ({
        lineOfBusiness: entry.lineOfBusiness,
        country: entry.country,
        gwp2025: Number(entry.gwp2025) || 0,
        targetYear1: Number(entry.targetYear1) || 0,
        targetYear2: Number(entry.targetYear2) || 0,
        targetYear3: Number(entry.targetYear3) || 0,
        notes: entry.notes || '',
      })),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('capacity-matching').add(submission);

    // Send notification email (await to ensure it completes before function terminates)
    await sendNotificationEmail({
      organizationName: submission.organizationName,
      contactName: submission.contactName,
      contactEmail: submission.contactEmail,
      entries: submission.entries,
    });

    return NextResponse.json({
      success: true,
      submissionId: docRef.id,
      message: 'Capacity matching submission saved successfully'
    });
  } catch (error: any) {
    console.error('Error saving capacity matching submission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
