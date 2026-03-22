/**
 * Shared hooks for Admin Portal data fetching
 *
 * These hooks consolidate common data fetching patterns used across
 * admin portal components to reduce duplication and ensure consistency.
 *
 * @see lib/admin-types.ts for type definitions
 * @see ADMIN-PORTAL-AUDIT.md for architecture overview
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { authFetch, authPost, authDelete } from '@/lib/auth-fetch';
import type {
  RendezvousRegistration,
  RendezvousInterestRegistration,
  FlattenedAttendee,
  RendezvousPaymentStatus,
  Transaction,
  PaymentActivity,
  PaymentNote,
  FinanceFilterSource,
  FinanceDateRange,
  MemberSearchResult,
  Sponsor,
  PendingReviewAccount,
} from '@/lib/admin-types';

// ============== GENERIC FETCH HOOK ==============

interface UseFetchOptions {
  /** Don't fetch automatically on mount */
  manual?: boolean;
  /** Dependencies that trigger refetch */
  deps?: unknown[];
}

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Generic fetch hook for admin API endpoints
 */
export function useAdminFetch<T>(
  url: string | null,
  options: UseFetchOptions = {}
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options.manual);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) return;

    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(url);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || `HTTP ${response.status}`);
      }

      setData(json);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error(`Error fetching ${url}:`, err);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (!options.manual && url) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, options.manual, ...(options.deps || [])]);

  return { data, loading, error, refetch: fetchData };
}

// ============== RENDEZVOUS DATA HOOK ==============

interface RendezvousStats {
  totalRegistrations: number;
  confirmedRegistrations: number;
  pendingRegistrations: number;
  totalAttendees: number;
  confirmedAttendees: number;
  pendingAttendees: number;
  confirmedRevenue: number;
  pendingRevenue: number;
  totalRevenue: number;
}

interface DataIssues {
  duplicateEmails: { email: string; count: number; attendees: FlattenedAttendee[] }[];
  similarCompanies: { normalized: string; companies: string[] }[];
  missingData: { type: string; count: number; items: unknown[] }[];
}

interface UseRendezvousDataResult {
  registrations: RendezvousRegistration[];
  interestRegistrations: RendezvousInterestRegistration[];
  allAttendees: FlattenedAttendee[];
  stats: RendezvousStats;
  dataIssues: DataIssues;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for Rendezvous registration data with computed stats
 */
export function useRendezvousData(): UseRendezvousDataResult {
  const [registrations, setRegistrations] = useState<RendezvousRegistration[]>([]);
  const [interestRegistrations, setInterestRegistrations] = useState<RendezvousInterestRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authFetch('/api/admin/rendezvous-registrations');
      if (!response.ok) throw new Error('Failed to fetch registrations');

      const data = await response.json();
      const allRegistrations = data.registrations || [];

      // Separate interest registrations from actual registrations
      const interest: RendezvousInterestRegistration[] = allRegistrations.filter(
        (r: { registrationType?: string }) => r.registrationType === 'interest'
      );
      const actual: RendezvousRegistration[] = allRegistrations.filter(
        (r: { registrationType?: string }) => r.registrationType !== 'interest'
      );

      setInterestRegistrations(interest);
      setRegistrations(actual);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error loading registrations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  // Flatten all attendees from all registrations
  const allAttendees = useMemo((): FlattenedAttendee[] => {
    const attendees: FlattenedAttendee[] = [];
    registrations.forEach(reg => {
      (reg.attendees || []).forEach(att => {
        attendees.push({
          id: att.id,
          firstName: att.firstName,
          lastName: att.lastName,
          email: att.email,
          jobTitle: att.jobTitle,
          company: reg.billingInfo?.company || '',
          country: reg.billingInfo?.country || '',
          organizationType: reg.billingInfo?.organizationType || '',
          paymentStatus: reg.paymentStatus,
          invoiceNumber: reg.invoiceNumber,
          registrationId: reg.registrationId,
          isFaseMember: reg.companyIsFaseMember,
          isAsaseMember: reg.isAsaseMember,
          totalPrice: reg.totalPrice,
          createdAt: reg.createdAt,
        });
      });
    });
    return attendees;
  }, [registrations]);

  // Calculate stats
  const stats = useMemo((): RendezvousStats => {
    const confirmed = registrations.filter(
      r => r.paymentStatus === 'paid' || r.paymentStatus === 'confirmed' || r.paymentStatus === 'complimentary'
    );
    const pending = registrations.filter(
      r => r.paymentStatus === 'pending_bank_transfer' || r.paymentStatus === 'pending'
    );

    const confirmedAttendees = confirmed.reduce((sum, r) => sum + (r.attendees?.length || 0), 0);
    const pendingAttendees = pending.reduce((sum, r) => sum + (r.attendees?.length || 0), 0);

    const confirmedRevenue = confirmed.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
    const pendingRevenue = pending.reduce((sum, r) => sum + (r.totalPrice || 0), 0);

    return {
      totalRegistrations: registrations.length,
      confirmedRegistrations: confirmed.length,
      pendingRegistrations: pending.length,
      totalAttendees: confirmedAttendees + pendingAttendees,
      confirmedAttendees,
      pendingAttendees,
      confirmedRevenue,
      pendingRevenue,
      totalRevenue: confirmedRevenue + pendingRevenue,
    };
  }, [registrations]);

  // Identify data quality issues
  const dataIssues = useMemo((): DataIssues => {
    const issues: DataIssues = {
      duplicateEmails: [],
      similarCompanies: [],
      missingData: [],
    };

    // Find duplicate emails across all attendees
    const emailMap = new Map<string, FlattenedAttendee[]>();
    allAttendees.forEach(att => {
      const email = (att.email || '').toLowerCase().trim();
      if (email) {
        if (!emailMap.has(email)) emailMap.set(email, []);
        emailMap.get(email)!.push(att);
      }
    });
    emailMap.forEach((attendees, email) => {
      if (attendees.length > 1) {
        issues.duplicateEmails.push({ email, count: attendees.length, attendees });
      }
    });

    // Find similar company names
    const companyMap = new Map<string, string[]>();
    registrations.forEach(reg => {
      const company = reg.billingInfo?.company || '';
      const normalized = company.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalized) {
        if (!companyMap.has(normalized)) companyMap.set(normalized, []);
        const existing = companyMap.get(normalized)!;
        if (!existing.includes(company)) existing.push(company);
      }
    });
    companyMap.forEach((companies, normalized) => {
      if (companies.length > 1) {
        issues.similarCompanies.push({ normalized, companies });
      }
    });

    // Find missing data
    const missingEmails = allAttendees.filter(a => !a.email);
    if (missingEmails.length > 0) {
      issues.missingData.push({ type: 'Missing email', count: missingEmails.length, items: missingEmails });
    }

    const missingNames = allAttendees.filter(a => !a.firstName && !a.lastName);
    if (missingNames.length > 0) {
      issues.missingData.push({ type: 'Missing name', count: missingNames.length, items: missingNames });
    }

    return issues;
  }, [allAttendees, registrations]);

