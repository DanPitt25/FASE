import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { adminDb, adminStorage, FieldValue } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// Currency conversion utilities
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  'US': 'USD', 'USA': 'USD', 'United States': 'USD',
  'CA': 'USD', 'Canada': 'USD',
  'MX': 'USD', 'Mexico': 'USD',
  'GB': 'GBP', 'UK': 'GBP', 'United Kingdom': 'GBP',
  'AT': 'EUR', 'BE': 'EUR', 'CY': 'EUR', 'EE': 'EUR', 'FI': 'EUR',
  'FR': 'EUR', 'DE': 'EUR', 'GR': 'EUR', 'IE': 'EUR', 'IT': 'EUR',
  'LV': 'EUR', 'LT': 'EUR', 'LU': 'EUR', 'MT': 'EUR', 'NL': 'EUR',
  'PT': 'EUR', 'SK': 'EUR', 'SI': 'EUR', 'ES': 'EUR', 'HR': 'EUR',
};

function detectCurrency(country: string): string {
  if (!country) return 'EUR';
  const currency = COUNTRY_CURRENCY_MAP[country];
  if (currency) return currency;
  const upperCountry = country.toUpperCase();
  for (const [key, value] of Object.entries(COUNTRY_CURRENCY_MAP)) {
    if (key.toUpperCase() === upperCountry) return value;
  }
  return 'EUR';
}

function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = { 'EUR': '€', 'USD': '$', 'GBP': '£' };
  return symbols[currency] || currency;
}

async function convertCurrency(eurAmount: number, targetCurrency: string) {
  if (targetCurrency === 'EUR') {
    return { convertedCurrency: 'EUR', roundedAmount: eurAmount, exchangeRate: 1 };
  }

  const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rates: ${response.status}`);
  }
  const data = await response.json();
  const rate = data.rates[targetCurrency];
  if (!rate) {
    throw new Error(`No exchange rate found for currency: ${targetCurrency}`);
  }
  const roundedAmount = Math.max(1, Math.floor((eurAmount * rate) / 10) * 10);
  return { convertedCurrency: targetCurrency, roundedAmount, exchangeRate: rate };
}

function getWiseBankDetails(currency: string) {
  const bankDetails: Record<string, any> = {
    EUR: {
      accountHolder: 'FASE BV',
      bic: 'TRWIBEB1XXX',
      iban: 'BE31 9677 5765 4344',
      bankName: 'Wise',
      address: ['Rue du Trône 100, 3rd floor', '1050 Brussels', 'Belgium']
    },
    GBP: {
      accountHolder: 'FASE BV',
      sortCode: '23-14-70',
      accountNumber: '38163382',
      iban: 'GB89 TRWI 2314 7038 1633 82',
      bankName: 'Wise Payments Limited',
      address: ['56 Shoreditch High Street', 'London', 'E1 6JJ', 'United Kingdom']
    },
    USD: {
      accountHolder: 'FASE BV',
      routingNumber: '084009519',
      accountNumber: '9600010674658553',
      accountType: 'Checking',
      bankName: 'Wise US Inc',
      address: ['30 W. 26th Street, Sixth Floor', 'New York NY 10010', 'United States']
    }
  };
  return bankDetails[currency] || bankDetails.EUR;
}

interface RegistrationData {
  invoiceNumber: string;
  registrationId: string;
  companyName: string;
  billingEmail: string;
  address?: string;
  country: string;
  attendees: Array<{
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
  }>;
  pricePerTicket: number;
  numberOfTickets: number;
  subtotal: number;
  vatAmount: number;
  vatRate: number;
  totalPrice: number;
  discount: number;
  discountReason?: string;
  isFaseMember: boolean;
  isAsaseMember: boolean;
  organizationType: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: RegistrationData = await request.json();

    if (!data.companyName || !data.registrationId) {
      return NextResponse.json(
        { error: 'Missing required fields: companyName, registrationId' },
        { status: 400 }
      );
    }

    // Generate invoice number if not provided
    const invoiceNumber = data.invoiceNumber || `RDV-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    // Detect currency based on country
    const targetCurrency = detectCurrency(data.country);
    const bankDetails = getWiseBankDetails(targetCurrency);

    // Convert currency if needed
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

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // FASE Brand Colors
    const faseNavy = rgb(0.176, 0.333, 0.455);
    const faseBlack = rgb(0.137, 0.122, 0.125);
    const faseCream = rgb(0.922, 0.910, 0.894);

    const margins = { left: 50, right: 50, top: 150, bottom: 80 };
    const contentWidth = width - margins.left - margins.right;
    const standardLineHeight = 16;

    const formatEuro = (amount: number) => `€${amount.toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatCurrency = (amount: number, currency: string) => {
      const symbol = getCurrencySymbol(currency);
      return `${symbol}${amount.toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const currentDate = new Date().toLocaleDateString('en-GB');

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

    // BILL TO and INVOICE DETAILS
    firstPage.drawText('Bill To:', {
      x: margins.left,
      y: currentY,
      size: 12,
      font: boldFont,
      color: faseNavy,
    });

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

    firstPage.drawText('Terms: Payment upon receipt', {
      x: invoiceDetailsX,
      y: currentY - 32,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });

    currentY -= 20;

    // Text wrapping helper
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

    billToLines.forEach((line, index) => {
      firstPage.drawText(line.text, {
        x: margins.left,
        y: currentY - (index * standardLineHeight),
        size: 10,
        font: line.bold ? boldFont : bodyFont,
        color: faseBlack,
      });
    });

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

    firstPage.drawRectangle({
      x: margins.left,
      y: tableY - 30,
      width: contentWidth,
      height: 30,
      color: faseCream,
    });

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

    const orgTypeLabels: Record<string, string> = {
      'mga': 'MGA',
      'carrier_broker': 'Carrier/Broker',
      'service_provider': 'Service Provider'
    };
    const orgTypeLabel = orgTypeLabels[data.organizationType] || data.organizationType;

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

    // Payment Instructions section (for unpaid invoices)
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
      `Reference: ${invoiceNumber}`,
      `Account holder: ${bankDetails.accountHolder}`,
    ];

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

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    // Upload PDF to Firebase Storage
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const storagePath = `rendezvous-invoices/${invoiceNumber}.pdf`;
    const file = adminStorage.bucket().file(storagePath);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          invoiceNumber,
          companyName: data.companyName,
          registrationId: data.registrationId,
          regeneratedAt: new Date().toISOString(),
        },
      },
    });

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '2099-12-31',
    });

    // Update the registration with the new invoice URL
    const registrationsRef = adminDb.collection('rendezvous_registrations');
    const snapshot = await registrationsRef
      .where('registrationId', '==', data.registrationId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        invoiceUrl: signedUrl,
        invoiceNumber: invoiceNumber,
        invoiceRegeneratedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      pdfBase64,
      invoiceNumber: invoiceNumber,
      invoiceUrl: signedUrl,
      filename: `${invoiceNumber}.pdf`,
    });
  } catch (error: any) {
    console.error('Error regenerating rendezvous invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to regenerate invoice' },
      { status: 500 }
    );
  }
}
