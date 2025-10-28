/**
 * Migration Script: Corporate Account ID Standardization
 * 
 * This script migrates corporate accounts from generated company IDs 
 * (like "company_1761648509155_b2h431uhy") to use the primary contact's 
 * Firebase Auth UID as the document ID.
 * 
 * This eliminates the dual-identity confusion between Firebase Auth UIDs
 * and Firestore account document IDs.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';

// Initialize Firebase (adjust config as needed)
const firebaseConfig = {
  // Add your Firebase config here
  // This should match your production Firebase config
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

interface CorporateAccount {
  id: string;
  data: any;
  primaryContactMemberId: string;
  members: { [uid: string]: any };
}

interface MigrationReport {
  totalCorporateAccounts: number;
  accountsWithGeneratedIds: number;
  successfulMigrations: number;
  failedMigrations: number;
  errors: string[];
}

/**
 * Step 1: Audit existing corporate accounts
 */
async function auditCorporateAccounts(): Promise<CorporateAccount[]> {
  console.log('🔍 Auditing corporate accounts...');
  
  const accountsRef = collection(db, 'accounts');
  const corporateQuery = query(accountsRef, where('membershipType', '==', 'corporate'));
  const snapshot = await getDocs(corporateQuery);
  
  const corporateAccounts: CorporateAccount[] = [];
  
  for (const accountDoc of snapshot.docs) {
    const accountData = accountDoc.data();
    const accountId = accountDoc.id;
    
    // Check if this uses a generated ID (starts with "company_")
    if (accountId.startsWith('company_')) {
      console.log(`📋 Found corporate account with generated ID: ${accountId}`);
      console.log(`   Organization: ${accountData.organizationName}`);
      console.log(`   Primary Contact: ${accountData.primaryContactMemberId}`);
      
      // Get all members in this account
      const membersRef = collection(db, 'accounts', accountId, 'members');
      const membersSnapshot = await getDocs(membersRef);
      
      const members: { [uid: string]: any } = {};
      membersSnapshot.docs.forEach(memberDoc => {
        members[memberDoc.id] = memberDoc.data();
      });
      
      corporateAccounts.push({
        id: accountId,
        data: accountData,
        primaryContactMemberId: accountData.primaryContactMemberId,
        members
      });
    }
  }
  
  console.log(`📊 Found ${corporateAccounts.length} corporate accounts with generated IDs`);
  return corporateAccounts;
}

/**
 * Step 2: Validate migration safety
 */
async function validateMigration(account: CorporateAccount): Promise<boolean> {
  const { primaryContactMemberId } = account;
  
  if (!primaryContactMemberId) {
    console.error(`❌ Account ${account.id} has no primaryContactMemberId`);
    return false;
  }
  
  // Check if target document already exists
  const targetRef = doc(db, 'accounts', primaryContactMemberId);
  const targetDoc = await getDoc(targetRef);
  
  if (targetDoc.exists()) {
    console.error(`❌ Target account ${primaryContactMemberId} already exists`);
    return false;
  }
  
  // Verify primary contact exists in members subcollection
  if (!account.members[primaryContactMemberId]) {
    console.error(`❌ Primary contact ${primaryContactMemberId} not found in members subcollection`);
    return false;
  }
  
  return true;
}

/**
 * Step 3: Migrate a single corporate account
 */
async function migrateSingleAccount(account: CorporateAccount): Promise<boolean> {
  const { id: oldAccountId, data: accountData, primaryContactMemberId, members } = account;
  
  try {
    console.log(`🔄 Migrating ${oldAccountId} -> ${primaryContactMemberId}`);
    
    // Create batch for atomic operation
    const batch = writeBatch(db);
    
    // 1. Create new account document with primary contact UID as ID
    const newAccountRef = doc(db, 'accounts', primaryContactMemberId);
    batch.set(newAccountRef, {
      ...accountData,
      id: primaryContactMemberId, // Update the ID field
      migratedFrom: oldAccountId, // Keep track of migration
      migratedAt: new Date()
    });
    
    // 2. Create new members subcollection
    Object.entries(members).forEach(([memberUid, memberData]) => {
      const newMemberRef = doc(db, 'accounts', primaryContactMemberId, 'members', memberUid);
      batch.set(newMemberRef, {
        ...memberData,
        migratedFrom: `${oldAccountId}/members/${memberUid}`,
        migratedAt: new Date()
      });
    });
    
    // 3. Delete old account and its subcollection
    // First delete all members
    Object.keys(members).forEach(memberUid => {
      const oldMemberRef = doc(db, 'accounts', oldAccountId, 'members', memberUid);
      batch.delete(oldMemberRef);
    });
    
    // Then delete the main account
    const oldAccountRef = doc(db, 'accounts', oldAccountId);
    batch.delete(oldAccountRef);
    
    // Execute the batch
    await batch.commit();
    
    console.log(`✅ Successfully migrated ${oldAccountId} -> ${primaryContactMemberId}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to migrate ${oldAccountId}:`, error);
    return false;
  }
}

