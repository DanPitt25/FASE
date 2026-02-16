import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { generateInvoicePDF, generateInvoiceFromLineItems, InvoiceGenerationData } from '../../../lib/invoice-pdf-generator';
import { uploadInvoicePDF } from '../../../lib/invoice-storage';
import {
  calculateMembershipFee,
  calculateRendezvousTotal,
  getOrgTypeLabel,
  normalizeOrgType,
  MGA_MEMBERSHIP_TIERS,
  MEMBERSHIP_FLAT_RATES
} from '../../../lib/pricing';

// Force Node.js runtime to enable file system access
export const runtime = 'nodejs';

// Load email translations from JSON files
function loadEmailTranslations(language: string): any {
  try {
    const filePath = path.join(process.cwd(), 'messages', language, 'email.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(fileContent);
    return parsed;
  } catch (error) {
    console.log('Error loading translation file:', error);
    // Fallback to English if file not found
    if (language !== 'en') {
      return loadEmailTranslations('en');
    }
    // Return empty object if even English fails
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();

    // Validate required fields - only organizationName is truly required
    if (!requestData.organizationName || requestData.organizationName.toString().trim() === '') {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // Generate invoice number if not provided
    const invoiceNumber = requestData.invoiceNumber || `FASE-${Math.floor(10000 + Math.random() * 90000)}`;

    const hasOtherAssociations = requestData.hasOtherAssociations || false;
    const rendezvousPassData = requestData.rendezvousPassReservation;

    // ==========================================================================
    // CALCULATE AMOUNTS FROM FIRST PRINCIPLES - DO NOT TRUST PRE-CALCULATED VALUES
    // ==========================================================================

    // Determine organization type for pricing
    const membershipOrgType = requestData.organizationType || 'MGA';
    const gwpBand = requestData.gwpBand || requestData.grossWrittenPremiums || '<10m';

    // Calculate membership fee from scratch
    let calculatedMembershipFee: number;
    if (requestData.originalAmount && typeof requestData.originalAmount === 'number' && requestData.originalAmount > 0) {
      // If originalAmount is explicitly provided (legacy support), use it as the base
      calculatedMembershipFee = requestData.originalAmount;
    } else {
      // Calculate from organization type and GWP band
      calculatedMembershipFee = calculateMembershipFee(membershipOrgType, gwpBand, false);
    }

    // Apply multi-association discount if applicable
    const discountAmount = hasOtherAssociations ? Math.round(calculatedMembershipFee * 0.2) : 0;
    const discountedMembershipFee = calculatedMembershipFee - discountAmount;

    // Calculate rendezvous pass cost from first principles (NO VAT - invoiced separately)
    let customLineItem = requestData.customLineItem || null;
    let rendezvousPassCost = 0;

    if (rendezvousPassData && rendezvousPassData.reserved) {
      const passOrgType = rendezvousPassData.organizationType || membershipOrgType;
      const passCount = rendezvousPassData.passCount || 1;
      const isFaseMember = rendezvousPassData.isFaseMember !== false; // Default to true for membership invoices
      const isAsaseMember = rendezvousPassData.isAsaseMember || false;

      // CALCULATE from pricing constants - ignore any pre-calculated amounts
      const rendezvousCalc = calculateRendezvousTotal(passOrgType, passCount, isFaseMember, isAsaseMember);
      rendezvousPassCost = rendezvousCalc.subtotal;

      const passLabel = getOrgTypeLabel(passOrgType);
      customLineItem = {
        enabled: true,
        description: `MGA Rendezvous 2026 Pass${passCount > 1 ? 'es' : ''} (${passLabel} - ${passCount}x)`,
        amount: rendezvousPassCost
      };

      console.log('🧮 Calculated rendezvous pass cost:', {
        passOrgType,
        passCount,
        isFaseMember,
        isAsaseMember,
        unitPrice: rendezvousCalc.unitPrice,
        subtotal: rendezvousCalc.subtotal,
        discount: rendezvousCalc.discount
      });
    }

    // Total amount is membership + rendezvous (NO VAT anywhere)
    const totalAmount = discountedMembershipFee + rendezvousPassCost;

    console.log('🧮 Invoice calculation summary:', {
      membershipOrgType,
      gwpBand,
      baseMembershipFee: calculatedMembershipFee,
      hasOtherAssociations,
      discountAmount,
      discountedMembershipFee,
      rendezvousPassCost,
      totalAmount
    });

    const invoiceData: any = {
      email: requestData.email || '',
      organizationName: requestData.organizationName,
      invoiceNumber: invoiceNumber,
      greeting: requestData.greeting || requestData.fullName || 'Client',
      gender: requestData.gender || 'm',
      totalAmount: totalAmount,
      fullName: requestData.greeting || requestData.fullName || 'Client',
      address: requestData.address || {
        line1: 'Not provided',
        line2: '',
        city: 'Not provided',
        postcode: 'Not provided',
        country: requestData.country || 'Netherlands'
      },
      originalAmount: calculatedMembershipFee,
      discountAmount: discountAmount,
      discountReason: hasOtherAssociations ? "Multi-Association Member Discount (20%)" : "",
      customLineItem: customLineItem
    };

    // Check if this is a preview request
    const isPreview = requestData.preview === true;
    
    // Detect language for email content
    const userLocale = requestData.userLocale || requestData.locale || requestData.language || 'en';
    const supportedLocales = ['en', 'fr', 'de', 'es', 'it', 'nl'];
    const locale = supportedLocales.includes(userLocale) ? userLocale : 'en';
    
    // Load email content translations from JSON files
    const emailTranslations = loadEmailTranslations(locale);
    const invoiceEmail = emailTranslations.invoice_delivery || {};
    
    // Apply template variable replacements with gender-aware content
    const genderSuffix = invoiceData.gender === 'f' ? '_f' : '_m';
    const genderAwareDear = invoiceEmail[`dear${genderSuffix}`] || invoiceEmail.dear;
    const genderAwareSubject = invoiceEmail[`subject${genderSuffix}`] || invoiceEmail.subject;
    
    // Handle customized email content
    let emailContent = {
      subject: genderAwareSubject?.replace('{invoiceNumber}', invoiceData.invoiceNumber) || `Invoice ${invoiceData.invoiceNumber}`,
      dear: genderAwareDear || 'Dear',
      deliveredText: invoiceEmail.delivered_text?.replace('{organizationName}', invoiceData.organizationName) || `Your invoice for ${invoiceData.organizationName} has been delivered.`,
      instructionsText: invoiceEmail.instructions_text || 'Please follow the payment instructions included in the attached PDF.',
      welcomeText: invoiceEmail.welcome_text || '',
      contactText: invoiceEmail.contact_text || 'If you have any questions, please contact us at admin@fasemga.com',
      regards: invoiceEmail.regards || 'Best regards,',
      signature: invoiceEmail.signature || 'The FASE Team'
    };

    // Apply customizations if provided
    if (requestData.customizedEmailContent) {
      const customContent = requestData.customizedEmailContent;
      emailContent = {
        subject: customContent.subject?.replace('{invoiceNumber}', invoiceData.invoiceNumber) || emailContent.subject,
        dear: customContent[`dear${genderSuffix}`] || customContent.dear || emailContent.dear,
        deliveredText: customContent.delivered_text?.replace('{organizationName}', invoiceData.organizationName) || emailContent.deliveredText,
        instructionsText: customContent.instructions_text || emailContent.instructionsText,
        welcomeText: customContent.welcome_text || emailContent.welcomeText,
        contactText: customContent.contact_text || emailContent.contactText,
        regards: customContent.regards || emailContent.regards,
        signature: customContent.signature || emailContent.signature
      };
    }

    // Generate PDF invoice using the shared generator
    let pdfBase64 = requestData.pdfAttachment;
    let generatedTotal = invoiceData.totalAmount;

    if (!pdfBase64) {
      console.log('🧾 Generating invoice PDF...');

      let result;

      // Check if using new line-items format
      if (requestData.lineItems && Array.isArray(requestData.lineItems) && requestData.lineItems.length > 0) {
        console.log('Using line-items-first generation');

        result = await generateInvoiceFromLineItems({
          invoiceNumber: invoiceData.invoiceNumber,
          email: invoiceData.email,
          fullName: invoiceData.fullName,
          organizationName: invoiceData.organizationName,
          greeting: invoiceData.greeting,
          gender: invoiceData.gender,
          address: invoiceData.address,
          lineItems: requestData.lineItems,
          paymentCurrency: requestData.paymentCurrency || requestData.forceCurrency || 'EUR',
          userLocale: locale,
          generationSource: 'customer_request'
        });
      } else {
        // Legacy format
        console.log('Using legacy generation format');

        const invoiceGenerationData: InvoiceGenerationData = {
          invoiceNumber: invoiceData.invoiceNumber,
          invoiceType: 'regular',

          email: invoiceData.email,
          fullName: invoiceData.fullName,
          organizationName: invoiceData.organizationName,
          greeting: invoiceData.greeting,
          gender: invoiceData.gender,
          address: invoiceData.address,

          totalAmount: invoiceData.totalAmount,
          originalAmount: invoiceData.originalAmount,
          discountAmount: invoiceData.discountAmount,
          discountReason: invoiceData.discountReason,
          hasOtherAssociations,

          forceCurrency: requestData.forceCurrency,
          userLocale: locale,

          customLineItem: invoiceData.customLineItem,

          generationSource: 'customer_request',
          isPreview: isPreview
        };

        result = await generateInvoicePDF(invoiceGenerationData);
      }

      pdfBase64 = result.pdfBase64;
      generatedTotal = result.totalAmount;

      // Store currency conversion info for logging
      invoiceData.generatedCurrency = result.currency;
      invoiceData.convertedCurrency = result.convertedCurrency;
      invoiceData.convertedAmount = result.convertedAmount;
      invoiceData.exchangeRate = result.exchangeRate;
      invoiceData.bankDetails = result.bankDetails;
      invoiceData.totalAmount = result.totalAmount;
    }

    const emailData = {
      email: invoiceData.email,
      cc: requestData.cc,
      subject: emailContent.subject,
      invoiceHTML: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
            </div>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.dear},
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.deliveredText}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 25px 0;">
              ${emailContent.instructionsText}
            </p>
            
            ${emailContent.welcomeText ? `<p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.welcomeText}
            </p>` : ''}
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 15px 0;">
              ${emailContent.contactText}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 15px 0 0 0;">
              ${emailContent.regards}<br><br>
              <strong>${emailContent.signature}</strong>
            </p>
          </div>
        </div>
      `,
      invoiceNumber: invoiceData.invoiceNumber,
      organizationName: invoiceData.organizationName,
      totalAmount: invoiceData.totalAmount.toString(),
      pdfAttachment: pdfBase64,
      pdfFilename: requestData.pdfFilename || `Invoice-${invoiceData.invoiceNumber}.pdf`
    };

    // For preview mode, return preview data instead of sending email
    if (isPreview) {
      return NextResponse.json({
        success: true,
        preview: true,
        to: invoiceData.email || null,
        cc: requestData.cc || null,
        subject: emailContent.subject,
        htmlContent: emailData.invoiceHTML,
        textContent: null,
        pdfBase64: pdfBase64,
        attachments: [{ filename: emailData.pdfFilename, type: 'application/pdf' }],
        invoiceNumber: invoiceData.invoiceNumber,
        totalAmount: invoiceData.totalAmount,
        convertedCurrency: invoiceData.convertedCurrency,
        convertedAmount: invoiceData.convertedAmount
      });
    }

    // Email is required for actual sending
    if (!invoiceData.email || invoiceData.email.trim() === '') {
      return NextResponse.json(
        { error: 'Email address is required to send the invoice' },
        { status: 400 }
      );
    }

    // Call Firebase Function directly via HTTP for actual sending
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
    console.log('✅ Invoice delivery email sent successfully:', result);

    // Store PDF in Firebase Storage (invoice record created client-side)
    let pdfUrl: string | undefined;
    try {
      const uploadResult = await uploadInvoicePDF(
        pdfBase64,
        invoiceData.invoiceNumber,
        invoiceData.organizationName
      );
      pdfUrl = uploadResult.downloadURL;
      console.log('✅ Invoice PDF stored:', pdfUrl);
    } catch (storageError) {
      console.error('❌ Failed to store PDF:', storageError);
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice delivery email sent successfully',
      result: result,
      pdfUrl,
      invoiceNumber: invoiceData.invoiceNumber,
      totalAmount: invoiceData.totalAmount,
      convertedCurrency: invoiceData.convertedCurrency,
      convertedAmount: invoiceData.convertedAmount
    });

  } catch (error: any) {
    console.error('Function call failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}