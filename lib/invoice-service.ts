/**
 * Consolidated Invoice Service
 *
 * Provides shared utilities for invoice operations across:
 * - Membership invoices (MemberEmailActions)
 * - Finance paid invoices (FinanceTab)
 * - Rendezvous invoices (RendezvousTab)
 *
 * The actual PDF generation is handled by specialized generators:
 * - lib/invoice-pdf-generator.ts (membership)
 * - lib/paid-invoice-generator.ts (finance paid)
 * - lib/rendezvous-invoice-generator.ts (rendezvous)
 */

import { adminDb, adminStorage, FieldValue } from './firebase-admin';

// ============================================================================
// Types
// ============================================================================

export type InvoiceType = 'membership' | 'finance_paid' | 'rendezvous' | 'rendezvous_paid';

export interface InvoiceNumberOptions {
  type: InvoiceType;
  registrationId?: string; // For rendezvous invoices
  year?: number;
}

export interface InvoiceStorageOptions {
  pdfBase64: string;
  invoiceNumber: string;
  organizationName: string;
  /** Storage folder path (e.g., 'invoices/paid', 'rendezvous-invoices') */
  folder: string;
  /** Additional metadata to store with the file */
  metadata?: Record<string, string>;
}

export interface InvoiceStorageResult {
  storagePath: string;
  signedUrl: string;
}

export interface InvoiceRecordData {
  invoiceNumber: string;
  organizationName: string;
  totalAmount: number;
  currency: string;
  type: InvoiceType;
  pdfUrl?: string;
  storagePath?: string;
  /** Additional fields to store */
  extra?: Record<string, unknown>;
}

export interface InvoiceActivityData {
  type: 'invoice_generated' | 'invoice_sent' | 'invoice_regenerated' | 'invoice_paid';
  invoiceNumber: string;
  organizationName: string;
  description: string;
  /** For payment-linked activities */
  paymentKey?: string;
  transactionId?: string;
  source?: 'stripe' | 'wise';
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Invoice Number Generation
// ============================================================================

/**
 * Generate a unique invoice number based on type
 *
 * Patterns:
 * - membership: FASE-XXXXX (5-digit random)
 * - finance_paid: FASE-XXXXX (5-digit random)
 * - rendezvous: RDV-YYYY-XXXXXXXX (year + 8-char ID)
 * - rendezvous_paid: Same as rendezvous
 */
export function generateInvoiceNumber(options: InvoiceNumberOptions): string {
  const { type, registrationId, year = new Date().getFullYear() } = options;

  switch (type) {
    case 'membership':
    case 'finance_paid': {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      return `FASE-${randomNum}`;
    }
    case 'rendezvous':
    case 'rendezvous_paid': {
      const suffix = registrationId
        ? registrationId.slice(-8).toUpperCase()
        : Math.random().toString(36).slice(2, 10).toUpperCase();
      return `RDV-${year}-${suffix}`;
    }
    default:
      throw new Error(`Unknown invoice type: ${type}`);
  }
}

// ============================================================================
// PDF Storage
// ============================================================================

/**
 * Upload an invoice PDF to Firebase Storage and return a signed URL
 */
export async function uploadInvoicePDF(
  options: InvoiceStorageOptions
): Promise<InvoiceStorageResult> {
  const { pdfBase64, invoiceNumber, organizationName, folder, metadata = {} } = options;

  // Sanitize organization name for folder path
  const sanitizedOrgName = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Create file path - use org subfolder for membership, flat for others
  const fileName = `${invoiceNumber}.pdf`;
  const storagePath =
    folder === 'invoices'
      ? `${folder}/${sanitizedOrgName}/${fileName}`
      : `${folder}/${fileName}`;

  const bucket = adminStorage.bucket();
  const file = bucket.file(storagePath);
  const pdfBuffer = Buffer.from(pdfBase64, 'base64');

  await file.save(pdfBuffer, {
    metadata: {
      contentType: 'application/pdf',
      metadata: {
        invoiceNumber,
        organizationName,
        uploadedAt: new Date().toISOString(),
        ...metadata,
      },
    },
  });

  // Get signed URL with far-future expiration
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: '2099-12-31',
  });

  console.log(`✅ Invoice PDF uploaded: ${storagePath}`);

  return {
    storagePath,
    signedUrl,
  };
}

/**
 * Make an uploaded invoice publicly accessible and return public URL
 * Use this instead of signed URLs when you want permanent public access
 */
