import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  DocumentData 
} from 'firebase/firestore';
import { db } from './firebase';
import { UnifiedMember, getMembersByStatus, getMembersWithPortalAccess } from './unified-member';

// Messaging interfaces (unchanged)
export interface Message {
  id: string;
  subject: string;
  content: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientId?: string;
  recipientType: 'user' | 'all_members' | 'all_admins' | 'all_users';
  messageType: 'direct' | 'announcement' | 'system';
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: any;
  updatedAt: any;
  parentMessageId?: string;
  attachments?: string[];
}

export interface UserMessage {
  id: string;
  messageId: string;
  userId: string;
  isRead: boolean;
  readAt?: any;
  isDeleted: boolean;
  deletedAt?: any;
  createdAt: any;
}

// Alert interfaces (unchanged)
export interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  targetAudience: 'all' | 'members' | 'admins' | 'specific';
  targetUsers?: string[];
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  expiresAt?: any;
  actionRequired: boolean;
  actionUrl?: string;
  actionText?: string;
}

export interface UserAlert {
  id: string;
  alertId: string;
  userId: string;
  isRead: boolean;
  isDismissed: boolean;
  readAt?: any;
  dismissedAt?: any;
  createdAt: any;
}

// Updated message creation with unified member support
export const sendMessage = async (messageData: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const messagesRef = collection(db, 'messages');
    const messageDoc = doc(messagesRef);
    
    const message: Message = {
      ...messageData,
      id: messageDoc.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(messageDoc, message);
    
    // Create user message records based on recipient type using unified members
    await createUserMessagesForRecipientsUnified(messageDoc.id, messageData.recipientType, messageData.recipientId);
    
    return messageDoc.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Updated recipient handling with unified members
const createUserMessagesForRecipientsUnified = async (
  messageId: string, 
  recipientType: string, 
  recipientId?: string
) => {
  try {
    let recipientIds: string[] = [];
    
    if (recipientType === 'user' && recipientId) {
      recipientIds = [recipientId];
    } else if (recipientType === 'all_members') {
      // Get all members with portal access (approved + admin)
      const members = await getMembersWithPortalAccess();
      recipientIds = members.map(member => member.id);
    } else if (recipientType === 'all_admins') {
      // Get all admin members
      const admins = await getMembersByStatus('admin');
      recipientIds = admins.map(admin => admin.id);
    } else if (recipientType === 'all_users') {
      // Get all unified members (regardless of status)
      const accountsRef = collection(db, 'accounts');
      const allAccounts = await getDocs(accountsRef);
      
      recipientIds = [];
      
      for (const accountDoc of allAccounts.docs) {
        const accountData = accountDoc.data();
        
        if (accountData.membershipType === 'corporate') {
          // For corporate accounts, get all members from subcollection
          const membersRef = collection(db, 'accounts', accountDoc.id, 'members');
          const membersSnapshot = await getDocs(membersRef);
          const memberIds = membersSnapshot.docs.map(memberDoc => memberDoc.data().firebaseUid).filter(Boolean);
          recipientIds.push(...memberIds);
        } else {
          // For individual accounts, use the account ID directly
          recipientIds.push(accountDoc.id);
        }
      }
    }
    
    const userMessagePromises = recipientIds.map(userId => {
      const userMessageRef = doc(collection(db, 'userMessages'));
      const userMessage: UserMessage = {
        id: userMessageRef.id,
        messageId,
        userId,
        isRead: false,
        isDeleted: false,
        createdAt: serverTimestamp()
      };
      return setDoc(userMessageRef, userMessage);
    });
    
    await Promise.all(userMessagePromises);
    console.log(`Created user messages for ${recipientIds.length} recipients`);
  } catch (error) {
    console.error('Error creating user messages for recipients:', error);
    throw error;
  }
};

// Updated alert creation with unified member support
export const createAlert = async (alertData: Omit<Alert, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const alertsRef = collection(db, 'alerts');
    const alertDoc = doc(alertsRef);
    
    const alert: Alert = {
      ...alertData,
      id: alertDoc.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(alertDoc, alert);
    
    // Create user alert records using unified members
    if (alertData.targetAudience === 'all' || alertData.targetAudience === 'members') {
      await createUserAlertsForAudienceUnified(alertDoc.id, alertData.targetAudience);
    } else if (alertData.targetAudience === 'specific' && alertData.targetUsers) {
      await createUserAlertsForUsers(alertDoc.id, alertData.targetUsers);
    }
    
    return alertDoc.id;
  } catch (error) {
    console.error('Error creating alert:', error);
    throw error;
  }
};

// Updated alert audience handling
const createUserAlertsForAudienceUnified = async (alertId: string, audience: 'all' | 'members' | 'admins') => {
  try {
    let recipientIds: string[] = [];
    
    if (audience === 'admins') {
      const admins = await getMembersByStatus('admin');
      recipientIds = admins.map(admin => admin.id);
    } else if (audience === 'members') {
      const members = await getMembersWithPortalAccess();
      recipientIds = members.map(member => member.id);
    } else {
      // All users
      const accountsRef = collection(db, 'accounts');
      const allAccounts = await getDocs(accountsRef);
      
      recipientIds = [];
      
      for (const accountDoc of allAccounts.docs) {
        const accountData = accountDoc.data();
        
        if (accountData.membershipType === 'corporate') {
          // For corporate accounts, get all members from subcollection
          const membersRef = collection(db, 'accounts', accountDoc.id, 'members');
          const membersSnapshot = await getDocs(membersRef);
          const memberIds = membersSnapshot.docs.map(memberDoc => memberDoc.data().firebaseUid).filter(Boolean);
          recipientIds.push(...memberIds);
        } else {
          // For individual accounts, use the account ID directly
          recipientIds.push(accountDoc.id);
        }
      }
    }
    
    const userAlertPromises = recipientIds.map(userId => {
      const userAlertRef = doc(collection(db, 'userAlerts'));
      const userAlert: UserAlert = {
        id: userAlertRef.id,
        alertId,
        userId,
        isRead: false,
        isDismissed: false,
        createdAt: serverTimestamp()
      };
      return setDoc(userAlertRef, userAlert);
    });
    
    await Promise.all(userAlertPromises);
  } catch (error) {
    console.error('Error creating user alerts for audience:', error);
    throw error;
  }
};

const createUserAlertsForUsers = async (alertId: string, userIds: string[]) => {
  try {
    const userAlertPromises = userIds.map(userId => {
      const userAlertRef = doc(collection(db, 'userAlerts'));
      const userAlert: UserAlert = {
        id: userAlertRef.id,
        alertId,
        userId,
        isRead: false,
        isDismissed: false,
        createdAt: serverTimestamp()
      };
      return setDoc(userAlertRef, userAlert);
    });
    
    await Promise.all(userAlertPromises);
  } catch (error) {
    console.error('Error creating user alerts for specific users:', error);
    throw error;
  }
};

// All other existing message/alert functions remain the same
// (getUserMessages, getUserAlerts, markMessageAsRead, etc.)
// They don't need to change because they work with the userId which remains the same

// Re-export existing functions from the original firestore.ts
export { 
  getUserMessages, 
  getUserAlerts, 
  markMessageAsRead, 
  deleteMessageForUser, 
  markAlertAsRead, 
  dismissAlert,
  getAllAlerts,
  updateAlert,
  getSentMessages
} from './firestore';