  return {
    registrations,
    interestRegistrations,
    allAttendees,
    stats,
    dataIssues,
    loading,
    error,
    refetch: loadRegistrations,
  };
}

// ============== FINANCE DATA HOOK ==============

interface UseFinanceDataOptions {
  sourceFilter?: FinanceFilterSource;
  dateRange?: FinanceDateRange;
}

interface UseFinanceDataResult {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  stripeConfigured: boolean;
  wiseConfigured: boolean;
  apiErrors: string[];
  refetch: () => Promise<void>;
}

/**
 * Hook for finance/transaction data
 */
export function useFinanceData(options: UseFinanceDataOptions = {}): UseFinanceDataResult {
  const { sourceFilter = 'all', dateRange = 'all' } = options;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [wiseConfigured, setWiseConfigured] = useState(false);
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/admin/finance/transactions?source=${sourceFilter}`;
      if (dateRange !== 'all') {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - parseInt(dateRange));
        url += `&from=${fromDate.toISOString()}`;
      }

      const response = await authFetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load transactions');
      }

      setTransactions(data.transactions || []);
      setStripeConfigured(data.summary?.stripeCount !== undefined);
      setWiseConfigured(data.summary?.wiseCount !== undefined);
      setApiErrors(data.errors || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    transactions,
    loading,
    error,
    stripeConfigured,
    wiseConfigured,
    apiErrors,
    refetch: loadData,
  };
}

// ============== PAYMENT CRM DATA HOOK ==============

interface UsePaymentCrmDataResult {
  activities: PaymentActivity[];
  notes: PaymentNote[];
  loading: boolean;
  load: (transactionId: string, source: string) => Promise<void>;
  addNote: (transactionId: string, source: string, content: string, category: string) => Promise<boolean>;
  deleteNote: (transactionId: string, source: string, noteId: string) => Promise<boolean>;
}

/**
 * Hook for payment CRM data (activities and notes)
 */
export function usePaymentCrmData(): UsePaymentCrmDataResult {
  const [activities, setActivities] = useState<PaymentActivity[]>([]);
  const [notes, setNotes] = useState<PaymentNote[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (transactionId: string, source: string) => {
    setLoading(true);
    try {
      const [activitiesRes, notesRes] = await Promise.all([
        authFetch(`/api/admin/finance/activities?transactionId=${transactionId}&source=${source}`),
        authFetch(`/api/admin/finance/notes?transactionId=${transactionId}&source=${source}`),
      ]);

      const [activitiesData, notesData] = await Promise.all([
        activitiesRes.json(),
        notesRes.json(),
      ]);

      if (activitiesData.success) setActivities(activitiesData.activities || []);
      if (notesData.success) setNotes(notesData.notes || []);
    } catch (err) {
      console.error('Failed to load payment CRM data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addNote = useCallback(async (
    transactionId: string,
    source: string,
    content: string,
    category: string
  ): Promise<boolean> => {
    try {
      const response = await authPost('/api/admin/finance/notes', {
        transactionId,
        source,
        content,
        category,
      });

      const data = await response.json();
      if (data.success && data.note) {
        setNotes(prev => [data.note, ...prev]);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to add note:', err);
      return false;
    }
  }, []);

  const deleteNote = useCallback(async (
    transactionId: string,
    source: string,
    noteId: string
  ): Promise<boolean> => {
    try {
      const response = await authDelete(
        `/api/admin/finance/notes?transactionId=${transactionId}&source=${source}&noteId=${noteId}`
      );

      const data = await response.json();
      if (data.success) {
        setNotes(prev => prev.filter(n => n.id !== noteId));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete note:', err);
      return false;
    }
  }, []);

  return { activities, notes, loading, load, addNote, deleteNote };
}

// ============== MEMBER SEARCH HOOK ==============

interface UseMemberSearchResult {
  results: MemberSearchResult[];
  searching: boolean;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

/**
 * Hook for searching members (used in finance tab for linking payments)
 */
export function useMemberSearch(): UseMemberSearchResult {
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await authFetch(`/api/admin/search?q=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();

      if (data.success) {
        setResults(data.accounts || []);
      }
    } catch (err) {
      console.error('Member search failed:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
  }, []);

  return { results, searching, search, clear };
}

