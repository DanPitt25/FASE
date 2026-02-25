/**
 * Generate reissued invoice for BRIT Group Services LTD
 * With FASE business address added to bottom-right corner
 *
 * Run on production: curl -X POST https://fasemga.com/api/generate-brit-invoice
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export async function generateBritInvoice() {
  console.log('Generating BRIT Group Services invoice...');

  // Invoice details - EXACT as specified
  const invoiceNumber = 'FASE-33101';
  const invoiceDate = '17/02/2026';
  const organizationName = 'BRIT Group Services LTD';
  const address = {
    line1: '122 Leadenhall Street',
    city: 'London',
    postcode: 'EC3V 4AB',
    country: 'GB'
  };

  // Financial details
  const baseAmountEUR = 4000;
  const totalAmountGBP = 3480;
  const reference = '560509';

  // Bank details for GBP
  const bankDetails = {
    reference,
    accountHolder: 'FASE B.V.',
    sortCode: '60-84-64',
    accountNumber: '34068846',
    iban: 'GB67 TRWI 6084 6434 0688 46',
    bankName: 'Wise Payments Limited',
    bankAddress: [
      'Worship Square, 65 Clifton Street',
      'London',
      'EC2A 4JE',
      'United Kingdom'
    ]
  };

  // FASE business address
  const faseAddress = {
    label: 'Business Address',
    lines: [
      'FASE B.V.',
      'Herengracht 124-128',
      '1015 BT Amsterdam, NL'
    ]
  };

  // Load PDF template
  const letterheadPath = path.join(process.cwd(), 'cleanedpdf.pdf');
  const letterheadBytes = fs.readFileSync(letterheadPath);
  const pdfDoc = await PDFDocument.load(letterheadBytes);

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  // Embed fonts
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // FASE Brand Colors
  const faseNavy = rgb(0.176, 0.333, 0.455);
  const faseBlack = rgb(0.137, 0.122, 0.125);
  const faseCream = rgb(0.922, 0.910, 0.894);

  // Layout settings
  const margins = { left: 50, right: 50, top: 150, bottom: 80 };
  const contentWidth = width - margins.left - margins.right;
  const standardLineHeight = 18;
  const sectionGap = 25;

  // Currency formatting
  const formatEuro = (amount: number) => `€ ${amount.toLocaleString()}`;
  const formatGBP = (amount: number) => `£ ${amount.toLocaleString()}`;

  // Start drawing
  let currentY = height - margins.top;

  // BILL TO header
  firstPage.drawText('Bill To:', {
    x: margins.left,
    y: currentY,
    size: 12,
    font: boldFont,
    color: faseNavy,
  });

  // Invoice details (right side)
  const invoiceDetailsX = width - margins.right - 150;
  firstPage.drawText(`Invoice #: ${invoiceNumber}`, {
    x: invoiceDetailsX,
    y: currentY,
    size: 11,
    font: boldFont,
    color: faseBlack,
  });

  firstPage.drawText(`Date: ${invoiceDate}`, {
    x: invoiceDetailsX,
    y: currentY - 16,
    size: 10,
    font: bodyFont,
    color: faseBlack,
  });

  firstPage.drawText('Terms: Payment upon receipt', {
    x: invoiceDetailsX,
    y: currentY - 32,
    size: 10,
    font: bodyFont,
    color: faseBlack,
  });

  firstPage.drawText('VAT Number Pending', {
    x: invoiceDetailsX,
    y: currentY - 48,
    size: 10,
    font: bodyFont,
    color: faseBlack,
  });

  // Bill To details (left side)
  currentY -= 20;

  const billToLines = [
    organizationName,
    address.line1,
    `${address.city} ${address.postcode}`,
    address.country
  ];

  billToLines.forEach((line, index) => {
    firstPage.drawText(line, {
      x: margins.left,
      y: currentY - (index * standardLineHeight),
      size: 10,
      font: index === 0 ? boldFont : bodyFont,
      color: faseBlack,
    });
  });

  // Table
  currentY -= (billToLines.length * standardLineHeight) + sectionGap + 20;

  const tableY = currentY;
  const colWidths = [250, 50, 100, 100];
  const colX = [
    margins.left,
    margins.left + colWidths[0],
    margins.left + colWidths[0] + colWidths[1],
    margins.left + colWidths[0] + colWidths[1] + colWidths[2]
  ];

  // Table header background
  firstPage.drawRectangle({
    x: margins.left,
    y: tableY - 35,
    width: contentWidth,
    height: 35,
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

  currentY = tableY - 40;

  // Single line item: FASE Annual Membership
  firstPage.drawText('FASE Annual Membership', {
    x: colX[0] + 10,
    y: currentY - 15,
    size: 10,
    font: bodyFont,
    color: faseBlack,
  });

  firstPage.drawText('1', {
    x: colX[1] + 25,
    y: currentY - 15,
    size: 10,
    font: bodyFont,
    color: faseBlack,
  });

  firstPage.drawText(formatEuro(baseAmountEUR), {
    x: colX[2] + 10,
    y: currentY - 15,
    size: 10,
    font: bodyFont,
    color: faseBlack,
  });

  firstPage.drawText(formatEuro(baseAmountEUR), {
    x: colX[3] + 10,
    y: currentY - 15,
    size: 10,
    font: bodyFont,
    color: faseBlack,
  });

  currentY -= 30;

  // Total section (dual currency)
  currentY -= 20;

  const totalSectionWidth = 320;
  const totalX = width - margins.right - totalSectionWidth;
  const sectionHeight = 55;

  firstPage.drawRectangle({
    x: totalX,
    y: currentY - sectionHeight,
    width: totalSectionWidth,
    height: sectionHeight,
    borderColor: faseNavy,
    borderWidth: 2,
  });

  const labelX = totalX + 15;

  // Base Amount (EUR)
  firstPage.drawText('Base Amount (EUR):', {
    x: labelX,
    y: currentY - 18,
    size: 11,
    font: bodyFont,
    color: faseNavy,
  });

  firstPage.drawText(formatEuro(baseAmountEUR), {
    x: labelX + 130,
    y: currentY - 18,
    size: 11,
    font: bodyFont,
    color: faseNavy,
  });

  // Total Amount Due (GBP)
  firstPage.drawText('Total Amount Due:', {
    x: labelX,
    y: currentY - 38,
    size: 12,
    font: boldFont,
    color: faseNavy,
  });

  firstPage.drawText(formatGBP(totalAmountGBP), {
    x: labelX + 130,
    y: currentY - 38,
    size: 13,
    font: boldFont,
    color: faseNavy,
  });

  // Payment Instructions
  currentY -= 80;

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
    `Reference: ${bankDetails.reference}`,
    `Account holder: ${bankDetails.accountHolder}`,
    `Sort code: ${bankDetails.sortCode}`,
    `Account number: ${bankDetails.accountNumber}`,
    `IBAN: ${bankDetails.iban}`,
    '',
    'Bank name and address:',
    bankDetails.bankName,
    ...bankDetails.bankAddress
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

  // FASE Business Address (bottom-right corner)
  const faseAddressX = width - margins.right - 150;
  const faseAddressY = currentY - 50;

  firstPage.drawText(faseAddress.label, {
    x: faseAddressX,
    y: faseAddressY,
    size: 10,
    font: boldFont,
    color: faseNavy,
  });

  faseAddress.lines.forEach((line, index) => {
    firstPage.drawText(line, {
      x: faseAddressX,
      y: faseAddressY - 16 - (index * 14),
      size: 9,
      font: bodyFont,
      color: faseBlack,
    });
  });

  // Generate PDF
  const pdfBytes = await pdfDoc.save();
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

  console.log('PDF generated, size:', pdfBytes.length);

  // Send email via Resend API
  console.log('Sending email to danielhpitt@gmail.com...');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FASE <admin@fasemga.com>',
      to: 'danielhpitt@gmail.com',
      subject: `Reissued Invoice ${invoiceNumber} - BRIT Group Services LTD`,
      html: `
        <p>Hi Daniel,</p>
        <p>Here is the reissued invoice for BRIT Group Services LTD with the FASE business address added.</p>
        <p>Invoice details:</p>
        <ul>
          <li>Invoice #: ${invoiceNumber}</li>
          <li>Date: ${invoiceDate}</li>
          <li>Organization: ${organizationName}</li>
          <li>Base Amount: €${baseAmountEUR.toLocaleString()}</li>
          <li>Total Due: £${totalAmountGBP.toLocaleString()}</li>
        </ul>
        <p>The PDF is attached.</p>
      `,
      attachments: [
        {
          filename: `${invoiceNumber}.pdf`,
          content: pdfBase64,
        }
      ]
    })
  });

  const result = await response.json();
  console.log('Email sent:', result);
}

generateBritInvoice().catch(console.error);
