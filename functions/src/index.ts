import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { getEmailTemplate, detectUserLanguage } from "./email-templates";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Initialize Firebase Admin with default credentials
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
    const { email, code, locale } = request.data;
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

    // Store verification code in Firestore using admin SDK (bypasses security rules)
    const db = admin.firestore();
    await db.collection('verification_codes').doc(email).set({
      code: code,
      email: email,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      used: false
    });

    // Check for Resend API key using environment variables
    const resendApiKey = process.env.RESEND_API_KEY;
    logger.info('Resend API key configured:', !!resendApiKey);

    if (resendApiKey) {
      try {
        // Use provided locale or default to English
        const userLanguage = (locale === 'fr' ? 'fr' : 'en') as 'en' | 'fr';
        logger.info(`Language for ${email}: ${userLanguage} (from locale: ${locale})`);
        
        // Get localized email template
        const template = getEmailTemplate('verificationCode', userLanguage) as { subject: string; html: (code: string) => string };
        const emailHtml = template.html(code);

        logger.info('Sending email via Resend...');
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'FASE <admin@fasemga.com>',
            to: email,
            subject: template.subject,
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

    if (!email || !invoiceNumber) {
      throw new functions.https.HttpsError('invalid-argument', 'Email and invoice number are required');
    }

    // Check for Resend API key using environment variables
    const resendApiKey = process.env.RESEND_API_KEY;
    logger.info('Resend API key configured:', !!resendApiKey);

    if (resendApiKey) {
      try {
        logger.info('Sending invoice email via Resend...');
        
        // Detect user's preferred language
        const userLanguage = detectUserLanguage(email, undefined, request.rawRequest?.headers?.['accept-language']);
        logger.info(`Detected language for invoice ${email}: ${userLanguage}`);
        
        // Get localized email template
        const template = getEmailTemplate('invoice', userLanguage) as { subject: (invoiceNumber: string, totalAmount: string) => string; html: (invoiceNumber: string, organizationName: string, totalAmount: string) => string };
        
        // Use custom HTML if provided, otherwise use localized template
        const emailHtml = invoiceHTML || template.html(invoiceNumber, organizationName || 'Organization', totalAmount || '0');
        
        const emailPayload: any = {
          from: 'FASE <admin@fasemga.com>',
          to: email,
          subject: template.subject(invoiceNumber, totalAmount || '0'),
          html: emailHtml,
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

export const sendJoinRequestNotification = functions.https.onCall({
  enforceAppCheck: false,
}, async (request) => {
  try {
    const { email, fullName, companyName, status, adminNotes } = request.data;
    logger.info('sendJoinRequestNotification called for:', email);

    if (!email || !fullName || !companyName || !status) {
      throw new functions.https.HttpsError('invalid-argument', 'Email, full name, company name, and status are required');
    }

    // Check for Resend API key using environment variables
    const resendApiKey = process.env.RESEND_API_KEY;
    logger.info('Resend API key configured:', !!resendApiKey);

    // Detect user's preferred language
    const userLanguage = detectUserLanguage(email, undefined, request.rawRequest?.headers?.['accept-language']);
    logger.info(`Detected language for join request ${email}: ${userLanguage}`);

    const isApproved = status === 'approved';
    
    // Get localized email template
    let emailHtml;
    let subject;
    
    if (isApproved) {
      const approvedTemplate = getEmailTemplate('joinRequestApproved', userLanguage) as { subject: (companyName: string) => string; html: (fullName: string, email: string, companyName: string, adminNotes?: string) => string };
      subject = approvedTemplate.subject(companyName);
      emailHtml = approvedTemplate.html(fullName, email, companyName, adminNotes);
    } else {
      const updateTemplate = getEmailTemplate('joinRequestUpdate', userLanguage) as { subject: (companyName: string) => string; html: (fullName: string, companyName: string, status: string, adminNotes?: string) => string };
      subject = updateTemplate.subject(companyName);
      emailHtml = updateTemplate.html(fullName, companyName, status, adminNotes);
    }

    if (resendApiKey) {
      try {
        logger.info('Sending join request notification via Resend...');
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'FASE <admin@fasemga.com>',
            to: email,
            subject: subject,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          throw new Error(`Resend API error: ${response.status}`);
        }

        logger.info(`Join request notification sent to ${email} via Resend`);
        return { success: true };
      } catch (emailError) {
        logger.error('Resend join request notification error:', emailError);
      }
    }

    // Fallback: Log to console for development
    logger.info(`Join request notification for ${email}:`);
    logger.info(`Subject: ${subject}`);
    logger.info(`Status: ${status}`);

    return { success: true };
  } catch (error) {
    logger.error('Error sending join request notification:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send join request notification');
  }
});

export const sendPasswordReset = functions.https.onCall({
  enforceAppCheck: false, // Allow unauthenticated calls
}, async (request) => {
  try {
    const { email } = request.data;
    logger.info('sendPasswordReset called with email:', email);

    if (!email) {
      throw new functions.https.HttpsError('invalid-argument', 'Email is required');
    }

    // Validate email format
    if (!isValidEmail(email)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
    }

    // Check rate limit
    if (!checkRateLimit(email)) {
      logger.warn(`Rate limit exceeded for email: ${email}`);
      throw new functions.https.HttpsError('resource-exhausted', 'Too many password reset attempts. Please wait before trying again.');
    }

    // First check if user exists in Firebase Auth
    try {
      await admin.auth().getUserByEmail(email);
    } catch (userError: any) {
      if (userError.code === 'auth/user-not-found') {
        // Don't reveal that user doesn't exist - return success anyway for security
        logger.info(`Password reset attempted for non-existent user: ${email}`);
        return { success: true };
      }
      throw userError;
    }

    // Generate secure reset token (32 characters)
    const resetToken = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    
    // Generate random document ID to prevent enumeration
    const resetDocId = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');

    // Store reset token in Firestore using admin SDK (bypasses security rules)
    const db = admin.firestore();
    await db.collection('password_resets').doc(resetDocId).set({
      token: resetToken,
      email: email,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      used: false
    });

    // Check for Resend API key using environment variables
    const resendApiKey = process.env.RESEND_API_KEY;
    logger.info('Resend API key configured:', !!resendApiKey);

    if (resendApiKey) {
      try {
        // Detect user's preferred language
        const userLanguage = detectUserLanguage(email, undefined, request.rawRequest?.headers?.['accept-language']);
        logger.info(`Detected language for password reset ${email}: ${userLanguage}`);
        
        // Get localized email template
        const template = getEmailTemplate('passwordReset', userLanguage) as { subject: string; html: (resetUrl: string) => string };
        const resetUrl = `https://fasemga.com/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
        const emailHtml = template.html(resetUrl);

        logger.info('Sending password reset email via Resend...');
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'FASE <admin@fasemga.com>',
            to: email,
            subject: template.subject,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          throw new Error(`Resend API error: ${response.status}`);
        }

        logger.info(`Password reset email sent to ${email} via Resend`);
        return { success: true };
      } catch (emailError) {
        logger.error('Resend password reset email error:', emailError);
        logger.error('API Key available:', !!resendApiKey);
        logger.error('API Key length:', resendApiKey?.length);
      }
    }

    // Fallback: Log to console for development/testing
    logger.info(`Password reset for ${email}: ${resetToken}`);
    logger.info(`
    ===========================================
    PASSWORD RESET EMAIL (DEVELOPMENT MODE)
    ===========================================
    To: ${email}
    Subject: Reset your FASE password
    
    Reset Token: ${resetToken}
    Reset URL: https://fasemga.com/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}
    
    This token will expire in 1 hour.
    ===========================================
    `);

    return { success: true };
  } catch (error) {
    logger.error('Error sending password reset:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send password reset email');
  }
});

export const validatePasswordResetToken = functions.https.onCall({
  enforceAppCheck: false, // Allow unauthenticated calls
}, async (request) => {
  try {
    const { email, token } = request.data;
    logger.info('validatePasswordResetToken called for email:', email);

    if (!email || !token) {
      throw new functions.https.HttpsError('invalid-argument', 'Email and token are required');
    }

    // Validate email format
    if (!isValidEmail(email)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
    }

    const db = admin.firestore();
    
    // Query for the reset token (can't use email as doc ID anymore)
    const querySnapshot = await db.collection('password_resets')
      .where('email', '==', email)
      .where('token', '==', token)
      .where('used', '==', false)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      throw new functions.https.HttpsError('not-found', 'Invalid or expired reset token');
    }

    const resetDoc = querySnapshot.docs[0];
    const resetData = resetDoc.data();

    // Check if token is expired
    if (new Date() > resetData.expiresAt.toDate()) {
      // Clean up expired token
      await resetDoc.ref.delete();
      throw new functions.https.HttpsError('deadline-exceeded', 'Reset token has expired');
    }

    // Mark token as used
    await resetDoc.ref.update({ used: true });

    logger.info(`Password reset token validated for: ${email}`);
    return { success: true, email: email };
  } catch (error) {
    logger.error('Error validating password reset token:', error);
    throw new functions.https.HttpsError('internal', 'Failed to validate reset token');
  }
});

export const resetPasswordWithToken = functions.https.onCall({
  enforceAppCheck: false, // Allow unauthenticated calls
}, async (request) => {
  try {
    const { email, token, newPassword } = request.data;
    logger.info('resetPasswordWithToken called for email:', email);

    if (!email || !token || !newPassword) {
      throw new functions.https.HttpsError('invalid-argument', 'Email, token, and new password are required');
    }

    // Validate email format
    if (!isValidEmail(email)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
    }

    // Validate password strength
    if (newPassword.length < 6) {
      throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters long');
    }

    const db = admin.firestore();
    
    // Query for the reset token and validate it
    const querySnapshot = await db.collection('password_resets')
      .where('email', '==', email)
      .where('token', '==', token)
      .where('used', '==', false)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      throw new functions.https.HttpsError('not-found', 'Invalid or expired reset token');
    }

    const resetDoc = querySnapshot.docs[0];
    const resetData = resetDoc.data();

    // Check if token is expired
    if (new Date() > resetData.expiresAt.toDate()) {
      // Clean up expired token
      await resetDoc.ref.delete();
      throw new functions.https.HttpsError('deadline-exceeded', 'Reset token has expired');
    }

    // Get the user and update their password
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, {
      password: newPassword
    });

    // Mark token as used and delete it
    await resetDoc.ref.delete();

    logger.info(`Password successfully reset for: ${email}`);
    return { success: true };
  } catch (error) {
    logger.error('Error resetting password:', error);
    throw new functions.https.HttpsError('internal', 'Failed to reset password');
  }
});

export const sendMembershipAcceptanceEmail = functions.https.onCall({
  enforceAppCheck: false,
}, async (request) => {
  try {
    const { 
      email, 
      fullName, 
      organizationName, 
      totalAmount,
      userId 
    } = request.data;
    
    logger.info('sendMembershipAcceptanceEmail called for:', email);

    if (!email || !fullName || !organizationName || !totalAmount || !userId) {
      throw new functions.https.HttpsError('invalid-argument', 'Email, full name, organization name, total amount, and user ID are required');
    }

    // Validate email format
    if (!isValidEmail(email)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
    }

    // Use provided total amount directly

    // Generate PayPal subscription link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://fasemga.com';
    const paypalLink = `${baseUrl}/register?step=payment&method=paypal&userId=${userId}`;
    
    // Generate invoice number for the PDF attachment
    const invoiceNumber = String(10000 + Math.floor(Math.random() * 90000));

    // Detect user's preferred language
    const userLanguage = detectUserLanguage(email, undefined, request.rawRequest?.headers?.['accept-language']);
    logger.info(`Detected language for membership acceptance ${email}: ${userLanguage}`);

    // Get localized email template
    const template = getEmailTemplate('membershipAcceptance', userLanguage) as { 
      subject: (organizationName: string) => string; 
      html: (fullName: string, organizationName: string, paypalUrl: string, invoiceUrl: string, totalAmount: string) => string 
    };

    const subject = template.subject(organizationName);
    // For now, use simple invoice text link - we'll attach the actual PDF below
    const invoiceText = userLanguage === 'fr' ? 'Facture PDF jointe' : 'PDF Invoice attached';
    const emailHtml = template.html(fullName, organizationName, paypalLink, invoiceText, totalAmount.toString());

    // Generate PDF invoice attachment
    let pdfAttachment: string | null = null;
    let pdfFilename: string | null = null;
    
    try {
      logger.info('Generating PDF invoice...');
      
      // Create a simple PDF invoice
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const { width, height } = page.getSize();
      
      // Embed fonts
      const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // FASE Brand Colors
      const faseNavy = rgb(0.176, 0.333, 0.455);      // #2D5574
      const faseBlack = rgb(0.137, 0.122, 0.125);     // #231F20
      
      // Layout
      const margins = { left: 50, right: 50, top: 100, bottom: 80 };
      let currentY = height - margins.top;
      
      // Header
      page.drawText('FEDERATION OF EUROPEAN MGAs', {
        x: margins.left,
        y: currentY,
        size: 20,
        font: boldFont,
        color: faseNavy,
      });
      
      currentY -= 30;
      page.drawText('Membership Acceptance Invoice', {
        x: margins.left,
        y: currentY,
        size: 16,
        font: boldFont,
        color: faseNavy,
      });
      
      currentY -= 50;
      
      // Invoice details
      const currentDate = new Date().toLocaleDateString('en-GB');
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
      
      page.drawText(`Invoice Number: ${invoiceNumber}`, {
        x: margins.left,
        y: currentY,
        size: 12,
        font: bodyFont,
        color: faseBlack,
      });
      
      page.drawText(`Date: ${currentDate}`, {
        x: width - margins.right - 120,
        y: currentY,
        size: 12,
        font: bodyFont,
        color: faseBlack,
      });
      
      currentY -= 20;
      page.drawText(`Due Date: ${dueDate}`, {
        x: width - margins.right - 120,
        y: currentY,
        size: 12,
        font: bodyFont,
        color: faseBlack,
      });
      
      currentY -= 40;
      
      // Bill to section
      page.drawText('Bill To:', {
        x: margins.left,
        y: currentY,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });
      
      currentY -= 20;
      page.drawText(organizationName, {
        x: margins.left,
        y: currentY,
        size: 12,
        font: boldFont,
        color: faseBlack,
      });
      
      currentY -= 18;
      page.drawText(fullName, {
        x: margins.left,
        y: currentY,
        size: 11,
        font: bodyFont,
        color: faseBlack,
      });
      
      currentY -= 60;
      
      // Invoice item
      page.drawText('Description: FASE Annual Membership', {
        x: margins.left,
        y: currentY,
        size: 12,
        font: bodyFont,
        color: faseBlack,
      });
      
      page.drawText(`Amount: €${totalAmount}`, {
        x: width - margins.right - 100,
        y: currentY,
        size: 12,
        font: boldFont,
        color: faseBlack,
      });
      
      currentY -= 60;
      
      // Payment instructions
      page.drawText('Payment Instructions:', {
        x: margins.left,
        y: currentY,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });
      
      currentY -= 20;
      const paymentLines = [
        'Bank: Citibank, N.A.',
        'Account: Lexicon Associates, LLC (125582998)',
        'ABA: 221172610 | SWIFT: CITIUS33',
        `Reference: ${invoiceNumber}`
      ];
      
      paymentLines.forEach((line) => {
        page.drawText(line, {
          x: margins.left,
          y: currentY,
          size: 10,
          font: bodyFont,
          color: faseBlack,
        });
        currentY -= 16;
      });
      
      // Generate PDF buffer
      const pdfBytes = await pdfDoc.save();
      pdfAttachment = Buffer.from(pdfBytes).toString('base64');
      pdfFilename = `FASE-Invoice-${invoiceNumber}.pdf`;
      
      logger.info('PDF invoice generated successfully');
      
    } catch (pdfError) {
      logger.error('Failed to generate PDF invoice:', pdfError);
      // Continue without PDF - email will still be sent
    }

    // Check for Resend API key
    const resendApiKey = process.env.RESEND_API_KEY;
    logger.info('Resend API key configured:', !!resendApiKey);

    if (resendApiKey) {
      try {
        logger.info('Sending membership acceptance email via Resend...');
        
        const emailPayload: any = {
          from: 'FASE <admin@fasemga.com>',
          to: email,
          subject: subject,
          html: emailHtml,
        };
        
        // Add PDF attachment if generated successfully
        if (pdfAttachment && pdfFilename) {
          emailPayload.attachments = [{
            filename: pdfFilename,
            content: pdfAttachment,
            type: 'application/pdf',
            disposition: 'attachment'
          }];
          logger.info('PDF attachment added to email');
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

        const result = await response.json();
        logger.info(`Membership acceptance email sent to ${email} via Resend:`, result.id);
        
        return { success: true, emailId: result.id };
      } catch (emailError) {
        logger.error('Resend membership acceptance email error:', emailError);
        throw new functions.https.HttpsError('internal', 'Failed to send membership acceptance email');
      }
    }

    // Fallback: Log to console for development
    logger.info(`Membership acceptance email for ${email}:`);
    logger.info(`Subject: ${subject}`);
    logger.info(`Organization: ${organizationName}`);
    logger.info(`Total Amount: €${totalAmount}`);
    logger.info(`PayPal Link: ${paypalLink}`);
    logger.info(`Invoice Number: ${invoiceNumber}`);

    return { success: true };
  } catch (error) {
    logger.error('Error sending membership acceptance email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send membership acceptance email');
  }
});