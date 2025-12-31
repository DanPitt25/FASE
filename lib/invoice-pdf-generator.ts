import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { convertCurrency, getWiseBankDetails, getCurrencySymbol } from './currency-conversion';

// Load email translations from JSON files
function loadEmailTranslations(language: string): any {
  try {
    const filePath = path.join(process.cwd(), 'messages', language, 'email.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    // Fallback to English if file not found
    if (language !== 'en') {
      return loadEmailTranslations('en');
    }
    // Return empty object if even English fails
    return {};
  }
}

export interface InvoiceGenerationData {
  // Core invoice details
  invoiceNumber: string;
  invoiceType?: 'regular' | 'lost_invoice' | 'reminder' | 'followup' | 'sponsorship';
  isLostInvoice?: boolean;
  
  // Recipient information
  email: string;
  fullName?: string;
  organizationName: string;
  greeting?: string;
  gender?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
  
  // Financial details
  totalAmount: number;
  originalAmount?: number;
  discountAmount?: number;
  discountReason?: string;
  hasOtherAssociations?: boolean;
  
  // Membership details
  organizationType?: 'MGA' | 'carrier' | 'provider';
  grossWrittenPremiums?: string;
  userId?: string;
  
  // Currency and conversion
  forceCurrency?: string;
  userLocale?: string;
  
  // Custom line items
  customLineItem?: {
    enabled: boolean;
    description: string;
    amount: number;
  } | null;
  
  // Admin context
  adminUserId?: string;
  adminUserEmail?: string;
  generationSource?: 'admin_portal' | 'customer_request' | 'system';
  isPreview?: boolean;
}

export interface InvoiceGenerationResult {
  pdfBase64: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  convertedCurrency?: string;
  convertedAmount?: number;
  exchangeRate?: number;
  bankDetails: any;
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isDiscount?: boolean;
}

function buildLineItems(data: InvoiceGenerationData, locale: string): InvoiceLineItem[] {
  const lineItems: InvoiceLineItem[] = [];

  // Skip main membership line for sponsorship invoices
  if (data.invoiceType !== 'sponsorship') {
    // Main membership line item - use original amount as the base price
    const membershipDescription = locale === 'nl' ? 
      'FASE Jaarlijks Lidmaatschap (1/1/2026 - 1/1/2027)' : 
      'FASE Annual Membership (1/1/2026 - 1/1/2027)';
    
    const originalAmount = data.originalAmount || data.totalAmount;
    
    lineItems.push({
      description: membershipDescription,
      quantity: 1,
      unitPrice: originalAmount,
      total: originalAmount,
      isDiscount: false
    });

    // Add discount line if applicable
    if (data.discountAmount && data.discountAmount > 0) {
      let discountDescription = data.discountReason || 'Association Member Discount';
      
      // Use localized discount text for Dutch
      if (locale === 'nl' && discountDescription.includes('Multi-Association Member Discount')) {
        discountDescription = 'Lidmaatschapskorting voor Meerdere Verenigingen (20%)';
      }
      
      lineItems.push({
        description: discountDescription,
        quantity: 1,
        unitPrice: -data.discountAmount,
        total: -data.discountAmount,
        isDiscount: true
      });
    }
  }

  // Add custom line item if applicable
  if (data.customLineItem?.enabled && data.customLineItem.description) {
    lineItems.push({
      description: data.customLineItem.description,
      quantity: 1,
      unitPrice: data.customLineItem.amount,
      total: data.customLineItem.amount,
      isDiscount: false
    });
  }

  return lineItems;
}

function calculateInvoiceTotal(lineItems: InvoiceLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.total, 0);
}

