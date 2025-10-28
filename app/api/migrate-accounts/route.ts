import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

interface CorporateAccount {
  id: string;
  data: any;
  primaryContactMemberId: string;
  members: { [uid: string]: any };
}

/**
 * API endpoint to migrate corporate accounts from generated IDs to Firebase Auth UIDs
 * This eliminates the dual-identity confusion in the account system
 */
export async function POST(request: NextRequest) {
  try {
    const { action, confirm } = await request.json();
    
    // Safety check - require explicit confirmation
    if (action === 'migrate' && confirm !== 'I understand this will permanently change account IDs') {
      return NextResponse.json({ 
        error: 'Migration requires explicit confirmation' 
      }, { status: 400 });
    }

    // Get all corporate accounts with generated IDs
    const accountsRef = collection(db, 'accounts');
    const corporateQuery = query(accountsRef, where('membershipType', '==', 'corporate'));
    const snapshot = await getDocs(corporateQuery);
    
    const corporateAccounts: CorporateAccount[] = [];
    
    for (const accountDoc of snapshot.docs) {
      const accountData = accountDoc.data();
      const accountId = accountDoc.id;
      
      // Only process accounts with generated IDs (start with "company_")
      if (accountId.startsWith('company_')) {
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

    // If this is just a dry run, return the plan
    if (action === 'dry-run' || !action) {
      return NextResponse.json({
        action: 'dry-run',
        totalCorporateAccounts: corporateAccounts.length,
        migrationPlan: corporateAccounts.map(account => ({
          oldId: account.id,
          newId: account.primaryContactMemberId,
          organizationName: account.data.organizationName,
          memberCount: Object.keys(account.members).length,
          isValid: !!account.primaryContactMemberId && 
                  !!account.members[account.primaryContactMemberId]
        }))
      });
    }

    // Perform actual migration
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const account of corporateAccounts) {
      try {
        const { id: oldAccountId, data: accountData, primaryContactMemberId, members } = account;
        
        // Validation
        if (!primaryContactMemberId) {
          throw new Error('No primaryContactMemberId');
        }
        
        // Check if target already exists
        const targetRef = doc(db, 'accounts', primaryContactMemberId);
        const targetDoc = await getDoc(targetRef);
        if (targetDoc.exists()) {
          throw new Error('Target account already exists');
        }
        
        // Verify primary contact exists in members
        if (!members[primaryContactMemberId]) {
          throw new Error('Primary contact not found in members subcollection');
        }

        // Create batch for atomic operation
        const batch = writeBatch(db);
        
        // 1. Create new account document
        const newAccountRef = doc(db, 'accounts', primaryContactMemberId);
        batch.set(newAccountRef, {
          ...accountData,
          id: primaryContactMemberId,
          migratedFrom: oldAccountId,
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
        
        // 3. Delete old account and subcollection
        Object.keys(members).forEach(memberUid => {
          const oldMemberRef = doc(db, 'accounts', oldAccountId, 'members', memberUid);
          batch.delete(oldMemberRef);
        });
        
        const oldAccountRef = doc(db, 'accounts', oldAccountId);
        batch.delete(oldAccountRef);
        
        // Execute batch
        await batch.commit();
        
        // Update messaging references
        await updateMessagingReferences(oldAccountId, primaryContactMemberId);
        
        successCount++;
        
      } catch (error) {
        failCount++;
        errors.push(`Failed to migrate ${account.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      action: 'migrate',
      totalAccounts: corporateAccounts.length,
      successfulMigrations: successCount,
      failedMigrations: failCount,
      errors
    });

  } catch (error) {
    console.error('Migration API error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error.message 
    }, { status: 500 });
  }
}

async function updateMessagingReferences(oldAccountId: string, newAccountId: string): Promise<void> {
  try {
    // Update userMessages
    const userMessagesRef = collection(db, 'userMessages');
    const messagesQuery = query(userMessagesRef, where('userId', '==', oldAccountId));
    const messagesSnapshot = await getDocs(messagesQuery);
    
    if (messagesSnapshot.docs.length > 0) {
      const messageBatch = writeBatch(db);
      messagesSnapshot.docs.forEach(messageDoc => {
        messageBatch.update(messageDoc.ref, {
          userId: newAccountId,
          migratedFrom: oldAccountId,
          migratedAt: new Date()
        });
      });
      await messageBatch.commit();
    }
    
    // Update userAlerts
    const userAlertsRef = collection(db, 'userAlerts');
    const alertsQuery = query(userAlertsRef, where('userId', '==', oldAccountId));
    const alertsSnapshot = await getDocs(alertsQuery);
    
    if (alertsSnapshot.docs.length > 0) {
      const alertsBatch = writeBatch(db);
      alertsSnapshot.docs.forEach(alertDoc => {
        alertsBatch.update(alertDoc.ref, {
          userId: newAccountId,
          migratedFrom: oldAccountId,
          migratedAt: new Date()
        });
      });
      await alertsBatch.commit();
    }
    
  } catch (error) {
    console.error('Failed to update messaging references:', error);
  }
}