import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
const initializeAdmin = async () => {
  if (!admin.apps.find(app => app?.name === 'log-error')) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing');
    }
    
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      }, 'log-error');
    } catch (parseError) {
      throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ' + parseError);
    }
  }
  
  const app = admin.apps.find(app => app?.name === 'log-error') || admin.app();
  return {
    db: admin.firestore(app)
  };
};

export async function POST(request: NextRequest) {
  try {
    console.log('Logging registration error...');
    const errorDetails = await request.json();
    console.log('Error details received:', errorDetails);
    
    // Add server-side information
    const enrichedError = {
      ...errorDetails,
      serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      referer: request.headers.get('referer') || 'none',
      origin: request.headers.get('origin') || 'none'
    };
    
    // Store in Firestore for analysis
    const { db } = await initializeAdmin();
    await db.collection('registration_errors').add(enrichedError);
    
    // Also send email notification for immediate attention
    const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .error-box { background-color: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .details { background-color: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; }
        h2 { color: #d00; }
    </style>
</head>
<body>
    <h2>⚠️ Registration Error Alert</h2>
    
    <div class="error-box">
        <h3>Error Details:</h3>
        <p><strong>Message:</strong> ${errorDetails.message || 'Unknown error'}</p>
        <p><strong>Email:</strong> ${errorDetails.email || 'Not provided'}</p>
        <p><strong>Organization:</strong> ${errorDetails.organizationName || 'Not provided'}</p>
        <p><strong>Type:</strong> ${errorDetails.organizationType || 'Not specified'}</p>
        <p><strong>Timestamp:</strong> ${errorDetails.timestamp}</p>
        <p><strong>User Agent:</strong> ${errorDetails.userAgent || 'Unknown'}</p>
    </div>
    
    <h3>Stack Trace:</h3>
    <div class="details">
        <pre>${errorDetails.stack || 'No stack trace available'}</pre>
    </div>
    
    <p><em>This error has been logged to Firestore under the 'registration_errors' collection for further analysis.</em></p>
</body>
</html>`;
    
    try {
      // Send email notification using Firebase Function
      const emailResponse = await fetch(`https://us-central1-fase-site.cloudfunctions.net/sendInvoiceEmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            email: 'tech@fasemga.com', // Send to tech team
            invoiceHTML: emailContent,
            invoiceNumber: `ERROR-${Date.now()}`,
            organizationName: 'Registration Error Alert',
            totalAmount: 0
          }
        }),
      });
      
      if (!emailResponse.ok) {
        console.error('Failed to send error notification email');
      }
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Failed to log registration error:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Failed to log error: ' + error.message },
      { status: 500 }
    );
  }
}