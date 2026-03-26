/**
 * Finance Matching Utility
 *
 * Matches incoming payments to member accounts using multiple signals:
 * - Email match (highest confidence)
 * - Organization name match (fuzzy matching)
 * - Amount match (based on known pricing)
 * - Reference keywords
 */

import { matchPayment, PaymentMatch } from './payment-matching';

// =============================================================================
// TYPES
// =============================================================================

export interface TransactionData {
  id: string;
  source: 'stripe' | 'wise';
  amount: number;
  amountEur: number;
  currency: string;
  senderName?: string;
  email?: string;
  reference?: string;
  description?: string;
}

export interface AccountData {
  id: string;
  organizationName: string;
  email?: string;
  primaryContact?: {
    name?: string;
    email?: string;
  };
  organizationType?: 'MGA' | 'carrier' | 'provider';
}

export interface MatchCandidate {
  accountId: string;
  accountName: string;
  score: number;
  signals: MatchSignal[];
  confidence: 'high' | 'medium' | 'low';
}

export interface MatchSignal {
  type: 'email' | 'name' | 'amount' | 'reference';
  description: string;
  points: number;
}

export interface MatchResult {
  candidates: MatchCandidate[];
  autoLinkCandidate: MatchCandidate | null;
  paymentMatch: PaymentMatch;
}

// =============================================================================
// STRING NORMALIZATION
// =============================================================================

// Common company suffixes to strip for comparison
const COMPANY_SUFFIXES = [
  'limited', 'ltd', 'ltd.', 'llc', 'llp', 'plc', 'inc', 'inc.',
  'incorporated', 'corp', 'corp.', 'corporation', 'co', 'co.',
  'company', 'gmbh', 'ag', 'sa', 'bv', 'nv', 's.a.', 's.l.',
  'pty', 'pty.', 'proprietary', 'holdings', 'group', 'international',
  'uk', 'europe', 'eu', 'underwriting', 'insurance', 'services',
  'solutions', 'partners', 'consulting', 'management', 'agencies', 'agency'
];

/**
 * Normalize a string for comparison
 * Removes punctuation, extra spaces, and common suffixes
 */
