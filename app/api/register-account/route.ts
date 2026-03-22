import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth, FieldValue } from '../../../lib/firebase-admin';
import { getGWPBand, convertToEUR, calculateMembershipFee } from '../../../lib/registration-utils-server';

export async function POST(request: NextRequest) {
  let createdUserId: string | null = null;

  try {
    console.log('Register account API called');

    const formData = await request.json();
    console.log('Form data received:', { email: formData.email, organizationType: formData.organizationType });

    if (!formData.email || !formData.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Step 1: Create Firebase Auth account
    const fullName = `${formData.firstName} ${formData.surname}`.trim();
    const orgForAuth = formData.organizationName; // All memberships are corporate
    const displayName = orgForAuth && orgForAuth.trim()
      ? `${fullName} (${orgForAuth})`
      : fullName;

    console.log('Creating Firebase Auth user...');
    const userRecord = await adminAuth.createUser({
      email: formData.email,
      password: formData.password,
      displayName: displayName,
      emailVerified: false
    });
    console.log('Auth user created:', userRecord.uid);

    createdUserId = userRecord.uid;

    // Step 2: Create Firestore documents using Admin SDK (no permission issues!)
    const batch = adminDb.batch();

    // All memberships are corporate
    const companyId = userRecord.uid;

    // Find primary contact
    const primaryContactMember = formData.members.find((m: any) => m.isPrimaryContact);
    if (!primaryContactMember) {
      throw new Error("No account administrator designated");
    }

    // Create company document
    const companyRef = adminDb.collection('accounts').doc(companyId);
    const companyRecord = {
        id: companyId,
        email: userRecord.email,
        displayName: formData.organizationName,
        status: formData.status || 'pending',
        personalName: '',
        isCompanyAccount: true,
        primaryContactMemberId: userRecord.uid,
        paymentUserId: userRecord.uid,
        organizationName: formData.organizationName,
        organizationType: formData.organizationType,
        accountAdministrator: {
          name: primaryContactMember.name,
          email: primaryContactMember.email,
          phone: primaryContactMember.phone,
          role: primaryContactMember.jobTitle
        },
        businessAddress: {
          line1: formData.addressLine1,
          line2: formData.addressLine2,
          city: formData.city,
          county: formData.state,
          postcode: formData.postalCode,
          country: formData.country
        },
        ...(formData.organizationType === 'MGA' && {
          portfolio: {
            grossWrittenPremiums: getGWPBand(await convertToEUR(parseFloat(formData.grossWrittenPremiums) || 0, formData.gwpCurrency)),
            grossWrittenPremiumsValue: parseFloat(formData.grossWrittenPremiums) || 0,
            grossWrittenPremiumsCurrency: formData.gwpCurrency,
            grossWrittenPremiumsEUR: await convertToEUR(parseFloat(formData.grossWrittenPremiums) || 0, formData.gwpCurrency),
            linesOfBusiness: formData.selectedLinesOfBusiness,
            otherLinesOfBusiness: {
              other1: formData.otherLineOfBusiness1?.trim() || '',
              other2: formData.otherLineOfBusiness2?.trim() || '',
              other3: formData.otherLineOfBusiness3?.trim() || ''
            },
            markets: formData.selectedMarkets
          }
        }),
        hasOtherAssociations: formData.hasOtherAssociations ?? false,
        otherAssociations: formData.hasOtherAssociations ? formData.otherAssociations : [],
        isInsurtechUKMember: formData.isInsurtechUKMember ?? false,
        // Carrier-specific fields
        ...(formData.organizationType === 'carrier' && {
          carrierInfo: {
            organizationType: formData.carrierOrganizationType,
            isDelegatingInEurope: formData.isDelegatingInEurope,
            numberOfMGAs: formData.numberOfMGAs,
            delegatingCountries: formData.delegatingCountries || [],
            frontingOptions: formData.frontingOptions,
            considerStartupMGAs: formData.considerStartupMGAs,
            amBestRating: formData.amBestRating,
            otherRating: formData.otherRating
          }
        }),
        // Service provider specific fields
        ...(formData.organizationType === 'provider' && {
          servicesProvided: formData.servicesProvided
        }),
        logoUrl: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      batch.set(companyRef, companyRecord);

      // Create member documents
      for (const member of formData.members) {
        const memberId = member.id === 'registrant' ? userRecord.uid : member.id;
        const memberRef = adminDb.collection('accounts').doc(companyId).collection('members').doc(memberId);

        const memberRecord = {
          id: memberId,
          email: member.email?.toLowerCase().trim(),
          personalName: member.name,
          jobTitle: member.jobTitle,
          isAccountAdministrator: member.isPrimaryContact,
          isRegistrant: member.id === 'registrant',
          accountConfirmed: member.id === 'registrant',
          joinedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };

        batch.set(memberRef, memberRecord);
      }

      // Create MGA Rendezvous registration (unified collection for all sources)
      if (formData.reserveRendezvousPasses) {
        const registrationId = `mga_reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const reservationRef = adminDb.collection('rendezvous-registrations').doc(registrationId);
        const reservationRecord = {
          registrationId,
          accountId: companyId,
          billingInfo: {
            company: formData.organizationName,
            billingEmail: formData.email,
            country: formData.country || '',
            organizationType: formData.organizationType
          },
          attendees: (formData.rendezvousAttendees || []).map((a: any, i: number) => ({
            id: `att_${i}`,
            firstName: a.firstName || '',
            lastName: a.lastName || '',
            email: a.email || '',
            jobTitle: a.jobTitle || ''
          })),
          numberOfAttendees: formData.rendezvousPassCount || 1,
          // VAT is billed separately - not included in registration payment
          subtotal: formData.rendezvousPassSubtotal || 0,
          vatAmount: 0, // VAT billed separately
          vatRate: 21,
          totalPrice: formData.rendezvousPassTotal || 0, // Excludes VAT
          companyIsFaseMember: true,
          isAsaseMember: formData.rendezvousIsAsaseMember || false,
          membershipType: formData.rendezvousIsAsaseMember ? 'asase' : 'fase',
          discount: formData.rendezvousIsAsaseMember ? 100 : 50,
          paymentMethod: formData.rendezvousIsAsaseMember ? 'asase_member_benefit' : 'bundled_with_membership',
          paymentStatus: formData.rendezvousIsAsaseMember ? 'complimentary' : 'pending',
          status: formData.rendezvousIsAsaseMember ? 'confirmed' : 'pending_payment',
          source: 'fase_registration',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };
        batch.set(reservationRef, reservationRecord);
      }

    // All memberships are corporate - no individual membership handling needed

    // Commit all writes atomically
    await batch.commit();

    // Send notification email to admin
    try {
      await sendApplicationNotificationEmail(formData);
    } catch (emailError) {
      // Log but don't fail registration if email fails
      console.error('Failed to send application notification email:', emailError);
    }

    // Return success with user ID
    return NextResponse.json({
      success: true,
      userId: userRecord.uid,
      email: userRecord.email
    });

  } catch (error: any) {
    console.error('Registration error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    // Cleanup if user was created but Firestore failed
    if (createdUserId) {
      try {
        console.log('Cleaning up created user:', createdUserId);
        await adminAuth.deleteUser(createdUserId);
        // Also try to delete any partial Firestore data
        await adminDb.collection('accounts').doc(createdUserId).delete();
        console.log('Cleanup completed');
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }

    // Return specific error messages
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 400 }
      );
    }

    if (error.code === 'auth/invalid-password') {
      return NextResponse.json(
        { error: 'Password does not meet security requirements' },
        { status: 400 }
      );
    }

    if (error.message?.includes('FIREBASE_SERVICE_ACCOUNT_KEY')) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}

// Send application notification email to admin
async function sendApplicationNotificationEmail(formData: any) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured, skipping notification email');
    return;
  }

  const {
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
    rendezvousAttendees,
    _testMode,
    _testName,
    _testEmailOverride
  } = formData;

  const gwpValue = parseFloat(grossWrittenPremiums) || 0;
  const membershipFee = calculateMembershipFee(organizationType, gwpValue, gwpCurrency, hasOtherAssociations || false);

  const currentDate = new Date().toLocaleDateString('en-GB');
  const orgTypeLabel = organizationType === 'MGA' ? 'MGA' : organizationType === 'carrier' ? 'Carrier/Broker' : 'Service Provider';

  const memberRows = (members || []).map((m: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${m.firstName || ''} ${m.lastName || ''}${m.isPrimaryContact ? ' <span style="color: #059669; font-size: 11px;">(Primary)</span>' : ''}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${m.email || ''}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${m.jobTitle || ''}</td>
    </tr>
  `).join('');

  let rendezvousSection = '';
  if (reserveRendezvousPasses && rendezvousAttendees?.length > 0) {
    const attendeeRows = rendezvousAttendees.map((a: any) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #fef3c7;">${a.firstName || ''} ${a.lastName || ''}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #fef3c7;">${a.email || ''}</td>
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

  const associationsList = hasOtherAssociations && otherAssociations?.length > 0
    ? otherAssociations.join(', ')
    : 'None';

  // Test mode banner
  const testBanner = _testMode ? `
    <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 12px; margin-bottom: 16px; border-radius: 6px;">
      <strong style="color: #92400e;">TEST MODE</strong><br>
      <span style="font-size: 13px; color: #78350f;">Test: ${_testName || 'Unknown test'}</span>
    </div>
  ` : '';

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
    ${testBanner}
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
        <td style="padding: 4px 0;"><span class="label">GWP</span><br><span class="value">${gwpCurrency} ${gwpValue.toLocaleString()}</span></td>
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

  const emailTo = _testEmailOverride || 'applications@fasemga.com';
  const subjectPrefix = _testMode ? '[TEST] ' : '';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FASE <applications@fasemga.com>',
      to: emailTo,
      subject: `${subjectPrefix}New Application: ${organizationName} (${orgTypeLabel})`,
      html: emailContent,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${errorText}`);
  }
}
