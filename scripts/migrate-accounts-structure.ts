import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface CurrentAccount {
  id: string;
  membershipType?: 'corporate' | 'individual';
  organizationName?: string;
  email: string;
  displayName?: string;
  personalName?: string;
  [key: string]: any;
}

export async function migrateAccountsStructure() {
  console.log('Starting accounts structure migration...');
  
  try {
    // Get all existing accounts
    const accountsRef = collection(db, 'accounts');
    const snapshot = await getDocs(accountsRef);
    
    const currentAccounts: CurrentAccount[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CurrentAccount[];
    
    console.log(`Found ${currentAccounts.length} accounts to migrate`);
    
    // Group corporate accounts by organization
    const corporateGroups = new Map<string, CurrentAccount[]>();
    const individualAccounts: CurrentAccount[] = [];
    
    currentAccounts.forEach(account => {
      if (account.membershipType === 'corporate' && account.organizationName) {
        const orgName = account.organizationName;
        if (!corporateGroups.has(orgName)) {
          corporateGroups.set(orgName, []);
        }
        corporateGroups.get(orgName)!.push(account);
      } else if (account.membershipType === 'individual') {
        individualAccounts.push(account);
      } else {
        // Handle accounts without membershipType (probably incomplete registrations)
        console.log(`Skipping account ${account.id} - no membershipType`);
      }
    });
    
    console.log(`Found ${corporateGroups.size} corporate organizations`);
    console.log(`Found ${individualAccounts.length} individual accounts`);
    
    const batch = writeBatch(db);
    
    // Migrate corporate organizations
    corporateGroups.forEach((members, orgName) => {
      // Use the first member's account as the template for organizational data
      const primaryMember = members[0];
      const orgId = `org_${orgName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
      
      console.log(`Creating organization: ${orgName} with ${members.length} members`);
      
      // Create organizational account
      const orgAccountRef = doc(db, 'accounts', orgId);
      batch.set(orgAccountRef, {
        membershipType: 'corporate',
        organizationName: orgName,
        organizationType: primaryMember.organizationType,
        status: primaryMember.status || 'active',
        primaryContact: primaryMember.primaryContact,
        registeredAddress: primaryMember.registeredAddress,
        portfolio: primaryMember.portfolio,
        hasOtherAssociations: primaryMember.hasOtherAssociations,
        otherAssociations: primaryMember.otherAssociations,
        logoUrl: primaryMember.logoUrl,
        privacyAgreed: primaryMember.privacyAgreed,
        dataProcessingAgreed: primaryMember.dataProcessingAgreed,
        organizationDetails: primaryMember.organizationDetails,
        regulatory: primaryMember.regulatory,
        createdAt: primaryMember.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        migratedAt: serverTimestamp()
      });
      
      // Add each member to the members subcollection
      members.forEach((member, index) => {
        const memberRef = doc(db, 'accounts', orgId, 'members', member.id);
        batch.set(memberRef, {
          name: member.personalName || member.displayName || 'Unknown',
          email: member.email,
          displayName: member.displayName,
          firebaseUid: member.id,
          role: index === 0 ? 'admin' : 'member', // First member becomes admin
          joinedAt: member.createdAt || serverTimestamp(),
          personalName: member.personalName,
          organisation: member.organisation
        });
        
        // Delete old individual account
        const oldAccountRef = doc(db, 'accounts', member.id);
        batch.delete(oldAccountRef);
      });
    });
    
    // Migrate individual accounts (restructure but keep as main accounts)
    individualAccounts.forEach(account => {
      console.log(`Migrating individual account: ${account.email}`);
      
      const accountRef = doc(db, 'accounts', account.id);
      batch.update(accountRef, {
        // Ensure organizationName is set to personal name for individuals
        organizationName: account.organizationName || account.personalName || account.displayName,
        migratedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
    
    // Execute all changes
    console.log('Executing migration batch...');
    await batch.commit();
    
    console.log('Migration completed successfully!');
    console.log(`Migrated ${corporateGroups.size} organizations and ${individualAccounts.length} individual accounts`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Example usage (run manually)
// migrateAccountsStructure().catch(console.error);