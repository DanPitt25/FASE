import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    stripe_key_exists: !!process.env.STRIPE_SECRET_KEY,
    stripe_key_prefix: process.env.STRIPE_SECRET_KEY?.substring(0, 15),
    stripe_webhook_exists: !!process.env.STRIPE_WEBHOOK_SECRET,
    firebase_key_exists: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    auth_secret_exists: !!process.env.AUTH_SECRET,
    node_env: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
    all_env_keys: Object.keys(process.env).filter(key => 
      key.includes('STRIPE') || 
      key.includes('PAYPAL') || 
      key.includes('FIREBASE') || 
      key.includes('AUTH')
    )
  });
}