import { NextRequest, NextResponse } from 'next/server';
import { getWiseClient } from '../../../../lib/wise-api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency') || 'EUR';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Default to last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const intervalStart = from || thirtyDaysAgo.toISOString();
    const intervalEnd = to || now.toISOString();

    const wiseClient = getWiseClient();

    const statement = await wiseClient.getStatement({
      currency,
      intervalStart,
      intervalEnd,
    });

    // Format for response
    const formattedStatement = {
      currency: statement.query.currency,
      period: {
        start: statement.query.intervalStart,
        end: statement.query.intervalEnd,
      },
      openingBalance: statement.startOfStatementBalance.value,
      closingBalance: statement.endOfStatementBalance.value,
      accountHolder: statement.accountHolder.fullName,
      transactions: statement.transactions.map((t) => ({
        date: t.date,
        type: t.type,
        description: t.details.description,
        senderName: t.details.senderName,
        paymentReference: t.details.paymentReference,
        amount: t.amount.value,
        currency: t.amount.currency,
        fees: t.totalFees.value,
        runningBalance: t.runningBalance.value,
        referenceNumber: t.referenceNumber,
        category: t.details.category,
        exchangeDetails: t.exchangeDetails
          ? {
              fromAmount: t.exchangeDetails.fromAmount.value,
              fromCurrency: t.exchangeDetails.fromAmount.currency,
              toAmount: t.exchangeDetails.toAmount.value,
              toCurrency: t.exchangeDetails.toAmount.currency,
              rate: t.exchangeDetails.rate,
            }
          : null,
      })),
      summary: {
        totalCredits: statement.transactions
          .filter((t) => t.amount.value > 0)
          .reduce((sum, t) => sum + t.amount.value, 0),
        totalDebits: Math.abs(
          statement.transactions
            .filter((t) => t.amount.value < 0)
            .reduce((sum, t) => sum + t.amount.value, 0)
        ),
        totalFees: statement.transactions.reduce(
          (sum, t) => sum + t.totalFees.value,
          0
        ),
        transactionCount: statement.transactions.length,
      },
    };

    return NextResponse.json({
      success: true,
      statement: formattedStatement,
    });
  } catch (error: any) {
    console.error('Error fetching Wise statement:', error);

    if (error.message?.includes('environment variable')) {
      return NextResponse.json(
        {
          error: 'Wise API not configured',
          details: error.message,
          configured: false,
        },
        { status: 503 }
      );
    }

    if (error.message?.includes('No balance found')) {
      return NextResponse.json(
        {
          error: error.message,
          suggestion: 'Try a different currency (EUR, GBP, USD)',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch statement' },
      { status: 500 }
    );
  }
}
