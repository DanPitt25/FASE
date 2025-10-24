import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import puppeteer from 'puppeteer';

// Initialize Firebase Admin
const initializeAdmin = async () => {
  if (admin.apps.length === 0) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error('Firebase credentials not configured');
    }

    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    admin.initializeApp({
      credential: serviceAccount 
        ? admin.credential.cert(serviceAccount)
        : admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
  
  return {
    auth: admin.auth(),
    db: admin.firestore()
  };
};

// Calculate membership fee (same logic as frontend)
const calculateMembershipFee = (membershipData: any): number => {
  if (membershipData.membershipType === 'individual') {
    return 500;
  } else if (membershipData.organizationType === 'MGA' && membershipData.grossWrittenPremiums) {
    switch (membershipData.grossWrittenPremiums) {
      case '<10m': return 900;
      case '10-20m': return 1500;
      case '20-50m': return 2000;
      case '50-100m': return 2800;
      case '100-500m': return 4200;
      case '500m+': return 6400;
      default: return 900;
    }
  } else {
    return 900; // Default corporate rate
  }
};

const getDiscountedFee = (membershipData: any): number => {
  const baseFee = calculateMembershipFee(membershipData);
  if (membershipData.membershipType === 'corporate' && membershipData.hasOtherAssociations) {
    return Math.round(baseFee * 0.8); // 20% discount
  }
  return baseFee;
};

// Generate invoice HTML template
const generateInvoiceHTML = (membershipData: any, invoiceNumber: string, totalAmount: number) => {
  const currentDate = new Date().toLocaleDateString('en-GB');
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'); // 30 days from now

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #1e3a8a; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; color: #1e3a8a; margin-bottom: 10px; }
        .tagline { color: #6b7280; font-size: 14px; }
        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .invoice-details { text-align: right; }
        .client-details { }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .items-table th { background-color: #f9fafb; font-weight: bold; }
        .total-row { font-weight: bold; background-color: #f9fafb; }
        .payment-info { background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-top: 40px; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">FEDERATION OF EUROPEAN MGAS</div>
        <div class="tagline">Professional Association for Managing General Agents</div>
    </div>

    <div class="invoice-info">
        <div class="client-details">
            <h3>Bill To:</h3>
            <strong>${membershipData.organizationName}</strong><br>
            ${membershipData.primaryContact.name}<br>
            ${membershipData.registeredAddress.line1}<br>
            ${membershipData.registeredAddress.line2 ? membershipData.registeredAddress.line2 + '<br>' : ''}
            ${membershipData.registeredAddress.city}, ${membershipData.registeredAddress.state} ${membershipData.registeredAddress.postalCode}<br>
            ${membershipData.registeredAddress.country}<br><br>
            Email: ${membershipData.primaryContact.email}<br>
            Phone: ${membershipData.primaryContact.phone}
        </div>
        
        <div class="invoice-details">
            <h3>Invoice Details:</h3>
            <strong>Invoice #: ${invoiceNumber}</strong><br>
            Date: ${currentDate}<br>
            Due Date: ${dueDate}<br>
            Terms: Net 30
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    FASE ${membershipData.membershipType === 'individual' ? 'Individual' : membershipData.organizationType + ' Corporate'} Membership - Annual
                    ${membershipData.organizationType === 'MGA' && membershipData.grossWrittenPremiums ? '<br><small>Premium Bracket: ' + membershipData.grossWrittenPremiums + '</small>' : ''}
                    ${membershipData.hasOtherAssociations ? '<br><small>20% European MGA Association Member Discount Applied</small>' : ''}
                </td>
                <td>1</td>
                <td>€${totalAmount}</td>
                <td>€${totalAmount}</td>
            </tr>
            <tr class="total-row">
                <td colspan="3"><strong>Total Amount Due</strong></td>
                <td><strong>€${totalAmount}</strong></td>
            </tr>
        </tbody>
    </table>

    <div class="payment-info">
        <h3>Payment Instructions:</h3>
        <p><strong>Please transfer the total amount to:</strong></p>
        <p>
            <strong>Bank:</strong> [Bank Name]<br>
            <strong>Account Name:</strong> Federation of European MGAs<br>
            <strong>IBAN:</strong> [IBAN Number]<br>
            <strong>BIC/SWIFT:</strong> [BIC Code]<br>
            <strong>Reference:</strong> ${invoiceNumber}
        </p>
        <p><em>Please include the invoice number (${invoiceNumber}) as the payment reference.</em></p>
    </div>

    <div class="footer">
        <p>Thank you for your membership in the Federation of European MGAs.</p>
        <p>For questions about this invoice, please contact: finance@fasemga.com</p>
    </div>
</body>
</html>`;
};

export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, membershipData } = await request.json();

    if (!userId || !userEmail || !membershipData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { db } = await initializeAdmin();

    // Generate invoice number
    const invoiceNumber = `FASE-${Date.now()}-${userId.slice(-6)}`;
    
    // Calculate fees
    const totalAmount = getDiscountedFee(membershipData);

    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML(membershipData, invoiceNumber, totalAmount);

    // Generate PDF using Puppeteer
    let pdfBuffer: Uint8Array | null = null;
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // For deployment environments
      });
      
      const page = await browser.newPage();
      await page.setContent(invoiceHTML, { waitUntil: 'networkidle0' });
      
      pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        printBackground: true
      });
      
      await browser.close();
    } catch (pdfError) {
      console.error('Failed to generate PDF:', pdfError);
      // Continue without PDF - will send HTML email instead
    }
    
    // Store invoice record
    await db.collection('invoices').doc(invoiceNumber).set({
      userId,
      userEmail,
      membershipData,
      invoiceNumber,
      totalAmount,
      status: 'sent',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Send invoice via email (using Firebase Functions)
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../../../lib/firebase');
      
      const sendInvoiceEmail = httpsCallable(functions, 'sendInvoiceEmail');
      
      const emailData: any = { 
        email: userEmail, 
        invoiceHTML,
        invoiceNumber,
        organizationName: membershipData.organizationName,
        totalAmount
      };
      
      // Add PDF attachment if generated successfully
      if (pdfBuffer) {
        emailData.pdfAttachment = Buffer.from(pdfBuffer).toString('base64');
        emailData.pdfFilename = `FASE-Invoice-${invoiceNumber}.pdf`;
      }
      
      await sendInvoiceEmail(emailData);
      console.log('Invoice email sent successfully');
    } catch (emailError) {
      console.error('Error sending invoice email:', emailError);
    }

    return NextResponse.json({
      success: true,
      invoiceNumber,
      totalAmount,
      message: 'Invoice generated and sent successfully'
    });

  } catch (error: any) {
    console.error('Generate invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}