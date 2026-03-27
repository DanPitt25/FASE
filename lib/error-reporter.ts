/**
 * Error Reporting Utility for FASE Main Site
 *
 * Sends error notifications to daniel.pitt@fasemga.com with batching
 * to prevent email flooding during outages.
 */

const ERROR_RECIPIENT = 'daniel.pitt@fasemga.com';
const BATCH_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BATCH_SIZE = 10;

interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent?: string;
  userId?: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  site: 'mga-rendezvous' | 'fase-main';
}

// Client-side batching storage
const pendingErrors: Map<string, { report: ErrorReport; count: number; firstSeen: Date }> = new Map();
let batchTimeout: NodeJS.Timeout | null = null;

/**
 * Generate a key for batching similar errors
 */
function getErrorKey(error: Error, url: string): string {
  return `${error.message}:${url}`;
}

/**
 * Client-side error reporter - batches errors and sends to API
 */
export async function reportError(
  error: Error,
  context?: Record<string, unknown>,
  severity: ErrorReport['severity'] = 'medium'
): Promise<void> {
  const url = typeof window !== 'undefined' ? window.location.href : 'unknown';
  const key = getErrorKey(error, url);

  const report: ErrorReport = {
    message: error.message,
    stack: error.stack,
    url,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    timestamp: new Date(),
    context,
    severity,
    site: 'fase-main',
  };

  // Check if we already have this error pending
  const existing = pendingErrors.get(key);
  if (existing) {
    existing.count++;
    // If we hit max batch size, send immediately
    if (existing.count >= MAX_BATCH_SIZE) {
      await flushErrors();
    }
  } else {
    pendingErrors.set(key, { report, count: 1, firstSeen: new Date() });
  }

  // Set up batch timer if not already running
  if (!batchTimeout) {
    batchTimeout = setTimeout(flushErrors, BATCH_WINDOW_MS);
  }
}

/**
 * Flush all pending errors to the API
 */
async function flushErrors(): Promise<void> {
  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }

  if (pendingErrors.size === 0) return;

  const errorsToSend = Array.from(pendingErrors.entries()).map(([key, { report, count, firstSeen }]) => ({
    ...report,
    count,
    firstSeen,
  }));

  pendingErrors.clear();

  try {
    await fetch('/api/report-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errors: errorsToSend }),
    });
  } catch (e) {
    // Don't throw - error reporting should never break the app
    console.error('Failed to report errors:', e);
  }
}

/**
 * Server-side error reporter - sends email directly via Resend
 */
export async function reportServerError(
  error: Error,
  context?: Record<string, unknown>,
  severity: ErrorReport['severity'] = 'medium'
): Promise<void> {
  const report: ErrorReport = {
    message: error.message,
    stack: error.stack,
    url: context?.route as string || 'server',
    timestamp: new Date(),
    context,
    severity,
    site: 'fase-main',
  };

  const emailHTML = generateErrorEmailHTML(report, 1);
  const subject = `[FASE Error] ${severity.toUpperCase()}: ${truncate(error.message, 50)}`;

  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error('RESEND_API_KEY not configured - cannot send error email');
      return;
    }

    await fetch('https://api.resend.com/emails', {
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
  } catch (e) {
    // Don't throw - error reporting should never break the app
    console.error('Failed to send error email:', e);
  }
}

/**
 * Generate HTML email content for error report
 */
export function generateErrorEmailHTML(report: ErrorReport, count: number = 1): string {
  const contextHTML = report.context
    ? `<h3 style="color: #2D5574; margin-top: 20px;">Context</h3>
       <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${JSON.stringify(report.context, null, 2)}</pre>`
    : '';

  const countHTML = count > 1
    ? `<div style="background: #fef3c7; color: #92400e; padding: 10px 15px; border-radius: 4px; margin-bottom: 20px;">
         <strong>⚠️ This error occurred ${count} times in the last 5 minutes</strong>
       </div>`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background: ${getSeverityColor(report.severity)}; color: white; padding: 15px 20px; border-radius: 4px 4px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">
          ${getSeverityIcon(report.severity)} ${report.severity.toUpperCase()} Error - ${report.site}
        </h2>
      </div>

      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 4px 4px;">
        ${countHTML}

        <h3 style="color: #2D5574; margin-top: 0;">Error Message</h3>
        <p style="background: #fef2f2; color: #991b1b; padding: 15px; border-radius: 4px; font-family: monospace; word-break: break-word;">
          ${escapeHTML(report.message)}
        </p>

        <h3 style="color: #2D5574;">Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; width: 120px;">URL</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; word-break: break-all;">${escapeHTML(report.url)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Timestamp</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${report.timestamp.toISOString()}</td>
          </tr>
          ${report.userAgent ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">User Agent</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">${escapeHTML(report.userAgent)}</td>
          </tr>
          ` : ''}
          ${report.userId ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">User ID</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHTML(report.userId)}</td>
          </tr>
          ` : ''}
        </table>

        ${report.stack ? `
        <h3 style="color: #2D5574; margin-top: 20px;">Stack Trace</h3>
        <pre style="background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 11px; line-height: 1.5;">${escapeHTML(report.stack)}</pre>
        ` : ''}

        ${contextHTML}
      </div>

      <p style="color: #6b7280; font-size: 12px; margin-top: 20px; text-align: center;">
        This is an automated error report from the FASE website.
      </p>
    </div>
  `;
}

function getSeverityColor(severity: ErrorReport['severity']): string {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#ca8a04';
    case 'low': return '#2563eb';
    default: return '#6b7280';
  }
}

function getSeverityIcon(severity: ErrorReport['severity']): string {
  switch (severity) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🔵';
    default: return '⚪';
  }
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}
