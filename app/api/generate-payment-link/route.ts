import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const amount = parseFloat(searchParams.get('amount') || '0');
    
    if (!amount || amount <= 0) {
      console.error('Invalid payment amount:', amount);
      return NextResponse.redirect(new URL('/payment-failed?error=invalid-amount', request.url));
    }
    
    // Get the essential payment data from URL params
    const userEmail = searchParams.get('email') || 'member@fasemga.com';
    const organizationName = searchParams.get('organization') || 'FASE Member';
    
    // Provide what the existing PayPal API expects (even though most is ignored)
    const paymentData = {
      organizationName: organizationName, // Used in PayPal plan name
      organizationType: "MGA", // Used in PayPal plan name  
      membershipType: "corporate", // Used in PayPal plan name
      grossWrittenPremiums: "10-20m", // API expects it but PayPal ignores
      userEmail: userEmail, // PayPal uses for receipts
      userId: `FASE-${Date.now()}`, // Our tracking
      hasOtherAssociations: false, // Used in PayPal plan name
      exactTotalAmount: amount // What PayPal charges
    };
    
    console.log('Generating PayPal subscription for amount:', amount);
    
    // Create fresh PayPal subscription
    const paypalResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/create-paypal-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });
    
    if (!paypalResponse.ok) {
      console.error('PayPal subscription creation failed:', paypalResponse.status);
      return NextResponse.redirect(new URL('/payment-failed', request.url));
    }
    
    const paypalData = await paypalResponse.json();
    
    if (!paypalData.approvalUrl) {
      console.error('No approval URL returned from PayPal');
      return NextResponse.redirect(new URL('/payment-failed', request.url));
    }
    
    // Redirect directly to PayPal
    return NextResponse.redirect(paypalData.approvalUrl);
    
  } catch (error) {
    console.error('Payment link generation error:', error);
    return NextResponse.redirect(new URL('/payment-failed', request.url));
  }
}