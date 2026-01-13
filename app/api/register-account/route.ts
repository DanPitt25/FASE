import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getGWPBand, convertToEUR } from '../../../lib/registration-utils-server';

// Initialize Firebase Admin using service account key from environment variable
const initializeAdmin = async () => {
  if (!admin.apps.find(app => app?.name === 'register-account')) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing');
    }
    
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      }, 'register-account');
    } catch (parseError) {
      throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ' + parseError);
    }
  }
  
  const app = admin.apps.find(app => app?.name === 'register-account') || admin.app();
  return {
    auth: admin.auth(app),
    db: admin.firestore(app)
  };
};

export async function POST(request: NextRequest) {
  let createdUserId: string | null = null;

  try {
    const formData = await request.json();
    
    if (!formData.email || !formData.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const { auth, db } = await initializeAdmin();

    // Step 1: Create Firebase Auth account
    const fullName = `${formData.firstName} ${formData.surname}`.trim();
    const orgForAuth = formData.organizationName; // All memberships are corporate
    const displayName = orgForAuth && orgForAuth.trim()
      ? `${fullName} (${orgForAuth})`
      : fullName;

    const userRecord = await auth.createUser({
      email: formData.email,
      password: formData.password,
      displayName: displayName,
      emailVerified: false
    });

    createdUserId = userRecord.uid;

    // Step 2: Create Firestore documents using Admin SDK (no permission issues!)
    const batch = db.batch();

    // All memberships are corporate
    const companyId = userRecord.uid;
    
    // Find primary contact
    const primaryContactMember = formData.members.find((m: any) => m.isPrimaryContact);
    if (!primaryContactMember) {
      throw new Error("No account administrator designated");
    }
      
    // Create company document
    const companyRef = db.collection('accounts').doc(companyId);
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
            grossWrittenPremiums: getGWPBand(convertToEUR(parseFloat(formData.grossWrittenPremiums) || 0, formData.gwpCurrency)),
            grossWrittenPremiumsValue: parseFloat(formData.grossWrittenPremiums) || 0,
            grossWrittenPremiumsCurrency: formData.gwpCurrency,
            grossWrittenPremiumsEUR: convertToEUR(parseFloat(formData.grossWrittenPremiums) || 0, formData.gwpCurrency),
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      batch.set(companyRef, companyRecord);
      
      // Create member documents
      for (const member of formData.members) {
        const memberId = member.id === 'registrant' ? userRecord.uid : member.id;
        const memberRef = db.collection('accounts').doc(companyId).collection('members').doc(memberId);
        
        const memberRecord = {
          id: memberId,
          email: member.email,
          personalName: member.name,
          jobTitle: member.jobTitle,
          isAccountAdministrator: member.isPrimaryContact,
          isRegistrant: member.id === 'registrant',
          accountConfirmed: member.id === 'registrant',
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        batch.set(memberRef, memberRecord);
      }

      // Create MGA Rendezvous registration (unified collection for all sources)
      if (formData.reserveRendezvousPasses) {
        const registrationId = `mga_reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const reservationRef = db.collection('rendezvous-registrations').doc(registrationId);
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
          totalPrice: formData.rendezvousPassTotal || 0,
          companyIsFaseMember: true,
          membershipType: 'fase',
          discount: 50,
          paymentMethod: 'bundled_with_membership',
          paymentStatus: 'pending',
          status: 'pending_payment',
          source: 'fase_registration',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        batch.set(reservationRef, reservationRecord);
      }

    // All memberships are corporate - no individual membership handling needed

    // Commit all writes atomically
    await batch.commit();

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
        const { auth, db } = await initializeAdmin();
        await auth.deleteUser(createdUserId);
        // Also try to delete any partial Firestore data
        await db.collection('accounts').doc(createdUserId).delete();
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