// ============== SPONSORS HOOK ==============

interface UseSponsorsResult {
  sponsors: Sponsor[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for sponsors data
 */
export function useSponsors(): UseSponsorsResult {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSponsors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/admin/sponsors');
      const data = await response.json();
      if (data.success) {
        setSponsors(data.sponsors || []);
      }
    } catch (err) {
      console.error('Error loading sponsors:', err);
      setError('Failed to load sponsors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSponsors();
  }, [loadSponsors]);

  return { sponsors, loading, error, refetch: loadSponsors };
}

// ============== BIO REVIEW HOOK ==============

interface UseBioReviewResult {
  pendingAccounts: PendingReviewAccount[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  approveBio: (accountId: string) => Promise<boolean>;
  rejectBio: (accountId: string, reason: string) => Promise<boolean>;
  approveLogo: (accountId: string) => Promise<boolean>;
  rejectLogo: (accountId: string, reason: string) => Promise<boolean>;
}

/**
 * Hook for bio/logo review workflow
 */
export function useBioReview(): UseBioReviewResult {
  const [pendingAccounts, setPendingAccounts] = useState<PendingReviewAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/admin/bio-review');
      const data = await response.json();
      if (data.success) {
        setPendingAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Error loading pending reviews:', err);
      setError('Failed to load pending reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const approveBio = useCallback(async (accountId: string): Promise<boolean> => {
    try {
      const response = await authPost('/api/admin/bio-review', {
        accountId,
        action: 'approve_bio',
      });
      const data = await response.json();
      if (data.success) {
        await loadPending();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to approve bio:', err);
      return false;
    }
  }, [loadPending]);

  const rejectBio = useCallback(async (accountId: string, reason: string): Promise<boolean> => {
    try {
      const response = await authPost('/api/admin/bio-review', {
        accountId,
        action: 'reject_bio',
        reason,
      });
      const data = await response.json();
      if (data.success) {
        await loadPending();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to reject bio:', err);
      return false;
    }
  }, [loadPending]);

  const approveLogo = useCallback(async (accountId: string): Promise<boolean> => {
    try {
      const response = await authPost('/api/admin/bio-review', {
        accountId,
        action: 'approve_logo',
      });
      const data = await response.json();
      if (data.success) {
        await loadPending();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to approve logo:', err);
      return false;
    }
  }, [loadPending]);

  const rejectLogo = useCallback(async (accountId: string, reason: string): Promise<boolean> => {
    try {
      const response = await authPost('/api/admin/bio-review', {
        accountId,
        action: 'reject_logo',
        reason,
      });
      const data = await response.json();
      if (data.success) {
        await loadPending();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to reject logo:', err);
      return false;
    }
  }, [loadPending]);

  return {
    pendingAccounts,
    loading,
    error,
    refetch: loadPending,
    approveBio,
    rejectBio,
    approveLogo,
    rejectLogo,
  };
}
