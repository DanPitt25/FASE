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
import { UnifiedMember, getMembersByStatus, getMembersWithPortalAccess, getAllMembers } from './unified-member';

// Messaging interfaces
export interface Message {
  id: string;
  subject: string;
  content: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientId?: string;
  recipientType: 'user' | 'all_members' | 'all_admins' | 'all_users';
  organizationType?: 'MGA' | 'carrier' | 'provider'; // Filter by organization type
  messageType: 'direct' | 'announcement' | 'system';
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

// Alert interfaces
export interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  targetAudience: 'all' | 'members' | 'admins' | 'specific';
  targetUsers?: string[];
  organizationType?: 'MGA' | 'carrier' | 'provider'; // Filter by organization type
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  expiresAt?: any;
  actionRequired: boolean;
  actionUrl?: string;
  actionText?: string;
  locale?: 'en' | 'fr' | 'de' | 'es' | 'it' | 'nl'; // Language of the alert
  emailSent?: boolean; // Track if email notification was sent
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
    
    // Create user message records based on recipient type using account IDs
    await createUserMessagesForRecipientsUnified(messageDoc.id, messageData.recipientType, messageData.recipientId, messageData.organizationType);
    
    return messageDoc.id;
  } catch (error) {
    throw error;
  }
};

// Simplified recipient handling using Firebase Auth UIDs only
const createUserMessagesForRecipientsUnified = async (
  messageId: string, 
  recipientType: string, 
  recipientId?: string,
  organizationType?: 'MGA' | 'carrier' | 'provider'
) => {
  try {
    let recipientUIDs: string[] = [];
    
    if (recipientType === 'user' && recipientId) {
      recipientUIDs = [recipientId];
    } else if (recipientType === 'all_members') {
      // Get all individual Firebase Auth UIDs with portal access (approved + admin)
      const members = await getMembersWithPortalAccess();
      
      // Filter by organization type if specified
      const filteredMembers = organizationType 
        ? members.filter(member => member.organizationType === organizationType)
        : members;
      
      recipientUIDs = filteredMembers.map(member => member.id); // These are Firebase Auth UIDs
    } else if (recipientType === 'all_admins') {
      // Get all admin Firebase Auth UIDs
      const admins = await getMembersByStatus('admin');
      
      // Filter by organization type if specified
      const filteredAdmins = organizationType 
        ? admins.filter(admin => admin.organizationType === organizationType)
        : admins;
      
      recipientUIDs = filteredAdmins.map(admin => admin.id); // These are Firebase Auth UIDs
    } else if (recipientType === 'all_users') {
      // Get all Firebase Auth UIDs (regardless of status)
      const allMembers = await getAllMembers();
      
      // Filter by organization type if specified
      const filteredMembers = organizationType 
        ? allMembers.filter(member => member.organizationType === organizationType)
        : allMembers;
      
      recipientUIDs = filteredMembers.map(member => member.id); // These are Firebase Auth UIDs
    }
    
    const userMessagePromises = recipientUIDs.map(uid => {
      const userMessageRef = doc(collection(db, 'userMessages'));
      const userMessage: UserMessage = {
        id: userMessageRef.id,
        messageId,
        userId: uid, // Using Firebase Auth UID consistently
        isRead: false,
        isDeleted: false,
        createdAt: serverTimestamp()
      };
      return setDoc(userMessageRef, userMessage);
    });
    
    await Promise.all(userMessagePromises);
  } catch (error) {
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
    
    // Create user alert records using account IDs
    if (alertData.targetAudience === 'all' || alertData.targetAudience === 'members' || alertData.targetAudience === 'admins') {
      await createUserAlertsForAudienceUnified(alertDoc.id, alertData.targetAudience, alertData.organizationType);
    } else if (alertData.targetAudience === 'specific' && alertData.targetUsers) {
      await createUserAlertsForUsers(alertDoc.id, alertData.targetUsers);
    }
    
    return alertDoc.id;
  } catch (error) {
    throw error;
  }
};

