import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, isAuthError } from '@/lib/admin-auth';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import {
  findMatchingAccounts,
  TransactionData,
  AccountData,
  MatchCandidate,
} from '@/lib/finance-matching';

export const dynamic = 'force-dynamic';

interface AutoLinkResult {
  transactionId: string;
  source: 'stripe' | 'wise';
  accountId: string;
  accountName: string;
  score: number;
  paymentType: 'membership' | 'rendezvous';
}

/**
 * POST: Auto-link high-confidence unlinked transactions
 *
 * Request body:
 * {
 *   transactionIds?: string[] - Optional list of specific transaction IDs to process
 *   dryRun?: boolean - If true, return what would be linked without actually linking
 *   minScore?: number - Minimum score threshold (default 70)
 * }
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const {
      transactionIds,
      dryRun = false,
      minScore = 70,
    } = body;

    // Get all accounts for matching
    const accountsSnapshot = await adminDb.collection('accounts').get();
    const accounts: AccountData[] = accountsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        organizationName: data.organizationName || '',
        email: data.email || data.primaryContact?.email,
        primaryContact: data.primaryContact,
        organizationType: data.organizationType,
      };
    }).filter(acc => acc.organizationName);

    // Get already linked transactions
    const linkedSnapshot = await adminDb.collection('linked-payments').get();
    const linkedIds = new Set(linkedSnapshot.docs.map(doc => doc.id));

    // Get transactions to process
    // For now, we'll process transactions passed in the request body
    // In a full implementation, you might want to fetch from Stripe/Wise here
    const { transactions: txList = [] } = body;

    const results: AutoLinkResult[] = [];
    const skipped: { transactionId: string; reason: string }[] = [];

    for (const tx of txList) {
      const txKey = `${tx.source}_${tx.id}`;

      // Skip if already linked
      if (linkedIds.has(txKey)) {
        skipped.push({ transactionId: tx.id, reason: 'Already linked' });
        continue;
      }

      // Skip if specific IDs requested and this isn't one of them
      if (transactionIds && !transactionIds.includes(tx.id)) {
        continue;
      }

      const txData: TransactionData = {
        id: tx.id,
        source: tx.source,
        amount: tx.amount,
        amountEur: tx.amountEur,
        currency: tx.currency,
        senderName: tx.senderName,
        email: tx.email,
        reference: tx.reference,
        description: tx.description,
      };

      const matchResult = findMatchingAccounts(txData, accounts);

      // Only auto-link if we have a high-confidence single candidate
      if (matchResult.autoLinkCandidate && matchResult.autoLinkCandidate.score >= minScore) {
        const candidate = matchResult.autoLinkCandidate;

        // Determine payment type from payment match
        let paymentType: 'membership' | 'rendezvous' = 'membership';
        if (matchResult.paymentMatch.suggestions.length > 0) {
          const firstSuggestion = matchResult.paymentMatch.suggestions[0];
          paymentType = firstSuggestion.type;
        }

        if (!dryRun) {
          // Create the link
          const linkDoc = {
            transactionId: tx.id,
            source: tx.source,
            accountId: candidate.accountId,
            accountName: candidate.accountName,
            paymentType,
            amount: tx.amount,
            currency: tx.currency,
            linkedAt: FieldValue.serverTimestamp(),
            linkedBy: 'system',
            linkedByName: 'Auto-Link',
            autoLinked: true,
            matchScore: candidate.score,
            matchSignals: candidate.signals,
          };

          await adminDb.collection('linked-payments').doc(txKey).set(linkDoc);

          // Log activity
          await adminDb.collection('payment_activities').add({
            paymentKey: txKey,
            transactionId: tx.id,
            source: tx.source,
            type: 'auto_linked_to_member',
            title: 'Auto-Linked to Member',
            description: `Automatically linked to ${candidate.accountName} (score: ${candidate.score})`,
            metadata: {
              accountId: candidate.accountId,
              accountName: candidate.accountName,
              paymentType,
              matchScore: candidate.score,
              signals: candidate.signals.map(s => s.description),
            },
            performedBy: 'system',
            performedByName: 'Auto-Link System',
            createdAt: FieldValue.serverTimestamp(),
          });
        }

        results.push({
          transactionId: tx.id,
          source: tx.source,
          accountId: candidate.accountId,
          accountName: candidate.accountName,
          score: candidate.score,
          paymentType,
        });
      } else if (matchResult.candidates.length > 0) {
        // Has candidates but not confident enough
        const best = matchResult.candidates[0];
        skipped.push({
          transactionId: tx.id,
          reason: `Best match score ${best.score} below threshold ${minScore}`,
        });
      } else {
        skipped.push({
          transactionId: tx.id,
          reason: 'No matching candidates found',
        });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      linked: results,
      linkedCount: results.length,
      skipped,
      skippedCount: skipped.length,
    });

  } catch (error: any) {
    console.error('Auto-link error:', error);
    return NextResponse.json(
      { error: error.message || 'Auto-link failed' },
      { status: 500 }
    );
  }
}

/**
 * GET: Get auto-link candidates for review
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const minScore = parseInt(searchParams.get('minScore') || '70', 10);

    // This endpoint is for reviewing what would be auto-linked
    // It requires the transactions to be passed in (they come from the transactions API)

    return NextResponse.json({
      success: true,
      message: 'Use POST with transactions array to process auto-linking',
      minScore,
    });

  } catch (error: any) {
    console.error('Auto-link GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get auto-link candidates' },
      { status: 500 }
    );
  }
}
