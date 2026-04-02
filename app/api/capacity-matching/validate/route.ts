import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '../../../../lib/capacity-matching-tokens';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return NextResponse.json({ valid: false, error: 'Missing token or email' });
    }

    const validation = await validateToken(token, email);

    if (validation.valid) {
      return NextResponse.json({
        valid: true,
        companyName: validation.data.companyName,
        contactName: validation.data.contactName || '',
        contactEmail: validation.data.contactEmail,
      });
    } else {
      return NextResponse.json({
        valid: false,
        error: validation.error,
      });
    }
  } catch (error: any) {
    console.error('Error validating token:', error);
    return NextResponse.json({ valid: false, error: 'Validation failed' });
  }
}