// Simplified alert audience handling using Firebase Auth UIDs only
const createUserAlertsForAudienceUnified = async (
  alertId: string, 
  audience: 'all' | 'members' | 'admins',
  organizationType?: 'MGA' | 'carrier' | 'provider'
) => {
  try {
    let recipientUIDs: string[] = [];
    
    if (audience === 'admins') {
      const admins = await getMembersByStatus('admin');
      
      // Filter by organization type if specified
      const filteredAdmins = organizationType 
        ? admins.filter(admin => admin.organizationType === organizationType)
        : admins;
      
      recipientUIDs = filteredAdmins.map(admin => admin.id); // Firebase Auth UIDs
    } else if (audience === 'members') {
      const members = await getMembersWithPortalAccess();
      
      // Filter by organization type if specified
      const filteredMembers = organizationType 
        ? members.filter(member => member.organizationType === organizationType)
        : members;
      
      recipientUIDs = filteredMembers.map(member => member.id); // Firebase Auth UIDs
    } else {
      // All members
      const allMembers = await getAllMembers();
      
      // Filter by organization type if specified
      const filteredMembers = organizationType 
        ? allMembers.filter(member => member.organizationType === organizationType)
        : allMembers;
      
      recipientUIDs = filteredMembers.map(member => member.id); // Firebase Auth UIDs
    }
    
    // Remove duplicates to prevent creating multiple userAlerts for the same user
    const uniqueRecipientUIDs = Array.from(new Set(recipientUIDs));
    
    const userAlertPromises = uniqueRecipientUIDs.map(uid => {
      const userAlertRef = doc(collection(db, 'userAlerts'));
      const userAlert: UserAlert = {
        id: userAlertRef.id,
        alertId,
        userId: uid, // Using Firebase Auth UID consistently
        isRead: false,
        isDismissed: false,
        createdAt: serverTimestamp()
      };
      return setDoc(userAlertRef, userAlert);
    });
    
    await Promise.all(userAlertPromises);
  } catch (error) {
    throw error;
  }
};

