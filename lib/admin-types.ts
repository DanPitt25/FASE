/**
 * Shared TypeScript interfaces for the Admin Portal
 *
 * This file consolidates all interfaces used across admin portal components
 * to eliminate duplication and provide a single source of truth.
 *
 * @see ADMIN-PORTAL-AUDIT.md for architecture overview
 */

// ============== COMMON TYPES ==============

/**
 * Firestore Timestamp type
 *
 * Firestore timestamps can come in different forms depending on context:
 * - Server: Firestore.Timestamp object with toDate() method
 * - Client (serialized): Object with _seconds and _nanoseconds properties
 * - Already converted: JavaScript Date object
 *
 * This union type covers all cases. Use formatFirestoreDate() for safe conversion.
 */
export interface FirestoreTimestampObject {
  _seconds: number;
  _nanoseconds: number;
  toDate?: () => Date;
}

export type FirestoreTimestamp = FirestoreTimestampObject | Date | string | null | undefined;

/**
 * Safely convert any Firestore timestamp to Date
 */
export function toDate(timestamp: FirestoreTimestamp): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'string') return new Date(timestamp);
  if (typeof timestamp === 'object') {
    if ('toDate' in timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if ('_seconds' in timestamp) {
      return new Date(timestamp._seconds * 1000);
    }
  }
  return null;
}

/**
 * Format a Firestore timestamp for display
 */
export function formatFirestoreDate(
  timestamp: FirestoreTimestamp,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
): string {
  const date = toDate(timestamp);
  if (!date) return '—';
  return date.toLocaleDateString('en-GB', options);
}

/** Standard sort direction */
export type SortDirection = 'asc' | 'desc';

/** Supported languages for translations */
export type SupportedLanguage = 'en' | 'fr' | 'de' | 'es' | 'it' | 'nl';

/** Translations object keyed by language code */
export type Translations = Partial<Record<SupportedLanguage, string>>;

// ============== ACCOUNT STATUSES ==============

/** All possible account statuses */
export type AccountStatus =
  | 'guest'
  | 'pending'
  | 'approved'
  | 'admin'
  | 'pending_invoice'
  | 'pending_payment'
  | 'invoice_sent'
  | 'flagged'
  | 'internal';

/** Organization types */
export type OrganizationType = 'MGA' | 'carrier' | 'provider';

// ============== ADDRESS TYPES ==============

/** Standard address format used across the system */
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}

/** Business address (same structure, different semantic meaning) */
export type BusinessAddress = Address;

/** Registered address (same structure, different semantic meaning) */
export type RegisteredAddress = Address;

// ============== CONTACT TYPES ==============

/** Primary contact information */
export interface PrimaryContact {
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

/** Account administrator info */
export interface AccountAdministrator {
  name: string;
  email: string;
  role?: string;
}

// ============== RENDEZVOUS TYPES ==============

/** Payment status for Rendezvous registrations */
export type RendezvousPaymentStatus =
  | 'paid'
  | 'pending_bank_transfer'
  | 'confirmed'
  | 'pending'
  | 'complimentary';

/** Payment method for Rendezvous */
export type RendezvousPaymentMethod = 'card' | 'bank_transfer' | 'admin_manual';

/** View mode for Rendezvous tab */
export type RendezvousViewMode = 'attendees' | 'companies' | 'issues';

/** Attendee type - personal attendees have no company/title */
export type RendezvousAttendeeType = 'corporate' | 'personal';

/** Individual attendee in a registration */
export interface RendezvousAttendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  attendeeType?: RendezvousAttendeeType; // Optional for backwards compatibility, defaults to 'corporate'
}

/** Billing information for a registration */
export interface RendezvousBillingInfo {
  company: string;
  billingEmail: string;
  country: string;
  address?: string;
  organizationType: string;
  vatNumber?: string;
}

/** Additional registration info */
export interface RendezvousAdditionalInfo {
  specialRequests?: string;
}

/** Complete Rendezvous registration */
export interface RendezvousRegistration {
  id: string;
  registrationId: string;
  invoiceNumber: string;
  billingInfo: RendezvousBillingInfo;
  attendees: RendezvousAttendee[];
  additionalInfo?: RendezvousAdditionalInfo;
  totalPrice: number;
  subtotal: number;
  vatAmount: number;
  currency: string;
  numberOfAttendees: number;
  companyIsFaseMember: boolean;
  isAsaseMember: boolean;
  membershipType: string;
  discount: number;
  paymentMethod: RendezvousPaymentMethod;
  paymentStatus: RendezvousPaymentStatus;
  stripeSessionId?: string;
  invoiceUrl?: string;
  createdAt: FirestoreTimestamp;
  status: string;
}

