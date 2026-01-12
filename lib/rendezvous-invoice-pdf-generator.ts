import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export interface RendezvousInvoiceData {
  invoiceNumber: string;
  registrationId: string;

  // Billing info
  companyName: string;
  billingEmail: string;
  address?: string;
  country: string;

  // Attendees
  attendees: Array<{
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
  }>;

  // Financial
  pricePerTicket: number;
  numberOfTickets: number;
  subtotal: number;
  vatAmount: number;
  vatRate: number;
  totalPrice: number;
  discount: number;
  discountReason?: string;

  // Membership
  isFaseMember: boolean;
  isAsaseMember: boolean;
  organizationType: string;
}

export interface RendezvousInvoiceResult {
  pdfBase64: string;
  invoiceNumber: string;
  totalAmount: number;
}

export async function generateRendezvousInvoicePDF(data: RendezvousInvoiceData): Promise<RendezvousInvoiceResult> {
  console.log(`🧾 Generating Rendezvous PDF invoice: ${data.invoiceNumber}`);

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

    // Layout settings
    const margins = { left: 50, right: 50, top: 150, bottom: 80 };
    const contentWidth = width - margins.left - margins.right;
    const standardLineHeight = 16;

    // Currency formatting
    const formatEuro = (amount: number) => `€${amount.toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Current date
    const currentDate = new Date().toLocaleDateString('en-GB');

    // Start drawing content
    let currentY = height - margins.top;

    // Title - INVOICE
    firstPage.drawText('INVOICE', {
      x: margins.left,
      y: currentY,
      size: 18,
      font: boldFont,
      color: faseNavy,
    });

    // Event subtitle
    firstPage.drawText('MGA Rendezvous 2026', {
      x: margins.left,
      y: currentY - 22,
      size: 12,
      font: bodyFont,
      color: faseNavy,
    });

    currentY -= 50;

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

    firstPage.drawText('Terms: Payment upon receipt', {
      x: invoiceDetailsX,
      y: currentY - 32,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    // Bill To details (left side)
    currentY -= 20;

    const billToLines = [
      data.companyName,
      data.billingEmail,
      data.address || '',
      data.country
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

    // Move down for table
    currentY -= (billToLines.length * standardLineHeight) + 30;

    // Table setup - 4 columns
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
      y: tableY - 30,
      width: contentWidth,
      height: 30,
      color: faseCream,
    });

    // Table headers
    const headers = ['Description', 'Qty', 'Unit Price', 'Total'];
    headers.forEach((header, i) => {
      firstPage.drawText(header, {
        x: colX[i] + 10,
        y: tableY - 18,
        size: 11,
        font: boldFont,
        color: faseNavy,
      });
    });

    currentY = tableY - 35;

    // Organization type label
    const orgTypeLabels: Record<string, string> = {
      'mga': 'MGA',
      'carrier_broker': 'Carrier/Broker',
      'service_provider': 'Service Provider'
    };
    const orgTypeLabel = orgTypeLabels[data.organizationType] || data.organizationType;

    // Main line item - Event pass
    const baseDescription = `MGA Rendezvous Pass (${orgTypeLabel})`;
    const basePrice = data.discount > 0 ? data.pricePerTicket / (1 - data.discount / 100) : data.pricePerTicket;

    firstPage.drawText(baseDescription, {
      x: colX[0] + 10,
      y: currentY - 15,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    firstPage.drawText(data.numberOfTickets.toString(), {
      x: colX[1] + 25,
      y: currentY - 15,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    firstPage.drawText(formatEuro(basePrice), {
      x: colX[2] + 10,
      y: currentY - 15,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    firstPage.drawText(formatEuro(basePrice * data.numberOfTickets), {
      x: colX[3] + 10,
      y: currentY - 15,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    currentY -= 28;

    // Discount line if applicable
    if (data.discount > 0) {
      const discountText = data.discountReason || `FASE Member Discount (${data.discount}%)`;
      const discountAmount = (basePrice * data.numberOfTickets) - data.subtotal;
      const green = rgb(0.0, 0.6, 0.0);

      firstPage.drawText(discountText, {
        x: colX[0] + 10,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: green,
      });

      firstPage.drawText('1', {
        x: colX[1] + 25,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: green,
      });

      firstPage.drawText(`-${formatEuro(discountAmount)}`, {
        x: colX[2] + 10,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: green,
      });

      firstPage.drawText(`-${formatEuro(discountAmount)}`, {
        x: colX[3] + 10,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: green,
      });

      currentY -= 28;
    }

    // Subtotal line
    currentY -= 5;
    firstPage.drawLine({
      start: { x: colX[2], y: currentY },
      end: { x: width - margins.right, y: currentY },
      thickness: 0.5,
      color: faseNavy,
    });

    currentY -= 18;
    firstPage.drawText('Subtotal:', {
      x: colX[2] + 10,
      y: currentY,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });
    firstPage.drawText(formatEuro(data.subtotal), {
      x: colX[3] + 10,
      y: currentY,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    // VAT line
    currentY -= 18;
    firstPage.drawText(`VAT (${data.vatRate}%):`, {
      x: colX[2] + 10,
      y: currentY,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });
    firstPage.drawText(formatEuro(data.vatAmount), {
      x: colX[3] + 10,
      y: currentY,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    // Total box
    currentY -= 25;
    const totalBoxWidth = 200;
    const totalX = width - margins.right - totalBoxWidth;

    firstPage.drawRectangle({
      x: totalX,
      y: currentY - 30,
      width: totalBoxWidth,
      height: 30,
      borderColor: faseNavy,
      borderWidth: 2,
    });

    firstPage.drawText('Total Amount Due:', {
      x: totalX + 15,
      y: currentY - 20,
      size: 12,
      font: boldFont,
      color: faseNavy,
    });

    firstPage.drawText(formatEuro(data.totalPrice), {
      x: totalX + 130,
      y: currentY - 20,
      size: 13,
      font: boldFont,
      color: faseNavy,
    });

    // Attendees section
    currentY -= 60;

    firstPage.drawText('Registered Attendees:', {
      x: margins.left,
      y: currentY,
      size: 12,
      font: boldFont,
      color: faseNavy,
    });

    currentY -= 20;

    // List attendees
    data.attendees.forEach((attendee, index) => {
      const attendeeText = `${index + 1}. ${attendee.firstName} ${attendee.lastName} - ${attendee.email}`;
      firstPage.drawText(attendeeText, {
        x: margins.left + 10,
        y: currentY - (index * standardLineHeight),
        size: 9,
        font: bodyFont,
        color: faseBlack,
      });
    });

    currentY -= (data.attendees.length * standardLineHeight) + 20;

    // Payment Instructions section
    firstPage.drawLine({
      start: { x: margins.left, y: currentY },
      end: { x: width - margins.right, y: currentY },
      thickness: 1,
      color: faseNavy,
    });

    currentY -= 25;

    firstPage.drawText('Payment Instructions:', {
      x: margins.left,
      y: currentY,
      size: 12,
      font: boldFont,
      color: faseNavy,
    });

    const bankDetails = [
      `Reference: ${data.invoiceNumber}`,
      'Account holder: FASE Stichting',
      'BIC: BUNQNL2A',
      'IBAN: NL31 BUNQ 2122 4965 42',
      '',
      'Bank name and address:',
      'Bunq B.V.',
      'Naritaweg 131-133',
      '1043 BS Amsterdam',
      'Netherlands'
    ];

    bankDetails.forEach((line, index) => {
      firstPage.drawText(line, {
        x: margins.left,
        y: currentY - 20 - (index * standardLineHeight),
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    console.log('✅ Rendezvous PDF generated successfully, size:', pdfBytes.length);

    return {
      pdfBase64,
      invoiceNumber: data.invoiceNumber,
      totalAmount: data.totalPrice
    };

  } catch (error: any) {
    console.error('❌ Failed to generate Rendezvous invoice PDF:', error);
    throw error;
  }
}
