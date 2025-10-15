// Data Migration Script: Users + Members -> Unified Members
// Run this script to migrate existing data to the new unified structure

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UnifiedMember } from '../lib/unified-member';
import { MemberApplication } from '../lib/firestore';
import { db } from '../lib/firebase'; // Import existing db instance

// You'll need to run this with Firebase Admin SDK in a Node.js environment
// This is a template showing the migration logic

interface OldUserProfile {
  uid: string;
  email: string;
  displayName: string;
  personalName: string;
  organisation?: string;
  createdAt: any;
  updatedAt: any;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  access?: 'none' | 'admin' | 'subscriber';
}

export const migrateData = async () => {
  try {
    console.log('Starting data migration...');
    
    // Get all existing users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const users = usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as OldUserProfile));
    
    // Get all existing member applications
    const membersRef = collection(db, 'members');
    const membersSnapshot = await getDocs(membersRef);
    const memberApplications = membersSnapshot.docs.map(doc => doc.data() as MemberApplication);
    
    // Create a map of uid -> member application
    const memberMap = new Map<string, MemberApplication>();
    memberApplications.forEach(member => {
      memberMap.set(member.uid, member);
    });
    
    console.log(`Found ${users.length} users and ${memberApplications.length} member applications`);
    
    // Migrate each user
    for (const user of users) {
      const memberApplication = memberMap.get(user.uid);
      
      // Determine status for unified member
      let status: UnifiedMember['status'] = 'guest';
      if (user.access === 'admin') {
        status = 'admin';
      } else if (memberApplication) {
        switch (memberApplication.status) {
          case 'approved':
          case 'paid':
            status = 'approved';
            break;
          case 'pending':
          case 'invoice_sent':
            status = 'pending';
            break;
          default:
            status = 'guest';
        }
      }
      
      // Create unified member record
      const unifiedMember: UnifiedMember = {
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        personalName: user.personalName,
        status,
        organisation: user.organisation,
        createdAt: user.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Copy over member application data if it exists
        ...(memberApplication && {
          membershipType: memberApplication.membershipType,
          organizationName: memberApplication.organizationName,
          organizationType: memberApplication.organizationType,
          logoURL: memberApplication.logoURL,
          privacyAgreed: memberApplication.privacyAgreed,
          dataProcessingAgreed: memberApplication.dataProcessingAgreed,
          primaryContact: memberApplication.primaryContact,
          organizationDetails: memberApplication.organizationDetails,
          regulatory: memberApplication.regulatory,
          registeredAddress: memberApplication.registeredAddress,
          seniorLeadership: memberApplication.seniorLeadership,
          keyContacts: memberApplication.keyContacts,
          invoicingAddress: memberApplication.invoicingAddress,
          invoicingContact: memberApplication.invoicingContact,
          distributionStrategy: memberApplication.distributionStrategy,
          technology: memberApplication.technology,
          portfolio: memberApplication.portfolio,
          productLines: memberApplication.productLines,
          claimsModel: memberApplication.claimsModel,
          generalInformation: memberApplication.generalInformation,
          demographics: memberApplication.demographics,
          termsAgreed: memberApplication.termsAgreed,
          hasOtherAssociations: memberApplication.hasOtherAssociations,
          otherAssociations: memberApplication.otherAssociations
        })
      };
      
      // Save to new collection
      const unifiedMemberRef = doc(db, 'accounts', user.uid);
      await setDoc(unifiedMemberRef, unifiedMember);
      
      console.log(`Migrated user ${user.email} with status ${status}`);
    }
    
    // Handle member applications without corresponding users
    for (const memberApplication of memberApplications) {
      if (!users.find(user => user.uid === memberApplication.uid)) {
        console.warn(`Found member application without user: ${memberApplication.uid}`);
        // You might want to create a basic user record or handle this case differently
      }
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Instructions for running this migration:
/*
1. Set up a Node.js environment with Firebase Admin SDK
2. Initialize admin with service account credentials
3. Update the imports to use admin SDK
4. Run this script in a secure environment
5. Verify data integrity
6. Update Firebase security rules for new collection
7. Deploy updated application code
8. Test thoroughly
9. Archive old collections (don't delete immediately)
*/

console.log('Migration script loaded. Call migrateData() to execute.');