/** Interest-only registration (not full registration) */
export interface RendezvousInterestRegistration {
  id: string;
  billingInfo: {
    company: string;
    billingEmail: string;
  };
  additionalContacts?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
  registrationType: string;
  submittedAt: string;
  createdAt: FirestoreTimestamp;
  status: string;
  source: string;
}

/** Flattened attendee for attendee list view */
export interface FlattenedAttendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  company: string;
  country: string;
  organizationType: string;
  attendeeType?: RendezvousAttendeeType;
  paymentStatus: RendezvousPaymentStatus;
  invoiceNumber: string;
  registrationId: string;
  isFaseMember: boolean;
  isAsaseMember: boolean;
  totalPrice: number;
  createdAt: FirestoreTimestamp;
}

// ============== FINANCE TYPES ==============

/** Payment source */
export type PaymentSource = 'stripe' | 'wise';

/** Payment type when linked to a member */
export type LinkedPaymentType = 'membership' | 'rendezvous' | 'not_a_member';

/** Linked payment record stored in Firestore */
export interface LinkedPayment {
  id: string;  // paymentKey: source_transactionId
  transactionId: string;
  source: PaymentSource;
  accountId: string;
  accountName: string;
  paymentType: LinkedPaymentType;
  amount: number;
  currency: string;
  linkedAt: string;  // ISO date
  linkedBy: string;  // Admin user ID
  linkedByName: string;
  notes?: string;
}

/** Match candidate for payment-to-account linking */
export interface MatchCandidate {
  accountId: string;
  accountName: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  signals: Array<{
    type: 'email' | 'name' | 'amount' | 'reference';
    description: string;
    points: number;
  }>;
}

/** Payment match result from pricing analysis */
export interface PaymentMatchResult {
  confidence: 'exact' | 'likely' | 'unknown';
  suggestions: Array<{
    type: 'membership' | 'rendezvous';
    description: string;
    amount: number;
    details?: string;
    lineItems?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
    }>;
  }>;
}

/** Transaction from payment provider */
export interface Transaction {
  id: string;
  source: PaymentSource;
  date: string;
  amount: number;
  currency: string;
  amountEur: number;
  reference: string;
  senderName?: string;
  email?: string;
  customerId?: string;
  description?: string;
  suppressed?: boolean;
  // Linked payment info (populated when fetched)
  linkedPayment?: LinkedPayment;
  // Match suggestions from finance-matching
  matchCandidates?: MatchCandidate[];
  autoLinkCandidate?: MatchCandidate | null;
  paymentMatch?: PaymentMatchResult;
}

/** Payment activity log entry */
export interface PaymentActivity {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  performedBy: string;
  performedByName: string;
}

/** Payment note */
export interface PaymentNote {
  id: string;
  content: string;
  category: string;
  createdAt: string;
  createdByName: string;
  isPinned?: boolean;
}

/** Invoice line item for generation */
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

/** Filter options for finance tab */
export type FinanceFilterSource = 'all' | 'stripe' | 'wise';
export type FinanceDateRange = 'all' | '30' | '90' | '180' | '365';
export type FinanceSortField = 'date' | 'amount';
export type FinanceModalTab = 'details' | 'invoice' | 'timeline' | 'notes';

// ============== MEMBER SEARCH TYPES ==============

/** Member search result for linking payments */
export interface MemberSearchResult {
  id: string;
  organizationName: string;
  organizationType: string;
  status: string;
  primaryContact?: {
    name?: string;
    email?: string;
  };
}

// ============== SPONSOR TYPES ==============

/** Sponsor tier levels */
export type SponsorTier = 'silver' | 'gold' | 'platinum';

/** Sponsor bio translations */
export interface SponsorBio {
  de: string;
  en: string;
  es: string;
  fr: string;
  it: string;
  nl: string;
}