export async function generateInvoicePDF(data: InvoiceGenerationData): Promise<InvoiceGenerationResult> {
  console.log(`🧾 Generating PDF invoice: ${data.invoiceNumber}`);
  
  try {
    // Validate required fields
    if (!data.email || !data.organizationName || !data.invoiceNumber) {
      throw new Error('Missing required fields: email, organizationName, or invoiceNumber');
    }

    // Set defaults for optional fields
    const invoiceData = {
      ...data,
      fullName: data.fullName || data.greeting || 'Client',
      greeting: data.greeting || data.fullName || 'Client',
      gender: data.gender || 'm',
      originalAmount: data.originalAmount || data.totalAmount,
      discountAmount: data.discountAmount || (data.hasOtherAssociations ? data.totalAmount * 0.2 : 0),
      discountReason: data.discountReason || (data.hasOtherAssociations ? 'Multi-Association Member Discount (20%)' : ''),
      organizationType: data.organizationType || 'MGA',
      address: data.address || {
        line1: 'Not provided',
        line2: '',
        city: 'Not provided',
        postcode: 'Not provided',
        country: 'Netherlands'
      }
    };

    // Language and currency setup
    const userLocale = data.userLocale || 'en';
    const supportedLocales = ['en', 'fr', 'de', 'es', 'it', 'nl'];
    const locale = supportedLocales.includes(userLocale) ? userLocale : 'en';
    
    // Currency conversion
    const baseCurrency = 'EUR';
    const targetCurrency = data.forceCurrency || baseCurrency;
    let currencyConversion = {
      convertedCurrency: baseCurrency,
      roundedAmount: invoiceData.totalAmount,
      exchangeRate: 1
    };

    if (targetCurrency !== baseCurrency) {
      currencyConversion = await convertCurrency(invoiceData.totalAmount, baseCurrency, targetCurrency);
    }

    // Get bank details
    const { getWiseBankDetails } = await import('./currency-conversion');
    const bankDetails = getWiseBankDetails(targetCurrency);

    // Generate PDF
    console.log('Generating branded invoice PDF...');
    
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
    const faseOrange = rgb(0.706, 0.416, 0.200);    // #B46A33
    const faseCream = rgb(0.922, 0.910, 0.894);     // #EBE8E4
    
    // Layout settings
    const margins = { left: 50, right: 50, top: 150, bottom: 80 };
    const contentWidth = width - margins.left - margins.right;
    const standardLineHeight = 18;
    const sectionGap = 25;
    
    // Currency formatting functions
    const formatEuro = (amount: number) => `€ ${amount.toLocaleString()}`;
    const formatCurrency = (amount: number, currency: string) => {
      const symbols: Record<string, string> = { 'EUR': '€', 'USD': '$', 'GBP': '£' };
      return `${symbols[currency] || currency} ${amount.toLocaleString()}`;
    };
    
    // Load PDF text translations
    const translations = loadEmailTranslations(locale);
    const pdfTexts = {
      invoice: 'INVOICE',
      billTo: translations.pdf_invoice?.bill_to || 'Bill To:',
      invoiceNumber: translations.pdf_invoice?.invoice_number || 'Invoice #:',
      date: translations.pdf_invoice?.date || 'Date:',
      terms: translations.pdf_invoice?.terms || 'Terms: Payment upon receipt',
      description: translations.pdf_invoice?.description || 'Description',
      quantity: translations.pdf_invoice?.quantity || 'Qty',
      unitPrice: translations.pdf_invoice?.unit_price || 'Unit Price',
      total: translations.pdf_invoice?.total || 'Total',
      totalAmountDue: translations.pdf_invoice?.total_amount_due || 'Total Amount Due:',
      paymentInstructions: translations.pdf_invoice?.payment_instructions || 'Payment Instructions:'
    };

    // Current date
    const dateLocales = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT' };
    const dateLocale = dateLocales[locale as keyof typeof dateLocales] || 'en-GB';
    const currentDate = new Date().toLocaleDateString(dateLocale);
    
    // Build line items and calculate total
    const lineItems = buildLineItems(data, locale);
    const calculatedTotal = calculateInvoiceTotal(lineItems);
    
    // Start drawing content
    let currentY = height - margins.top;
    
    // Title - INVOICE
    firstPage.drawText(pdfTexts.invoice, {
      x: margins.left,
      y: currentY,
      size: 18,
      font: boldFont,
      color: faseNavy,
    });
    
    currentY -= 40;
    
    // BILL TO and INVOICE DETAILS on same line
    firstPage.drawText(pdfTexts.billTo, {
      x: margins.left,
      y: currentY,
      size: 12,
      font: boldFont,
      color: faseNavy,
    });
    
    // Invoice details (right-aligned)
    const invoiceDetailsX = width - margins.right - 150;
    firstPage.drawText(`${pdfTexts.invoiceNumber} ${invoiceData.invoiceNumber}`, {
      x: invoiceDetailsX,
      y: currentY,
      size: 11,
      font: boldFont,
      color: faseBlack,
    });
    
    firstPage.drawText(`${pdfTexts.date} ${currentDate}`, {
      x: invoiceDetailsX,
      y: currentY - 16,
      size: 10,
      font: bodyFont,
      color: faseBlack,
    });
    
    firstPage.drawText(pdfTexts.terms, {
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
      invoiceData.organizationName,
      invoiceData.fullName,
      invoiceData.address.line1 || '',
      invoiceData.address.line2 || '',
      `${invoiceData.address.city || ''} ${invoiceData.address.postcode || ''}`.trim(),
      invoiceData.address.country || ''
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
    currentY -= (billToLines.length * standardLineHeight) + sectionGap + 20;
    
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
      y: tableY - 35,
      width: contentWidth,
      height: 35,
      color: faseCream,
    });
    
    // Table headers
    const headers = [pdfTexts.description, pdfTexts.quantity, pdfTexts.unitPrice, pdfTexts.total];
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
    
    // Render line items
    lineItems.forEach((item) => {
      const color = item.isDiscount ? rgb(0.0, 0.6, 0.0) : faseBlack;
      
      // Description
      firstPage.drawText(item.description, {
        x: colX[0] + 10,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: color,
      });
      
      // Quantity
      firstPage.drawText(item.quantity.toString(), {
        x: colX[1] + 25,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: color,
      });
      
      // Unit Price
      const unitPriceText = item.isDiscount ? 
        `-${formatEuro(Math.abs(item.unitPrice))}` : 
        formatEuro(item.unitPrice);
      
      firstPage.drawText(unitPriceText, {
        x: colX[2] + 10,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: color,
      });
      
      // Total
      const totalText = item.isDiscount ? 
        `-${formatEuro(Math.abs(item.total))}` : 
        formatEuro(item.total);
      
      firstPage.drawText(totalText, {
        x: colX[3] + 10,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: color,
      });
      
      currentY -= 30;
    });
    
    // Total section
    currentY -= 20;
    
    // TOTAL SECTION - Expanded for dual currency display
    const totalSectionWidth = 320; // Expanded width for dual currency
    const totalX = width - margins.right - totalSectionWidth;
    const fixedGapBetweenTextAndAmount = 15; // Smaller gap for more space
    
    // Determine section height based on whether currency conversion is needed
    const sectionHeight = currencyConversion.convertedCurrency === 'EUR' ? 35 : 55;
    
    firstPage.drawRectangle({
      x: totalX,
      y: currentY - sectionHeight,
      width: totalSectionWidth,
      height: sectionHeight,
      borderColor: faseNavy,
      borderWidth: 2,
    });
    
    const labelX = totalX + 15;
    
    if (currencyConversion.convertedCurrency === 'EUR') {
      // EUR only - single line display
      firstPage.drawText(pdfTexts.totalAmountDue, {
        x: labelX,
        y: currentY - 22,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });
      
      const textWidth = boldFont.widthOfTextAtSize(pdfTexts.totalAmountDue, 12);
      const amountX = labelX + textWidth + fixedGapBetweenTextAndAmount;
      
      firstPage.drawText(formatEuro(calculatedTotal), {
        x: amountX,
        y: currentY - 22,
        size: 13,
        font: boldFont,
        color: faseNavy,
      });
    } else {
      // Dual currency display
      firstPage.drawText('Base Amount (EUR):', {
        x: labelX,
        y: currentY - 18,
        size: 11,
        font: bodyFont,
        color: faseNavy,
      });
      
      firstPage.drawText(formatEuro(calculatedTotal), {
        x: labelX + 130,
        y: currentY - 18,
        size: 11,
        font: bodyFont,
        color: faseNavy,
      });
      
      firstPage.drawText(pdfTexts.totalAmountDue, {
        x: labelX,
        y: currentY - 38,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });
      
      firstPage.drawText(formatCurrency(currencyConversion.roundedAmount, currencyConversion.convertedCurrency), {
        x: labelX + 130,
        y: currentY - 38,
        size: 13,
        font: boldFont,
        color: faseNavy,
      });
    }
    
    // Payment Instructions section
    currentY -= 80;
    
    // PAYMENT INSTRUCTIONS - Bottom section with tasteful separation line
    firstPage.drawLine({
      start: { x: margins.left, y: currentY - 10 },
      end: { x: width - margins.right, y: currentY - 10 },
      thickness: 1,
      color: faseNavy,
    });
    
    firstPage.drawText(pdfTexts.paymentInstructions, {
      x: margins.left,
      y: currentY - 30,
      size: 12,
      font: boldFont,
      color: faseNavy,
    });
    
    // Load payment instructions from translations
    const invoiceT = translations.pdf_invoice || {};
    
    // Currency-specific bank details from Wise
    if (!bankDetails) {
      throw new Error('Wise bank details not available for regular invoices');
    }
    
    const paymentLines = [
      `${invoiceT.reference || 'Reference'}: ${bankDetails.reference}`,
      `${invoiceT.account_holder || 'Account holder'}: ${bankDetails.accountHolder}`,
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
      `${invoiceT.bank_name_address || 'Bank name and address'}:`,
      bankDetails.bankName,
      ...bankDetails.address
    );
    
    paymentLines.forEach((line, index) => {
      firstPage.drawText(line, {
        x: margins.left,
        y: currentY - 50 - (index * standardLineHeight),
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    
    console.log('✅ PDF generated successfully, size:', pdfBytes.length);



    return {
      pdfBase64,
      invoiceNumber: invoiceData.invoiceNumber,
      totalAmount: calculatedTotal,
      currency: baseCurrency,
      convertedCurrency: currencyConversion.convertedCurrency !== baseCurrency ? currencyConversion.convertedCurrency : undefined,
      convertedAmount: currencyConversion.convertedCurrency !== baseCurrency ? currencyConversion.roundedAmount : undefined,
      exchangeRate: currencyConversion.convertedCurrency !== baseCurrency ? currencyConversion.exchangeRate : undefined,
      bankDetails
    };

  } catch (error: any) {
    console.error('❌ Failed to generate invoice PDF:', error);
    
    throw error;
  }
}