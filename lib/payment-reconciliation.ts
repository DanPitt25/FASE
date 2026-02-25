/**
 * Payment Reconciliation Library
 * Handles matching payments from Stripe and Wise to invoices
 */

import { adminDb, FieldValue, Timestamp } from './firebase-admin';
import Stripe from 'stripe';

// Types
export interface PaymentTransaction {
  id: string;
  source: 'stripe' | 'wise';
  date: Date;
  amount: number;
  currency: string;
  reference: string;
  senderName?: string;
  metadata?: Record<string, string>;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  organizationName: string;
  amount: number;
  currency: string;
  status: string;
  accountId?: string;
}

export interface MatchResult {
  transaction: PaymentTransaction;
  invoice: InvoiceRecord;
  confidence: 'high' | 'medium' | 'low';
  matchReason: string;
}

export interface ReconciliationSummary {
  totalTransactions: number;
  matchedCount: number;
  unmatchedCount: number;
  alreadyPaidCount: number;
  matches: MatchResult[];
  unmatched: PaymentTransaction[];
  errors: string[];
}

// Stripe client singleton
let stripeClient: Stripe | null = null;

const getStripeClient = (): Stripe | null => {
  if (!stripeClient) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return null;
    stripeClient = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripeClient;
};

/**
 * Fetch all invoices from Firestore
 */
export async function getAllInvoices(): Promise<{
  byNumber: Map<string, InvoiceRecord>;
  byId: Map<string, InvoiceRecord>;
}> {
  const snapshot = await adminDb.collection('invoices').get();
  const byNumber = new Map<string, InvoiceRecord>();
  const byId = new Map<string, InvoiceRecord>();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const invoice: InvoiceRecord = {
      id: doc.id,
      invoiceNumber: data.invoiceNumber,
      organizationName: data.organizationName,
      amount: data.amount || data.totalAmount,
      currency: data.currency,
      status: data.status,
      accountId: data.accountId,
    };

    if (data.invoiceNumber) {
      byNumber.set(data.invoiceNumber.toUpperCase(), invoice);
    }
    byId.set(doc.id, invoice);
  }

  return { byNumber, byId };
}

/**
 * Fetch Stripe payments for a date range
 */
export async function getStripePayments(
  from: Date,
  to: Date,
  limit: number = 100
): Promise<PaymentTransaction[]> {
  const stripe = getStripeClient();
  if (!stripe) return [];

  const transactions: PaymentTransaction[] = [];

  try {
    const paymentIntents = await stripe.paymentIntents.list({
      limit: Math.min(limit, 100),
      created: {
        gte: Math.floor(from.getTime() / 1000),
        lte: Math.floor(to.getTime() / 1000),
      },
    });

    for (const pi of paymentIntents.data) {
      if (pi.status !== 'succeeded') continue;

      transactions.push({
        id: pi.id,
        source: 'stripe',
        date: new Date(pi.created * 1000),
        amount: pi.amount / 100,
        currency: pi.currency.toUpperCase(),
        reference: pi.metadata?.invoice_number || pi.description || pi.id,
        senderName: pi.metadata?.organization_name,
        metadata: pi.metadata,
      });
    }
  } catch (error) {
    console.error('Failed to fetch Stripe payments:', error);
  }

  return transactions;
}

/**
 * Fetch Wise incoming payments for a date range
 */
export async function getWisePayments(
  from: Date,
  to: Date
): Promise<PaymentTransaction[]> {
  const transactions: PaymentTransaction[] = [];

  try {
    const { getWiseClient } = await import('./wise-api');
    const wiseClient = getWiseClient();
    const wiseTransactions = await wiseClient.getIncomingPayments({
      from: from.toISOString(),
      to: to.toISOString(),
    });

    for (const wiseTx of wiseTransactions) {
      transactions.push({
        id: wiseTx.referenceNumber,
        source: 'wise',
        date: new Date(wiseTx.date),
        amount: wiseTx.amount.value,
        currency: wiseTx.amount.currency,
        reference: wiseTx.details.paymentReference || wiseTx.details.description || '',
        senderName: wiseTx.details.senderName,
      });
    }
  } catch (error: any) {
    if (!error.message?.includes('environment variable')) {
      console.error('Failed to fetch Wise payments:', error);
    }
  }

  return transactions;
}

/**
 * Match a single transaction to invoices
 */
export function matchTransaction(
  transaction: PaymentTransaction,
  invoicesByNumber: Map<string, InvoiceRecord>,
  invoicesById: Map<string, InvoiceRecord>
): MatchResult | null {
  // For Stripe, check metadata first
  if (transaction.source === 'stripe' && transaction.metadata) {
    const invoiceNumber = transaction.metadata.invoice_number;
    const invoiceId = transaction.metadata.invoice_id;

    if (invoiceNumber) {
      const invoice = invoicesByNumber.get(invoiceNumber.toUpperCase());
      if (invoice) {
        return {
          transaction,
          invoice,
          confidence: 'high',
          matchReason: 'Stripe metadata invoice_number',
        };
      }
    }

    if (invoiceId) {
      const invoice = invoicesById.get(invoiceId);
      if (invoice) {
        return {
          transaction,
          invoice,
          confidence: 'high',
          matchReason: 'Stripe metadata invoice_id',
        };
      }
    }
  }

  // Check reference for invoice number
  const referenceUpper = transaction.reference.toUpperCase();
  for (const [invNumber, invoice] of invoicesByNumber) {
    if (referenceUpper.includes(invNumber)) {
      return {
        transaction,
        invoice,
        confidence: transaction.source === 'stripe' ? 'medium' : 'high',
        matchReason: `Reference contains invoice number ${invNumber}`,
      };
    }
  }

  return null;
}

