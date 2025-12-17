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
      console.log(`Generating member portal welcome email preview for ${testData.email}...`, testData);
    } else {
      console.log(`Sending member portal welcome email to ${testData.email}...`, testData);
    }
    
    // Detect language
    const userLocale = requestData.userLocale || 'en';
    const supportedLocales = ['en', 'fr', 'de', 'es', 'it', 'nl'];
    const locale = supportedLocales.includes(userLocale) ? userLocale : 'en';

    // Load email content translations from JSON files
    const emailTranslations = loadEmailTranslations(locale);
    const welcomeEmail = emailTranslations.member_portal_welcome || {};
    
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

    let emailContent = {
      subject: welcomeEmail.subject || "Welcome to FASE - your member portal access",
      dear: getGenderedText('dear', "Dear"),
      welcomeIntro: (welcomeEmail.welcome_intro || "Welcome to FASE, the pan-European MGA federation. We're delighted to have {organizationName} as a founder member.").replace('{organizationName}', `<strong>${testData.organizationName}</strong>`),
      portalAccess: welcomeEmail.portal_access || "You can access our member portal here. In the coming weeks, we will continue to release, through the portal, new tools and data resources to support the growth of your business in Europe.",
      memberDirectory: (welcomeEmail.member_directory || "Next month we will also be publishing the first iteration of FASE's member directory. You can use the portal to share relevant details of {organizationName} that you would like to share with other members through the portal and with the broader market through our website.").replace('{organizationName}', testData.organizationName),
      closing: welcomeEmail.closing || "Please do not hesitate to reach out if you have any questions.",
      regards: welcomeEmail.regards || "Best regards,",
      signatureName: welcomeEmail.signature_name || "William",
      signatureFull: welcomeEmail.signature_full || "William Pitt",
      signatureTitle: welcomeEmail.signature_title || "Executive Director, FASE",
      accessPortal: welcomeEmail.access_portal || "Access Member Portal",
      portalUrl: "https://fasemga.com/member-portal"
    };

    // Apply customizations if provided
    if (requestData.customizedEmailContent) {
      const customContent = requestData.customizedEmailContent;
      const genderSuffix = testData.gender === 'f' ? '_f' : '_m';
      
      emailContent = {
        subject: customContent.subject || emailContent.subject,
        dear: customContent[`dear${genderSuffix}`] || customContent.dear || emailContent.dear,
        welcomeIntro: (customContent.welcome_intro || welcomeEmail.welcome_intro || emailContent.welcomeIntro).replace('{organizationName}', `<strong>${testData.organizationName}</strong>`),
        portalAccess: customContent.portal_access || emailContent.portalAccess,
        memberDirectory: (customContent.member_directory || welcomeEmail.member_directory || emailContent.memberDirectory).replace('{organizationName}', testData.organizationName),
        closing: customContent.closing || emailContent.closing,
        regards: customContent.regards || emailContent.regards,
        signatureName: customContent.signature_name || emailContent.signatureName,
        signatureFull: customContent.signature_full || emailContent.signatureFull,
        signatureTitle: customContent.signature_title || emailContent.signatureTitle,
        accessPortal: customContent.access_portal || emailContent.accessPortal,
        portalUrl: emailContent.portalUrl
      };
    }

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
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.dear} ${testData.greeting},
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 20px 0;">
              ${emailContent.welcomeIntro}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 20px 0 20px 0;">
              ${emailContent.portalAccess}
            </p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${emailContent.portalUrl}" style="display: inline-block; background-color: #2D5574; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">${emailContent.accessPortal}</a>
            </div>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 20px 0 20px 0;">
              ${emailContent.memberDirectory}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 20px 0 15px 0;">
              ${emailContent.closing}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 0 0;">
              ${emailContent.regards}<br><br>
              <strong>${emailContent.signatureName}</strong><br>
              ${emailContent.signatureTitle}
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
      console.log('Sending member portal welcome email via Resend...');
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'William Pitt <william.pitt@fasemga.com>',
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
      console.log(`✅ Member portal welcome email sent to ${testData.email} via Resend:`, result.id);
      
      return NextResponse.json({
        success: true,
        message: 'Member portal welcome email sent successfully',
        emailId: result.id,
        to: testData.email,
        subject: emailContent.subject
      });
    } catch (emailError: any) {
      console.error('Failed to send member portal welcome email via Resend:', emailError);
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