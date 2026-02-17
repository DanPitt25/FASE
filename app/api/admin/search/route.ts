import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let admin: any;
let db: FirebaseFirestore.Firestore;

const initializeFirebase = async () => {
  if (!admin) {
    admin = await import('firebase-admin');

    if (admin.apps.length === 0) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
      }

      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }

    db = admin.firestore();
  }

  return { admin, db };
};

interface SearchFilters {
  organizationType?: string[];
  status?: string[];
  country?: string[];
  hasUnpaidInvoice?: boolean;
  createdAfter?: string;
  createdBefore?: string;
}

/**
 * POST: Advanced search across accounts, members, and invoices
 */
export async function POST(request: NextRequest) {
  try {
    const { db } = await initializeFirebase();

    const body = await request.json();
    const { query, filters, limit = 50 } = body as {
      query?: string;
      filters?: SearchFilters;
      limit?: number;
    };

    const searchQuery = query?.toLowerCase().trim() || '';

    // Get all accounts
    const accountsSnapshot = await db.collection('accounts').get();

    const results: any[] = [];

    for (const accountDoc of accountsSnapshot.docs) {
      const accountData = accountDoc.data();

      // Apply filters
      if (filters?.organizationType?.length) {
        if (!filters.organizationType.includes(accountData.organizationType)) {
          continue;
        }
      }

      if (filters?.status?.length) {
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
          // Also search in members
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
        const invoicesSnapshot = await db
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

      // Get member count
      const membersSnapshot = await accountDoc.ref.collection('members').get();

      // Get invoice stats
      const invoicesSnapshot = await db
        .collection('invoices')
        .where('accountId', '==', accountDoc.id)
        .get();

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

      results.push({
        id: accountDoc.id,
        organizationName: accountData.organizationName,
        organizationType: accountData.organizationType,
        status: accountData.status,
        country: accountData.registeredAddress?.country,
        primaryContact: accountData.primaryContact,
        memberCount: membersSnapshot.size,
        invoiceStats,
        hasUnpaidInvoice,
        createdAt: accountData.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: accountData.updatedAt?.toDate?.()?.toISOString() || null,
        logoURL: accountData.logoURL,
      });
    }

    // Sort by organization name
    results.sort((a, b) =>
      (a.organizationName || '').localeCompare(b.organizationName || '')
    );

    return NextResponse.json({
      success: true,
      results: results.slice(0, limit),
      total: results.length,
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
 * GET: Quick search by query string
 */
export async function GET(request: NextRequest) {
  try {
    const { db } = await initializeFirebase();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase().trim() || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
        message: 'Query too short (minimum 2 characters)',
      });
    }

    const accountsSnapshot = await db.collection('accounts').get();

    const results: any[] = [];

    for (const accountDoc of accountsSnapshot.docs) {
      const data = accountDoc.data();

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

      if (results.length >= limit) break;
    }

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error: any) {
    console.error('Error in quick search:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
