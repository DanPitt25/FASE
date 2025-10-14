import { NextRequest, NextResponse } from 'next/server';

// Legacy Stripe webhook endpoint - no longer in use
// The system now uses bank transfer invoicing instead of Stripe subscriptions
export async function POST(request: NextRequest) {
  console.log('Legacy Stripe webhook called - system now uses bank transfer invoicing');
  return NextResponse.json({ message: 'Webhook endpoint deprecated' }, { status: 410 });
}