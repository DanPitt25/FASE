import { AuditLogger } from './audit-logger';

/**
 * Utility functions for common admin actions with automatic audit logging
 */
export class AdminActions {
  
  /**
   * Update member status with audit logging
   */
  static async updateMemberStatus(data: {
    adminUserId: string;
    adminUserEmail?: string;
    memberAccountId: string;
    memberEmail?: string;
    organizationName?: string;
    oldStatus: string;
    newStatus: string;
    reason?: string;
    updateFunction: () => Promise<any>;
  }) {
    try {
      const result = await data.updateFunction();
      
      await AuditLogger.logMemberAction({
        adminUserId: data.adminUserId,
        adminUserEmail: data.adminUserEmail,
        memberAccountId: data.memberAccountId,
        memberEmail: data.memberEmail,
        organizationName: data.organizationName,
        action: `status_changed_${data.oldStatus}_to_${data.newStatus}`,
        oldValue: data.oldStatus,
        newValue: data.newStatus,
        reason: data.reason,
        success: true
      });
      
      return result;
    } catch (error: any) {
      await AuditLogger.logMemberAction({
        adminUserId: data.adminUserId,
        adminUserEmail: data.adminUserEmail,
        memberAccountId: data.memberAccountId,
        memberEmail: data.memberEmail,
        organizationName: data.organizationName,
        action: `status_change_failed_${data.oldStatus}_to_${data.newStatus}`,
        oldValue: data.oldStatus,
        newValue: data.newStatus,
        reason: data.reason,
        success: false,
        errorMessage: error.message
      });
      
      throw error;
    }
  }

  /**
   * Send email with audit logging
   */
  static async sendEmail(data: {
    adminUserId: string;
    adminUserEmail?: string;
    memberAccountId?: string;
    memberEmail?: string;
    organizationName?: string;
    emailType: string;
    templateUsed?: string;
    subject?: string;
    sendFunction: () => Promise<any>;
  }) {
    try {
      const result = await data.sendFunction();
      
      await AuditLogger.logEmailAction({
        adminUserId: data.adminUserId,
        adminUserEmail: data.adminUserEmail,
        memberAccountId: data.memberAccountId,
        memberEmail: data.memberEmail,
        organizationName: data.organizationName,
        action: `email_sent_${data.emailType}`,
        emailType: data.emailType,
        templateUsed: data.templateUsed,
        subject: data.subject,
        success: true
      });
      
      return result;
    } catch (error: any) {
      await AuditLogger.logEmailAction({
        adminUserId: data.adminUserId,
        adminUserEmail: data.adminUserEmail,
        memberAccountId: data.memberAccountId,
        memberEmail: data.memberEmail,
        organizationName: data.organizationName,
        action: `email_failed_${data.emailType}`,
        emailType: data.emailType,
        templateUsed: data.templateUsed,
        subject: data.subject,
        success: false,
        errorMessage: error.message
      });
      
      throw error;
    }
  }

  /**
   * Process payment with audit logging
   */
  static async processPayment(data: {
    adminUserId: string;
    adminUserEmail?: string;
    memberAccountId: string;
    memberEmail?: string;
    organizationName?: string;
    action: string;
    amount?: string;
    invoiceNumber?: string;
    paymentMethod?: string;
    paymentFunction: () => Promise<any>;
  }) {
    try {
      const result = await data.paymentFunction();
      
      await AuditLogger.logPaymentAction({
        adminUserId: data.adminUserId,
        adminUserEmail: data.adminUserEmail,
        memberAccountId: data.memberAccountId,
        memberEmail: data.memberEmail,
        organizationName: data.organizationName,
        action: data.action,
        amount: data.amount,
        invoiceNumber: data.invoiceNumber,
        paymentMethod: data.paymentMethod,
        success: true
      });
      
      return result;
    } catch (error: any) {
      await AuditLogger.logPaymentAction({
        adminUserId: data.adminUserId,
        adminUserEmail: data.adminUserEmail,
        memberAccountId: data.memberAccountId,
        memberEmail: data.memberEmail,
        organizationName: data.organizationName,
        action: `${data.action}_failed`,
        amount: data.amount,
        invoiceNumber: data.invoiceNumber,
        paymentMethod: data.paymentMethod,
        success: false,
        errorMessage: error.message
      });
      
      throw error;
    }
  }

  /**
   * Approve join request with audit logging
   */
  static async approveJoinRequest(data: {
    adminUserId: string;
    adminUserEmail?: string;
    requestId: string;
    memberEmail: string;
    organizationName: string;
    approvalFunction: () => Promise<any>;
  }) {
    try {
      const result = await data.approvalFunction();
      
      await AuditLogger.logMemberAction({
        adminUserId: data.adminUserId,
        adminUserEmail: data.adminUserEmail,
        memberAccountId: data.requestId,
        memberEmail: data.memberEmail,
        organizationName: data.organizationName,
        action: 'join_request_approved',
        success: true
      });
      
      return result;
    } catch (error: any) {
      await AuditLogger.logMemberAction({
        adminUserId: data.adminUserId,
        adminUserEmail: data.adminUserEmail,
        memberAccountId: data.requestId,
        memberEmail: data.memberEmail,
        organizationName: data.organizationName,
        action: 'join_request_approval_failed',
        success: false,
        errorMessage: error.message
      });
      
      throw error;
    }
  }