/**
 * Run full reconciliation
 */
export async function runReconciliation(options: {
  from?: Date;
  to?: Date;
  sources?: ('stripe' | 'wise')[];
}): Promise<ReconciliationSummary> {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const from = options.from || defaultFrom;
  const to = options.to || now;
  const sources = options.sources || ['stripe', 'wise'];

  const summary: ReconciliationSummary = {
    totalTransactions: 0,
    matchedCount: 0,
    unmatchedCount: 0,
    alreadyPaidCount: 0,
    matches: [],
    unmatched: [],
    errors: [],
  };

  try {
    // Get invoices
    const { byNumber, byId } = await getAllInvoices();

    // Track paid invoice numbers
    const paidInvoiceNumbers = new Set<string>();
    for (const invoice of byNumber.values()) {
      if (invoice.status === 'paid') {
        paidInvoiceNumbers.add(invoice.invoiceNumber.toUpperCase());
      }
    }

    // Get transactions
    const allTransactions: PaymentTransaction[] = [];

    if (sources.includes('stripe')) {
      const stripePayments = await getStripePayments(from, to);
      allTransactions.push(...stripePayments);
    }

    if (sources.includes('wise')) {
      const wisePayments = await getWisePayments(from, to);
      allTransactions.push(...wisePayments);
    }

    summary.totalTransactions = allTransactions.length;

    // Process each transaction
    for (const transaction of allTransactions) {
      const match = matchTransaction(transaction, byNumber, byId);

      if (match) {
        // Check if invoice is already paid
        if (paidInvoiceNumbers.has(match.invoice.invoiceNumber.toUpperCase())) {
          summary.alreadyPaidCount++;
        } else {
          summary.matches.push(match);
          summary.matchedCount++;
        }
      } else {
        summary.unmatched.push(transaction);
        summary.unmatchedCount++;
      }
    }
  } catch (error: any) {
    summary.errors.push(error.message);
  }

  return summary;
}

/**
 * Apply matches to Firestore
 */
export async function applyMatches(
  matches: MatchResult[]
): Promise<{ applied: number; errors: string[] }> {
  const result = { applied: 0, errors: [] as string[] };

  for (const match of matches) {
    try {
      const updateData: any = {
        status: 'paid',
        paymentMethod: match.transaction.source,
        paidAt: Timestamp.fromDate(match.transaction.date),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (match.transaction.source === 'stripe') {
        updateData.paymentId = match.transaction.id;
        updateData.stripePaymentIntentId = match.transaction.id;
      } else {
        updateData.wiseReference = match.transaction.id;
      }

      await adminDb.collection('invoices').doc(match.invoice.id).update(updateData);
      result.applied++;
    } catch (error: any) {
      result.errors.push(`Failed to update ${match.invoice.invoiceNumber}: ${error.message}`);
    }
  }

  return result;
}

/**
 * Get summary statistics
 */
export async function getFinanceSummary(from?: Date, to?: Date): Promise<{
  totalRevenue: number;
  paidInvoices: { count: number; total: number };
  unpaidInvoices: { count: number; total: number };
  recentPayments: Array<{
    invoiceNumber: string;
    organizationName: string;
    amount: number;
    currency: string;
    paidAt: Date | null;
    paymentMethod: string;
  }>;
}> {
  const snapshot = await adminDb.collection('invoices').get();

  let totalRevenue = 0;
  const paidInvoices = { count: 0, total: 0 };
  const unpaidInvoices = { count: 0, total: 0 };
  const recentPayments: any[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const amount = data.amount || data.totalAmount || 0;

    if (data.status === 'paid') {
      paidInvoices.count++;
      paidInvoices.total += amount;
      totalRevenue += amount;

      const paidAt = data.paidAt?.toDate?.() || null;

      // Filter by date if provided
      if (from && paidAt && paidAt < from) continue;
      if (to && paidAt && paidAt > to) continue;

      recentPayments.push({
        invoiceNumber: data.invoiceNumber,
        organizationName: data.organizationName,
        amount,
        currency: data.currency || 'EUR',
        paidAt,
        paymentMethod: data.paymentMethod || 'unknown',
      });
    } else if (data.status === 'sent') {
      unpaidInvoices.count++;
      unpaidInvoices.total += amount;
    }
  }

  // Sort recent payments by date descending
  recentPayments.sort((a, b) => {
    if (!a.paidAt) return 1;
    if (!b.paidAt) return -1;
    return b.paidAt.getTime() - a.paidAt.getTime();
  });

  return {
    totalRevenue,
    paidInvoices,
    unpaidInvoices,
    recentPayments: recentPayments.slice(0, 20),
  };
}
