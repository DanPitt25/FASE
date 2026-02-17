import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminDb, FieldValue, Timestamp } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

let stripe: Stripe;

const initializeStripe = () => {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripe = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripe;
};

/**
 * Sync Stripe payments to Firestore invoices
 * POST: Full sync operation
 */
export async function POST(request: NextRequest) {
  try {
    const stripe = initializeStripe();
    const db = getAdminDb();

    const body = await request.json();
    const { accountId, syncAll = false } = body;

    // Get all Firestore invoices that need syncing
    let invoicesQuery = db.collection('invoices').where('status', '!=', 'paid');

    if (accountId) {
      invoicesQuery = invoicesQuery.where('accountId', '==', accountId);
    }

    const invoicesSnapshot = await invoicesQuery.get();
    const firestoreInvoices = invoicesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const syncResults = {
      matched: 0,
      updated: 0,
      notFound: 0,
      errors: [] as string[],
    };

    // For each unpaid invoice, check if there's a matching Stripe payment
    for (const invoice of firestoreInvoices) {
      try {
        // Search for payments by invoice number in metadata
        const invoiceNumber = (invoice as any).invoiceNumber;
        if (!invoiceNumber) continue;

        // Search payment intents with this invoice number
        const paymentIntents = await stripe.paymentIntents.search({
          query: `metadata["invoice_number"]:"${invoiceNumber}"`,
          limit: 5,
        });

        // Find a successful payment
        const successfulPayment = paymentIntents.data.find(
          (pi) => pi.status === 'succeeded'
        );

        if (successfulPayment) {
          syncResults.matched++;

          // Update the Firestore invoice
          await db.collection('invoices').doc(invoice.id).update({
            status: 'paid',
            paymentMethod: 'stripe',
            paymentId: successfulPayment.id,
            stripePaymentIntentId: successfulPayment.id,
            paidAt: Timestamp.fromMillis(successfulPayment.created * 1000),
            updatedAt: FieldValue.serverTimestamp(),
          });

          syncResults.updated++;

          // Log activity if accountId is available
          const invoiceAccountId = (invoice as any).accountId;
          if (invoiceAccountId) {
            const { logPaymentReceived } = await import('../../../../lib/activity-logger');
            await logPaymentReceived(
              invoiceAccountId,
              successfulPayment.amount / 100,
              successfulPayment.currency.toUpperCase(),
              'stripe',
              invoice.id
            );
          }
        } else {
          syncResults.notFound++;
        }
      } catch (error: any) {
        syncResults.errors.push(`Invoice ${(invoice as any).invoiceNumber}: ${error.message}`);
      }
    }

    // Also sync checkout sessions (for direct checkout payments)
    if (syncAll) {
      const recentSessions = await stripe.checkout.sessions.list({
        limit: 100,
        expand: ['data.payment_intent'],
      });

      for (const session of recentSessions.data) {
        if (session.payment_status !== 'paid') continue;

        const invoiceNumber = session.metadata?.invoice_number;
        if (!invoiceNumber) continue;

        try {
          // Find matching Firestore invoice
          const matchingInvoices = await db
            .collection('invoices')
            .where('invoiceNumber', '==', invoiceNumber)
            .where('status', '!=', 'paid')
            .get();

          if (!matchingInvoices.empty) {
            const invoiceDoc = matchingInvoices.docs[0];
            await invoiceDoc.ref.update({
              status: 'paid',
              paymentMethod: 'stripe',
              paymentId: session.id,
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId:
                typeof session.payment_intent === 'string'
                  ? session.payment_intent
                  : session.payment_intent?.id,
              paidAt: Timestamp.fromMillis(session.created * 1000),
              updatedAt: FieldValue.serverTimestamp(),
            });
            syncResults.matched++;
            syncResults.updated++;
          }
        } catch (error: any) {
          syncResults.errors.push(`Session ${session.id}: ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Stripe sync completed',
      results: syncResults,
    });
  } catch (error: any) {
    console.error('Error syncing Stripe data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync Stripe data' },
      { status: 500 }
    );
  }
}

/**
 * GET: Get sync status and recent payments summary
 */
export async function GET(request: NextRequest) {
  try {
    const stripe = initializeStripe();
    const db = getAdminDb();

    // Get recent successful payments from Stripe
    const recentPayments = await stripe.paymentIntents.list({
      limit: 20,
    });

    const successfulPayments = recentPayments.data.filter((pi) => pi.status === 'succeeded');

    // Get unpaid invoices from Firestore
    const unpaidInvoices = await db.collection('invoices').where('status', '!=', 'paid').get();

    // Calculate potential matches
    const potentialMatches: any[] = [];
    for (const payment of successfulPayments) {
      const invoiceNumber = payment.metadata?.invoice_number;
      if (invoiceNumber) {
        const matchingInvoice = unpaidInvoices.docs.find(
          (doc) => doc.data().invoiceNumber === invoiceNumber
        );
        if (matchingInvoice) {
          potentialMatches.push({
            paymentId: payment.id,
            invoiceNumber,
            amount: payment.amount / 100,
            currency: payment.currency,
            paymentDate: new Date(payment.created * 1000).toISOString(),
            firestoreInvoiceId: matchingInvoice.id,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalUnpaidInvoices: unpaidInvoices.size,
        recentSuccessfulPayments: successfulPayments.length,
        potentialMatchesCount: potentialMatches.length,
      },
      potentialMatches,
    });
  } catch (error: any) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