  /**
   * Reject join request with audit logging
   */
  static async rejectJoinRequest(data: {
    adminUserId: string;
    adminUserEmail?: string;
    requestId: string;
    memberEmail: string;
    organizationName: string;
    reason?: string;
    rejectionFunction: () => Promise<any>;
  }) {
    try {
      const result = await data.rejectionFunction();
      
      await AuditLogger.logMemberAction({
        adminUserId: data.adminUserId,
        adminUserEmail: data.adminUserEmail,
        memberAccountId: data.requestId,
        memberEmail: data.memberEmail,
        organizationName: data.organizationName,
        action: 'join_request_rejected',
        reason: data.reason,
        success: true
      });
      
      return result;
    } catch (error: any) {
      await AuditLogger.logMemberAction({
        adminUserId: data.adminUserId,
        adminUserEmail: data.adminUserEmail,
        memberAccountId: data.requestId,
        memberEmail: data.memberEmail,
        organizationName: data.organizationName,
        action: 'join_request_rejection_failed',
        reason: data.reason,
        success: false,
        errorMessage: error.message
      });
      
      throw error;
    }
  }

  /**
   * Generate and send invoice with comprehensive audit logging
   */
  static async generateInvoice(data: {
    adminUserId: string;
    adminUserEmail?: string;
    invoiceData: any; // The full invoice request data
    invoiceFunction: () => Promise<any>;
  }) {
    try {
      const result = await data.invoiceFunction();
      
      // Extract comprehensive invoice data for audit logging
      const auditInvoiceData = {
        invoiceNumber: data.invoiceData.invoiceNumber || 'UNKNOWN',
        invoiceType: (data.invoiceData.isLostInvoice ? 'lost_invoice' : 
                     data.invoiceData.template === 'followup' ? 'followup' :
                     data.invoiceData.template === 'reminder' ? 'reminder' : 'regular') as 'lost_invoice' | 'reminder' | 'followup' | 'regular' | 'sponsorship',
        isLostInvoice: data.invoiceData.isLostInvoice || false,
        
        recipientEmail: data.invoiceData.email,
        recipientName: data.invoiceData.fullName,
        organizationName: data.invoiceData.organizationName,
        address: data.invoiceData.address,
        
        originalAmount: data.invoiceData.originalAmount || data.invoiceData.totalAmount,
        discountAmount: data.invoiceData.discountAmount || 0,
        discountReason: data.invoiceData.discountReason,
        totalAmount: data.invoiceData.totalAmount,
        currency: data.invoiceData.forceCurrency || 'EUR',
        convertedCurrency: data.invoiceData.convertedCurrency,
        convertedAmount: data.invoiceData.convertedAmount,
        exchangeRate: data.invoiceData.exchangeRate,
        
        membershipType: data.invoiceData.membershipType || 'corporate',
        organizationType: data.invoiceData.organizationType || 'MGA',
        grossWrittenPremiums: data.invoiceData.grossWrittenPremiums,
        hasOtherAssociations: data.invoiceData.hasOtherAssociations || false,
        
        bankDetails: {
          accountName: 'Account Name from bank details',
          reference: data.invoiceData.invoiceNumber
        },
        
        emailTemplate: data.invoiceData.template || 'membership_acceptance_admin',
        emailLanguage: data.invoiceData.userLocale || 'en',
        emailSubject: 'Invoice subject from template',
        customizedEmailContent: data.invoiceData.customizedEmailContent,
        
        pdfGenerated: true,
        emailId: result.emailId,
        invoiceDate: new Date().toISOString().split('T')[0],
        
        attachments: data.invoiceData.uploadedAttachment ? [{
          filename: data.invoiceData.uploadedFilename || 'attachment.pdf',
          type: 'pdf' as const,
        }] : []
      };

      await AuditLogger.logInvoiceGeneration({
        adminUserId: data.adminUserId,
        adminUserEmail: data.adminUserEmail,
        action: `invoice_generated_${auditInvoiceData.invoiceType}`,
        success: true,
        invoiceData: auditInvoiceData
      });
      
      return result;
    } catch (error: any) {
      // Log failed invoice attempt with whatever data we have
      const partialInvoiceData = {
        invoiceNumber: data.invoiceData.invoiceNumber || 'FAILED',
        invoiceType: (data.invoiceData.isLostInvoice ? 'lost_invoice' : 'regular') as 'lost_invoice' | 'reminder' | 'followup' | 'regular' | 'sponsorship',
        recipientEmail: data.invoiceData.email || 'unknown',
        recipientName: data.invoiceData.fullName || 'unknown',
        organizationName: data.invoiceData.organizationName || 'unknown',
        totalAmount: data.invoiceData.totalAmount || 0,
        originalAmount: data.invoiceData.originalAmount || data.invoiceData.totalAmount || 0,
        currency: data.invoiceData.forceCurrency || 'EUR',
        membershipType: data.invoiceData.membershipType || 'corporate' as const,
        organizationType: data.invoiceData.organizationType || 'MGA' as const,
        emailTemplate: data.invoiceData.template || 'unknown',
        emailLanguage: data.invoiceData.userLocale || 'en',
        pdfGenerated: false
      };

      await AuditLogger.logInvoiceGeneration({
        adminUserId: data.adminUserId,
        adminUserEmail: data.adminUserEmail,
        action: `invoice_generation_failed`,
        success: false,
        errorMessage: error.message,
        invoiceData: partialInvoiceData
      });
      
      throw error;
    }
  }
}