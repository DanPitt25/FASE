import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reload,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { auth } from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  twoFactorEnabled?: boolean;
}



// Sign in existing user - simplified to only use Firebase Auth data
export const signIn = async (email: string, password: string): Promise<AuthUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      twoFactorEnabled: false
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Sign out user
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Auth state observer - simplified to only use Firebase Auth data
export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        twoFactorEnabled: false
      });
    } else {
      callback(null);
    }
  });
};


// Generate and send verification code (works without authentication)
export const sendVerificationCode = async (email: string): Promise<void> => {
  try {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Call Firebase Function to handle both Firestore write and email sending
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('./firebase');
    
    const sendEmailFunction = httpsCallable(functions, 'sendVerificationCode');
    const result = await sendEmailFunction({ email, code });
    
    if (!result.data || !(result.data as any).success) {
      throw new Error('Failed to send verification email');
    }
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    console.error('Error details:', error.message, error.code);
    throw new Error('Failed to send verification code');
  }
};

// Verify the code (works without authentication)
export const verifyCode = async (email: string, code: string): Promise<boolean> => {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    const docRef = doc(db, 'verification_codes', email);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Invalid verification code');
    }
    
    const data = docSnap.data();
    
    // Check if code matches
    if (data.code !== code) {
      throw new Error('Invalid verification code');
    }
    
    // Check if code is expired
    if (new Date() > data.expiresAt.toDate()) {
      throw new Error('Verification code has expired');
    }
    
    // Check if code was already used
    if (data.used) {
      throw new Error('Verification code has already been used');
    }
    
    // Delete the verification code after successful use
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(docRef);
    
    // Don't create any accounts here - just verify the code
    // Account creation happens later during payment/invoice selection
    
    return true;
  } catch (error: any) {
    console.error('Error verifying code:', error);
    throw new Error(error.message || 'Failed to verify code');
  }
};

// Set admin claim for a user
export const setAdminClaim = async (targetUserId: string): Promise<void> => {
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const setAdminClaimFunction = httpsCallable(functions, 'setAdminClaim');
    
    const result = await setAdminClaimFunction({ targetUserId });
    console.log('Admin claim set:', result.data);
  } catch (error: any) {
    console.error('Error setting admin claim:', error);
    throw new Error(error.message || 'Failed to set admin claim');
  }
};

// Remove admin claim for a user
export const removeAdminClaim = async (targetUserId: string): Promise<void> => {
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const removeAdminClaimFunction = httpsCallable(functions, 'removeAdminClaim');
    
    const result = await removeAdminClaimFunction({ targetUserId });
    console.log('Admin claim removed:', result.data);
  } catch (error: any) {
    console.error('Error removing admin claim:', error);
    throw new Error(error.message || 'Failed to remove admin claim');
  }
};

// Send password reset email
export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Submit application via Firebase Function (using existing sendInvoiceEmail)
export const submitApplication = async (applicationData: any): Promise<{ applicationNumber: string }> => {
  try {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('./firebase');
    
    // Generate application number
    const applicationNumber = `FASE-APP-${Date.now()}-${Date.now().toString().slice(-6)}`;
    
    // Calculate membership fee (using same logic as form)
    const membershipFee = calculateMembershipFee(applicationData);
    
    // Generate application email HTML
    const emailContent = generateApplicationEmailHTML(applicationData, applicationNumber, membershipFee);
    
    // Use existing sendInvoiceEmail function to send application
    const sendEmailFunction = httpsCallable(functions, 'sendInvoiceEmail');
    const result = await sendEmailFunction({
      email: 'daniel.pitt@fasemga.com',
      invoiceHTML: emailContent,
      invoiceNumber: applicationNumber,
      organizationName: applicationData.organizationName || `${applicationData.firstName} ${applicationData.surname}`,
      totalAmount: membershipFee
    });
    
    if (!result.data || !(result.data as any).success) {
      throw new Error('Failed to send application email');
    }
    
    return { applicationNumber };
  } catch (error: any) {
    console.error('Error submitting application:', error);
    throw new Error(error.message || 'Failed to submit application');
  }
};

// Calculate membership fee (replicated from form logic)
const calculateMembershipFee = (applicationData: any): number => {
  if (applicationData.membershipType === 'individual') {
    return 500;
  } else if (applicationData.membershipType === 'corporate' && applicationData.organizationType === 'MGA') {
    // Use the GWP band to determine fee
    const band = applicationData.grossWrittenPremiums;
    switch (band) {
      case '<10m': return 900;
      case '10-20m': return 1500;
      case '20-50m': return 2200;
      case '50-100m': return 2800;
      case '100-500m': return 4200;
      case '500m+': return 7000;
      default: return 900;
    }
  } else if (applicationData.membershipType === 'corporate' && applicationData.organizationType === 'carrier') {
    return 4000;
  } else if (applicationData.membershipType === 'corporate' && applicationData.organizationType === 'provider') {
    return 5000;
  } else {
    return 900; // Default corporate rate
  }
};

