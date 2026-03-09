import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';
import { verifyAdminAccess, isAuthError } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

interface SearchFilters {
  organizationType?: string[];
  status?: string[];
  country?: string[];
  hasUnpaidInvoice?: boolean;
  createdAfter?: string;
  createdBefore?: string;
}

interface PaginationOptions {
  limit: number;
  cursor?: string; // Last document ID for cursor-based pagination
  offset?: number; // Alternative: offset-based pagination (less efficient but simpler)
}

/**
 * POST: Advanced search across accounts with pagination
 *
 * Optimizations:
 * - Uses cursor-based pagination to avoid loading all accounts
 * - Only fetches member/invoice data for accounts that pass filters
 * - Returns minimal data by default, with option to include stats
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const {
      query,
      filters,
      limit = 50,
      cursor,
      includeStats = false, // Only fetch invoice stats if requested
    } = body as {
      query?: string;
      filters?: SearchFilters;
      limit?: number;
      cursor?: string;
      includeStats?: boolean;
    };

    const searchQuery = query?.toLowerCase().trim() || '';
    const pageSize = Math.min(limit, 100); // Cap at 100

    // Build Firestore query with filters that can be applied at query level
    let accountsQuery = adminDb.collection('accounts').orderBy('organizationName');

    // Apply status filter at query level if single value
    if (filters?.status?.length === 1) {
      accountsQuery = accountsQuery.where('status', '==', filters.status[0]);
    }

    // Apply organization type filter at query level if single value
    if (filters?.organizationType?.length === 1) {
      accountsQuery = accountsQuery.where('organizationType', '==', filters.organizationType[0]);
    }

    // Apply cursor for pagination
    if (cursor) {
      const cursorDoc = await adminDb.collection('accounts').doc(cursor).get();
      if (cursorDoc.exists) {
        accountsQuery = accountsQuery.startAfter(cursorDoc);
      }
    }

    // Fetch more than needed to account for client-side filtering
    // If we have text search or complex filters, we need to over-fetch
    const needsClientFilter = searchQuery ||
      (filters?.status?.length && filters.status.length > 1) ||
      (filters?.organizationType?.length && filters.organizationType.length > 1) ||
      filters?.country?.length ||
      filters?.createdAfter ||
      filters?.createdBefore ||
      filters?.hasUnpaidInvoice !== undefined;

    const fetchLimit = needsClientFilter ? pageSize * 3 : pageSize;
    const accountsSnapshot = await accountsQuery.limit(fetchLimit).get();

    const results: any[] = [];
    let lastDocId: string | null = null;

    for (const accountDoc of accountsSnapshot.docs) {
      if (results.length >= pageSize) break;

      const accountData = accountDoc.data();
      lastDocId = accountDoc.id;

      // Apply client-side filters
      if (filters?.organizationType?.length && filters.organizationType.length > 1) {
        if (!filters.organizationType.includes(accountData.organizationType)) {
          continue;
        }
      }

      if (filters?.status?.length && filters.status.length > 1) {
        if (!filters.status.includes(accountData.status)) {
          continue;
        }
      }

      if (filters?.country?.length) {
        const country = accountData.registeredAddress?.country;
        if (!country || !filters.country.includes(country)) {
          continue;
        }
      }

      if (filters?.createdAfter) {
        const createdAt = accountData.createdAt?.toDate?.();
        if (!createdAt || createdAt < new Date(filters.createdAfter)) {
          continue;
        }
      }

      if (filters?.createdBefore) {
        const createdAt = accountData.createdAt?.toDate?.();
        if (!createdAt || createdAt > new Date(filters.createdBefore)) {
          continue;
        }
      }

      // Apply text search
      if (searchQuery) {
        const searchableFields = [
          accountData.organizationName,
          accountData.primaryContact?.email,
          accountData.primaryContact?.name,
          accountData.registeredAddress?.country,
          accountData.organizationType,
        ]
          .filter(Boolean)
          .map((f) => f.toLowerCase());

        const matches = searchableFields.some((field) =>
          field.includes(searchQuery)
        );

        if (!matches) {
          // Search in members - this is expensive but necessary for member search
          const membersSnapshot = await accountDoc.ref.collection('members').get();
          const memberMatches = membersSnapshot.docs.some((memberDoc) => {
            const memberData = memberDoc.data();
            const memberFields = [
              memberData.email,
              memberData.personalName,
              memberData.jobTitle,
            ]
              .filter(Boolean)
              .map((f) => f.toLowerCase());
            return memberFields.some((f) => f.includes(searchQuery));
          });

          if (!memberMatches) {
            continue;
          }
        }
      }

      // Check for unpaid invoices if filter is set
      let hasUnpaidInvoice = false;
      if (filters?.hasUnpaidInvoice !== undefined) {
        const invoicesSnapshot = await adminDb
          .collection('invoices')
          .where('accountId', '==', accountDoc.id)
          .where('status', '!=', 'paid')
          .limit(1)
          .get();

        hasUnpaidInvoice = !invoicesSnapshot.empty;

        if (filters.hasUnpaidInvoice && !hasUnpaidInvoice) {
          continue;
        }
        if (!filters.hasUnpaidInvoice && hasUnpaidInvoice) {
          continue;
        }
      }

      // Build result object
      const result: any = {
        id: accountDoc.id,
        organizationName: accountData.organizationName,
        organizationType: accountData.organizationType,
        status: accountData.status,
        country: accountData.registeredAddress?.country,
        primaryContact: accountData.primaryContact,
        hasUnpaidInvoice,
        createdAt: accountData.createdAt?.toDate?.()?.toISOString() || null,
        logoURL: accountData.logoURL,
      };

      // Only fetch stats if requested (reduces queries significantly)
      if (includeStats) {
        const [membersSnapshot, invoicesSnapshot] = await Promise.all([
          accountDoc.ref.collection('members').get(),
          adminDb.collection('invoices').where('accountId', '==', accountDoc.id).get(),
        ]);

        result.memberCount = membersSnapshot.size;

        const invoiceStats = {
          total: invoicesSnapshot.size,
          paid: 0,
          unpaid: 0,
          totalAmount: 0,
          paidAmount: 0,
        };

        invoicesSnapshot.docs.forEach((invoiceDoc) => {
          const invoiceData = invoiceDoc.data();
          invoiceStats.totalAmount += invoiceData.amount || 0;
          if (invoiceData.status === 'paid') {
            invoiceStats.paid++;
            invoiceStats.paidAmount += invoiceData.amount || 0;
          } else {
            invoiceStats.unpaid++;
          }
        });

        result.invoiceStats = invoiceStats;
        result.updatedAt = accountData.updatedAt?.toDate?.()?.toISOString() || null;
      }

      results.push(result);
    }

    // Determine if there are more results
    const hasMore = accountsSnapshot.docs.length === fetchLimit && results.length === pageSize;

    return NextResponse.json({
      success: true,
      results,
      pagination: {
        limit: pageSize,
        count: results.length,
        hasMore,
        nextCursor: hasMore ? lastDocId : null,
      },
      query: searchQuery,
      filters,
    });
  } catch (error: any) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}

/**
 * GET: Quick search by query string with pagination
 *
 * Optimized for typeahead/autocomplete use cases.
 * Returns minimal data for fast responses.
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase().trim() || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const cursor = searchParams.get('cursor');

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
        message: 'Query too short (minimum 2 characters)',
      });
    }

    // Build query with cursor support
    let accountsQuery = adminDb.collection('accounts').orderBy('organizationName');

    if (cursor) {
      const cursorDoc = await adminDb.collection('accounts').doc(cursor).get();
      if (cursorDoc.exists) {
        accountsQuery = accountsQuery.startAfter(cursorDoc);
      }
    }

    // Fetch more than needed since we filter client-side
    const fetchLimit = limit * 3;
    const accountsSnapshot = await accountsQuery.limit(fetchLimit).get();

    const results: any[] = [];
    let lastDocId: string | null = null;

    for (const accountDoc of accountsSnapshot.docs) {
      if (results.length >= limit) break;

      const data = accountDoc.data();
      lastDocId = accountDoc.id;

      const searchableText = [
        data.organizationName,
        data.primaryContact?.email,
        data.primaryContact?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (searchableText.includes(query)) {
        results.push({
          id: accountDoc.id,
          type: 'account',
          organizationName: data.organizationName,
          organizationType: data.organizationType,
          status: data.status,
          primaryContact: data.primaryContact,
        });
      }
    }

    const hasMore = accountsSnapshot.docs.length === fetchLimit && results.length === limit;

    return NextResponse.json({
      success: true,
      results,
      pagination: {
        count: results.length,
        hasMore,
        nextCursor: hasMore ? lastDocId : null,
      },
    });
  } catch (error: any) {
    console.error('Error in quick search:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