export async function makeInvoicePublic(storagePath: string): Promise<string> {
  const bucket = adminStorage.bucket();
  const file = bucket.file(storagePath);

  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

// ============================================================================
// Invoice Records (Firestore)
// ============================================================================

/**
 * Store an invoice record in Firestore
 *
 * Collection mapping:
 * - membership: 'invoices'
 * - finance_paid: 'paid_invoices'
 * - rendezvous/rendezvous_paid: No separate record (stored on registration)
 */
export async function createInvoiceRecord(
  data: InvoiceRecordData
): Promise<{ id: string; collection: string } | null> {
  const { type, invoiceNumber, organizationName, totalAmount, currency, pdfUrl, storagePath, extra = {} } = data;

  // Determine collection based on type
  let collection: string;
  switch (type) {
    case 'membership':
      collection = 'invoices';
      break;
    case 'finance_paid':
      collection = 'paid_invoices';
      break;
    case 'rendezvous':
    case 'rendezvous_paid':
      // Rendezvous invoices are stored on the registration document, not separately
      return null;
    default:
      throw new Error(`Unknown invoice type: ${type}`);
  }

  const docRef = await adminDb.collection(collection).add({
    invoiceNumber,
    organizationName,
    totalAmount,
    currency,
    pdfUrl: pdfUrl || null,
    storagePath: storagePath || null,
    generatedAt: FieldValue.serverTimestamp(),
    ...extra,
  });

  console.log(`✅ Invoice record created: ${collection}/${docRef.id}`);

  return {
    id: docRef.id,
    collection,
  };
}

// ============================================================================
// Activity Logging
// ============================================================================

/**
 * Log an invoice-related activity
 *
 * For payment-linked activities, provide paymentKey/transactionId/source
 * to store in payment_activities collection.
 * Otherwise, stores in a general activities collection.
 */
export async function logInvoiceActivity(data: InvoiceActivityData): Promise<string> {
  const {
    type,
    invoiceNumber,
    organizationName,
    description,
    paymentKey,
    transactionId,
    source,
    metadata = {},
  } = data;

  // Determine collection - payment-linked goes to payment_activities
  const collection = paymentKey ? 'payment_activities' : 'invoice_activities';

  // Format title based on type
  const titleMap: Record<string, string> = {
    invoice_generated: 'Invoice Generated',
    invoice_sent: 'Invoice Sent',
    invoice_regenerated: 'Invoice Regenerated',
    invoice_paid: 'Invoice Marked Paid',
  };

  const docRef = await adminDb.collection(collection).add({
    type,
    title: titleMap[type] || 'Invoice Activity',
    description,
    invoiceNumber,
    organizationName,
    // Payment-specific fields (if applicable)
    ...(paymentKey && { paymentKey }),
    ...(transactionId && { transactionId }),
    ...(source && { source }),
    // Metadata
    metadata: {
      invoiceNumber,
      ...metadata,
    },
    performedBy: 'admin',
    performedByName: 'Admin',
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log(`✅ Invoice activity logged: ${collection}/${docRef.id}`);

  return docRef.id;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Generate, upload, and record an invoice in one operation
 *
 * This is a high-level helper for common invoice workflows.
 * Returns all the generated artifacts.
 */
export interface GenerateAndStoreResult {
  invoiceNumber: string;
  pdfBase64: string;
  storagePath?: string;
  signedUrl?: string;
  recordId?: string;
  activityId?: string;
}

export interface GenerateAndStoreOptions {
  type: InvoiceType;
  organizationName: string;
  totalAmount: number;
  currency: string;
  /** The PDF generator function to call */
  generatePdf: () => Promise<{ pdfBase64: string; invoiceNumber: string }>;
  /** Whether to upload to storage (default: true for finance_paid) */
  upload?: boolean;
  /** Storage folder (default based on type) */
  folder?: string;
  /** Whether to create a Firestore record (default: true for membership/finance_paid) */
  createRecord?: boolean;
  /** Whether to log activity (default: true) */
  logActivity?: boolean;
  /** Payment info for activity logging */
  payment?: {
    paymentKey: string;
    transactionId: string;
    source: 'stripe' | 'wise';
  };
  /** Extra data for the invoice record */
  recordExtra?: Record<string, unknown>;
  /** Extra metadata for storage */
  storageMetadata?: Record<string, string>;
}

export async function generateAndStore(
  options: GenerateAndStoreOptions
): Promise<GenerateAndStoreResult> {
  const {
    type,
    organizationName,
    totalAmount,
    currency,
    generatePdf,
    upload = type === 'finance_paid',
    folder = type === 'finance_paid' ? 'invoices/paid' : 'invoices',
    createRecord = type === 'membership' || type === 'finance_paid',
    logActivity = true,
    payment,
    recordExtra,
    storageMetadata,
  } = options;

  // Generate the PDF
  const { pdfBase64, invoiceNumber } = await generatePdf();

  const result: GenerateAndStoreResult = {
    invoiceNumber,
    pdfBase64,
  };

  // Upload to storage if requested
  if (upload) {
    const storageResult = await uploadInvoicePDF({
      pdfBase64,
      invoiceNumber,
      organizationName,
      folder,
      metadata: storageMetadata,
    });
    result.storagePath = storageResult.storagePath;
    result.signedUrl = storageResult.signedUrl;
  }

  // Create Firestore record if requested
  if (createRecord) {
    const recordResult = await createInvoiceRecord({
      type,
      invoiceNumber,
      organizationName,
      totalAmount,
      currency,
      pdfUrl: result.signedUrl,
      storagePath: result.storagePath,
      extra: recordExtra,
    });
    if (recordResult) {
      result.recordId = recordResult.id;
    }
  }

  // Log activity if requested
  if (logActivity) {
    result.activityId = await logInvoiceActivity({
      type: 'invoice_generated',
      invoiceNumber,
      organizationName,
      description: `Invoice ${invoiceNumber} generated for ${organizationName}`,
      paymentKey: payment?.paymentKey,
      transactionId: payment?.transactionId,
      source: payment?.source,
      metadata: {
        totalAmount,
        currency,
        pdfUrl: result.signedUrl,
      },
    });
  }

  return result;
}