/** Sponsor record */
export interface Sponsor {
  id: string;
  name: string;
  tier: SponsorTier;
  logoUrl: string;
  websiteUrl: string;
  bio: SponsorBio;
  order: number;
  isActive: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ============== BIO/LOGO REVIEW TYPES ==============

/** Bio review status */
export type BioReviewStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

/** Company summary with approval workflow */
export interface CompanySummary {
  text: string;
  status: BioReviewStatus;
  submittedAt?: FirestoreTimestamp;
  reviewedAt?: FirestoreTimestamp;
  reviewedBy?: string;
  rejectionReason?: string;
  translations?: Translations;
}

/** Logo approval status */
export type LogoApprovalStatus = 'pending_review' | 'approved' | 'rejected';

/** Logo review workflow status */
export interface LogoStatus {
  status: LogoApprovalStatus;
  pendingURL?: string;
  submittedAt?: FirestoreTimestamp;
  reviewedAt?: FirestoreTimestamp;
  reviewedBy?: string;
  rejectionReason?: string;
}

/** Account pending bio/logo review */
export interface PendingReviewAccount {
  id: string;
  organizationName: string;
  organizationType?: OrganizationType;
  status: AccountStatus;
  companySummary?: CompanySummary;
  logoStatus?: LogoStatus;
  logoURL?: string;
  createdAt: FirestoreTimestamp;
}

// ============== EMAIL TYPES ==============

/** Email action types for member emails */
export type EmailAction =
  | 'welcome'
  | 'membership_invoice'
  | 'followup'
  | 'rendezvous_confirmation'
  | 'rendezvous_reminder'
  | 'custom';

/** Email form base data */
export interface EmailFormData {
  to: string;
  cc?: string;
  sender: string;
  language: SupportedLanguage;
  subject?: string;
  body?: string;
}

/** Email preview result */
export interface EmailPreview {
  html: string;
  subject: string;
  to: string;
}

/** Email send result */
export interface EmailSendResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

// ============== ACTIVITY TYPES ==============

/** Account activity log entry */
export interface AccountActivity {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  performedBy: string;
  performedByName: string;
  metadata?: Record<string, unknown>;
}

/** Account note */
export interface AccountNote {
  id: string;
  content: string;
  category: string;
  createdAt: string;
  createdByName: string;
  isPinned?: boolean;
}

// ============== COMPANY MEMBER TYPES ==============

/** Corporate team member (subcollection) */
export interface CompanyMember {
  id: string;
  email: string;
  personalName: string;
  jobTitle?: string;
  isPrimaryContact?: boolean;
  isAccountAdministrator?: boolean;
  accountConfirmed?: boolean;
  isRegistrant?: boolean;
  joinedAt: FirestoreTimestamp;
  addedBy?: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ============== INVOICE TYPES ==============

/** Stored invoice record */
export interface StoredInvoice {
  id: string;
  invoiceNumber: string;
  accountId?: string;
  accountName?: string;
  amount: number;
  currency: string;
  status: 'sent' | 'paid' | 'overdue' | 'cancelled';
  type: 'membership' | 'rendezvous' | 'other';
  sentAt?: FirestoreTimestamp;
  paidAt?: FirestoreTimestamp;
  fileUrl?: string;
  createdAt: FirestoreTimestamp;
}

/** Invoice generation request */
export interface InvoiceGenerationRequest {
  organization: string;
  contactName?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    country: string;
  };
  lineItems: InvoiceLineItem[];
  currency: string;
  vatRate?: number;
  notes?: string;
}

// ============== CURRENCY TYPES ==============

/** Supported currencies */
export type Currency = 'EUR' | 'GBP' | 'USD';

/** Bank details for wire transfers */
export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber?: string;
  sortCode?: string;
  iban?: string;
  bic?: string;
  routingNumber?: string;
  reference?: string;
}

// ============== API RESPONSE TYPES ==============

/** Standard API success response */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

/** Standard API error response */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/** Combined API response type */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============== TYPE GUARDS ==============

/** Check if API response is successful */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/** Check if API response is an error */
export function isApiError(response: ApiResponse): response is ApiErrorResponse {
  return response.success === false;
}

/** Check if payment status is a final state */
export function isPaymentFinal(status: RendezvousPaymentStatus): boolean {
  return status === 'paid' || status === 'complimentary';
}

/** Check if account status grants member access */
export function hasMemberAccess(status: AccountStatus): boolean {
  return status === 'approved' || status === 'admin' || status === 'invoice_sent';
}

/** Check if account status grants admin access */
export function hasAdminAccess(status: AccountStatus): boolean {
  return status === 'admin';
}

// ============== MEMBER DATA TYPE ==============

/**
 * For member/account data, use UnifiedMember from lib/unified-member.ts
 * That is the single source of truth for account document types.
 *
 * @see lib/unified-member.ts
 */