function normalizeString(str: string): string {
  if (!str) return '';

  let normalized = str
    .toLowerCase()
    .trim()
    // Remove common punctuation
    .replace(/[.,\-_'"()&]/g, ' ')
    // Normalize multiple spaces
    .replace(/\s+/g, ' ')
    .trim();

  // Remove leading "the"
  if (normalized.startsWith('the ')) {
    normalized = normalized.slice(4);
  }

  // Remove common company suffixes
  const words = normalized.split(' ');
  const filteredWords = words.filter(word => !COMPANY_SUFFIXES.includes(word));

  return filteredWords.join(' ').trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity ratio (0-1) between two strings
 */
function stringSimilarity(a: string, b: string): number {
  const normalizedA = normalizeString(a);
  const normalizedB = normalizeString(b);

  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 1;

  const maxLength = Math.max(normalizedA.length, normalizedB.length);
  const distance = levenshteinDistance(normalizedA, normalizedB);

  return 1 - distance / maxLength;
}

/**
 * Check if string A contains string B as a significant portion
 */
function containsSignificantPortion(haystack: string, needle: string): boolean {
  const normalizedHaystack = normalizeString(haystack);
  const normalizedNeedle = normalizeString(needle);

  if (!normalizedHaystack || !normalizedNeedle) return false;
  if (normalizedNeedle.length < 3) return false; // Too short to be meaningful

  return normalizedHaystack.includes(normalizedNeedle);
}

// =============================================================================
// MATCHING LOGIC
// =============================================================================

/**
 * Calculate match score between a transaction and an account
 */
export function calculateMatchScore(
  transaction: TransactionData,
  account: AccountData
): MatchCandidate {
  const signals: MatchSignal[] = [];
  let totalScore = 0;

  // Signal 1: Email Match (50 points for exact match)
  if (transaction.email) {
    const txEmail = transaction.email.toLowerCase().trim();
    const accountEmail = account.email?.toLowerCase().trim();
    const contactEmail = account.primaryContact?.email?.toLowerCase().trim();

    if (txEmail === accountEmail || txEmail === contactEmail) {
      signals.push({
        type: 'email',
        description: `Email match: ${txEmail}`,
        points: 50
      });
      totalScore += 50;
    }
  }

  // Signal 2: Organization Name Match (40 exact, 25 fuzzy)
  if (transaction.senderName && account.organizationName) {
    const similarity = stringSimilarity(transaction.senderName, account.organizationName);

    if (similarity === 1) {
      signals.push({
        type: 'name',
        description: `Exact name match: ${account.organizationName}`,
        points: 40
      });
      totalScore += 40;
    } else if (similarity >= 0.85) {
      const points = Math.round(25 * similarity);
      signals.push({
        type: 'name',
        description: `Similar name (${Math.round(similarity * 100)}%): ${transaction.senderName} ≈ ${account.organizationName}`,
        points
      });
      totalScore += points;
    } else if (similarity >= 0.7) {
      const points = Math.round(15 * similarity);
      signals.push({
        type: 'name',
        description: `Partial name match (${Math.round(similarity * 100)}%): ${transaction.senderName} ~ ${account.organizationName}`,
        points
      });
      totalScore += points;
    }
  }

  // Signal 3: Amount Match (15 points)
  const paymentMatch = matchPayment(transaction.amountEur);
  if (paymentMatch.confidence === 'exact') {
    signals.push({
      type: 'amount',
      description: `Amount matches known pricing: €${transaction.amountEur.toLocaleString()}`,
      points: 15
    });
    totalScore += 15;
  } else if (paymentMatch.confidence === 'likely') {
    signals.push({
      type: 'amount',
      description: `Amount likely matches pricing: €${transaction.amountEur.toLocaleString()}`,
      points: 8
    });
    totalScore += 8;
  }

  // Signal 4: Reference Contains Keywords (10 points)
  if (transaction.reference || transaction.description) {
    const refText = `${transaction.reference || ''} ${transaction.description || ''}`.toLowerCase();

    // Check if reference contains organization name
    if (account.organizationName && containsSignificantPortion(refText, account.organizationName)) {
      signals.push({
        type: 'reference',
        description: `Reference mentions organization name`,
        points: 10
      });
      totalScore += 10;
    }

    // Check for FASE invoice number pattern
    if (refText.includes('fase-') || refText.includes('fase ')) {
      signals.push({
        type: 'reference',
        description: `Reference contains FASE invoice number`,
        points: 5
      });
      totalScore += 5;
    }
  }

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low';
  if (totalScore >= 70) {
    confidence = 'high';
  } else if (totalScore >= 40) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    accountId: account.id,
    accountName: account.organizationName,
    score: totalScore,
    signals,
    confidence
  };
}

/**
 * Find all matching accounts for a transaction, ranked by score
 */
export function findMatchingAccounts(
  transaction: TransactionData,
  accounts: AccountData[]
): MatchResult {
  // Calculate scores for all accounts
  const candidates: MatchCandidate[] = accounts
    .map(account => calculateMatchScore(transaction, account))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  // Take top candidates (those scoring above threshold)
  const topCandidates = candidates.filter(c => c.score >= 30).slice(0, 5);

  // Determine if we should auto-link
  let autoLinkCandidate: MatchCandidate | null = null;

  if (topCandidates.length > 0) {
    const best = topCandidates[0];

    // Auto-link conditions:
    // 1. Score >= 70 (high confidence)
    // 2. No other candidate within 10 points (clear winner)
    if (best.score >= 70) {
      const hasCloseCompetitor = topCandidates.length > 1 &&
        (best.score - topCandidates[1].score) < 10;

      if (!hasCloseCompetitor) {
        autoLinkCandidate = best;
      }
    }
  }

  // Get payment type match
  const paymentMatch = matchPayment(transaction.amountEur);

  return {
    candidates: topCandidates,
    autoLinkCandidate,
    paymentMatch
  };
}

/**
 * Format match result for display
 */
export function formatMatchSummary(result: MatchResult): string {
  if (result.autoLinkCandidate) {
    return `Auto-link: ${result.autoLinkCandidate.accountName} (${result.autoLinkCandidate.score}pts)`;
  }

  if (result.candidates.length > 0) {
    const best = result.candidates[0];
    return `${best.accountName} (${best.score}pts, ${best.confidence})`;
  }

  return 'No match found';
}
