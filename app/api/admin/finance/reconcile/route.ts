import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue, Timestamp } from '../../../../../lib/firebase-admin';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

let stripe: Stripe | null = null;

const initializeStripe = () => {
  if (!stripe) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return null;
    }
    stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripe;
};

interface ReconciliationResult {
  matched: Array<{
    transactionId: string;
    source: 'stripe' | 'wise';
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    autoApplied: boolean;
  }>;
  unmatched: Array<{
    transactionId: string;
    source: 'stripe' | 'wise';
    amount: number;
    currency: string;
    reference: string;
    senderName?: string;
    date: string;
  }>;
  alreadyMatched: number;
  errors: string[];
}

/**
 * POST: Run auto-reconciliation
 * Matches payments to invoices and optionally applies the matches
 * Body: { applyMatches?: boolean, fromDate?: string, toDate?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { applyMatches = false, fromDate, toDate } = body;

    // Calculate date range (default: last 90 days)
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const from = fromDate ? new Date(fromDate) : defaultFrom;
    const to = toDate ? new Date(toDate) : now;

    const result: ReconciliationResult = {
      matched: [],
      unmatched: [],
      alreadyMatched: 0,
      errors: [],
    };

    // Get all invoices (both paid and unpaid for matching)
    const invoicesSnapshot = await adminDb.collection('invoices').get();
    const invoicesByNumber = new Map<string, any>();
    const invoicesById = new Map<string, any>();
    const paidInvoiceNumbers = new Set<string>();

    for (const doc of invoicesSnapshot.docs) {
      const data = doc.data();
      const invoiceInfo = {
        id: doc.id,
        invoiceNumber: data.invoiceNumber,
        organizationName: data.organizationName,
        amount: data.amount || data.totalAmount,
        currency: data.currency,
        status: data.status,
        accountId: data.accountId,
      };

      if (data.invoiceNumber) {
        invoicesByNumber.set(data.invoiceNumber.toUpperCase(), invoiceInfo);
        if (data.status === 'paid') {
          paidInvoiceNumbers.add(data.invoiceNumber.toUpperCase());
        }
      }
      invoicesById.set(doc.id, invoiceInfo);
    }

    // Process Stripe payments
    const stripeInstance = initializeStripe();
    if (stripeInstance) {
      try {
        const paymentIntents = await stripeInstance.paymentIntents.list({
          limit: 100,
          created: {
            gte: Math.floor(from.getTime() / 1000),
            lte: Math.floor(to.getTime() / 1000),
          },
        });

        for (const pi of paymentIntents.data) {
          if (pi.status !== 'succeeded') continue;

          const invoiceNumber = pi.metadata?.invoice_number;
          const invoiceId = pi.metadata?.invoice_id;

          // Check if already matched via metadata
          if (invoiceNumber && paidInvoiceNumbers.has(invoiceNumber.toUpperCase())) {
            result.alreadyMatched++;
            continue;
          }

          let matchedInvoice = null;

          // Try to match by metadata
          if (invoiceNumber) {
            matchedInvoice = invoicesByNumber.get(invoiceNumber.toUpperCase());
          } else if (invoiceId) {
            matchedInvoice = invoicesById.get(invoiceId);
          }

          // Try to match by description
          if (!matchedInvoice && pi.description) {
            const desc = pi.description.toUpperCase();
            for (const [invNumber, invoice] of invoicesByNumber) {
              if (desc.includes(invNumber)) {
                matchedInvoice = invoice;
                break;
              }
            }
          }

          if (matchedInvoice) {
            const matchInfo = {
              transactionId: pi.id,
              source: 'stripe' as const,
              invoiceId: matchedInvoice.id,
              invoiceNumber: matchedInvoice.invoiceNumber,
              amount: pi.amount / 100,
              currency: pi.currency.toUpperCase(),
              autoApplied: false,
            };

            // Apply match if requested and invoice is not already paid
            if (applyMatches && matchedInvoice.status !== 'paid') {
              try {
                await adminDb.collection('invoices').doc(matchedInvoice.id).update({
                  status: 'paid',
                  paymentMethod: 'stripe',
                  paymentId: pi.id,
                  paidAt: Timestamp.fromDate(new Date(pi.created * 1000)),
                  updatedAt: FieldValue.serverTimestamp(),
                });
                matchInfo.autoApplied = true;
              } catch (err: any) {
                result.errors.push(`Failed to update invoice ${matchedInvoice.invoiceNumber}: ${err.message}`);
              }
            }

            result.matched.push(matchInfo);
          } else {
            result.unmatched.push({
              transactionId: pi.id,
              source: 'stripe',
              amount: pi.amount / 100,
              currency: pi.currency.toUpperCase(),
              reference: invoiceNumber || pi.description || pi.id,
              senderName: pi.metadata?.organization_name,
              date: new Date(pi.created * 1000).toISOString(),
            });
          }
        }
      } catch (stripeError: any) {
        result.errors.push(`Stripe error: ${stripeError.message}`);
      }
    }

    // Process Wise payments
    try {
      const { getWiseClient } = await import('../../../../../lib/wise-api');
      const wiseClient = getWiseClient();
      const wiseTransactions = await wiseClient.getIncomingPayments({
        from: from.toISOString(),
        to: to.toISOString(),
      });

      for (const wiseTx of wiseTransactions) {
        const reference = (
          wiseTx.details.paymentReference ||
          wiseTx.details.description ||
          ''
        ).toUpperCase();

        // Check if reference contains a paid invoice number
        let alreadyPaid = false;
        for (const paidInvNum of paidInvoiceNumbers) {
          if (reference.includes(paidInvNum)) {
            result.alreadyMatched++;
            alreadyPaid = true;
            break;
          }
        }
        if (alreadyPaid) continue;

        let matchedInvoice = null;

        // Try to match by reference containing invoice number
        for (const [invNumber, invoice] of invoicesByNumber) {
          if (reference.includes(invNumber)) {
            matchedInvoice = invoice;
            break;
          }
        }

        if (matchedInvoice) {
          const matchInfo = {
            transactionId: wiseTx.referenceNumber,
            source: 'wise' as const,
            invoiceId: matchedInvoice.id,
            invoiceNumber: matchedInvoice.invoiceNumber,
            amount: wiseTx.amount.value,
            currency: wiseTx.amount.currency,
            autoApplied: false,
          };

          // Apply match if requested and invoice is not already paid
          if (applyMatches && matchedInvoice.status !== 'paid') {
            try {
              await adminDb.collection('invoices').doc(matchedInvoice.id).update({
                status: 'paid',
                paymentMethod: 'wise',
                wiseReference: wiseTx.referenceNumber,
                paidAt: Timestamp.fromDate(new Date(wiseTx.date)),
                updatedAt: FieldValue.serverTimestamp(),
              });
              matchInfo.autoApplied = true;
            } catch (err: any) {
              result.errors.push(`Failed to update invoice ${matchedInvoice.invoiceNumber}: ${err.message}`);
            }
          }

          result.matched.push(matchInfo);
        } else {
          result.unmatched.push({
            transactionId: wiseTx.referenceNumber,
            source: 'wise',
            amount: wiseTx.amount.value,
            currency: wiseTx.amount.currency,
            reference: wiseTx.details.paymentReference || wiseTx.details.description || '',
            senderName: wiseTx.details.senderName,
            date: wiseTx.date,
          });
        }
      }
    } catch (wiseError: any) {
      if (!wiseError.message?.includes('environment variable')) {
        result.errors.push(`Wise error: ${wiseError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      result,
      summary: {
        newMatches: result.matched.length,
        appliedMatches: result.matched.filter((m) => m.autoApplied).length,
        unmatchedTransactions: result.unmatched.length,
        alreadyMatched: result.alreadyMatched,
        errors: result.errors.length,
      },
      filters: {
        from: from.toISOString(),
        to: to.toISOString(),
        applyMatches,
      },
    });
  } catch (error: any) {
    console.error('Error running reconciliation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run reconciliation' },
      { status: 500 }
    );
  }
}
