/**
 * Shared Firestore types used across the application.
 * No functions - this is a pure types file.
 */

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  personalName: string;
  organisation?: string;
  createdAt: any;
  updatedAt: any;
  twoFactorEnabled: boolean;
  access?: 'none' | 'admin' | 'subscriber';
  markets?: string[];
  marketLinesOfBusiness?: {[countryCode: string]: string[]};
}

export interface MemberApplication {
  id: string;
  uid: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'invoice_sent';
  createdAt: any;
  updatedAt: any;
  organizationName: string;
  organizationType: 'MGA' | 'carrier' | 'provider';
  logoURL?: string;
  privacyAgreed: boolean;
  dataProcessingAgreed: boolean;
  primaryContact: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  organizationDetails: {
    tradingName?: string;
    registeredNumber: string;
    vatNumber?: string;
    websiteUrl?: string;
  };
  regulatory: {
    fcarNumber?: string;
    authorizedActivities: string[];
    regulatoryBody?: string;
  };
  registeredAddress: {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  };
  seniorLeadership: Array<{
    name: string;
    role: string;
    email: string;
  }>;
  keyContacts?: Array<{
    name: string;
    role: string;
    email: string;
    phone: string;
  }>;
  invoicingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
    sameAsRegistered: boolean;
  };
  invoicingContact?: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  distributionStrategy?: {
    channels: string[];
    brokerNetwork?: string;
  };
  technology?: {
    managementSystem?: string;
    dataAnalytics?: string;
    technicalPartners: string[];
  };
  portfolio?: {
    grossWrittenPremiums?: '<10m' | '10-20m' | '20-50m' | '50-100m' | '100-500m' | '500m+';
    portfolioMix: Record<string, number>;
  };
  productLines?: {
    lines: string[];
    targetMarkets: string[];
  };
  claimsModel?: {
    handling?: string;
    partners: string[];
  };
  generalInformation?: {
    businessPlan?: string;
    marketingStrategy?: string;
  };
  demographics?: {
    employeeCount?: string;
    yearEstablished?: string;
    ownership?: string;
  };
  servicesProvided?: string[];
  termsAgreed: boolean;
  hasOtherAssociations?: boolean;
  otherAssociations?: string[];
}

export interface DirectoryMember {
  id: string;
  organizationName: string;
  organizationType: string;
  country: string;
  memberSince: string;
  linesOfBusiness: Array<{ name: string; percentage: number }>;
  logoURL?: string;
  website?: string;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
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

export interface Invoice {
  id: string;
  invoiceNumber: string;
  recipientEmail: string;
  recipientName: string;
  organizationName: string;
  amount: number;
  currency: string;
  type: 'regular' | 'reminder' | 'standalone';
  status: 'sent' | 'paid' | 'overdue';
  createdAt: any;
  updatedAt: any;
  sentAt: any;
  pdfGenerated: boolean;
  pdfUrl?: string;
  accountId?: string;
  paymentMethod?: 'stripe' | 'wise' | 'bank_transfer' | 'manual';
  paymentId?: string;
  paidAt?: any;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  stripeCustomerId?: string;
  wiseTransferId?: string;
  wiseReference?: string;
}

// CRM: Activity Timeline
export type ActivityType =
  | 'email_sent'
  | 'status_change'
  | 'payment_received'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'note_added'
  | 'note_updated'
  | 'note_deleted'
  | 'member_added'
  | 'member_removed'
  | 'task_created'
  | 'task_updated'
  | 'task_completed'
  | 'wise_transfer'
  | 'stripe_payment'
  | 'bio_updated'
  | 'logo_updated'
  | 'manual_entry';

export interface Activity {
  id: string;
  accountId: string;
  type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  performedBy?: string;
  performedByName?: string;
  createdAt: any;
  relatedInvoiceId?: string;
  relatedMemberId?: string;
}

// CRM: Notes
export type NoteCategory = 'general' | 'payment' | 'support' | 'sales' | 'other';

export interface Note {
  id: string;
  accountId: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: any;
  updatedAt: any;
  category?: NoteCategory;
  isPinned?: boolean;
}

// Payment Tracking
export interface StripePayment {
  id: string;
  accountId?: string;
  invoiceId?: string;
  stripePaymentIntentId: string;
  stripeCustomerId?: string;
  stripeChargeId?: string;
  amount: number;
  currency: string;
  status: 'initiated' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
  paymentMethod?: string;
  errorMessage?: string;
  createdAt: any;
  updatedAt: any;
  succeededAt?: any;
  metadata?: Record<string, any>;
}

export interface WiseTransfer {
  id: string;
  accountId?: string;
  invoiceId?: string;
  wiseTransferId: string;
  wiseQuoteId?: string;
  sourceAmount: number;
  sourceCurrency: string;
  targetAmount: number;
  targetCurrency: string;
  exchangeRate?: number;
  reference: string;
  status: 'incoming_payment_waiting' | 'processing' | 'funds_converted' | 'outgoing_payment_sent' | 'completed' | 'cancelled' | 'failed';
  senderName?: string;
  createdAt: any;
  updatedAt: any;
  completedAt?: any;
  matched: boolean;
  matchedAt?: any;
}
