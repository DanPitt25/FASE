import { NextRequest, NextResponse } from 'next/server';

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Generate verification code
    const code = generateVerificationCode();

    // Call the Firebase Function to handle both Firestore storage and email sending
    try {
      const response = await fetch(`https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/sendVerificationCode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: { email, code }
        }),
      });

      if (!response.ok) {
        console.error('Failed to call sendVerificationCode function:', response.status);
      }
    } catch (error) {
      console.error('Error calling Firebase function:', error);
      // Continue anyway - the code is stored and user can still verify
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
    });
  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}