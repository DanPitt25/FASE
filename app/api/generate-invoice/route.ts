import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

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

    // const { db } = await initializeAdmin(); // Skip Firebase for PDF testing

    // Generate invoice number
    const invoiceNumber = `FASE-${Date.now()}-${userId.slice(-6)}`;
    
    // Calculate fees
    const totalAmount = getDiscountedFee(membershipData);

    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML(membershipData, invoiceNumber, totalAmount);

    // Generate branded PDF using the EXACT working approach from standalone script
    let pdfBuffer: Uint8Array | null = null;
    try {
      console.log('Generating branded invoice PDF...');
      
      // Load the cleaned letterhead template
      const letterheadPath = path.join(process.cwd(), 'cleanedpdf.pdf');
      const letterheadBytes = fs.readFileSync(letterheadPath);
      const pdfDoc = await PDFDocument.load(letterheadBytes);
      
      // Get the first page
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      // Embed fonts - using brand fonts (exactly like working script)
      const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const serifFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const serifBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      
      // FASE Brand Colors
      const faseNavy = rgb(0.176, 0.333, 0.455);      // #2D5574
      const faseBlack = rgb(0.137, 0.122, 0.125);     // #231F20
      const faseOrange = rgb(0.706, 0.416, 0.200);    // #B46A33
      const faseCream = rgb(0.922, 0.910, 0.894);     // #EBE8E4
      
      // STANDARD 8.5x11 INVOICE LAYOUT with proper spacing
      const margins = { left: 50, right: 50, top: 150, bottom: 80 };
      const contentWidth = width - margins.left - margins.right;
      const standardLineHeight = 18;
      const sectionGap = 25;
      
      // Helper function
      const formatEuro = (amount: number) => `€ ${amount}`;
      
      // Current date and due date
      const currentDate = new Date().toLocaleDateString('en-GB');
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
      
      // INVOICE HEADER SECTION (starts 150pt from top to avoid letterhead)
      let currentY = height - margins.top;
      
      firstPage.drawText('INVOICE', {
        x: margins.left,
        y: currentY,
        size: 18,
        font: boldFont,
        color: faseNavy,
      });
      
      currentY -= 50; // Space after main header
      
      // BILL TO and INVOICE DETAILS on same line
      firstPage.drawText('Bill To:', {
        x: margins.left,
        y: currentY,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });
      
      // Invoice details (right-aligned)
      const invoiceDetailsX = width - margins.right - 150;
      firstPage.drawText(`Invoice #: ${invoiceNumber}`, {
        x: invoiceDetailsX,
        y: currentY,
        size: 11,
        font: boldFont,
        color: faseBlack,
      });
      
      firstPage.drawText(`Date: ${currentDate}`, {
        x: invoiceDetailsX,
        y: currentY - 16,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      firstPage.drawText(`Due Date: ${dueDate}`, {
        x: invoiceDetailsX,
        y: currentY - 32,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      firstPage.drawText('Terms: Net 30', {
        x: invoiceDetailsX,
        y: currentY - 48,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      currentY -= 20;
      const billToLines = [
        membershipData.organizationName,
        membershipData.primaryContact.name,
        membershipData.registeredAddress.line1,
        membershipData.registeredAddress.line2,
        `${membershipData.registeredAddress.city}, ${membershipData.registeredAddress.state} ${membershipData.registeredAddress.postalCode}`,
        membershipData.registeredAddress.country
      ].filter(line => line && line.trim() !== '');
      
      billToLines.forEach((line, index) => {
        firstPage.drawText(line, {
          x: margins.left,
          y: currentY - (index * standardLineHeight),
          size: 10,
          font: index === 0 ? boldFont : bodyFont,
          color: faseBlack,
        });
      });
      
      currentY -= (billToLines.length * standardLineHeight) + sectionGap;
      
      // INVOICE TABLE
      const rowHeight = 35;
      const tableY = currentY;
      const colWidths = [280, 60, 80, 80];
      const colX = [
        margins.left,
        margins.left + colWidths[0],
        margins.left + colWidths[0] + colWidths[1],
        margins.left + colWidths[0] + colWidths[1] + colWidths[2]
      ];
      
      // Table header background
      firstPage.drawRectangle({
        x: margins.left,
        y: tableY - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: faseCream,
      });
      
      // Table headers
      const headers = ['Description', 'Qty', 'Unit Price', 'Total'];
      headers.forEach((header, i) => {
        firstPage.drawText(header, {
          x: colX[i] + 10,
          y: tableY - 20,
          size: 11,
          font: boldFont,
          color: faseNavy,
        });
      });
      
      currentY -= rowHeight;
      
      // Invoice item row
      const membershipDesc = membershipData.membershipType === 'individual' 
        ? 'FASE Individual Membership - Annual'
        : `FASE ${membershipData.organizationType} Corporate Membership - Annual`;
      
      firstPage.drawText(membershipDesc, {
        x: colX[0] + 10,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: faseBlack,
        maxWidth: colWidths[0] - 20,
      });
      
      firstPage.drawText('1', {
        x: colX[1] + 25,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      firstPage.drawText(formatEuro(totalAmount), {
        x: colX[2] + 10,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      firstPage.drawText(formatEuro(totalAmount), {
        x: colX[3] + 10,
        y: currentY - 15,
        size: 10,
        font: boldFont,
        color: faseBlack,
      });
      
      currentY -= 40; // Space for additional details
      
      // Additional details (with proper spacing)
      if (membershipData.organizationType === 'MGA' && membershipData.grossWrittenPremiums) {
        firstPage.drawText(`Premium Bracket: ${membershipData.grossWrittenPremiums}`, {
          x: colX[0] + 20,
          y: currentY,
          size: 9,
          font: bodyFont,
          color: rgb(0.4, 0.4, 0.4),
        });
        currentY -= standardLineHeight;
      }
      
      if (membershipData.hasOtherAssociations) {
        firstPage.drawText('20% European MGA Association Member Discount Applied', {
          x: colX[0] + 20,
          y: currentY,
          size: 9,
          font: bodyFont,
          color: faseOrange,
        });
        currentY -= standardLineHeight;
      }
      
      currentY -= sectionGap;
      
      // TOTAL SECTION
      const totalSectionWidth = 200;
      const totalX = width - margins.right - totalSectionWidth;
      
      firstPage.drawRectangle({
        x: totalX,
        y: currentY - 35,
        width: totalSectionWidth,
        height: 35,
        borderColor: faseNavy,
        borderWidth: 2,
      });
      
      firstPage.drawText('Total Amount Due:', {
        x: totalX + 15,
        y: currentY - 22,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });
      
      firstPage.drawText(formatEuro(totalAmount), {
        x: totalX + totalSectionWidth - 60,
        y: currentY - 22,
        size: 13,
        font: boldFont,
        color: faseNavy,
      });
      
      currentY -= 60;
      
      // PAYMENT INSTRUCTIONS - Bottom section with tasteful separation line
      const paymentSectionHeight = 80;
      
      // Tasteful separation line above payment instructions
      firstPage.drawLine({
        start: { x: margins.left, y: currentY - 10 },
        end: { x: width - margins.right, y: currentY - 10 },
        thickness: 1,
        color: faseNavy,
      });
      
      firstPage.drawText('Payment Instructions:', {
        x: margins.left,
        y: currentY - 30,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });
      
      const paymentLines = [
        'Bank Name: [Bank Name]  •  Account Name: Federation of European MGAs',
        'IBAN: [IBAN Number]  •  BIC/SWIFT: [BIC Code]',
        `Payment Reference: ${invoiceNumber}`
      ];
      
      paymentLines.forEach((line, index) => {
        firstPage.drawText(line, {
          x: margins.left,
          y: currentY - 50 - (index * standardLineHeight),
          size: 10,
          font: bodyFont,
          color: faseBlack,
        });
      });
      
      // Save the PDF
      pdfBuffer = await pdfDoc.save();
      console.log('PDF generated successfully, size:', pdfBuffer.length);
      
    } catch (pdfError: any) {
      console.error('Failed to generate branded PDF:', pdfError);
      console.error('PDF Error stack:', pdfError.stack);
      // Continue without PDF - will send HTML email instead
    }
    
    // Store invoice record (skipped for PDF testing)
    // await db.collection('invoices').doc(invoiceNumber).set({
    //   userId,
    //   userEmail,
    //   membershipData,
    //   invoiceNumber,
    //   totalAmount,
    //   status: 'sent',
    //   createdAt: admin.firestore.FieldValue.serverTimestamp(),
    //   dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    // });

    // Send invoice via email (using Firebase Functions)
    let emailSent = false;
    let emailError = null;
    
    try {
      console.log('Starting email send process...');
      console.log('User email:', userEmail);
      console.log('Invoice number:', invoiceNumber);
      
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
        // Replace HTML with simple PDF notification
        emailData.invoiceHTML = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2D5574;">Your FASE Membership Invoice</h2>
            <p>Dear ${membershipData.primaryContact.name},</p>
            <p>Thank you for your FASE membership. Please find your invoice attached as a PDF.</p>
            <p><strong>Invoice Number:</strong> ${invoiceNumber}<br>
            <strong>Amount Due:</strong> €${totalAmount}</p>
            <p>If you have any questions about this invoice, please contact us at <a href="mailto:help@fasemga.com">help@fasemga.com</a></p>
            <p>Best regards,<br>FASE Team</p>
          </div>
        `;
        console.log('PDF attachment added to email data');
      } else {
        // If PDF generation failed, send error message instead of HTML fallback
        emailData.invoiceHTML = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626;">Invoice Generation Error</h2>
            <p>We're sorry, but there was an issue generating your invoice PDF.</p>
            <p>Please contact our support team at <a href="mailto:help@fasemga.com">help@fasemga.com</a> and we'll send your invoice manually.</p>
            <p>Reference: ${invoiceNumber}</p>
          </div>
        `;
        console.log('PDF generation failed - sending error message');
      }
      
      // Call Firebase Function via HTTP
      const response = await fetch(`https://us-central1-fase-site.cloudfunctions.net/sendInvoiceEmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: emailData
        }),
      });

      if (!response.ok) {
        throw new Error(`Firebase Function error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Invoice email sent successfully:', result);
      
      emailSent = true;
      console.log('✅ Invoice email sent successfully');
    } catch (error: any) {
      emailError = error;
      console.error('❌ Error sending invoice email:', error);
      console.error('Error details:', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
    }

    return NextResponse.json({
      success: true,
      invoiceNumber,
      totalAmount,
      message: 'Invoice generated and sent successfully',
      emailSent,
      emailError: emailError ? {
        name: emailError?.name,
        message: emailError?.message,
        code: emailError?.code
      } : null
    });

  } catch (error: any) {
    console.error('Generate invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}