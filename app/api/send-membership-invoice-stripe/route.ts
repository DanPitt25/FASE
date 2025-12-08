import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';

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
    const invoiceData = {
      email: requestData.email || "danielhpitt@gmail.com",
      fullName: requestData.fullName || "Daniel Pitt", 
      organizationName: requestData.organizationName || "Sample Organization Ltd",
      totalAmount: requestData.totalAmount || 1500,
      userId: requestData.userId || "user-123",
      membershipType: requestData.membershipType || "corporate",
      organizationType: requestData.organizationType || "MGA",
      grossWrittenPremiums: requestData.grossWrittenPremiums || "10-20m",
      hasOtherAssociations: requestData.hasOtherAssociations || false,
      greeting: requestData.greeting || requestData.fullName || "Daniel Pitt",
      gender: requestData.gender || "m", // "m" for masculine, "f" for feminine
      originalAmount: requestData.originalAmount || 1500,
      discountAmount: requestData.discountAmount || 0,
      discountReason: requestData.discountReason || "",
      address: requestData.address
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

    const session = await stripeInstance.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `FASE Membership Invoice ${invoiceNumber}`,
              description: `Payment for ${invoiceData.organizationName} membership`,
            },
            unit_amount: invoiceData.totalAmount * 100, // Convert euros to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoice_number: invoiceNumber,
        organization_name: invoiceData.organizationName,
        organization_type: invoiceData.organizationType || 'individual',
        membership_type: invoiceData.membershipType,
        user_id: invoiceData.userId || '',
        user_email: invoiceData.email,
      },
      success_url: `${baseUrl}/payment-succeeded?session_id={CHECKOUT_SESSION_ID}&invoice=${invoiceNumber}`,
      cancel_url: `${baseUrl}/payment-failed?invoice=${invoiceNumber}`,
      customer_email: invoiceData.email,
    });

    const stripeLink = session.url;
    
    console.log('✅ Stripe payment link generated:', stripeLink);
    
    // Detect language for email content
    const userLocale = requestData.userLocale || requestData.locale || 'en';
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
    
    const emailContent = {
      subject: genderAwareSubject || "Welcome to FASE - Membership Approved",
      welcome: genderAwareWelcome || "Welcome to FASE",
      dear: genderAwareDear || "Dear",
      welcomeText: genderAwareWelcomeText?.replace('{organizationName}', `<strong>${invoiceData.organizationName}</strong>`) || `Welcome to FASE. Your application for <strong>${invoiceData.organizationName}</strong> has been approved.`,
      paymentText: adminEmail.payment_text?.replace('{totalAmount}', invoiceData.totalAmount.toString()) || `To complete your membership and access our members' portal, please remit your membership dues of €${invoiceData.totalAmount}. Your annual membership will then incept with immediate effect.`,
      paymentButton: adminEmail.payment_button || "Pay membership dues",
      bankTransferText: adminEmail.bank_transfer_text || "If you would prefer to pay with bank transfer, please follow {LINK}this link{/LINK}",
      bankTransferLink: adminEmail.bank_transfer_link || "Generate bank transfer invoice", 
      engagement: adminEmail.engagement || "We look forward to your engagement in FASE. Please do not hesitate to contact us at admin@fasemga.com with any questions.",
      regards: adminEmail.regards || "Best regards,",
      signature: adminEmail.signature || "Aline",
      title: adminEmail.title || "Chief Operating Officer, FASE"
    };

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
                .replace('{LINK}', `<a href="${baseUrl}/bank-transfer-invoice?userId=${invoiceData.userId}&amount=${invoiceData.totalAmount}&orgName=${encodeURIComponent(invoiceData.organizationName)}" style="color: #2D5574; text-decoration: underline;">`)
                .replace('{/LINK}', '</a>')}.
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 15px 0;">
              ${emailContent.engagement}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 15px 0 0 0;">
              ${emailContent.regards}<br><br>
              <strong>Aline</strong><br><br>
              Aline Sullivan<br>
              Chief Operating Officer, FASE<br>
              <a href="mailto:aline.sullivan@fasemga.com" style="color: #2D5574;">aline.sullivan@fasemga.com</a>
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