// Generate application email HTML
const generateApplicationEmailHTML = (applicationData: any, applicationNumber: string, membershipFee: number) => {
  const currentDate = new Date().toLocaleDateString('en-GB');
  const organizationName = applicationData.organizationName || `${applicationData.firstName} ${applicationData.surname}`;
  
  // Get primary contact info for corporate memberships
  const primaryContact = applicationData.members?.find((m: any) => m.isPrimaryContact);
  const contactPhone = applicationData.membershipType === 'corporate' 
    ? (primaryContact?.phone || 'N/A')
    : 'N/A'; // Individual memberships don't include phone in applicationData
  
  let applicationDetails = `
    <h3>Applicant Information</h3>
    <p><strong>Organization:</strong> ${organizationName}</p>
    <p><strong>Contact:</strong> ${applicationData.firstName} ${applicationData.surname}</p>
    <p><strong>Email:</strong> ${applicationData.email}</p>
    <p><strong>Phone:</strong> ${contactPhone}</p>
    <p><strong>Membership Type:</strong> ${applicationData.membershipType}</p>
    
    <h3>Membership Fee</h3>
    <p><strong>Annual Fee:</strong> €${membershipFee.toLocaleString()}</p>
  `;

  if (applicationData.membershipType === 'corporate') {
    applicationDetails += `
      <p><strong>Organization Type:</strong> ${applicationData.organizationType}</p>
    `;

    // Add team members information
    if (applicationData.members && applicationData.members.length > 0) {
      applicationDetails += `
        <h4>Team Members</h4>
      `;
      applicationData.members.forEach((member: any) => {
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

    // Show all organization-specific information regardless of type
    
    // MGA Information (always show if available)
    if (applicationData.grossWrittenPremiums || applicationData.gwpCurrency || applicationData.selectedLinesOfBusiness || applicationData.selectedMarkets || applicationData.hasOtherAssociations !== undefined) {
      applicationDetails += `<h4>MGA Information</h4>`;
      if (applicationData.grossWrittenPremiums) {
        applicationDetails += `<p><strong>Gross Written Premiums Band:</strong> ${applicationData.grossWrittenPremiums}</p>`;
      }
      if (applicationData.gwpCurrency) {
        applicationDetails += `<p><strong>GWP Currency:</strong> ${applicationData.gwpCurrency}</p>`;
      }
      if (applicationData.selectedLinesOfBusiness?.length > 0) {
        applicationDetails += `<p><strong>Lines of Business:</strong> ${applicationData.selectedLinesOfBusiness.join(', ')}</p>`;
      }
      if (applicationData.selectedMarkets?.length > 0) {
        applicationDetails += `<p><strong>Markets:</strong> ${applicationData.selectedMarkets.join(', ')}</p>`;
      }
      if (applicationData.hasOtherAssociations !== undefined) {
        applicationDetails += `<p><strong>Member of other European associations:</strong> ${applicationData.hasOtherAssociations ? 'Yes' : 'No'}</p>`;
        if (applicationData.hasOtherAssociations && applicationData.otherAssociations?.length > 0) {
          applicationDetails += `<p><strong>Other associations:</strong> ${applicationData.otherAssociations.join(', ')}</p>`;
        }
      }
    }

    // Carrier Information (always show if available)
    if (applicationData.isDelegatingInEurope || applicationData.frontingOptions || applicationData.considerStartupMGAs || applicationData.amBestRating) {
      applicationDetails += `<h4>Carrier Information</h4>`;
      if (applicationData.isDelegatingInEurope) {
        applicationDetails += `<p><strong>Currently writing delegated authority business in Europe:</strong> ${applicationData.isDelegatingInEurope}</p>`;
        if (applicationData.isDelegatingInEurope === 'Yes') {
          if (applicationData.numberOfMGAs) {
            applicationDetails += `<p><strong>Number of MGAs working with:</strong> ${applicationData.numberOfMGAs}</p>`;
          }
          if (applicationData.delegatingCountries?.length > 0) {
            applicationDetails += `<p><strong>Countries delegating authority:</strong> ${applicationData.delegatingCountries.join(', ')}</p>`;
          }
        }
      }
      if (applicationData.frontingOptions) {
        applicationDetails += `<p><strong>Fronting options:</strong> ${applicationData.frontingOptions}</p>`;
      }
      if (applicationData.considerStartupMGAs) {
        applicationDetails += `<p><strong>Consider startup MGAs:</strong> ${applicationData.considerStartupMGAs}</p>`;
      }
      if (applicationData.amBestRating) {
        applicationDetails += `<p><strong>AM Best rating:</strong> ${applicationData.amBestRating}</p>`;
      }
      if (applicationData.otherRating) {
        applicationDetails += `<p><strong>Other rating:</strong> ${applicationData.otherRating}</p>`;
      }
    }

    // Service Provider Information (always show if available)
    if (applicationData.servicesProvided?.length > 0) {
      applicationDetails += `
        <h4>Service Provider Information</h4>
        <p><strong>Services provided:</strong> ${applicationData.servicesProvided.join(', ')}</p>
      `;
    }
  }

  applicationDetails += `
    <h3>Address Information</h3>
    <p><strong>Address:</strong><br>
    ${applicationData.businessAddress?.line1 || 'N/A'}<br>
    ${applicationData.businessAddress?.line2 ? applicationData.businessAddress.line2 + '<br>' : ''}
    ${applicationData.businessAddress?.city || 'N/A'}, ${applicationData.businessAddress?.state || 'N/A'} ${applicationData.businessAddress?.postalCode || 'N/A'}<br>
    ${applicationData.businessAddress?.country || 'N/A'}</p>

    <h3>Consents</h3>
    <p><strong>Data Processing Consent:</strong> ${applicationData.dataNoticeConsent ? 'Yes' : 'No'}</p>
    <p><strong>Code of Conduct Agreement:</strong> ${applicationData.codeOfConductConsent ? 'Yes' : 'No'}</p>
  `;

  return `
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
        <p><strong>Applicant Email:</strong> ${applicationData.email}</p>
    </div>

    <div class="content">
        ${applicationDetails}
    </div>

    <div class="footer">
        <p>This application was submitted through the FASE website registration system.</p>
        <p>Please review and respond to the applicant within one business day.</p>
    </div>
</body>
</html>`;
};