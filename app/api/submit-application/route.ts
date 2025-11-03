import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data) {
      return NextResponse.json(
        { error: 'Missing application data' },
        { status: 400 }
      );
    }
    
    const {
      applicationNumber,
      membershipFee,
      email,
      firstName,
      surname,
      organizationName,
      membershipType,
      organizationType,
      hasOtherAssociations,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      grossWrittenPremiums,
      gwpCurrency,
      selectedLinesOfBusiness,
      selectedMarkets,
      members
    } = data;
    
    // Generate application email HTML
    const currentDate = new Date().toLocaleDateString('en-GB');
    const orgName = organizationName || `${firstName} ${surname}`;
    
    // Get primary contact info for corporate memberships
    const primaryContact = members?.find((m: any) => m.isPrimaryContact);
    const contactPhone = membershipType === 'corporate' 
      ? (primaryContact?.phone || 'N/A')
      : 'N/A';
    
    let applicationDetails = `
      <h3>Applicant Information</h3>
      <p><strong>Organization:</strong> ${orgName}</p>
      <p><strong>Contact:</strong> ${firstName} ${surname}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${contactPhone}</p>
      <p><strong>Membership Type:</strong> ${membershipType}</p>
      
      <h3>Membership Fee</h3>
      <p><strong>Annual Fee:</strong> €${membershipFee.toLocaleString()}</p>
    `;

    if (membershipType === 'corporate') {
      applicationDetails += `
        <p><strong>Organization Type:</strong> ${organizationType}</p>
      `;

      // Add team members information
      if (members && members.length > 0) {
        applicationDetails += `
          <h4>Team Members</h4>
        `;
        members.forEach((member: any) => {
          applicationDetails += `
            <div style="margin-bottom: 15px; padding: 10px; background-color: #f9f9f9; border-radius: 5px;">
              <p><strong>${member.firstName} ${member.lastName}</strong> ${member.isPrimaryContact ? '(Primary Contact)' : ''}</p>
              <p>Email: ${member.email}</p>
              <p>Phone: ${member.phone || 'N/A'}</p>
              <p>Job Title: ${member.jobTitle}</p>
            </div>
          `;
        });
      }

      // MGA Information
      if (organizationType === 'MGA' && (grossWrittenPremiums || selectedLinesOfBusiness || selectedMarkets)) {
        applicationDetails += `<h4>MGA Information</h4>`;
        if (grossWrittenPremiums) {
          applicationDetails += `<p><strong>Gross Written Premiums:</strong> ${gwpCurrency || 'EUR'} ${parseFloat(grossWrittenPremiums).toLocaleString()}</p>`;
        }
        if (selectedLinesOfBusiness?.length > 0) {
          applicationDetails += `<p><strong>Lines of Business:</strong> ${selectedLinesOfBusiness.join(', ')}</p>`;
        }
        if (selectedMarkets?.length > 0) {
          applicationDetails += `<p><strong>Markets:</strong> ${selectedMarkets.join(', ')}</p>`;
        }
      }

      if (hasOtherAssociations !== undefined) {
        applicationDetails += `<p><strong>Member of other European associations:</strong> ${hasOtherAssociations ? 'Yes' : 'No'}</p>`;
      }
    }

    applicationDetails += `
      <h3>Address Information</h3>
      <p><strong>Address:</strong><br>
      ${addressLine1 || 'N/A'}<br>
      ${addressLine2 ? addressLine2 + '<br>' : ''}
      ${city || 'N/A'}, ${state || 'N/A'} ${postalCode || 'N/A'}<br>
      ${country || 'N/A'}</p>
    `;

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2D5574; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; color: #2D5574; margin-bottom: 10px; }
        .tagline { color: #6b7280; font-size: 14px; }
        .application-info { background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .content { margin-bottom: 20px; }
        h3 { color: #2D5574; border-bottom: 2px solid #2D5574; padding-bottom: 5px; }
        h4 { color: #2D5574; margin-top: 20px; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">FEDERATION OF EUROPEAN MGAS</div>
        <div class="tagline">New Membership Application</div>
    </div>

    <div class="application-info">
        <h2>New Membership Application Received</h2>
        <p><strong>Application Number:</strong> ${applicationNumber}</p>
        <p><strong>Submitted:</strong> ${currentDate}</p>
        <p><strong>Applicant Email:</strong> ${email}</p>
    </div>

    <div class="content">
        ${applicationDetails}
    </div>

    <div class="application-info">
        <h3>Membership Fee Information</h3>
        <p><strong>Calculated Membership Fee:</strong> €${membershipFee.toLocaleString()}</p>
        ${hasOtherAssociations ? '<p><strong>Discount Applied:</strong> 20% discount for membership in other European MGA associations</p>' : ''}
    </div>

    <div class="footer">
        <p>This application was submitted through the FASE website registration system.</p>
        <p>Please review and respond to the applicant within one business day.</p>
    </div>
</body>
</html>`;
    
    // Call Firebase Function directly via HTTP
    const response = await fetch(`https://us-central1-fase-site.cloudfunctions.net/sendInvoiceEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          email: 'applications@fasemga.com',
          invoiceHTML: emailContent,
          invoiceNumber: applicationNumber,
          organizationName: orgName,
          totalAmount: membershipFee
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Firebase Function error: ${response.status}`);
    }

    const result = await response.json();
    if (!result.result || !result.result.success) {
      throw new Error('Failed to send application email');
    }
    
    return NextResponse.json({
      success: true,
      applicationNumber
    });
    
  } catch (error: any) {
    console.error('Application submission error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit application' },
      { status: 500 }
    );
  }
}