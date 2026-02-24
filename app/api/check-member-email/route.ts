import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * Check if an email exists as an unconfirmed member in any account
 * and optionally trigger an invite email resend
 */
export async function POST(request: NextRequest) {
  try {
    const { email, sendInvite } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get all accounts and query their members subcollections in parallel
    const accountsSnapshot = await adminDb.collection('accounts').get();

    let foundMember: {
      memberId: string;
      companyId: string;
      companyName: string;
      memberName: string;
      accountConfirmed: boolean;
      accountStatus: string;
    } | null = null;

    // Query all accounts' members subcollections in parallel
    // Note: Firestore queries are case-sensitive, so we fetch all members and compare in code
    const memberQueries = accountsSnapshot.docs.map(async (accountDoc) => {
      const accountData = accountDoc.data();
      const membersSnapshot = await adminDb
        .collection('accounts')
        .doc(accountDoc.id)
        .collection('members')
        .get();

      // Find member with case-insensitive email match
      const matchingMember = membersSnapshot.docs.find(doc => {
        const memberEmail = doc.data().email;
        return memberEmail && memberEmail.toLowerCase() === normalizedEmail;
      });

      if (matchingMember) {
        const memberData = matchingMember.data();
        return {
          memberId: matchingMember.id,
          companyId: accountDoc.id,
          companyName: accountData?.organizationName || 'Unknown Company',
          memberName: memberData.personalName || memberData.fullName || '',
          accountConfirmed: memberData.accountConfirmed === true,
          accountStatus: accountData?.status || 'unknown'
        };
      }
      return null;
    });

    const results = await Promise.all(memberQueries);
    foundMember = results.find(r => r !== null) || null;

    if (!foundMember) {
      return NextResponse.json({
        found: false,
        message: 'No membership found for this email address'
      });
    }

    // If member already has account set up
    if (foundMember.accountConfirmed) {
      return NextResponse.json({
        found: true,
        accountConfirmed: true,
        message: 'Account already set up. Please use the login page.'
      });
    }

    // Check if the company account is approved
    if (foundMember.accountStatus !== 'approved' && foundMember.accountStatus !== 'admin') {
      return NextResponse.json({
        found: true,
        accountConfirmed: false,
        companyPending: true,
        message: 'Your company\'s membership is still being processed. You will be able to set up your account once it is approved.'
      });
    }

    // Member found but not confirmed - if sendInvite is true, send the invite
    if (sendInvite) {
      // Generate invite token
      const inviteData = {
        memberId: foundMember.memberId,
        companyId: foundMember.companyId,
        email: normalizedEmail,
        name: foundMember.memberName,
        companyName: foundMember.companyName,
        timestamp: Date.now()
      };

      const token = Buffer.from(JSON.stringify(inviteData))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://fasemga.com'}/invite/${token}`;

      // Send invite email via internal API route
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://fasemga.com';
        const response = await fetch(`${baseUrl}/api/send-invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            name: foundMember.memberName,
            companyName: foundMember.companyName,
            inviteUrl: inviteUrl,
            inviterName: 'FASE'
          })
        });

        if (!response.ok) {
          console.error('Failed to send invite email:', await response.text());
          return NextResponse.json({
            found: true,
            accountConfirmed: false,
            inviteSent: false,
            error: 'Failed to send invite email. Please contact help@fasemga.com'
          });
        }

        return NextResponse.json({
          found: true,
          accountConfirmed: false,
          inviteSent: true,
          companyName: foundMember.companyName,
          message: 'Invitation email sent! Check your inbox to set up your password.'
        });
      } catch (emailError) {
        console.error('Error sending invite email:', emailError);
        return NextResponse.json({
          found: true,
          accountConfirmed: false,
          inviteSent: false,
          error: 'Failed to send invite email. Please contact help@fasemga.com'
        });
      }
    }

    // Just checking - return status without sending
    return NextResponse.json({
      found: true,
      accountConfirmed: false,
      companyName: foundMember.companyName,
      message: 'Account setup required'
    });

  } catch (error: any) {
    console.error('Error checking member email:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
