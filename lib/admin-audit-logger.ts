import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const adminDb = getFirestore();

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
    reason?: string;
    [key: string]: any;
  };
  category: 'member' | 'email' | 'payment' | 'invoice' | 'system';
  success?: boolean;
  errorMessage?: string;
  duration?: number;
}

export class AdminAuditLogger {
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
   * Log an action to the persistent actions collection using Admin SDK
   */
  static async logAction(actionData: Omit<ActionRecord, 'id' | 'timestamp'>): Promise<string> {
    try {
      // Filter out undefined values recursively to avoid Firestore errors
      const cleanData = this.cleanUndefined({
        ...actionData,
        timestamp: new Date()
      });

      const docRef = await adminDb.collection(this.collectionName).add(cleanData);
      
      console.log(`✅ Action logged: ${actionData.action} (${docRef.id})`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Failed to log action:', error);
      throw error;
    }
  }

  /**
   * Log email communication with full content and metadata
   */
  static async logEmailSent(data: {
    adminUserId?: string;
    adminUserEmail?: string;
    action: string;
    success?: boolean;
    errorMessage?: string;
    emailData: {
      // Email recipients
      toEmail: string;
      toName?: string;
      ccEmails?: string[];
      organizationName?: string;
      
      // Email content
      subject: string;
      emailType: string; // template type like 'membership_invoice', 'sponsorship', etc.
      htmlContent: string;
      textContent?: string;
      
      // Email metadata
      emailLanguage?: string;
      templateUsed?: string;
      customizedContent?: boolean;
      
      // Attachments
      attachments?: Array<{
        filename: string;
        type: 'pdf' | 'image' | 'document';
        size?: number;
      }>;
      
      // Related records
      invoiceNumber?: string;
      memberApplicationId?: string;
      emailServiceId?: string; // Resend/SendGrid ID
      
      // Financial data (for invoice emails)
      invoiceAmount?: number;
      currency?: string;
      paymentInstructions?: string;
    };
  }): Promise<string> {
    return this.logAction({
      adminUserId: data.adminUserId || 'system',
      adminUserEmail: data.adminUserEmail,
      memberAccountId: data.emailData.toEmail, // Use email as member identifier
      memberEmail: data.emailData.toEmail,
      organizationName: data.emailData.organizationName,
      action: data.action,
      details: {
        // Complete email snapshot
        emailSnapshot: data.emailData,
        
        // Key summary fields for quick reference
        emailType: data.emailData.emailType,
        subject: data.emailData.subject,
        toEmail: data.emailData.toEmail,
        ccEmails: data.emailData.ccEmails,
        templateUsed: data.emailData.templateUsed,
        hasAttachments: (data.emailData.attachments?.length || 0) > 0,
        
        // Content analysis
        contentLength: data.emailData.htmlContent?.length || 0,
        customizedContent: data.emailData.customizedContent,
        language: data.emailData.emailLanguage,
        
        // Related records
        invoiceNumber: data.emailData.invoiceNumber,
        memberApplicationId: data.emailData.memberApplicationId,
        emailServiceId: data.emailData.emailServiceId,
        
        // Financial summary (for invoice emails)
        ...(data.emailData.invoiceAmount && {
          financialSummary: {
            amount: data.emailData.invoiceAmount,
            currency: data.emailData.currency,
            paymentRequired: true
          }
        }),
        
        // Attachment summary
        attachmentsSummary: data.emailData.attachments?.map(att => ({
          filename: att.filename,
          type: att.type,
          size: att.size
        })) || []
      },
      category: 'email',
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
      
      // Bank details
      bankDetails?: {
        accountName?: string;
        accountNumber?: string;
        iban?: string;
        bic?: string;
        bankName?: string;
        reference?: string;
      };
      
      // Email details
      emailTemplate?: string;
      emailLanguage?: string;
      emailSubject?: string;
      customizedEmailContent?: any;
      
      // Generation metadata
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
            originalCurrency: data.invoiceData.currency,
            convertedCurrency: data.invoiceData.convertedCurrency,
            convertedAmount: data.invoiceData.convertedAmount,
            exchangeRate: data.invoiceData.exchangeRate
          }
        }),
        
        // Bank payment information
        ...(data.invoiceData.bankDetails && {
          bankDetails: data.invoiceData.bankDetails
        }),
        
        // Email details
        emailDetails: {
          template: data.invoiceData.emailTemplate,
          language: data.invoiceData.emailLanguage,
          subject: data.invoiceData.emailSubject,
          customized: !!data.invoiceData.customizedEmailContent
        },
        
        // Attachments info
        attachmentsSummary: data.invoiceData.attachments?.map(att => ({
          filename: att.filename,
          type: att.type,
          size: att.size
        })) || []
      },
      category: 'invoice',
      success: data.success ?? true,
      errorMessage: data.errorMessage
    });
  }
}