import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';
import { convertCurrency, detectCurrency } from '../../../lib/currency-conversion';

// Force Node.js runtime to enable file system access
export const runtime = 'nodejs';

// Initialize Stripe
let stripe: Stripe | null = null;

const initializeStripe = () => {
  if (!stripe) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    
    stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripe;
};

// Load email translations from JSON files
function loadEmailTranslations(language: string): any {
  try {
    const filePath = path.join(process.cwd(), 'messages', language, 'email.json');
    console.log('🔍 DEBUG: Attempting to load file from:', filePath);
    console.log('🔍 DEBUG: process.cwd():', process.cwd());
    console.log('🔍 DEBUG: File exists?', fs.existsSync(filePath));
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(fileContent);
    console.log('🔍 DEBUG: Successfully parsed file, keys:', Object.keys(parsed));
    return parsed;
  } catch (error) {
    console.log('🔍 DEBUG: Error loading file:', error);
    // Fallback to English if file not found
    if (language !== 'en') {
      console.log('🔍 DEBUG: Falling back to English');
      return loadEmailTranslations('en');
    }
    // Return empty object if even English fails
    console.log('🔍 DEBUG: Returning empty object as final fallback');
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    // Read data from request body instead of hardcoded values
    const requestData = await request.json();

    // Check for MGA Rendezvous pass reservation
    // IMPORTANT: Only keep RAW DATA - strip all pre-calculated amounts
    // The bank-transfer-invoice page and send-invoice-only API will calculate from scratch
    let rendezvousPassData = requestData.rendezvousPassReservation || null;
    if (rendezvousPassData) {
      rendezvousPassData = {
        reserved: rendezvousPassData.reserved,
        passCount: rendezvousPassData.passCount,
        organizationType: rendezvousPassData.organizationType,
        isAsaseMember: rendezvousPassData.isAsaseMember || false,
        isFaseMember: true, // Always true for membership invoices
        attendees: rendezvousPassData.attendees || []
        // DELIBERATELY NOT including: passTotal, subtotal, vatAmount, vatRate
      };
    }

    const invoiceData = {
      email: requestData.email || "danielhpitt@gmail.com",
      fullName: requestData.fullName || "Daniel Pitt",
      organizationName: requestData.organizationName || "Sample Organization Ltd",
      totalAmount: requestData.totalAmount || 1500,
      userId: requestData.userId || "user-123",
      organizationType: requestData.organizationType || "MGA",
      grossWrittenPremiums: requestData.grossWrittenPremiums || "10-20m",
      hasOtherAssociations: requestData.hasOtherAssociations || false,
      greeting: requestData.greeting || requestData.fullName || "Daniel Pitt",
      gender: requestData.gender || "m", // "m" for masculine, "f" for feminine
      originalAmount: requestData.originalAmount || 1500,
      discountAmount: requestData.discountAmount || 0,
      discountReason: requestData.discountReason || "",
      address: requestData.address,
      customLineItem: requestData.customLineItem || null,
      rendezvousPassReservation: rendezvousPassData
    };

    // Validate required basic fields
    const requiredBasicFields = ['email', 'fullName', 'organizationName'];
    const missingBasicFields = [];
    
    for (const field of requiredBasicFields) {
      if (!invoiceData[field as keyof typeof invoiceData] || invoiceData[field as keyof typeof invoiceData].trim() === '') {
        missingBasicFields.push(field);
      }
    }

    if (missingBasicFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingBasicFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate required address fields
    if (!invoiceData.address || typeof invoiceData.address !== 'object') {
      return NextResponse.json(
        { error: 'Address object is required' },
        { status: 400 }
      );
    }

    const requiredAddressFields = ['line1', 'city', 'postcode', 'country'];
    const missingAddressFields = [];
    
    for (const field of requiredAddressFields) {
      if (!invoiceData.address[field] || invoiceData.address[field].trim() === '') {
        missingAddressFields.push(`address.${field}`);
      }
    }

    if (missingAddressFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required address fields: ${missingAddressFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if this is a preview request
    const isPreview = requestData.preview === true;
    
    if (isPreview) {
      console.log(`Generating email preview for ${invoiceData.email}...`, invoiceData);
    } else {
      console.log(`Sending membership acceptance email to ${invoiceData.email}...`, invoiceData);
    }
    
    // Generate 5-digit invoice number
    const invoiceNumber = "FASE-" + Math.floor(10000 + Math.random() * 90000);
    
    // Create Stripe checkout session for payment
    const stripeInstance = initializeStripe();
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const baseUrl = `${protocol}://${host}`;

    // Create product for Payment Link (persistent, no expiration)
    const product = await stripeInstance.products.create({
      name: `FASE Annual Membership`,
      description: `Annual membership for ${invoiceData.organizationName}`,
      metadata: {
        invoice_number: invoiceNumber,
        organization_name: invoiceData.organizationName,
        organization_type: invoiceData.organizationType || 'individual',
      }
    });

    // Create price for the product (annual subscription)
    const price = await stripeInstance.prices.create({
      currency: 'eur',
      product: product.id,
      unit_amount: invoiceData.totalAmount * 100, // Convert euros to cents
      recurring: {
        interval: 'year',
      }
    });

    // Create Payment Link (persistent, no expiration)
    const paymentLink = await stripeInstance.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        }
      ],
      metadata: {
        invoice_number: invoiceNumber,
        organization_name: invoiceData.organizationName,
        organization_type: invoiceData.organizationType || 'individual',
        user_id: invoiceData.userId || '',
        user_email: invoiceData.email,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${baseUrl}/payment-succeeded?payment_link_id={PAYMENT_LINK_ID}&invoice=${invoiceNumber}`,
        }
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto'
    });

    const stripeLink = paymentLink.url;
    
    console.log('✅ Stripe payment link generated:', stripeLink);
    
    // Set base URL for bank transfer links
    const emailBaseUrl = 'https://fasemga.com';
    
    // Detect language for email content
    const userLocale = requestData.userLocale || requestData.locale || requestData.language || 'en';
    const supportedLocales = ['en', 'fr', 'de', 'es', 'it', 'nl'];
    const locale = supportedLocales.includes(userLocale) ? userLocale : 'en';
    console.log('🔍 DEBUG: Detected locale:', locale, 'from userLocale:', userLocale);
    
    // Load email content translations from JSON files
    console.log('🔍 DEBUG: Loading translations for locale:', locale);
    const emailTranslations = loadEmailTranslations(locale);
    console.log('🔍 DEBUG: Loaded translations object:', JSON.stringify(emailTranslations, null, 2));
    const adminEmail = emailTranslations.membership_acceptance_admin || {};
    console.log('🔍 DEBUG: Admin email section:', JSON.stringify(adminEmail, null, 2));
    
    // Apply template variable replacements with gender-aware content
    const genderSuffix = invoiceData.gender === 'f' ? '_f' : '_m';
    const genderAwareDear = adminEmail[`dear${genderSuffix}`] || adminEmail.dear;
    const genderAwareSubject = adminEmail[`subject${genderSuffix}`] || adminEmail.subject;
    const genderAwareWelcome = adminEmail[`welcome${genderSuffix}`] || adminEmail.welcome;
    const genderAwareWelcomeText = adminEmail[`welcome_text${genderSuffix}`] || adminEmail.welcome_text;
    
    // Use appropriate payment text based on whether rendezvous passes are included
    const hasRendezvousPasses = rendezvousPassData && rendezvousPassData.reserved;
    let paymentText = hasRendezvousPasses
      ? (adminEmail.payment_text_with_rendezvous || "To complete your membership and access our members' portal, please remit your membership dues of €{totalAmount}. This includes your MGA Rendezvous 2026 pass reservation. Your annual membership will then incept with immediate effect.")
      : (adminEmail.payment_text || "To complete your membership and access our members' portal, please remit your membership dues of €{totalAmount}. Your annual membership will then incept with immediate effect.");
    paymentText = paymentText.replace('{totalAmount}', invoiceData.totalAmount.toString());

    let emailContent = {
      subject: genderAwareSubject || "FASE - Membership Approved",
      welcome: genderAwareWelcome || "Membership Approved",
      dear: genderAwareDear || "Dear",
      welcomeText: genderAwareWelcomeText?.replace('{organizationName}', `<strong>${invoiceData.organizationName}</strong>`) || `Your application for <strong>${invoiceData.organizationName}</strong> has been approved.`,
      paymentText,
      paymentButton: adminEmail.payment_button || "Pay membership dues",
      bankTransferText: adminEmail.bank_transfer_text || "If you would prefer to pay with bank transfer, please follow {LINK}this link{/LINK}",
      bankTransferLink: adminEmail.bank_transfer_link || "Generate bank transfer invoice",
      engagement: adminEmail.engagement || "We look forward to your engagement in FASE. Please do not hesitate to contact us at admin@fasemga.com with any questions.",
      regards: adminEmail.regards || "Best regards,",
      signature: adminEmail.signature || "William",
      title: adminEmail.title || "Executive Director, FASE",
      name: adminEmail.name || "William Pitt",
      email: adminEmail.email || "william.pitt@fasemga.com"
    };

    // Override with customized content if provided
    if (requestData.customizedEmailContent) {
      const customContent = requestData.customizedEmailContent;
      
      // Helper function to replace variables in customized content
      const replaceVariables = (text: string) => {
        if (!text) return text;
        return text
          .replace(/{organizationName}/g, invoiceData.organizationName)
          .replace(/{fullName}/g, invoiceData.fullName)
          .replace(/{totalAmount}/g, invoiceData.totalAmount.toString());
      };
      
      emailContent = {
        subject: replaceVariables(customContent.subject) || emailContent.subject,
        welcome: replaceVariables(customContent.welcome) || emailContent.welcome,
        dear: replaceVariables(customContent.dear) || emailContent.dear,
        welcomeText: replaceVariables(customContent.welcome_text)?.replace(invoiceData.organizationName, `<strong>${invoiceData.organizationName}</strong>`) || emailContent.welcomeText,
        paymentText: replaceVariables(customContent.payment_text) || emailContent.paymentText,
        paymentButton: replaceVariables(customContent.payment_button) || emailContent.paymentButton,
        bankTransferText: replaceVariables(customContent.bank_transfer_text) || emailContent.bankTransferText,
        bankTransferLink: replaceVariables(customContent.bank_transfer_link) || emailContent.bankTransferLink,
        engagement: replaceVariables(customContent.engagement) || emailContent.engagement,
        regards: replaceVariables(customContent.regards) || emailContent.regards,
        signature: replaceVariables(customContent.signature) || emailContent.signature,
        title: replaceVariables(customContent.title) || emailContent.title,
        name: replaceVariables(customContent.name) || emailContent.name,
        email: replaceVariables(customContent.email) || emailContent.email
      };
    }

    // Convert currency based on customer country or force currency override
    const currencyConversion = await convertCurrency(invoiceData.totalAmount, invoiceData.address.country, requestData.forceCurrency);

    const emailData = {
      email: invoiceData.email,
      cc: requestData.cc, // Add CC support
      subject: emailContent.subject,
      invoiceHTML: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
            </div>
            <h2 style="color: #2D5574; margin: 0 0 20px 0; font-size: 20px;">${emailContent.welcome}</h2>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.dear} ${invoiceData.greeting},
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.welcomeText}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 25px 0;">
              ${emailContent.paymentText}
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${stripeLink}" style="display: inline-block; background-color: #2D5574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">${emailContent.paymentButton}</a>
            </div>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 10px 0;">
              ${emailContent.bankTransferText
                .replace('{LINK}', `<a href="${emailBaseUrl}/bank-transfer-invoice?originalAmount=${invoiceData.originalAmount}&amount=${currencyConversion.roundedAmount}&currency=${currencyConversion.convertedCurrency}&orgName=${encodeURIComponent(invoiceData.organizationName)}&fullName=${encodeURIComponent(invoiceData.fullName)}&addressLine1=${encodeURIComponent(invoiceData.address?.line1 || '')}&addressLine2=${encodeURIComponent(invoiceData.address?.line2 || '')}&city=${encodeURIComponent(invoiceData.address?.city || '')}&county=${encodeURIComponent(invoiceData.address?.county || '')}&postcode=${encodeURIComponent(invoiceData.address?.postcode || '')}&country=${encodeURIComponent(invoiceData.address?.country || '')}&locale=${locale}&gender=${invoiceData.gender}&email=${encodeURIComponent(invoiceData.email)}&hasOtherAssociations=${invoiceData.hasOtherAssociations || false}&organizationType=${encodeURIComponent(invoiceData.organizationType)}&gwpBand=${encodeURIComponent(invoiceData.grossWrittenPremiums || '<10m')}${invoiceData.customLineItem && invoiceData.customLineItem.enabled ? `&customLineItem=${encodeURIComponent(JSON.stringify(invoiceData.customLineItem))}` : ''}${hasRendezvousPasses ? `&rendezvousPass=${encodeURIComponent(JSON.stringify(rendezvousPassData))}` : ''}" style="color: #2D5574; text-decoration: underline;">`)
                .replace('{/LINK}', '</a>')}.
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 15px 0;">
              ${emailContent.engagement}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 15px 0 0 0;">
              ${emailContent.regards}<br><br>
              <strong>William</strong><br><br>
              William Pitt<br>
              Executive Director, FASE<br>
              <a href="mailto:william.pitt@fasemga.com" style="color: #2D5574;">william.pitt@fasemga.com</a>
            </p>
          </div>
        </div>
      `,
      invoiceNumber: invoiceNumber,
      organizationName: invoiceData.organizationName,
      totalAmount: invoiceData.totalAmount.toString()
      // PDF attachment removed - invoice available via bank transfer page only
    };

    // For preview mode, return preview data instead of sending email
    if (isPreview) {
      return NextResponse.json({
        success: true,
        preview: true,
        to: invoiceData.email,
        cc: requestData.cc || null,
        subject: emailContent.subject,
        htmlContent: emailData.invoiceHTML,
        textContent: null, // Could add plain text version
        attachments: [], // No PDF attachments in email
        invoiceNumber: invoiceNumber,
        totalAmount: invoiceData.totalAmount,
        stripeLink: stripeLink
      });
    }

    // Call Firebase Function directly via HTTP (server-side) for actual sending
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
    console.log('✅ Membership acceptance email sent successfully:', result);
    
    
    return NextResponse.json({
      success: true,
      message: 'Membership invoice email sent successfully with Stripe payment link',
      result: result,
      stripeLink: stripeLink
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