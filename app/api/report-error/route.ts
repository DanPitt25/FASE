import { NextRequest, NextResponse } from 'next/server';
import { generateErrorEmailHTML } from '../../../lib/error-reporter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ERROR_RECIPIENT = 'daniel.pitt@fasemga.com';

// Rate limiting: track requests per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per minute per IP

interface BatchedError {
  message: string;
  stack?: string;
  url: string;
  userAgent?: string;
  userId?: string;
  timestamp: string;
  context?: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  site: string;
  count: number;
  firstSeen: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();

    const rateLimit = rateLimitMap.get(ip);
    if (rateLimit) {
      if (now < rateLimit.resetTime) {
        if (rateLimit.count >= RATE_LIMIT_MAX) {
          return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429 }
          );
        }
        rateLimit.count++;
      } else {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      }
    } else {
      rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    }

    // Parse request
    const { errors } = await request.json() as { errors: BatchedError[] };

    if (!errors || !Array.isArray(errors) || errors.length === 0) {
      return NextResponse.json(
        { error: 'No errors provided' },
        { status: 400 }
      );
    }

    // Generate combined email for all batched errors
    let emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2D5574; border-bottom: 2px solid #2D5574; padding-bottom: 10px;">
          Error Report - FASE
        </h1>
        <p style="color: #6b7280;">
          ${errors.length} error${errors.length > 1 ? 's' : ''} reported at ${new Date().toISOString()}
        </p>
    `;

    // Determine highest severity for subject line
    const severityOrder = ['critical', 'high', 'medium', 'low'];
    let highestSeverity = 'low';
    for (const err of errors) {
      if (severityOrder.indexOf(err.severity) < severityOrder.indexOf(highestSeverity)) {
        highestSeverity = err.severity;
      }
    }

    // Add each error to the email
    for (const err of errors) {
      const report = {
        message: err.message,
        stack: err.stack,
        url: err.url,
        userAgent: err.userAgent,
        userId: err.userId,
        timestamp: new Date(err.timestamp),
        context: err.context,
        severity: err.severity,
        site: err.site as 'mga-rendezvous' | 'fase-main',
      };

      emailHTML += `
        <div style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          ${generateErrorEmailHTML(report, err.count)}
        </div>
      `;
    }

    emailHTML += `
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          This is an automated error report from the FASE website.
        </p>
      </div>
    `;

    // Send email via Resend
    const subject = `[FASE Error] ${highestSeverity.toUpperCase()}: ${errors.length} error${errors.length > 1 ? 's' : ''} reported`;

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FASE Errors <errors@fasemga.com>',
        to: ERROR_RECIPIENT,
        subject,
        html: emailHTML,
      }),
    });

    if (!emailResponse.ok) {
      console.error('Failed to send error email:', await emailResponse.text());
      return NextResponse.json(
        { error: 'Failed to send error report' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, errorsReported: errors.length });
  } catch (error: any) {
    console.error('Error in report-error endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 500 }
    );
  }
}
