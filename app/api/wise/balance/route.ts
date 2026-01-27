import { NextRequest, NextResponse } from 'next/server';
import { getWiseClient } from '../../../../lib/wise-api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency');

    const wiseClient = getWiseClient();

    if (currency) {
      const balance = await wiseClient.getBalance(currency);
      if (!balance) {
        return NextResponse.json(
          { error: `No balance found for currency: ${currency}` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, balance });
    }

    const balances = await wiseClient.getBalances();

    // Format balances for display
    const formattedBalances = balances.map((balance) => ({
      id: balance.id,
      currency: balance.currency,
      available: balance.amount.value,
      reserved: balance.reservedAmount?.value || 0,
      total: balance.amount.value + (balance.reservedAmount?.value || 0),
      bankDetails: balance.bankDetails,
    }));

    return NextResponse.json({
      success: true,
      balances: formattedBalances,
    });
  } catch (error: any) {
    console.error('Error fetching Wise balance:', error);

    // Check if it's a configuration error
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

    return NextResponse.json(
      { error: error.message || 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
