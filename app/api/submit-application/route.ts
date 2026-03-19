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
      membershipFee,
      email,
      firstName,
      surname,
      organizationName,
      organizationType,
      hasOtherAssociations,
      otherAssociations,
      addressLine1,
      city,
      country,
      grossWrittenPremiums,
      gwpCurrency,
      selectedLinesOfBusiness,
      selectedMarkets,
      members,
      reserveRendezvousPasses,
      rendezvousPassCount,
      rendezvousPassTotal,
      rendezvousAttendees
    } = data;

    const currentDate = new Date().toLocaleDateString('en-GB');
    const orgTypeLabel = organizationType === 'MGA' ? 'MGA' : organizationType === 'carrier' ? 'Carrier/Broker' : 'Service Provider';

    // Build team members table rows
    const memberRows = (members || []).map((m: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${m.firstName} ${m.lastName}${m.isPrimaryContact ? ' <span style="color: #059669; font-size: 11px;">(Primary)</span>' : ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${m.email}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${m.jobTitle}</td>
      </tr>
    `).join('');

    // Build rendezvous attendees if applicable
    let rendezvousSection = '';
    if (reserveRendezvousPasses && rendezvousAttendees?.length > 0) {
      const attendeeRows = rendezvousAttendees.map((a: any, i: number) => `
        <tr>
          <td style="padding: 6px 8px; border-bottom: 1px solid #fef3c7;">${a.firstName} ${a.lastName}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #fef3c7;">${a.email}</td>
        </tr>
      `).join('');

      const isAsase = otherAssociations?.includes('ASASE');
      const passPrice = isAsase ? 0 : (organizationType === 'MGA' ? 400 : organizationType === 'carrier' ? 550 : 700);

      rendezvousSection = `
        <tr>
          <td colspan="2" style="padding: 12px 0 8px 0;">
            <div style="background: #fef3c7; border-left: 3px solid #d97706; padding: 12px; border-radius: 4px;">
              <strong style="color: #92400e;">MGA Rendezvous 2026</strong><br>
              <span style="font-size: 13px;">${rendezvousPassCount} pass${rendezvousPassCount > 1 ? 'es' : ''} @ €${passPrice}${isAsase ? ' (ASASE complimentary)' : ''} = €${rendezvousPassTotal || 0}</span>
              <table style="width: 100%; margin-top: 8px; font-size: 13px;">
                ${attendeeRows}
              </table>
            </div>
          </td>
        </tr>
      `;
    }

    // Build associations list
    const associationsList = hasOtherAssociations && otherAssociations?.length > 0
      ? otherAssociations.join(', ')
      : 'None';

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; color: #1f2937; font-size: 14px; line-height: 1.5; }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { font-size: 18px; color: #2D5574; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #2D5574; }
    table { width: 100%; border-collapse: collapse; }
    .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { font-weight: 500; }
    .section { margin-bottom: 20px; }
    .fee-box { background: #f0f9ff; padding: 12px; border-radius: 6px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>New Application: ${organizationName}</h1>

    <table class="section">
      <tr>
        <td width="50%" style="padding: 4px 0;"><span class="label">Type</span><br><span class="value">${orgTypeLabel}</span></td>
        <td width="50%" style="padding: 4px 0;"><span class="label">Date</span><br><span class="value">${currentDate}</span></td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><span class="label">Contact</span><br><span class="value">${firstName} ${surname}</span></td>
        <td style="padding: 4px 0;"><span class="label">Email</span><br><span class="value">${email}</span></td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><span class="label">Location</span><br><span class="value">${city}, ${country}</span></td>
        <td style="padding: 4px 0;"><span class="label">Other Associations</span><br><span class="value">${associationsList}</span></td>
      </tr>
      ${organizationType === 'MGA' ? `
      <tr>
        <td style="padding: 4px 0;"><span class="label">GWP</span><br><span class="value">${gwpCurrency} ${parseFloat(grossWrittenPremiums || 0).toLocaleString()}</span></td>
        <td style="padding: 4px 0;"><span class="label">Markets</span><br><span class="value">${(selectedMarkets || []).join(', ') || 'N/A'}</span></td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 4px 0;"><span class="label">Lines of Business</span><br><span class="value">${(selectedLinesOfBusiness || []).join(', ') || 'N/A'}</span></td>
      </tr>
      ` : ''}
    </table>

    <div class="fee-box">
      <table>
        <tr>
          <td><strong>Annual Membership Fee:</strong></td>
          <td style="text-align: right; font-size: 18px; font-weight: bold; color: #2D5574;">€${membershipFee.toLocaleString()}</td>
        </tr>
        ${hasOtherAssociations ? '<tr><td colspan="2" style="color: #059669; font-size: 12px;">20% association discount applied</td></tr>' : ''}
      </table>
    </div>

    <div class="section">
      <span class="label">Team Members</span>
      <table style="margin-top: 8px;">
        <tr style="background: #f3f4f6;">
          <th style="padding: 8px; text-align: left; font-size: 12px;">Name</th>
          <th style="padding: 8px; text-align: left; font-size: 12px;">Email</th>
          <th style="padding: 8px; text-align: left; font-size: 12px;">Role</th>
        </tr>
        ${memberRows}
      </table>
    </div>

    <table>
      ${rendezvousSection}
    </table>
  </div>
</body>
</html>`;

    // Send via Firebase Function
    const response = await fetch(`https://us-central1-fase-site.cloudfunctions.net/sendInvoiceEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          email: 'applications@fasemga.com',
          invoiceHTML: emailContent,
          invoiceNumber: `APP-${Date.now()}`, // Required by function but not displayed
          organizationName: organizationName,
          totalAmount: membershipFee,
          subject: `New Application: ${organizationName} (${orgTypeLabel})`
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
      success: true
    });

  } catch (error: any) {
    console.error('Application submission error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit application' },
      { status: 500 }
    );
  }
}
