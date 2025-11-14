import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

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
    // Read data from request body
    const requestData = await request.json();
    const testData = {
      email: requestData.email || "danielhpitt@gmail.com",
      fullName: requestData.fullName || "Daniel Pitt", 
      organizationName: requestData.organizationName || "Test Organization Ltd",
      greeting: requestData.greeting || requestData.fullName || "Daniel Pitt",
      gender: requestData.gender || "m", // "m" for masculine, "f" for feminine
    };

    // Validate required basic fields
    const requiredBasicFields = ['email', 'fullName', 'organizationName'];
    const missingBasicFields = [];
    
    for (const field of requiredBasicFields) {
      if (!testData[field as keyof typeof testData] || testData[field as keyof typeof testData].trim() === '') {
        missingBasicFields.push(field);
      }
    }

    if (missingBasicFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingBasicFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if this is a preview request
    const isPreview = requestData.preview === true;
    
    if (isPreview) {
      console.log(`Generating welcome email preview for ${testData.email}...`, testData);
    } else {
      console.log(`Sending welcome email to ${testData.email}...`, testData);
    }
    
    // Detect language
    const userLocale = requestData.userLocale || 'en';
    const supportedLocales = ['en', 'fr', 'de', 'es', 'it', 'nl'];
    const locale = supportedLocales.includes(userLocale) ? userLocale : 'en';

    // Load email content translations from JSON files
    const emailTranslations = loadEmailTranslations(locale);
    const welcomeEmail = emailTranslations.payment_confirmed_welcome || {};
    
    // Gender-aware translation selection with error handling
    const getGenderedText = (baseKey: string, fallback: string) => {
      try {
        const genderKey = testData.gender === 'f' ? `${baseKey}_f` : `${baseKey}_m`;
        return welcomeEmail[genderKey] || welcomeEmail[baseKey] || fallback;
      } catch (error) {
        console.warn(`Error getting gendered text for ${baseKey}:`, error);
        return fallback;
      }
    };

    const emailContent = {
      subject: getGenderedText('subject', "Welcome to FASE"),
      welcome: getGenderedText('welcome', "Welcome to FASE!"),
      dear: getGenderedText('dear', "Dear"),
      congratulations: (getGenderedText('congratulations', "We're pleased to welcome you to FASE. Your membership is now active.") || "").replace('{organizationName}', `<strong>${testData.organizationName}</strong>`),
      portalDescription: welcomeEmail.portal_description || "Your member portal is now ready. Here you can showcase your company with a professional profile, download FASE branding materials for your own marketing, and explore the full range of member benefits available to you.",
      logoInfo: welcomeEmail.logo_info || "As a FASE member, you are entitled to display the FASE logo on your websites and marketing materials. You can download both horizontal and vertical logo versions from your portal. To be featured in our member directory, please send your company logo and a brief business summary (max 500 characters) to admin@fasemga.com.",
      accessPortal: welcomeEmail.access_portal || "Access Your Member Portal",
      portalUrl: "https://fasemga.com/member-portal",
      support: welcomeEmail.support || "If you need any assistance getting started, our team is here to help.",
      regards: welcomeEmail.regards || "Best regards,",
      signature: welcomeEmail.signature || "The FASE Team",
      contactEmail: "admin@fasemga.com"
    };

    const emailData = {
      email: testData.email,
      cc: requestData.cc,
      subject: emailContent.subject,
      welcomeHTML: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
            </div>
            <h2 style="color: #2D5574; margin: 0 0 20px 0; font-size: 20px;">${emailContent.welcome}</h2>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.dear} ${testData.greeting},
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 20px 0;">
              ${emailContent.congratulations}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 20px 0 20px 0;">
              ${emailContent.portalDescription}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 20px 0 25px 0;">
              ${emailContent.logoInfo}
            </p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${emailContent.portalUrl}" style="display: inline-block; background-color: #2D5574; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">${emailContent.accessPortal}</a>
            </div>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 15px 0;">
              ${emailContent.support}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 15px 0 0 0;">
              ${emailContent.regards}<br><br>
              <strong>${emailContent.signature}</strong><br>
              <a href="mailto:${emailContent.contactEmail}" style="color: #2D5574;">${emailContent.contactEmail}</a>
            </p>
          </div>
        </div>
      `,
      organizationName: testData.organizationName
    };

    // For preview mode, return preview data instead of sending email
    if (isPreview) {
      return NextResponse.json({
        success: true,
        preview: true,
        to: testData.email,
        cc: requestData.cc || null,
        subject: emailContent.subject,
        htmlContent: emailData.welcomeHTML,
        textContent: null,
        pdfUrl: null,
        attachments: []
      });
    }

    // Send email directly using Resend API (following existing pattern from invite email)
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not configured');
    }

    try {
      console.log('Sending welcome email via Resend...');
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'FASE <aline.sullivan@fasemga.com>',
          to: testData.email,
          cc: requestData.cc || undefined,
          subject: emailContent.subject,
          html: emailData.welcomeHTML,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Welcome email sent to ${testData.email} via Resend:`, result.id);
      
      return NextResponse.json({
        success: true,
        message: 'Welcome email sent successfully',
        emailId: result.id,
        to: testData.email,
        subject: emailContent.subject
      });
    } catch (emailError: any) {
      console.error('Failed to send welcome email via Resend:', emailError);
      throw new Error(`Email sending failed: ${emailError.message}`);
    }

  } catch (error: any) {
    console.error('Function call failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}