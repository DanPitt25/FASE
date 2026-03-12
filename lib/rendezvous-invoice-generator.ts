import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { detectCurrency, getWiseBankDetails, convertCurrency, getCurrencySymbol } from './currency-conversion';

export interface RendezvousInvoiceData {
  invoiceNumber: string;
  registrationId: string;

  // Billing info
  companyName: string;
  billingEmail: string;
  address?: string;
  country: string;
  vatNumber?: string;

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

  // Optional currency override
  forceCurrency?: 'EUR' | 'GBP' | 'USD';
}

export interface RendezvousInvoiceResult {
  pdfBase64: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  convertedAmount?: number;
  convertedCurrency?: string;
}

export async function generateRendezvousInvoicePDF(data: RendezvousInvoiceData): Promise<RendezvousInvoiceResult> {
  console.log(`Generating Rendezvous PDF invoice: ${data.invoiceNumber}`);

  try {
    // Use forced currency if provided, otherwise detect from country
    const targetCurrency = data.forceCurrency || detectCurrency(data.country);
    const bankDetails = getWiseBankDetails(targetCurrency);

    // Convert currency if needed (use subtotal since VAT is invoiced separately)
    let currencyConversion = {
      convertedCurrency: 'EUR',
      roundedAmount: data.subtotal,
      exchangeRate: 1
    };

    if (targetCurrency !== 'EUR') {
      currencyConversion = await convertCurrency(data.subtotal, targetCurrency);
    }

    // Load the cleaned letterhead template from public folder
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
    const formatCurrency = (amount: number, currency: string) => {
      const symbol = getCurrencySymbol(currency);
      return `${symbol}${amount.toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

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

    // Helper function to wrap text to fit within a maximum width
    const wrapText = (text: string, maxWidth: number, font: typeof bodyFont, fontSize: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    // Maximum width for bill-to section (leave room for invoice details on right)
    const billToMaxWidth = 250;

    // Build bill-to lines with text wrapping for address
    const billToLines: { text: string; bold: boolean }[] = [];

    // Company name (bold)
    billToLines.push({ text: data.companyName, bold: true });

    // Address - wrap if needed
    if (data.address && data.address.trim() !== '') {
      const addressLines = wrapText(data.address, billToMaxWidth, bodyFont, 10);
      addressLines.forEach(line => {
        billToLines.push({ text: line, bold: false });
      });
    }

    // Country
    billToLines.push({ text: data.country, bold: false });

    // VAT number if provided
    if (data.vatNumber && data.vatNumber.trim() !== '') {
      billToLines.push({ text: `VAT: ${data.vatNumber.trim()}`, bold: false });
    }

    billToLines.forEach((line, index) => {
      firstPage.drawText(line.text, {
        x: margins.left,
        y: currentY - (index * standardLineHeight),
        size: 10,
        font: line.bold ? boldFont : bodyFont,
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

    // VAT line - Spanish VAT to be invoiced separately
    currentY -= 18;
    firstPage.drawText('Spanish VAT:', {
      x: colX[2] + 10,
      y: currentY,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });
    firstPage.drawText('Pending, to be invoiced separately', {
      x: colX[3] + 10,
      y: currentY,
      size: 9,
      font: bodyFont,
      color: faseBlack,
    });

    // Total box - show dual currency if applicable
    currentY -= 25;
    const totalBoxWidth = 280;
    const totalX = width - margins.right - totalBoxWidth;

    // Determine box height based on currency conversion
    const boxHeight = currencyConversion.convertedCurrency === 'EUR' ? 35 : 55;

    firstPage.drawRectangle({
      x: totalX,
      y: currentY - boxHeight,
      width: totalBoxWidth,
      height: boxHeight,
      borderColor: faseNavy,
      borderWidth: 2,
    });

    if (currencyConversion.convertedCurrency === 'EUR') {
      // EUR only - single line (use subtotal since VAT is invoiced separately)
      firstPage.drawText('Total Amount Due:', {
        x: totalX + 15,
        y: currentY - 22,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });

      firstPage.drawText(formatEuro(data.subtotal), {
        x: totalX + 150,
        y: currentY - 22,
        size: 13,
        font: boldFont,
        color: faseNavy,
      });
    } else {
      // Dual currency display (use subtotal since VAT is invoiced separately)
      firstPage.drawText('Base Amount (EUR):', {
        x: totalX + 15,
        y: currentY - 18,
        size: 11,
        font: bodyFont,
        color: faseNavy,
      });

      firstPage.drawText(formatEuro(data.subtotal), {
        x: totalX + 150,
        y: currentY - 18,
        size: 11,
        font: bodyFont,
        color: faseNavy,
      });

      firstPage.drawText('Total Amount Due:', {
        x: totalX + 15,
        y: currentY - 38,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });

      firstPage.drawText(formatCurrency(currencyConversion.roundedAmount, currencyConversion.convertedCurrency), {
        x: totalX + 150,
        y: currentY - 38,
        size: 13,
        font: boldFont,
        color: faseNavy,
      });
    }

    // Payment Instructions section
    currentY -= boxHeight + 30;

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

    // Build bank details based on currency
    const paymentLines: string[] = [
      `Reference: ${data.invoiceNumber}`,
      `Account holder: ${bankDetails.accountHolder}`,
    ];

    // Add currency-specific payment details
    switch (currencyConversion.convertedCurrency) {
      case 'USD':
        paymentLines.push(
          `ACH and Wire routing number: ${bankDetails.routingNumber}`,
          `Account number: ${bankDetails.accountNumber}`,
          `Account type: ${bankDetails.accountType}`
        );
        break;
      case 'GBP':
        paymentLines.push(
          `Sort code: ${bankDetails.sortCode}`,
          `Account number: ${bankDetails.accountNumber}`,
          `IBAN: ${bankDetails.iban}`
        );
        break;
      case 'EUR':
      default:
        paymentLines.push(
          `BIC: ${bankDetails.bic}`,
          `IBAN: ${bankDetails.iban}`
        );
        break;
    }

    paymentLines.push(
      '',
      'Bank name and address:',
      bankDetails.bankName,
      ...bankDetails.address
    );

    paymentLines.forEach((line, index) => {
      firstPage.drawText(line, {
        x: margins.left,
        y: currentY - 20 - (index * standardLineHeight),
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
    });

    // FASE Company Info (right side, parallel to payment details)
    const companyInfoX = width - margins.right - 180;
    const companyInfoY = currentY - 20;

    firstPage.drawText('FASE B.V.', {
      x: companyInfoX,
      y: companyInfoY,
      size: 10,
      font: boldFont,
      color: faseBlack,
    });

    firstPage.drawText('Herengracht 124-128', {
      x: companyInfoX,
      y: companyInfoY - 14,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    firstPage.drawText('1015 BT Amsterdam', {
      x: companyInfoX,
      y: companyInfoY - 28,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    firstPage.drawText('Netherlands', {
      x: companyInfoX,
      y: companyInfoY - 42,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    firstPage.drawText('Reg: 98582151', {
      x: companyInfoX,
      y: companyInfoY - 56,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    firstPage.drawText('admin@fasemga.com', {
      x: companyInfoX,
      y: companyInfoY - 70,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    console.log('Rendezvous PDF generated successfully, size:', pdfBytes.length);

    return {
      pdfBase64,
      invoiceNumber: data.invoiceNumber,
      totalAmount: data.subtotal, // Use subtotal since VAT is invoiced separately
      currency: 'EUR',
      convertedAmount: currencyConversion.convertedCurrency !== 'EUR' ? currencyConversion.roundedAmount : undefined,
      convertedCurrency: currencyConversion.convertedCurrency !== 'EUR' ? currencyConversion.convertedCurrency : undefined
    };

  } catch (error: any) {
    console.error('Failed to generate Rendezvous invoice PDF:', error);
    throw error;
  }
}

/**
 * Generate a PAID invoice PDF for MGA Rendezvous
 * Shows "Status: PAID" and thank you message instead of payment instructions
 */
export async function generateRendezvousPaidInvoicePDF(data: RendezvousInvoiceData): Promise<RendezvousInvoiceResult> {
  console.log(`Generating Rendezvous PAID PDF invoice: ${data.invoiceNumber}`);

  try {
    // Use forced currency if provided, otherwise detect from country
    const targetCurrency = data.forceCurrency || detectCurrency(data.country);

    // Convert currency if needed (use subtotal since VAT is invoiced separately)
    let currencyConversion = {
      convertedCurrency: 'EUR',
      roundedAmount: data.subtotal,
      exchangeRate: 1
    };

    if (targetCurrency !== 'EUR') {
      currencyConversion = await convertCurrency(data.subtotal, targetCurrency);
    }

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
    const formatCurrency = (amount: number, currency: string) => {
      const symbol = getCurrencySymbol(currency);
      return `${symbol}${amount.toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

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

    // Status: PAID instead of Terms
    firstPage.drawText('Status: PAID', {
      x: invoiceDetailsX,
      y: currentY - 32,
      size: 10,
      font: boldFont,
      color: faseNavy,
    });

    // Bill To details (left side)
    currentY -= 20;

    // Helper function to wrap text
    const wrapText = (text: string, maxWidth: number, font: typeof bodyFont, fontSize: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    const billToMaxWidth = 250;
    const billToLines: { text: string; bold: boolean }[] = [];

    billToLines.push({ text: data.companyName, bold: true });

    if (data.address && data.address.trim() !== '') {
      const addressLines = wrapText(data.address, billToMaxWidth, bodyFont, 10);
      addressLines.forEach(line => {
        billToLines.push({ text: line, bold: false });
      });
    }

    billToLines.push({ text: data.country, bold: false });

    // VAT number if provided
    if (data.vatNumber && data.vatNumber.trim() !== '') {
      billToLines.push({ text: `VAT: ${data.vatNumber.trim()}`, bold: false });
    }

    billToLines.forEach((line, index) => {
      firstPage.drawText(line.text, {
        x: margins.left,
        y: currentY - (index * standardLineHeight),
        size: 10,
        font: line.bold ? boldFont : bodyFont,
        color: faseBlack,
      });
    });

    // Move down for table
    currentY -= (billToLines.length * standardLineHeight) + 30;

    // Table setup
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

    // Main line item
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
    firstPage.drawText('Spanish VAT:', {
      x: colX[2] + 10,
      y: currentY,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });
    firstPage.drawText('Pending, to be invoiced separately', {
      x: colX[3] + 10,
      y: currentY,
      size: 9,
      font: bodyFont,
      color: faseBlack,
    });

    // Total box
    currentY -= 25;
    const totalBoxWidth = 280;
    const totalX = width - margins.right - totalBoxWidth;
    const boxHeight = currencyConversion.convertedCurrency === 'EUR' ? 35 : 55;

    firstPage.drawRectangle({
      x: totalX,
      y: currentY - boxHeight,
      width: totalBoxWidth,
      height: boxHeight,
      borderColor: faseNavy,
      borderWidth: 2,
    });

    if (currencyConversion.convertedCurrency === 'EUR') {
      firstPage.drawText('Total Amount Paid:', {
        x: totalX + 15,
        y: currentY - 22,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });

      firstPage.drawText(formatEuro(data.subtotal), {
        x: totalX + 150,
        y: currentY - 22,
        size: 13,
        font: boldFont,
        color: faseNavy,
      });
    } else {
      firstPage.drawText('Base Amount (EUR):', {
        x: totalX + 15,
        y: currentY - 18,
        size: 11,
        font: bodyFont,
        color: faseNavy,
      });

      firstPage.drawText(formatEuro(data.subtotal), {
        x: totalX + 150,
        y: currentY - 18,
        size: 11,
        font: bodyFont,
        color: faseNavy,
      });

      firstPage.drawText('Total Amount Paid:', {
        x: totalX + 15,
        y: currentY - 38,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });

      firstPage.drawText(formatCurrency(currencyConversion.roundedAmount, currencyConversion.convertedCurrency), {
        x: totalX + 150,
        y: currentY - 38,
        size: 13,
        font: boldFont,
        color: faseNavy,
      });
    }

    // Thank you message (instead of payment instructions)
    currentY -= boxHeight + 30;

    firstPage.drawLine({
      start: { x: margins.left, y: currentY },
      end: { x: width - margins.right, y: currentY },
      thickness: 1,
      color: faseNavy,
    });

    currentY -= 25;

    firstPage.drawText('Thank you for your payment!', {
      x: margins.left,
      y: currentY,
      size: 12,
      font: boldFont,
      color: faseNavy,
    });

    currentY -= 20;

    firstPage.drawText('This invoice has been paid in full. We look forward to seeing you at MGA Rendezvous 2026.', {
      x: margins.left,
      y: currentY,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    currentY -= 30;

    // Contact info
    const contactLines = [
      'FASE B.V.',
      'Herengracht 124-128',
      '1015 BT Amsterdam, The Netherlands',
      'Reg: 98582151',
      'admin@fasemga.com'
    ];

    contactLines.forEach((line, index) => {
      firstPage.drawText(line, {
        x: margins.left,
        y: currentY - (index * standardLineHeight),
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    console.log('Rendezvous PAID PDF generated successfully, size:', pdfBytes.length);

    return {
      pdfBase64,
      invoiceNumber: data.invoiceNumber,
      totalAmount: data.subtotal,
      currency: 'EUR',
      convertedAmount: currencyConversion.convertedCurrency !== 'EUR' ? currencyConversion.roundedAmount : undefined,
      convertedCurrency: currencyConversion.convertedCurrency !== 'EUR' ? currencyConversion.convertedCurrency : undefined
    };

  } catch (error: any) {
    console.error('Failed to generate Rendezvous PAID invoice PDF:', error);
    throw error;
  }
}