/**
 * Step 4: Update any existing userMessages/userAlerts that reference old account IDs
 */
async function updateMessagingReferences(oldAccountId: string, newAccountId: string): Promise<void> {
  console.log(`📬 Updating messaging references: ${oldAccountId} -> ${newAccountId}`);
  
  try {
    // Update userMessages
    const userMessagesRef = collection(db, 'userMessages');
    const messagesQuery = query(userMessagesRef, where('userId', '==', oldAccountId));
    const messagesSnapshot = await getDocs(messagesQuery);
    
    const messageBatch = writeBatch(db);
    messagesSnapshot.docs.forEach(messageDoc => {
      messageBatch.update(messageDoc.ref, {
        userId: newAccountId,
        migratedFrom: oldAccountId,
        migratedAt: new Date()
      });
    });
    
    if (messagesSnapshot.docs.length > 0) {
      await messageBatch.commit();
      console.log(`📧 Updated ${messagesSnapshot.docs.length} user messages`);
    }
    
    // Update userAlerts
    const userAlertsRef = collection(db, 'userAlerts');
    const alertsQuery = query(userAlertsRef, where('userId', '==', oldAccountId));
    const alertsSnapshot = await getDocs(alertsQuery);
    
    const alertsBatch = writeBatch(db);
    alertsSnapshot.docs.forEach(alertDoc => {
      alertsBatch.update(alertDoc.ref, {
        userId: newAccountId,
        migratedFrom: oldAccountId,
        migratedAt: new Date()
      });
    });
    
    if (alertsSnapshot.docs.length > 0) {
      await alertsBatch.commit();
      console.log(`🚨 Updated ${alertsSnapshot.docs.length} user alerts`);
    }
    
  } catch (error) {
    console.error(`❌ Failed to update messaging references:`, error);
  }
}

/**
 * Main migration function
 */
export async function migrateCorporateAccountIds(): Promise<MigrationReport> {
  console.log('🚀 Starting Corporate Account ID Migration');
  console.log('=====================================');
  
  const report: MigrationReport = {
    totalCorporateAccounts: 0,
    accountsWithGeneratedIds: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    errors: []
  };
  
  try {
    // Step 1: Audit existing accounts
    const corporateAccounts = await auditCorporateAccounts();
    report.totalCorporateAccounts = corporateAccounts.length;
    report.accountsWithGeneratedIds = corporateAccounts.length;
    
    if (corporateAccounts.length === 0) {
      console.log('✅ No corporate accounts with generated IDs found. Migration not needed.');
      return report;
    }
    
    // Step 2: Validate and migrate each account
    for (const account of corporateAccounts) {
      console.log(`\n--- Processing ${account.id} ---`);
      
      // Validate migration safety
      const isValid = await validateMigration(account);
      if (!isValid) {
        report.failedMigrations++;
        report.errors.push(`Validation failed for ${account.id}`);
        continue;
      }
      
      // Perform migration
      const success = await migrateSingleAccount(account);
      if (success) {
        // Update messaging references
        await updateMessagingReferences(account.id, account.primaryContactMemberId);
        report.successfulMigrations++;
      } else {
        report.failedMigrations++;
        report.errors.push(`Migration failed for ${account.id}`);
      }
    }
    
    // Final report
    console.log('\n🎉 Migration Complete!');
    console.log('=====================');
    console.log(`📊 Total corporate accounts: ${report.totalCorporateAccounts}`);
    console.log(`🔄 Accounts with generated IDs: ${report.accountsWithGeneratedIds}`);
    console.log(`✅ Successful migrations: ${report.successfulMigrations}`);
    console.log(`❌ Failed migrations: ${report.failedMigrations}`);
    
    if (report.errors.length > 0) {
      console.log('\n❌ Errors:');
      report.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    return report;
    
  } catch (error) {
    console.error('💥 Migration failed with error:', error);
    report.errors.push(`Migration failed: ${error}`);
    return report;
  }
}

/**
 * Dry run function - shows what would be migrated without making changes
 */
export async function dryRunMigration(): Promise<void> {
  console.log('🔍 DRY RUN: Corporate Account ID Migration');
  console.log('=========================================');
  
  const corporateAccounts = await auditCorporateAccounts();
  
  if (corporateAccounts.length === 0) {
    console.log('✅ No corporate accounts with generated IDs found.');
    return;
  }
  
  console.log('\n📋 Migration Plan:');
  console.log('==================');
  
  for (const account of corporateAccounts) {
    console.log(`\n${account.id} -> ${account.primaryContactMemberId}`);
    console.log(`   Organization: ${account.data.organizationName}`);
    console.log(`   Members: ${Object.keys(account.members).length}`);
    
    // Validation check
    const isValid = await validateMigration(account);
    console.log(`   Valid: ${isValid ? '✅' : '❌'}`);
  }
}

// Export for use in scripts
if (require.main === module) {
  // Run as standalone script
  const args = process.argv.slice(2);
  
  if (args.includes('--dry-run')) {
    dryRunMigration().catch(console.error);
  } else {
    migrateCorporateAccountIds().catch(console.error);
  }
}