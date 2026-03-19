import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, isAuthError } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * Trigger the Gmail → Tasks import via Apps Script webhook
 *
 * Actions:
 * - status: Check how many unprocessed emails exist
 * - test: Classify first email without creating task
 * - process: Run full import
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { action = 'status', hoursBack = 24 } = body;

    const webhookUrl = process.env.GMAIL_IMPORT_WEBHOOK_URL;
    const webhookSecret = process.env.GMAIL_IMPORT_WEBHOOK_SECRET;

    if (!webhookUrl || !webhookSecret) {
      return NextResponse.json({
        success: false,
        error: 'Email import not configured',
        details: 'GMAIL_IMPORT_WEBHOOK_URL and GMAIL_IMPORT_WEBHOOK_SECRET must be set in environment variables'
      }, { status: 503 });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: webhookSecret,
        action,
        hoursBack: Math.min(Math.max(hoursBack, 1), 168), // Clamp between 1 hour and 1 week
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({
        success: false,
        error: 'Webhook request failed',
        details: text
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error calling email import webhook:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to trigger email import'
    }, { status: 500 });
  }
}
