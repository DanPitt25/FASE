import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../../lib/firebase-admin';
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

/**
 * GET: Finance dashboard overview
 * Returns summary metrics for payments and invoices
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get('days') || '90', 10);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // Get all invoices from Firestore
    const invoicesSnapshot = await adminDb.collection('invoices').get();

    let totalRevenue = 0;
    let paidInvoicesCount = 0;
    let paidInvoicesTotal = 0;
    let unpaidInvoicesCount = 0;
    let unpaidInvoicesTotal = 0;
    const recentPayments: any[] = [];

    for (const doc of invoicesSnapshot.docs) {
      const data = doc.data();
      const amount = data.amount || data.totalAmount || 0;

      if (data.status === 'paid') {
        paidInvoicesCount++;
        paidInvoicesTotal += amount;
        totalRevenue += amount;

        // Track recent payments
        const paidAt = data.paidAt?.toDate?.() || data.updatedAt?.toDate?.();
        if (paidAt && paidAt > cutoffDate) {
          recentPayments.push({
            id: doc.id,
            invoiceNumber: data.invoiceNumber,
            organizationName: data.organizationName,
            amount,
            currency: data.currency || 'EUR',
            paymentMethod: data.paymentMethod,
            paidAt: paidAt.toISOString(),
            paidPdfUrl: data.paidPdfUrl,
          });
        }
      } else {
        unpaidInvoicesCount++;
        unpaidInvoicesTotal += amount;
      }
    }

    // Sort recent payments by date descending
    recentPayments.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    // Get Stripe payment count for comparison
    let stripePaymentsCount = 0;
    let unmatchedStripeCount = 0;

    const stripeInstance = initializeStripe();
    if (stripeInstance) {
      try {
        // Get recent successful payment intents
        const paymentIntents = await stripeInstance.paymentIntents.list({
          limit: 100,
          created: { gte: Math.floor(cutoffDate.getTime() / 1000) },
        });

        const successfulPayments = paymentIntents.data.filter(
          (pi) => pi.status === 'succeeded'
        );
        stripePaymentsCount = successfulPayments.length;

        // Check how many have invoice_number metadata
        const matchedStripePayments = successfulPayments.filter(
          (pi) => pi.metadata?.invoice_number
        );
        unmatchedStripeCount = stripePaymentsCount - matchedStripePayments.length;
      } catch (stripeError) {
        console.error('Failed to fetch Stripe payments:', stripeError);
      }
    }

    // Get Wise transaction count if configured
    let wiseTransactionsCount = 0;
    let unmatchedWiseCount = 0;

    try {
      const { getWiseClient } = await import('../../../../../lib/wise-api');
      const wiseClient = getWiseClient();
      const wiseTransactions = await wiseClient.getIncomingPayments({
        from: cutoffDate.toISOString(),
      });
      wiseTransactionsCount = wiseTransactions.length;

      // Count unmatched by checking if reference contains any invoice number
      const invoiceNumbers = invoicesSnapshot.docs
        .map((doc) => doc.data().invoiceNumber?.toUpperCase())
        .filter(Boolean);

      for (const tx of wiseTransactions) {
        const reference = (
          tx.details.paymentReference ||
          tx.details.description ||
          ''
        ).toUpperCase();

        const matched = invoiceNumbers.some((inv) => reference.includes(inv));
        if (!matched) {
          unmatchedWiseCount++;
        }
      }
    } catch (wiseError: any) {
      // Wise might not be configured
      if (!wiseError.message?.includes('environment variable')) {
        console.error('Failed to fetch Wise transactions:', wiseError);
      }
    }

    return NextResponse.json({
      success: true,
      overview: {
        totalRevenue,
        currency: 'EUR',
        paidInvoices: {
          count: paidInvoicesCount,
          total: paidInvoicesTotal,
        },
        unpaidInvoices: {
          count: unpaidInvoicesCount,
          total: unpaidInvoicesTotal,
        },
        stripePayments: {
          count: stripePaymentsCount,
          unmatched: unmatchedStripeCount,
        },
        wiseTransactions: {
          count: wiseTransactionsCount,
          unmatched: unmatchedWiseCount,
        },
        totalUnmatched: unmatchedStripeCount + unmatchedWiseCount,
      },
      recentPayments: recentPayments.slice(0, 20),
      periodDays: daysBack,
    });
  } catch (error: any) {
    console.error('Error fetching finance overview:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch overview' },
      { status: 500 }
    );
  }
}