const createUserAlertsForUsers = async (alertId: string, userIds: string[]) => {
  try {
    // Remove duplicates to prevent creating multiple userAlerts for the same user
    const uniqueUserIds = Array.from(new Set(userIds));
    
    const userAlertPromises = uniqueUserIds.map(userId => {
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
    throw error;
  }
};

// Get messages for a specific user
export const getUserMessages = async (userId: string): Promise<(Message & UserMessage)[]> => {
  try {
    const userMessagesRef = collection(db, 'userMessages');
    const userMessagesQuery = query(
      userMessagesRef,
      where('userId', '==', userId),
      where('isDeleted', '==', false)
    );
    
    const userMessages = await getDocs(userMessagesQuery);
    
    const messagesWithDetails = await Promise.all(
      userMessages.docs.map(async (userMessageDoc) => {
        const userMessage = userMessageDoc.data() as UserMessage;
        const messageDoc = await getDoc(doc(db, 'messages', userMessage.messageId));
        
        if (messageDoc.exists()) {
          const message = messageDoc.data() as Message;
          return { 
            ...message, 
            ...userMessage,
            id: userMessageDoc.id // Use userMessage ID for operations
          };
        } else {
          return null;
        }
      })
    );
    
    return messagesWithDetails.filter(message => message !== null) as (Message & UserMessage)[];
  } catch (error) {
    return [];
  }
};

// Get alerts for a specific user
export const getUserAlerts = async (userId: string): Promise<(Alert & UserAlert)[]> => {
  try {
    const userAlertsRef = collection(db, 'userAlerts');
    const userAlertsQuery = query(
      userAlertsRef,
      where('userId', '==', userId),
      where('isDismissed', '==', false)
    );
    
    const userAlerts = await getDocs(userAlertsQuery);
    
    const alertsWithDetails = await Promise.all(
      userAlerts.docs.map(async (userAlertDoc) => {
        const userAlert = userAlertDoc.data() as UserAlert;
        const alertDoc = await getDoc(doc(db, 'alerts', userAlert.alertId));
        
        if (alertDoc.exists()) {
          const alert = alertDoc.data() as Alert;
          return { 
            ...alert, 
            ...userAlert,
            id: userAlertDoc.id // Use userAlert ID for operations
          };
        }
        return null;
      })
    );
    
    return alertsWithDetails.filter(alert => alert !== null) as (Alert & UserAlert)[];
  } catch (error) {
    return [];
  }
};

// Mark message as read
export const markMessageAsRead = async (userMessageId: string): Promise<void> => {
  try {
    const userMessageRef = doc(db, 'userMessages', userMessageId);
    await updateDoc(userMessageRef, {
      isRead: true,
      readAt: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

// Delete message for user
export const deleteMessageForUser = async (userMessageId: string): Promise<void> => {
  try {
    const userMessageRef = doc(db, 'userMessages', userMessageId);
    await updateDoc(userMessageRef, {
      isDeleted: true,
      deletedAt: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

// Mark alert as read
export const markAlertAsRead = async (userAlertId: string): Promise<void> => {
  try {
    const userAlertRef = doc(db, 'userAlerts', userAlertId);
    await updateDoc(userAlertRef, {
      isRead: true,
      readAt: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

// Dismiss alert
export const dismissAlert = async (userAlertId: string): Promise<void> => {
  try {
    const userAlertRef = doc(db, 'userAlerts', userAlertId);
    await updateDoc(userAlertRef, {
      isDismissed: true,
      dismissedAt: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

// Get all alerts (admin function)
export const getAllAlerts = async (): Promise<Alert[]> => {
  try {
    const alertsRef = collection(db, 'alerts');
    const alertsSnapshot = await getDocs(alertsRef);
    
    return alertsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Alert[];
  } catch (error) {
    return [];
  }
};

// Update alert
export const updateAlert = async (alertId: string, updates: Partial<Alert>): Promise<void> => {
  try {
    const alertRef = doc(db, 'alerts', alertId);
    await updateDoc(alertRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

// Get sent messages
export const getSentMessages = async (senderId: string): Promise<Message[]> => {
  try {
    const messagesRef = collection(db, 'messages');
    const sentQuery = query(messagesRef, where('senderId', '==', senderId));
    const sentMessages = await getDocs(sentQuery);
    
    return sentMessages.docs.map(doc => doc.data() as Message);
  } catch (error) {
    throw error;
  }
};

// Create welcome message for new account signups
export const createWelcomeMessage = async (newUserId: string): Promise<void> => {
  try {
    
    const welcomeMessage = {
      subject: 'Welcome to FASE - Fédération des agences de souscription',
      content: `Welcome to the Fédération des Agences de Souscription Européennes (FASE)!

We're delighted to have you join our growing community of MGA professionals, capacity providers, and service companies across Europe.

Your account has been successfully created and is currently under review. You'll receive an email notification once your membership status is updated.

In the meantime, you can:
• Explore our member resources and educational content
• Learn about upcoming events and networking opportunities
• Connect with the European MGA community

If you have any questions about your membership or need assistance, please don't hesitate to contact us at help@fasemga.com.

Thank you for choosing to be part of FASE's mission to strengthen and advance the European MGA ecosystem.

Best regards,
The FASE Team`,
      senderId: 'system',
      senderName: 'FASE System',
      senderEmail: 'info@fasemga.com',
      recipientId: newUserId,
      recipientType: 'user' as const,
      messageType: 'system' as const,
      priority: 'medium' as const,
      isRead: false
    };

    // Send the welcome message
    await sendMessage(welcomeMessage);
  } catch (error) {
    // Don't throw error to avoid breaking account creation
  }
};