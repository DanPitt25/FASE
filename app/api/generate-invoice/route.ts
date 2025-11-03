import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin using service account key from environment variable
const initializeAdmin = async () => {
  if (admin.apps.length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
  
  return {
    auth: admin.auth(),
    db: admin.firestore()
  };
};

// Auth verification removed for testing

// Calculate membership fee (same logic as frontend)
const calculateMembershipFee = (membershipData: any): number => {
  if (membershipData.membershipType === 'individual') {
    return 500;
  } else if (membershipData.organizationType === 'MGA' && membershipData.grossWrittenPremiums) {
    switch (membershipData.grossWrittenPremiums) {
      case '<10m': return 900;
      case '10-20m': return 1500;
      case '20-50m': return 2200;
      case '50-100m': return 2800;
      case '100-500m': return 4200;
      case '500m+': return 7000;
      default: return 900;
    }
  } else if (membershipData.organizationType === 'carrier') {
    return 4000; // Flat rate for carriers
  } else if (membershipData.organizationType === 'provider') {
    return 5000; // Flat rate for service providers
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
const generateInvoiceHTML = (membershipData: any, invoiceNumber: string, totalAmount: number, texts: any) => {
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
        <div class="logo">${texts.federationName}</div>
        <div class="tagline">${texts.tagline}</div>
    </div>

    <div class="invoice-info">
        <div class="client-details">
            <h3>${texts.billTo}</h3>
            <strong>${membershipData.organizationName}</strong><br>
            ${membershipData.primaryContact.name}<br>
            ${membershipData.registeredAddress.line1}<br>
            ${membershipData.registeredAddress.line2 ? membershipData.registeredAddress.line2 + '<br>' : ''}
            ${membershipData.registeredAddress.city}, ${membershipData.registeredAddress.state} ${membershipData.registeredAddress.postalCode}<br>
            ${membershipData.registeredAddress.country}<br><br>
            ${texts.email} ${membershipData.primaryContact.email}<br>
            ${texts.phone} ${membershipData.primaryContact.phone}
        </div>
        
        <div class="invoice-details">
            <h3>${texts.invoiceDetails}</h3>
            <strong>${texts.invoiceNumber} ${invoiceNumber}</strong><br>
            ${texts.date} ${currentDate}<br>
            ${texts.dueDate} ${dueDate}<br>
            ${texts.terms}
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>${texts.description}</th>
                <th>${texts.quantity}</th>
                <th>${texts.unitPrice}</th>
                <th>${texts.total}</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    FASE ${membershipData.membershipType === 'individual' ? texts.individual : membershipData.organizationType + ' ' + texts.corporate} ${texts.membershipType}
                    ${membershipData.organizationType === 'MGA' && membershipData.grossWrittenPremiums ? '<br><small>' + texts.premiumBracket + ' ' + membershipData.grossWrittenPremiums + '</small>' : ''}
                    ${membershipData.hasOtherAssociations ? '<br><small>' + texts.discountApplied + '</small>' : ''}
                </td>
                <td>1</td>
                <td>€${totalAmount}</td>
                <td>€${totalAmount}</td>
            </tr>
            <tr class="total-row">
                <td colspan="3"><strong>${texts.totalAmountDue}</strong></td>
                <td><strong>€${totalAmount}</strong></td>
            </tr>
        </tbody>
    </table>

    <div class="payment-info">
        <h3>${texts.paymentInstructions}</h3>
        <p><strong>${texts.transferAmount}</strong></p>
        <p>
            ${texts.paymentText[0]}<br><br>
            <strong>${texts.bankDetails.bank}</strong> Citibank, N.A.<br>
            <strong>${texts.bankDetails.address}</strong> USCC CITISWEEP<br>
            100 Citibank Drive<br>
            San Antonio, TX 78245<br><br>
            <strong>${texts.bankDetails.account}</strong> 125582998<br>
            <strong>ABA:</strong> 221172610<br>
            <strong>SWIFT:</strong> CITIUS33<br>
            <strong>${texts.bankDetails.reference}</strong> ${invoiceNumber}
        </p>
        <p><em>${texts.paymentText[3]}</em></p>
    </div>

    <div class="footer">
        <p>${texts.thankYou}</p>
        <p>${texts.questions}</p>
    </div>
</body>
</html>`;
};

export async function POST(request: NextRequest) {
  try {
    const { membershipData } = await request.json();
    
    // For testing - use email from membershipData
    const userEmail = membershipData?.primaryContact?.email || membershipData?.email || 'test@example.com';
    const userUid = 'test-user-' + Date.now();
    
    // Use user's selected language if provided, otherwise detect from header
    const userLocale = membershipData?.userLocale;
    const acceptLanguage = request.headers.get('accept-language');
    const isFrench = userLocale ? userLocale === 'fr' : acceptLanguage?.toLowerCase().includes('fr');
    
    // PDF text translations
    const pdfText = {
      en: {
        invoice: 'INVOICE',
        billTo: 'Bill To:',
        invoiceNumber: 'Invoice #:',
        date: 'Date:',
        dueDate: 'Due Date:',
        terms: 'Terms: Net 30',
        description: 'Description',
        quantity: 'Qty',
        unitPrice: 'Unit Price', 
        total: 'Total',
        paymentInstructions: 'Payment Instructions:',
        paymentText: [
          'Please deposit to the following account: Lexicon Associates, LLC',
          'Citibank, N.A. • USCC CITISWEEP • 100 Citibank Drive, San Antonio, TX 78245',
          'Account: 125582998 • ABA: 221172610 • SWIFT: CITIUS33',
          'Payment Reference: [TO_BE_FILLED]'
        ],
        totalAmountDue: 'Total Amount Due:',
        membershipType: 'Membership - Annual',
        individual: 'Individual',
        corporate: 'Corporate',
        premiumBracket: 'Premium Bracket:',
        discountApplied: '20% European MGA association member discount applied',
        // HTML-specific translations
        federationName: 'FEDERATION OF EUROPEAN MGAS',
        tagline: 'Professional Association for Managing General Agents',
        invoiceDetails: 'Invoice Details:',
        email: 'Email:',
        phone: 'Phone:',
        thankYou: 'Thank you for your membership in the Federation of European MGAs.',
        questions: 'For questions about this invoice, please contact: admin@fasemga.com',
        transferAmount: 'Please transfer the total amount to:',
        bankDetails: {
          bank: 'Bank:',
          address: 'Address:',
          account: 'Account Number:',
          reference: 'Reference:'
        }
      },
      fr: {
        invoice: 'FACTURE',
        billTo: 'Facturer à :',
        invoiceNumber: 'Facture #:',
        date: 'Date :',
        dueDate: 'Date d\'échéance :',
        terms: 'Conditions : Net 30',
        description: 'Description',
        quantity: 'Qté',
        unitPrice: 'Prix unitaire',
        total: 'Total',
        paymentInstructions: 'Instructions de paiement :',
        paymentText: [
          'Veuillez déposer sur le compte suivant : Lexicon Associates, LLC',
          'Citibank, N.A. • USCC CITISWEEP • 100 Citibank Drive, San Antonio, TX 78245',
          'Compte : 125582998 • ABA : 221172610 • SWIFT : CITIUS33',
          'Référence de paiement : [TO_BE_FILLED]'
        ],
        totalAmountDue: 'Montant total dû :',
        membershipType: 'Adhésion - Annuelle',
        individual: 'Individuelle',
        corporate: 'Entreprise',
        premiumBracket: 'Tranche de prime :',
        discountApplied: 'Remise de 20% pour membre d\'association MGA européenne appliquée',
        // HTML-specific translations
        federationName: 'FÉDÉRATION DES AGENCES DE SOUSCRIPTION EUROPÉENNES',
        tagline: 'Association Professionnelle des Agences de Souscription',
        invoiceDetails: 'Détails de la facture :',
        email: 'E-mail :',
        phone: 'Téléphone :',
        thankYou: 'Merci pour votre adhésion à la Fédération des Agences de Souscription Européennes.',
        questions: 'Pour toute question concernant cette facture, veuillez contacter : admin@fasemga.com',
        transferAmount: 'Veuillez virer le montant à :',
        bankDetails: {
          bank: 'Banque :',
          address: 'Adresse :',
          account: 'Numéro de compte :',
          reference: 'Référence :'
        }
      }
    };
    
    const currentLang = isFrench ? 'fr' : 'en';
    const texts = pdfText[currentLang];

    if (!membershipData) {
      return NextResponse.json(
        { error: 'Membership data is required' },
        { status: 400 }
      );
    }

    // const { db } = await initializeAdmin(); // Skipped - not storing invoice records

    // Generate simple 5-digit invoice number
    const invoiceNumber = String(10000 + Math.floor(Math.random() * 90000));
    
    // Use exact amount from frontend if provided, otherwise calculate
    const totalAmount = membershipData.exactTotalAmount || getDiscountedFee(membershipData);
    
    // Update payment text with actual invoice number
    texts.paymentText[3] = currentLang === 'fr' ? 
      `Référence de paiement : ${invoiceNumber}` : 
      `Payment Reference: ${invoiceNumber}`;

    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML(membershipData, invoiceNumber, totalAmount, texts);

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
      
      firstPage.drawText(texts.invoice, {
        x: margins.left,
        y: currentY,
        size: 18,
        font: boldFont,
        color: faseNavy,
      });
      
      currentY -= 50; // Space after main header
      
      // BILL TO and INVOICE DETAILS on same line
      firstPage.drawText(texts.billTo, {
        x: margins.left,
        y: currentY,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });
      
      // Invoice details (right-aligned)
      const invoiceDetailsX = width - margins.right - 150;
      firstPage.drawText(`${texts.invoiceNumber} ${invoiceNumber}`, {
        x: invoiceDetailsX,
        y: currentY,
        size: 11,
        font: boldFont,
        color: faseBlack,
      });
      
      firstPage.drawText(`${texts.date} ${currentDate}`, {
        x: invoiceDetailsX,
        y: currentY - 16,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      firstPage.drawText(`${texts.dueDate} ${dueDate}`, {
        x: invoiceDetailsX,
        y: currentY - 32,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      firstPage.drawText(texts.terms, {
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
      const headers = [texts.description, texts.quantity, texts.unitPrice, texts.total];
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
        ? `FASE ${texts.individual} ${texts.membershipType}`
        : `FASE ${membershipData.organizationType} ${texts.corporate} ${texts.membershipType}`;
      
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
        firstPage.drawText(`${texts.premiumBracket} ${membershipData.grossWrittenPremiums}`, {
          x: colX[0] + 20,
          y: currentY,
          size: 9,
          font: bodyFont,
          color: rgb(0.4, 0.4, 0.4),
        });
        currentY -= standardLineHeight;
      }
      
      if (membershipData.hasOtherAssociations) {
        firstPage.drawText(texts.discountApplied, {
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
      
      firstPage.drawText(texts.totalAmountDue, {
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
      
      firstPage.drawText(texts.paymentInstructions, {
        x: margins.left,
        y: currentY - 30,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });
      
      const paymentLines = texts.paymentText;
      
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
    
    // Store invoice record (skipped - requires admin permissions in production)
    // await db.collection('invoices').doc(invoiceNumber).set({
    //   userId: userUid,
    //   userEmail,
    //   membershipData,
    //   invoiceNumber,
    //   totalAmount,
    //   status: 'sent',
    //   createdAt: admin.firestore.FieldValue.serverTimestamp(),
    //   dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    // });

    // Update account status from draft to pending after invoice generation
    const { db } = await initializeAdmin();
    
    // Get userId from membershipData
    const userId = membershipData.userId;
    if (userId) {
      try {
        await db.collection('accounts').doc(userId).update({
          status: 'pending',
          paymentMethod: 'invoice',
          invoiceNumber: invoiceNumber,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Account ${userId} updated to pending status with invoice ${invoiceNumber}`);
      } catch (updateError) {
        console.error('Failed to update account status:', updateError);
      }
    }
    
    const applicationNumber = `FASE-APP-${Date.now()}`;

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
        console.log('PDF attachment added to email data');
      }
      
      // Always include a nice thank you message
      emailData.invoiceHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #333; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 40px; border-radius: 8px; border: 2px solid #2D5574;">
            <h2 style="color: #2D5574; text-align: center; margin-bottom: 30px;">Welcome to FASE!</h2>
            
            <p style="font-size: 16px; line-height: 1.6;">Dear ${membershipData.organizationName},</p>
            
            <p style="font-size: 16px; line-height: 1.6;">Thank you for joining the Federation of European MGAs – Europe's premier professional association for Managing General Agents and insurance professionals.</p>
            
            <p style="font-size: 16px; line-height: 1.6;">Your membership application has been received and you're now part of an exclusive community that:</p>
            
            <ul style="font-size: 16px; line-height: 1.8; margin: 20px 0;">
              <li>Connects you with Europe's leading insurance professionals</li>
              <li>Provides access to industry insights and best practices</li>
              <li>Offers networking opportunities at exclusive events</li>
              <li>Advocates for MGA interests across European markets</li>
            </ul>
            
            <p style="font-size: 16px; line-height: 1.6;">Your invoice is attached${pdfBuffer ? '' : ' (will be sent separately due to a technical issue)'}. We'll activate your membership benefits within 24 hours of payment confirmation.</p>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #2D5574;">
              <p style="margin: 0; font-size: 14px; color: #2D5574;"><strong>Invoice Reference:</strong> ${invoiceNumber}</p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6;">Questions? Contact us at <a href="mailto:admin@fasemga.com" style="color: #2D5574; text-decoration: none;">admin@fasemga.com</a></p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">Welcome aboard!</p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 0;"><strong>The FASE Team</strong><br>
            <span style="color: #666; font-size: 14px;">Federation of European MGAs</span></p>
          </div>
        </div>
      `;
      
      // Call Firebase Function directly via HTTP (server-side)
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
      applicationNumber,
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
    
    if (error instanceof Error && error.message.includes('authorization')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}