import { db } from './firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, Timestamp, startAfter } from 'firebase/firestore';

export interface ActionRecord {
  id?: string;
  timestamp: any;
  adminUserId: string;
  adminUserEmail?: string;
  memberAccountId?: string;
  memberEmail?: string;
  organizationName?: string;
  action: string;
  details: {
    oldValue?: any;
    newValue?: any;
    emailType?: string;
    templateUsed?: string;
    reason?: string;
    amount?: string;
    invoiceNumber?: string;
    [key: string]: any;
  };
  category: 'member' | 'email' | 'payment' | 'invoice' | 'system';
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  duration?: number;
}

export class AuditLogger {
  private static collectionName = 'actions';

  /**
   * Recursively remove undefined values from an object
   */
  private static cleanUndefined(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanUndefined(item)).filter(item => item !== undefined);
    }
    
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, this.cleanUndefined(value)])
    );
  }

  /**
   * Log an action to the persistent actions collection
   */
  static async logAction(actionData: Omit<ActionRecord, 'id' | 'timestamp'>): Promise<string> {
    try {
      // Filter out undefined values recursively to avoid Firestore errors
      const cleanData = this.cleanUndefined({
        ...actionData,
        timestamp: serverTimestamp()
      });

      const docRef = await addDoc(collection(db, this.collectionName), cleanData);
      
      console.log(`✅ Action logged: ${actionData.action} (${docRef.id})`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Failed to log action:', error);
      throw error;
    }
  }

  /**
   * Log a member management action
   */
  static async logMemberAction(data: {
    adminUserId: string;
    adminUserEmail?: string;
    memberAccountId: string;
    memberEmail?: string;
    organizationName?: string;
    action: string;
    oldValue?: any;
    newValue?: any;
    reason?: string;
    success?: boolean;
    errorMessage?: string;
  }): Promise<string> {
    return this.logAction({
      adminUserId: data.adminUserId,
      adminUserEmail: data.adminUserEmail,
      memberAccountId: data.memberAccountId,
      memberEmail: data.memberEmail,
      organizationName: data.organizationName,
      action: data.action,
      details: {
        oldValue: data.oldValue,
        newValue: data.newValue,
        reason: data.reason
      },
      category: 'member',
      success: data.success ?? true,
      errorMessage: data.errorMessage
    });
  }

  /**
   * Log an email communication
   */
  static async logEmailAction(data: {
    adminUserId: string;
    adminUserEmail?: string;
    memberAccountId?: string;
    memberEmail?: string;
    organizationName?: string;
    action: string;
    emailType: string;
    templateUsed?: string;
    subject?: string;
    success?: boolean;
    errorMessage?: string;
  }): Promise<string> {
    return this.logAction({
      adminUserId: data.adminUserId,
      adminUserEmail: data.adminUserEmail,
      memberAccountId: data.memberAccountId,
      memberEmail: data.memberEmail,
      organizationName: data.organizationName,
      action: data.action,
      details: {
        emailType: data.emailType,
        templateUsed: data.templateUsed,
        subject: data.subject
      },
      category: 'email',
      success: data.success ?? true,
      errorMessage: data.errorMessage
    });
  }

  /**
   * Log a payment-related action
   */
  static async logPaymentAction(data: {
    adminUserId: string;
    adminUserEmail?: string;
    memberAccountId?: string;
    memberEmail?: string;
    organizationName?: string;
    action: string;
    amount?: string;
    invoiceNumber?: string;
    paymentMethod?: string;
    success?: boolean;
    errorMessage?: string;
  }): Promise<string> {
    return this.logAction({
      adminUserId: data.adminUserId,
      adminUserEmail: data.adminUserEmail,
      memberAccountId: data.memberAccountId,
      memberEmail: data.memberEmail,
      organizationName: data.organizationName,
      action: data.action,
      details: {
        amount: data.amount,
        invoiceNumber: data.invoiceNumber,
        paymentMethod: data.paymentMethod
      },
      category: 'payment',
      success: data.success ?? true,
      errorMessage: data.errorMessage
    });
  }

  /**
   * Log complete invoice generation with ALL PDF and email data
   */
  static async logInvoiceGeneration(data: {
    adminUserId: string;
    adminUserEmail?: string;
    action: string;
    success?: boolean;
    errorMessage?: string;
    invoiceData: {
      // Core invoice details
      invoiceNumber: string;
      invoiceType: 'regular' | 'lost_invoice' | 'reminder' | 'followup' | 'sponsorship';
      isLostInvoice?: boolean;
      
      // Recipient information
      recipientEmail: string;
      recipientName: string;
      organizationName: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        postcode?: string;
        country?: string;
      };
      
      // Financial details
      originalAmount: number;
      discountAmount?: number;
      discountReason?: string;
      totalAmount: number;
      currency: string;
      convertedCurrency?: string;
      convertedAmount?: number;
      exchangeRate?: number;
      
      // Membership details
      organizationType: 'MGA' | 'carrier' | 'provider';
      grossWrittenPremiums?: string;
      hasOtherAssociations?: boolean;
      
      // Payment details
      bankDetails?: {
        accountName?: string;
        accountNumber?: string;
        iban?: string;
        bic?: string;
        bankName?: string;
        reference?: string;
      };
      
      // Email details
      emailTemplate: string;
      emailLanguage: string;
      emailSubject?: string;
      customizedEmailContent?: any;
      
      // Technical details
      pdfGenerated: boolean;
      emailId?: string;
      invoiceDate?: string;
      dueDate?: string;
      
      // Attachments
      attachments?: Array<{
        filename: string;
        type: 'pdf' | 'image' | 'document';
        size?: number;
      }>;
    };
  }): Promise<string> {
    return this.logAction({
      adminUserId: data.adminUserId,
      adminUserEmail: data.adminUserEmail,
      memberAccountId: data.invoiceData.recipientEmail, // Use email as member identifier
      memberEmail: data.invoiceData.recipientEmail,
      organizationName: data.invoiceData.organizationName,
      action: data.action,
      details: {
        // Complete invoice snapshot
        invoiceSnapshot: data.invoiceData,
        
        // Key summary fields for quick reference
        invoiceNumber: data.invoiceData.invoiceNumber,
        invoiceType: data.invoiceData.invoiceType,
        totalAmount: data.invoiceData.totalAmount,
        currency: data.invoiceData.currency,
        recipientEmail: data.invoiceData.recipientEmail,
        emailTemplate: data.invoiceData.emailTemplate,
        pdfGenerated: data.invoiceData.pdfGenerated,
        
        // Financial breakdown
        originalAmount: data.invoiceData.originalAmount,
        discountAmount: data.invoiceData.discountAmount,
        discountReason: data.invoiceData.discountReason,
        
        // Currency conversion details
        ...(data.invoiceData.convertedCurrency && {
          currencyConversion: {
            baseCurrency: data.invoiceData.currency,
            convertedCurrency: data.invoiceData.convertedCurrency,
            convertedAmount: data.invoiceData.convertedAmount,
            exchangeRate: data.invoiceData.exchangeRate
          }
        }),
        
        // Address snapshot
        billingAddress: data.invoiceData.address,
        
        // Payment details snapshot
        paymentInstructions: data.invoiceData.bankDetails,
        
        // Email customizations
        emailCustomizations: data.invoiceData.customizedEmailContent
      },
      category: 'invoice',
      success: data.success ?? true,
      errorMessage: data.errorMessage
    });
  }

  /**
   * Get actions for a specific member
   */
  static async getMemberActions(memberAccountId: string, limitCount: number = 50): Promise<ActionRecord[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('memberAccountId', '==', memberAccountId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionRecord));
    } catch (error) {
      console.error('Failed to get member actions:', error);
      return [];
    }
  }

  /**
   * Get recent actions by admin user
   */
  static async getAdminActions(adminUserId: string, limitCount: number = 50): Promise<ActionRecord[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('adminUserId', '==', adminUserId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionRecord));
    } catch (error) {
      console.error('Failed to get admin actions:', error);
      return [];
    }
  }

  /**
   * Get recent actions across all users with pagination support
   */
  static async getRecentActions(limitCount: number = 100, offsetCount: number = 0): Promise<ActionRecord[]> {
    try {
      // For simplicity, we'll get a larger set and slice it client-side
      // In production, you'd want proper Firestore pagination with cursors
      const totalToFetch = limitCount + offsetCount;
      
      const q = query(
        collection(db, this.collectionName),
        orderBy('timestamp', 'desc'),
        limit(totalToFetch)
      );
      
      const querySnapshot = await getDocs(q);
      const allDocs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionRecord));
      
      // Slice to get the requested page
      return allDocs.slice(offsetCount, offsetCount + limitCount);
    } catch (error) {
      console.error('Failed to get recent actions:', error);
      return [];
    }
  }

  /**
   * Get actions by category
   */
  static async getActionsByCategory(category: ActionRecord['category'], limitCount: number = 50): Promise<ActionRecord[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('category', '==', category),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionRecord));
    } catch (error) {
      console.error('Failed to get actions by category:', error);
      return [];
    }
  }
}

/**
 * Wrapper function to automatically log function execution
 */
export async function withAuditLog<T>(
  actionName: string,
  adminUserId: string,
  operation: () => Promise<T>,
  options: {
    memberAccountId?: string;
    memberEmail?: string;
    organizationName?: string;
    category?: ActionRecord['category'];
    additionalDetails?: Record<string, any>;
  } = {}
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    
    await AuditLogger.logAction({
      adminUserId,
      memberAccountId: options.memberAccountId,
      memberEmail: options.memberEmail,
      organizationName: options.organizationName,
      action: actionName,
      details: {
        ...options.additionalDetails,
        duration: Date.now() - startTime
      },
      category: options.category || 'system',
      success: true,
      duration: Date.now() - startTime
    });
    
    return result;
  } catch (error: any) {
    await AuditLogger.logAction({
      adminUserId,
      memberAccountId: options.memberAccountId,
      memberEmail: options.memberEmail,
      organizationName: options.organizationName,
      action: actionName,
      details: {
        ...options.additionalDetails,
        duration: Date.now() - startTime
      },
      category: options.category || 'system',
      success: false,
      errorMessage: error.message,
      duration: Date.now() - startTime
    });
    
    throw error;
  }
}