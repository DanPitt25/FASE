import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const limit = rateLimitStore.get(key);
  
  if (!limit || now > limit.resetTime) {
    // Reset or create new limit
    rateLimitStore.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }
  
  if (limit.count >= 3) { // Max 3 codes per minute per email
    return false;
  }
  
  limit.count++;
  return true;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const sendVerificationCode = functions.https.onCall({
  enforceAppCheck: false, // Allow unauthenticated calls
}, async (request) => {
  try {
    const { email, code } = request.data;
    logger.info('sendVerificationCode called with email:', email);

    if (!email || !code) {
      throw new functions.https.HttpsError('invalid-argument', 'Email and code are required');
    }

    // Validate email format
    if (!isValidEmail(email)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
    }

    // Check rate limit
    if (!checkRateLimit(email)) {
      logger.warn(`Rate limit exceeded for email: ${email}`);
      throw new functions.https.HttpsError('resource-exhausted', 'Too many verification attempts. Please wait before trying again.');
    }

    // Check for Resend API key using environment variables
    const resendApiKey = process.env.RESEND_API_KEY;
    logger.info('Resend API key configured:', !!resendApiKey);

    if (resendApiKey) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e3a8a;">Verify your FASE account</h2>
            <p>Your verification code is:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e3a8a;">${code}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code will expire in 20 minutes.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `;

        logger.info('Sending email via Resend...');
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'FASE <noreply@fasemga.com>',
            to: email,
            subject: 'Verify your FASE account',
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          throw new Error(`Resend API error: ${response.status}`);
        }

        logger.info(`Verification email sent to ${email} via Resend`);
        return { success: true };
      } catch (emailError) {
        logger.error('Resend email error:', emailError);
        logger.error('API Key available:', !!resendApiKey);
        logger.error('API Key length:', resendApiKey?.length);
      }
    }

    // Fallback: Log to console for development/testing
    logger.info(`Verification code for ${email}: ${code}`);
    logger.info(`
    ===========================================
    VERIFICATION EMAIL (DEVELOPMENT MODE)
    ===========================================
    To: ${email}
    Subject: Verify your FASE account
    
    Your verification code is: ${code}
    
    This code will expire in 20 minutes.
    ===========================================
    `);

    return { success: true };
  } catch (error) {
    logger.error('Error sending verification code:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send verification code');
  }
});

export const setAdminClaim = functions.https.onCall({
  enforceAppCheck: false,
}, async (request) => {
  try {
    const { targetUserId } = request.data;
    
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check if the caller is already an admin (either through claims or database)
    const callerUid = request.auth.uid;
    let isCallerAdmin = false;

    // First check custom claims
    if (request.auth.token.admin === true) {
      isCallerAdmin = true;
    } else {
      // Fallback: check database (this is safe because we're checking the caller's own document)
      const db = admin.firestore();
      const callerDoc = await db.collection('accounts').doc(callerUid).get();
      if (callerDoc.exists && callerDoc.data()?.status === 'admin') {
        isCallerAdmin = true;
        // Set the claim for the caller too while we're at it
        await admin.auth().setCustomUserClaims(callerUid, { admin: true });
        logger.info(`Set admin claim for caller: ${callerUid}`);
      }
    }

    if (!isCallerAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can set admin claims');
    }

    // Set admin claim for target user
    await admin.auth().setCustomUserClaims(targetUserId, { admin: true });
    logger.info(`Admin claim set for user: ${targetUserId} by admin: ${callerUid}`);

    return { success: true, message: `Admin claim set for user ${targetUserId}` };
  } catch (error) {
    logger.error('Error setting admin claim:', error);
    throw new functions.https.HttpsError('internal', 'Failed to set admin claim');
  }
});

export const removeAdminClaim = functions.https.onCall({
  enforceAppCheck: false,
}, async (request) => {
  try {
    const { targetUserId } = request.data;
    
    if (!request.auth || !request.auth.token.admin) {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can remove admin claims');
    }

    await admin.auth().setCustomUserClaims(targetUserId, { admin: false });
    logger.info(`Admin claim removed for user: ${targetUserId}`);

    return { success: true, message: `Admin claim removed for user ${targetUserId}` };
  } catch (error) {
    logger.error('Error removing admin claim:', error);
    throw new functions.https.HttpsError('internal', 'Failed to remove admin claim');
  }
});

export const sendInvoiceEmail = functions.https.onCall({
  enforceAppCheck: false,
}, async (request) => {
  try {
    const { email, invoiceHTML, invoiceNumber, organizationName, totalAmount, pdfAttachment, pdfFilename } = request.data;
    logger.info('sendInvoiceEmail called for:', email);

    if (!email || !invoiceHTML || !invoiceNumber) {
      throw new functions.https.HttpsError('invalid-argument', 'Email, invoice HTML, and invoice number are required');
    }

    // Check for Resend API key - use Firebase Functions config
    const resendApiKey = functions.config().resend?.api_key || process.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        logger.info('Sending invoice email via Resend...');
        
        const emailPayload: any = {
          from: 'FASE <invoices@fasemga.com>',
          to: email,
          subject: `FASE Membership Invoice ${invoiceNumber} - €${totalAmount}`,
          html: invoiceHTML,
        };
        
        // Add PDF attachment if provided
        if (pdfAttachment && pdfFilename) {
          emailPayload.attachments = [{
            filename: pdfFilename,
            content: pdfAttachment,
            type: 'application/pdf',
            disposition: 'attachment'
          }];
        }
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload),
        });

        if (!response.ok) {
          throw new Error(`Resend API error: ${response.status}`);
        }

        logger.info(`Invoice email sent to ${email} via Resend`);
        return { success: true };
      } catch (emailError) {
        logger.error('Resend invoice email error:', emailError);
      }
    }

    // Fallback: Log to console for development
    logger.info(`Invoice email for ${email}:`);
    logger.info(`Subject: FASE Membership Invoice ${invoiceNumber} - €${totalAmount}`);
    logger.info(`Organization: ${organizationName}`);

    return { success: true };
  } catch (error) {
    logger.error('Error sending invoice email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send invoice email');
  }
});