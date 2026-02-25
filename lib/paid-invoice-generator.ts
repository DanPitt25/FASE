import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export interface PaidInvoiceData {
  invoiceNumber: string;
  organizationName: string;
  description: string;
  amount: number;
  currency: string;
  paidAt: string;
  paymentMethod: string;
  reference?: string;
  // Optional address info (from member data)
  contactName?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
}

export interface PaidInvoiceResult {
  pdfBase64: string;
  invoiceNumber: string;
}

export async function generatePaidInvoicePDF(data: PaidInvoiceData): Promise<PaidInvoiceResult> {
  console.log(`Generating PAID invoice: ${data.invoiceNumber}`);

  try {
    // Load the cleaned letterhead template
    const letterheadPath = path.join(process.cwd(), 'cleanedpdf.pdf');
    const letterheadBytes = fs.readFileSync(letterheadPath);
    const pdfDoc = await PDFDocument.load(letterheadBytes);

    // Get the first page
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Embed fonts
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // FASE Brand Colors
    const faseNavy = rgb(0.176, 0.333, 0.455);      // #2D5574
    const faseBlack = rgb(0.137, 0.122, 0.125);     // #231F20
    const faseCream = rgb(0.922, 0.910, 0.894);     // #EBE8E4
    const paidGreen = rgb(0.133, 0.545, 0.133);     // Green for PAID

    // Layout settings
    const margins = { left: 50, right: 50, top: 150, bottom: 80 };
    const contentWidth = width - margins.left - margins.right;
    const standardLineHeight = 18;

    // Currency formatting
    const formatCurrency = (amount: number, currency: string) => {
      const symbols: Record<string, string> = { 'EUR': '\u20AC', 'USD': '$', 'GBP': '\u00A3' };
      return `${symbols[currency] || currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    };

    // Format dates
    const paidDate = new Date(data.paidAt);
    const formattedPaidDate = paidDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    // Format payment method
    const paymentMethodDisplay = data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1);

    // Start drawing content
    let currentY = height - margins.top;

    // PAID STAMP - Large, prominent
    firstPage.drawText('PAID', {
      x: width - margins.right - 120,
      y: currentY + 10,
      size: 40,
      font: boldFont,
      color: paidGreen,
    });

    // Bill To section
    firstPage.drawText('Payment Confirmation', {
      x: margins.left,
      y: currentY,
      size: 14,
      font: boldFont,
      color: faseNavy,
    });

    currentY -= 30;

    firstPage.drawText('For:', {
      x: margins.left,
      y: currentY,
      size: 12,
      font: boldFont,
      color: faseNavy,
    });

    currentY -= 20;

    // Build address lines
    const addressLines = [
      data.organizationName,
      data.contactName,
      data.address?.line1,
      data.address?.line2,
      [data.address?.city, data.address?.postcode].filter(Boolean).join(' '),
      data.address?.country,
    ].filter(line => line && line.trim() !== '');

    // Draw address lines
    addressLines.forEach((line, index) => {
      firstPage.drawText(line!, {
        x: margins.left,
        y: currentY - (index * standardLineHeight),
        size: index === 0 ? 11 : 10,
        font: index === 0 ? boldFont : bodyFont,
        color: faseBlack,
      });
    });

    // Invoice details (right-aligned)
    const invoiceDetailsX = width - margins.right - 150;
    firstPage.drawText(`Invoice #: ${data.invoiceNumber}`, {
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

    // Move down for table (account for address lines)
    currentY -= Math.max(60, addressLines.length * standardLineHeight + 20);

    // Table setup
    const tableY = currentY;
    const colWidths = [300, 100, 100];
    const colX = [
      margins.left,
      margins.left + colWidths[0],
      margins.left + colWidths[0] + colWidths[1],
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
    const headers = ['Description', 'Status', 'Amount'];
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

    // Line item
    firstPage.drawText(data.description, {
      x: colX[0] + 10,
      y: currentY - 15,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    firstPage.drawText('PAID', {
      x: colX[1] + 10,
      y: currentY - 15,
      size: 10,
      font: boldFont,
      color: paidGreen,
    });

    firstPage.drawText(formatCurrency(data.amount, data.currency), {
      x: colX[2] + 10,
      y: currentY - 15,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    currentY -= 50;

    // Total section
    const totalSectionWidth = 280;
    const totalX = width - margins.right - totalSectionWidth;
    const sectionHeight = 40;

    firstPage.drawRectangle({
      x: totalX,
      y: currentY - sectionHeight,
      width: totalSectionWidth,
      height: sectionHeight,
      borderColor: paidGreen,
      borderWidth: 2,
    });

    firstPage.drawText('Total Paid:', {
      x: totalX + 15,
      y: currentY - 25,
      size: 12,
      font: boldFont,
      color: faseNavy,
    });

    firstPage.drawText(formatCurrency(data.amount, data.currency), {
      x: totalX + 130,
      y: currentY - 25,
      size: 13,
      font: boldFont,
      color: paidGreen,
    });

    // Payment Details section
    currentY -= 80;

    firstPage.drawLine({
      start: { x: margins.left, y: currentY - 10 },
      end: { x: width - margins.right, y: currentY - 10 },
      thickness: 1,
      color: faseNavy,
    });

    firstPage.drawText('Payment Details', {
      x: margins.left,
      y: currentY - 30,
      size: 12,
      font: boldFont,
      color: faseNavy,
    });

    const paymentDetails = [
      `Payment Date: ${formattedPaidDate}`,
      `Payment Method: ${paymentMethodDisplay}`,
      data.reference ? `Reference: ${data.reference}` : null,
    ].filter(Boolean) as string[];

    paymentDetails.forEach((line, index) => {
      firstPage.drawText(line, {
        x: margins.left,
        y: currentY - 50 - (index * standardLineHeight),
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
    });

    // Thank you message
    currentY -= 50 + (paymentDetails.length * standardLineHeight) + 30;

    firstPage.drawText('Thank you for your payment!', {
      x: margins.left,
      y: currentY,
      size: 11,
      font: boldFont,
      color: faseNavy,
    });

    firstPage.drawText('This document serves as confirmation of your payment.', {
      x: margins.left,
      y: currentY - 18,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    firstPage.drawText('If you have any questions, please contact us at info@fasemga.com', {
      x: margins.left,
      y: currentY - 36,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    console.log(`PAID invoice generated successfully: ${data.invoiceNumber}`);

    return {
      pdfBase64,
      invoiceNumber: data.invoiceNumber,
    };
  } catch (error: any) {
    console.error('Failed to generate PAID invoice PDF:', error);
    throw error;
  }
}
