import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { generateInvoicePDF, InvoiceGenerationData } from '../../../lib/invoice-pdf-generator';
import { createInvoiceRecord } from '../../../lib/firestore';
import { getCurrencySymbol } from '../../../lib/currency-conversion';
import { AdminAuditLogger } from '../../../lib/admin-audit-logger';

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
    
    // Determine lost invoice flag early for currency conversion logic
    const isLostInvoice = requestData.isLostInvoice || false;
    
    // Create payment link with amount and PayPal email (can be different from recipient email)
    const paypalEmail = requestData.paypalEmail || invoiceData.email; // Use separate PayPal email if provided
    const paypalParams = new URLSearchParams({
      amount: invoiceData.totalAmount.toString(),
      email: paypalEmail,
      organization: invoiceData.organizationName
    });
    const paypalLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://fasemga.com'}/payment?${paypalParams.toString()}`;
    
    console.log('✅ Payment link generated:', paypalLink);
    
    // Detect language for PDF generation
    const userLocale = requestData.userLocale || 'en';
    const supportedLocales = ['en', 'fr', 'de', 'es', 'it', 'nl'];
    const locale = supportedLocales.includes(userLocale) ? userLocale : 'en';
    
    // Determine email template type
    const template = requestData.template || 'invoice';
    
    // Currency conversion for email content (PDF generator handles its own conversion)
    let currencyConversion;
    if (isLostInvoice) {
      currencyConversion = {
        convertedCurrency: 'EUR',
        roundedAmount: invoiceData.totalAmount,
        conversionRate: 1
      };
    } else {
      const { convertCurrency } = await import('../../../lib/currency-conversion');
      currencyConversion = await convertCurrency(invoiceData.totalAmount, invoiceData.address.country, requestData.forceCurrency);
    }
    
    // Generate PDF invoice using the shared generator
    let pdfAttachment: string | null = null;
    try {
      console.log('🧾 Generating membership invoice PDF using shared generator...');
      
      const invoiceGenerationData: InvoiceGenerationData = {
        invoiceNumber: invoiceNumber,
        invoiceType: template === 'followup' ? 'followup' : 
                     isLostInvoice ? 'lost_invoice' : 'regular',
        isLostInvoice: isLostInvoice,
        
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
        hasOtherAssociations: invoiceData.hasOtherAssociations,
        
        membershipType: invoiceData.membershipType,
        organizationType: invoiceData.organizationType,
        grossWrittenPremiums: invoiceData.grossWrittenPremiums,
        userId: invoiceData.userId,
        
        forceCurrency: requestData.forceCurrency,
        userLocale: locale,
        
        generationSource: 'admin_portal',
        isPreview: isPreview
      };

      const result = await generateInvoicePDF(invoiceGenerationData);
      pdfAttachment = result.pdfBase64;
      
    } catch (pdfError: any) {
      console.error('Failed to generate branded PDF:', pdfError);
      console.error('PDF Error stack:', pdfError.stack);
      // Continue without PDF - will send HTML email instead
    }
    
    // Load email content translations from JSON files
    const emailTranslations = loadEmailTranslations(locale);
    
    let emailContent: any;
    
    if (template === 'followup') {
      // Follow-up email template
      const followupEmail = emailTranslations.membership_followup || {};
      
      // Apply gender-aware content for follow-up
      const genderSuffix = invoiceData.gender === 'f' ? '_f' : '_m';
      const genderAwareDear = followupEmail[`dear${genderSuffix}`] || followupEmail.dear || "Dear {fullName},";
      
      emailContent = {
        subject: (followupEmail.subject || "Reminder: Outstanding membership dues for {organizationName}").replace('{organizationName}', invoiceData.organizationName),
        dear: genderAwareDear.replace('{fullName}', invoiceData.greeting || invoiceData.fullName),
        intro: (followupEmail.intro || "We have yet to receive settlement of {organizationName}'s member dues as a founder member of FASE. Please find attached our updated invoice.").replace('{organizationName}', invoiceData.organizationName),
        portalAccess: followupEmail.portal_access || "As soon as we receive payment, we will be happy to share details on how to access the resources contained in our members' portal.",
        questions: followupEmail.questions || "If you have any questions relating to your membership, please do not hesitate to contact us.",
        regards: followupEmail.regards || "Best regards,",
        signature: followupEmail.signature || "Aline Sullivan",
        title: followupEmail.title || "Chief Operating Officer",
        company: followupEmail.company || "FASE B.V.",
        address: followupEmail.address || "Herengracht 124-128\n1015 BT Amsterdam"
      };
    } else if (isLostInvoice) {
      // Lost invoice template using translations
      const lostInvoiceEmail = emailTranslations.lost_invoice || {};
      
      // Apply gender-aware content for lost invoice
      const genderSuffix = invoiceData.gender === 'f' ? '_f' : '_m';
      const genderAwareDear = lostInvoiceEmail[`dear${genderSuffix}`] || lostInvoiceEmail.dear || "Dear";
      
      // Format the custom invoice date
      const customInvoiceDate = requestData.invoiceDate || '2025-11-05';
      const formattedDate = new Date(customInvoiceDate).toLocaleDateString(locale, { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      
      // Replace placeholder date in intro text with custom date
      const introText = (lostInvoiceEmail.intro_text || "I am writing to follow up on your membership dues for FASE (Fédération des Agences de Souscription Européennes), issued on {invoiceDate}, which remains outstanding. Please let me know the status of this payment.")
        .replace('{invoiceDate}', formattedDate);
      
      emailContent = {
        subject: lostInvoiceEmail.subject || "Outstanding Invoice for FASE",
        welcome: lostInvoiceEmail.welcome || "INVOICE",
        dear: genderAwareDear,
        welcomeText: introText,
        paymentText: lostInvoiceEmail.follow_up_text || "We look forward to activating your FASE membership, providing you with access to the member portal, and inviting you to our upcoming events. If you require any additional documentation or have questions that would assist in processing the payment, please feel free to reach out to me or simply contact admin@fasemga.com. We are now able to provide European banking details, so just let me know if you need those.",
        engagement: lostInvoiceEmail.closing_text || "Thank you for your time in addressing this. We appreciate your prompt response.",
        regards: lostInvoiceEmail.regards || "Best regards,",
        signature: lostInvoiceEmail.signature || "Aline Sullivan",
        title: lostInvoiceEmail.title || "Chief Operating Officer, FASE",
        email: lostInvoiceEmail.email || "aline.sullivan@fasemga.com"
      };

      // Apply customizations for lost invoice if provided
      if (requestData.customizedEmailContent) {
        const customContent = requestData.customizedEmailContent;
        const customInvoiceDate = requestData.invoiceDate || '2025-11-05';
        const dateLocales = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT' };
        const dateLocale = dateLocales[locale as keyof typeof dateLocales] || 'en-GB';
        const formattedDate = new Date(customInvoiceDate).toLocaleDateString(dateLocale);
        
        emailContent = {
          subject: customContent.subject || emailContent.subject,
          welcome: customContent.welcome || emailContent.welcome,
          dear: customContent[`dear${genderSuffix}`] || customContent.dear || emailContent.dear,
          welcomeText: customContent.intro_text?.replace('{invoiceDate}', formattedDate) || emailContent.welcomeText,
          paymentText: customContent.follow_up_text || emailContent.paymentText,
          engagement: customContent.closing_text || emailContent.engagement,
          regards: customContent.regards || emailContent.regards,
          signature: customContent.signature || emailContent.signature,
          title: customContent.title || emailContent.title,
          email: customContent.email || emailContent.email
        };
      }
    } else {
      // Original invoice template
      const adminEmail = emailTranslations.membership_acceptance_admin || {};
      
      // Apply template variable replacements with gender-aware content
      const genderSuffix = invoiceData.gender === 'f' ? '_f' : '_m';
      const genderAwareDear = adminEmail[`dear${genderSuffix}`] || adminEmail.dear || "Dear";
      const genderAwareSubject = adminEmail[`subject${genderSuffix}`] || adminEmail.subject || "Welcome to FASE - Membership Approved";
      const genderAwareWelcome = adminEmail[`welcome${genderSuffix}`] || adminEmail.welcome || "Welcome to FASE";
      const genderAwareWelcomeText = adminEmail[`welcome_text${genderSuffix}`] || adminEmail.welcome_text || "Welcome to FASE. Your application for {organizationName} has been approved.";
    
      // Create payment text with currency conversion
      let paymentText = adminEmail.payment_text || "To complete your membership, please remit payment of {totalAmount} using one of the following methods:";
      
      // Replace the currency amount - handle both €{totalAmount} pattern and {totalAmount} pattern
      if (currencyConversion.convertedCurrency === 'EUR') {
        const eurAmount = `€${invoiceData.totalAmount}`;
        paymentText = paymentText.replace('€{totalAmount}', eurAmount).replace('{totalAmount}', eurAmount);
      } else {
        // Just show the converted amount
        const convertedSymbol = getCurrencySymbol(currencyConversion.convertedCurrency);
        const convertedAmount = `${convertedSymbol}${currencyConversion.roundedAmount}`;
        paymentText = paymentText.replace('€{totalAmount}', convertedAmount).replace('{totalAmount}', convertedAmount);
      }
      
      emailContent = {
        subject: genderAwareSubject,
        welcome: genderAwareWelcome,
        dear: genderAwareDear,
        welcomeText: genderAwareWelcomeText.replace('{organizationName}', `<strong>${invoiceData.organizationName}</strong>`),
        paymentText,
        paymentOptions: adminEmail.payment_options || "Payment Options:",
        paypalOption: adminEmail.paypal_option || "PayPal:",
        payOnline: adminEmail.pay_online || "Pay Online",
        bankTransfer: adminEmail.bank_transfer || "Bank Transfer:",
        invoiceAttached: adminEmail.invoice_attached || "Invoice attached with payment details",
        engagement: adminEmail.engagement || "We look forward to your engagement in FASE and we'll be in touch very shortly with a link to our member portal. In the interim, please contact admin@fasemga.com with any questions.",
        regards: adminEmail.regards || "Best regards,",
        signature: adminEmail.signature || "Aline Sullivan",
        title: adminEmail.title || "Chief Operating Officer, FASE"
      };
    }

    // Override with customized content if provided
    if (requestData.customizedEmailContent) {
      const customContent = requestData.customizedEmailContent;
      emailContent = {
        subject: customContent.subject || emailContent.subject,
        welcome: customContent.welcome || emailContent.welcome,
        dear: customContent.dear || emailContent.dear,
        welcomeText: customContent.welcome_text?.replace('{organizationName}', `<strong>${invoiceData.organizationName}</strong>`) || emailContent.welcomeText,
        paymentText: customContent.payment_text?.replace('{totalAmount}', currencyConversion.convertedCurrency === 'EUR' ? `€${invoiceData.totalAmount}` : `${getCurrencySymbol(currencyConversion.convertedCurrency)}${currencyConversion.roundedAmount}`) || emailContent.paymentText,
        paymentOptions: emailContent.paymentOptions,
        paypalOption: emailContent.paypalOption,
        payOnline: customContent.payment_button || emailContent.payOnline,
        bankTransfer: emailContent.bankTransfer,
        invoiceAttached: customContent.bank_transfer_text || emailContent.invoiceAttached,
        engagement: customContent.engagement || emailContent.engagement,
        regards: customContent.regards || emailContent.regards,
        signature: customContent.signature || emailContent.signature,
        title: customContent.title || emailContent.title
      };
    }

    // Generate HTML based on template
    let invoiceHTML: string;
    
    if (template === 'followup') {
      // Follow-up email HTML
      invoiceHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
            </div>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.dear}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.intro}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.portalAccess}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 25px 0;">
              ${emailContent.questions}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 0 0;">
              ${emailContent.regards}<br><br>
              <strong>${emailContent.signature}</strong><br>
              ${emailContent.title}<br>
              ${emailContent.company}<br><br>
              ${emailContent.address.replace('\n', '<br>')}
            </p>
          </div>
        </div>
      `;
    } else if (isLostInvoice) {
      // Lost invoice email HTML - specific format
      invoiceHTML = `
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
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 15px 0;">
              ${emailContent.engagement}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 15px 0 0 0;">
              ${emailContent.regards}<br><br>
              <strong>Aline</strong><br><br>
              ${emailContent.signature}<br>
              ${emailContent.title}<br>
              <a href="mailto:aline.sullivan@fasemga.com" style="color: #2D5574;">aline.sullivan@fasemga.com</a>
            </p>
          </div>
        </div>
      `;
    } else {
      // Original invoice email HTML
      invoiceHTML = `
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
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
              <h3 style="color: #2D5574; margin: 0 0 15px 0; font-size: 16px;">${emailContent.paymentOptions}</h3>
              
              <p style="margin: 0 0 10px 0; font-size: 15px;">
                <strong>1. ${emailContent.paypalOption}</strong> <a href="${paypalLink}" style="color: #2D5574; text-decoration: none;">${emailContent.payOnline}</a>
              </p>
              
              <p style="margin: 0; font-size: 15px;">
                <strong>2. ${emailContent.bankTransfer}</strong> ${emailContent.invoiceAttached}
              </p>
            </div>
            
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
      `;
    }

    const emailData = {
      email: invoiceData.email,
      cc: requestData.cc, // Add CC support
      subject: emailContent.subject,
      invoiceHTML,
      invoiceNumber: invoiceNumber,
      organizationName: invoiceData.organizationName,
      totalAmount: invoiceData.totalAmount.toString(),
      // Add PDF attachment if generated successfully AND not a lost invoice (lost invoices reference previous invoices)
      ...(pdfAttachment && !isLostInvoice && {
        pdfAttachment: pdfAttachment,
        pdfFilename: `FASE-Invoice-${invoiceNumber}.pdf`
      }),
      // Add uploaded attachment for lost invoices (recovered invoice files)
      ...(isLostInvoice && requestData.uploadedAttachment && {
        pdfAttachment: requestData.uploadedAttachment,
        pdfFilename: requestData.uploadedFilename || 'recovered-invoice.pdf'
      })
    };

    // For preview mode, return preview data instead of sending email
    if (isPreview) {
      // Create a temporary file URL for preview
      let filePreviewUrl = null;
      let attachmentsList: string[] = [];
      
      if (pdfAttachment && !isLostInvoice) {
        // Generated PDF for regular invoices
        filePreviewUrl = `data:application/pdf;base64,${pdfAttachment}`;
        attachmentsList = ['Generated Invoice PDF'];
      } else if (isLostInvoice && requestData.uploadedAttachment) {
        // Uploaded file for lost invoices
        const mimeType = requestData.uploadedFilename?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 
                        requestData.uploadedFilename?.toLowerCase().match(/\.(jpg|jpeg)$/) ? 'image/jpeg' :
                        requestData.uploadedFilename?.toLowerCase().endsWith('.png') ? 'image/png' : 'application/octet-stream';
        filePreviewUrl = `data:${mimeType};base64,${requestData.uploadedAttachment}`;
        attachmentsList = [requestData.uploadedFilename || 'Recovered Invoice'];
      }
      
      return NextResponse.json({
        success: true,
        preview: true,
        to: invoiceData.email,
        cc: requestData.cc || null,
        subject: emailContent.subject,
        htmlContent: emailData.invoiceHTML,
        textContent: null, // Could add plain text version
        pdfUrl: filePreviewUrl,
        attachments: attachmentsList,
        invoiceNumber: invoiceNumber,
        totalAmount: invoiceData.totalAmount
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
    
    // Log email audit trail (only if not preview mode)
    if (!isPreview) {
      try {
        const emailType = template === 'followup' ? 'membership_followup' : 
                         isLostInvoice ? 'lost_invoice' : 'membership_acceptance';
        
        await AdminAuditLogger.logEmailSent({
          adminUserId: 'admin_portal', // TODO: Pass actual admin user ID from request
          action: `email_sent_${emailType}`,
          success: true,
          emailData: {
            toEmail: invoiceData.email,
            toName: invoiceData.fullName,
            ccEmails: requestData.cc ? [requestData.cc] : undefined,
            organizationName: invoiceData.organizationName,
            subject: emailContent.subject,
            emailType: emailType,
            htmlContent: emailData.invoiceHTML,
            emailLanguage: locale,
            templateUsed: template || 'invoice',
            customizedContent: !!requestData.customizedEmailContent,
            attachments: pdfAttachment ? [{
              filename: `FASE-Invoice-${invoiceNumber}.pdf`,
              type: 'pdf' as const,
              size: undefined // PDF size not available here
            }] : [],
            invoiceNumber: invoiceNumber,
            emailServiceId: result.id,
            invoiceAmount: invoiceData.totalAmount,
            currency: currencyConversion.convertedCurrency,
            paymentInstructions: 'Bank transfer or PayPal'
          }
        });
        console.log('✅ Email audit logged successfully');
      } catch (auditError) {
        console.error('❌ Failed to log email audit:', auditError);
        // Don't fail the request if audit logging fails
      }
    }
    
    // Log invoice to database after successful sending
    try {
      const invoiceType = template === 'followup' ? 'followup' : (isLostInvoice ? 'lost_invoice' : 'regular');
      await createInvoiceRecord({
        invoiceNumber,
        recipientEmail: invoiceData.email,
        recipientName: invoiceData.fullName,
        organizationName: invoiceData.organizationName,
        amount: invoiceData.totalAmount,
        currency: currencyConversion.convertedCurrency,
        type: invoiceType,
        status: 'sent',
        isLostInvoice,
        sentAt: new Date(),
        emailId: result.id || undefined,
        pdfGenerated: !!pdfAttachment
      });
      console.log('✅ Invoice logged to database:', invoiceNumber);
    } catch (dbError) {
      console.error('❌ Failed to log invoice to database:', dbError);
      // Don't fail the request if database logging fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'Membership invoice email sent successfully',
      result: result
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