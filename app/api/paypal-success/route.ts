import { NextRequest, NextResponse } from 'next/server';
import { updateMemberApplicationPaymentStatus } from '../../../lib/firestore';

const PAYPAL_BASE_URL = process.env.PAYPAL_ENVIRONMENT === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

// Get PayPal access token
async function getAccessToken() {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured');
  }

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const payerId = searchParams.get('PayerID');

    if (!token || !payerId) {
      return NextResponse.redirect(
        new URL('/member-portal/apply?error=missing_payment_info', request.url)
      );
    }

    const accessToken = await getAccessToken();

    // Capture the payment
    const captureResponse = await fetch(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${token}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const captureData = await captureResponse.json();

    if (!captureResponse.ok || captureData.status !== 'COMPLETED') {
      console.error('PayPal capture failed:', captureData);
      return NextResponse.redirect(
        new URL('/member-portal/apply?error=payment_failed', request.url)
      );
    }

    // Extract custom data from the order
    const customData = JSON.parse(
      captureData.purchase_units[0]?.payments?.captures[0]?.custom_id || '{}'
    );

    // Update member application payment status
    if (customData.user_id) {
      await updateMemberApplicationPaymentStatus(
        customData.user_id,
        'paid',
        'paypal',
        captureData.id
      );
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/member-portal/apply?success=true', request.url)
    );

  } catch (error: any) {
    console.error('Error processing PayPal success:', error);
    return NextResponse.redirect(
      new URL('/member-portal/apply?error=processing_failed', request.url)
    );
  }
}