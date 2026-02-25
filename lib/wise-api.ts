/**
 * Wise API Client
 * Handles all interactions with the Wise (TransferWise) API
 * Docs: https://docs.wise.com/api-docs/api-reference
 */

// ==========================================
// TYPES
// ==========================================

export interface WiseProfile {
  id: number;
  type: 'personal' | 'business';
  details: {
    name?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    companyType?: string;
  };
}

export interface WiseBalance {
  id: number;
  currency: string;
  amount: {
    value: number;
    currency: string;
  };
  reservedAmount: {
    value: number;
    currency: string;
  };
  bankDetails?: {
    bankCode?: string;
    accountNumber?: string;
    iban?: string;
    bic?: string;
  };
}

export interface WiseTransfer {
  id: number;
  user: number;
  targetAccount: number;
  sourceAccount?: number;
  quote?: number;
  quoteUuid?: string;
  status: WiseTransferStatus;
  reference?: string;
  rate: number;
  created: string;
  business?: number;
  transferRequest?: number;
  details: {
    reference?: string;
  };
  hasActiveIssues: boolean;
  sourceCurrency: string;
  sourceValue: number;
  targetCurrency: string;
  targetValue: number;
  customerTransactionId?: string;
}

export type WiseTransferStatus =
  | 'incoming_payment_waiting'
  | 'incoming_payment_initiated'
  | 'processing'
  | 'funds_converted'
  | 'outgoing_payment_sent'
  | 'cancelled'
  | 'funds_refunded'
  | 'bounced_back'
  | 'charged_back'
  | 'unknown';

export interface WiseStatement {
  accountHolder: {
    type: string;
    address: {
      addressFirstLine: string;
      city: string;
      postCode: string;
      stateCode?: string;
      countryName: string;
    };
    firstName?: string;
    lastName?: string;
    fullName: string;
  };
  issuer: {
    name: string;
    firstLine: string;
    city: string;
    postCode: string;
    stateCode?: string;
    country: string;
  };
  bankDetails?: any;
  transactions: WiseTransaction[];
  startOfStatementBalance: {
    value: number;
    currency: string;
  };
  endOfStatementBalance: {
    value: number;
    currency: string;
  };
  query: {
    intervalStart: string;
    intervalEnd: string;
    currency: string;
    accountId: number;
  };
}

export interface WiseTransaction {
  type: string;
  date: string;
  amount: {
    value: number;
    currency: string;
  };
  totalFees: {
    value: number;
    currency: string;
  };
  details: {
    type: string;
    description: string;
    senderName?: string;
    senderAccount?: string;
    paymentReference?: string;
    category?: string;
    merchant?: {
      name: string;
      category: string;
      city: string;
      country: string;
    };
  };
  exchangeDetails?: {
    toAmount: {
      value: number;
      currency: string;
    };
    fromAmount: {
      value: number;
      currency: string;
    };
    rate: number;
  };
  runningBalance: {
    value: number;
    currency: string;
  };
  referenceNumber: string;
}

// ==========================================
// CLIENT
// ==========================================

class WiseClient {
  private apiKey: string;
  private baseUrl: string;
  private profileId: string;

  constructor() {
    const apiKey = process.env.WISE_API_KEY;
    const profileId = process.env.WISE_PROFILE_ID;
    const environment = process.env.WISE_ENVIRONMENT || 'production';

    if (!apiKey) {
      throw new Error('WISE_API_KEY environment variable is not set');
    }
    if (!profileId) {
      throw new Error('WISE_PROFILE_ID environment variable is not set');
    }

    this.apiKey = apiKey;
    this.profileId = profileId;
    this.baseUrl =
      environment === 'production'
        ? 'https://api.wise.com'
        : 'https://api.sandbox.wise.com';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Wise API error: ${response.status} - ${errorText}`);
      throw new Error(`Wise API error: ${response.status} - ${response.statusText}`);
    }

    return response.json();
  }

  // ==========================================
  // PROFILE
  // ==========================================

  async getProfiles(): Promise<WiseProfile[]> {
    return this.request<WiseProfile[]>('/v1/profiles');
  }

  async getProfile(): Promise<WiseProfile> {
    return this.request<WiseProfile>(`/v1/profiles/${this.profileId}`);
  }

  // ==========================================
  // BALANCES
  // ==========================================

  async getBalances(): Promise<WiseBalance[]> {
    const response = await this.request<any>(
      `/v4/profiles/${this.profileId}/balances?types=STANDARD`
    );
    return response;
  }

  async getBalance(currency: string): Promise<WiseBalance | null> {
    const balances = await this.getBalances();
    return balances.find((b) => b.currency === currency) || null;
  }

  // ==========================================
  // TRANSFERS
  // ==========================================

  async getTransfers(params?: {
    limit?: number;
    offset?: number;
    createdDateStart?: string;
    createdDateEnd?: string;
    status?: WiseTransferStatus;
  }): Promise<WiseTransfer[]> {
    const queryParams = new URLSearchParams();
    queryParams.set('profile', this.profileId);

    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.createdDateStart)
      queryParams.set('createdDateStart', params.createdDateStart);
    if (params?.createdDateEnd)
      queryParams.set('createdDateEnd', params.createdDateEnd);
    if (params?.status) queryParams.set('status', params.status);

    return this.request<WiseTransfer[]>(`/v1/transfers?${queryParams.toString()}`);
  }

  async getTransfer(transferId: number): Promise<WiseTransfer> {
    return this.request<WiseTransfer>(`/v1/transfers/${transferId}`);
  }

  // ==========================================
  // STATEMENTS (requires balance statement scope)
  // ==========================================

  async getStatement(params: {
    currency: string;
    intervalStart: string;
    intervalEnd: string;
    balanceId: number;
  }): Promise<WiseStatement> {
    const queryParams = new URLSearchParams();
    queryParams.set('currency', params.currency);
    queryParams.set('intervalStart', params.intervalStart);
    queryParams.set('intervalEnd', params.intervalEnd);
    queryParams.set('type', 'COMPACT');

    const url = `/v1/profiles/${this.profileId}/balance-statements/${params.balanceId}/statement.json?${queryParams.toString()}`;

    return this.request<WiseStatement>(url);
  }

  // ==========================================
  // ACTIVITIES (works with read-only tokens)
  // ==========================================

  async getActivities(params?: {
    since?: string;
    until?: string;
    size?: number;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.since) queryParams.set('since', params.since);
    if (params?.until) queryParams.set('until', params.until);
    queryParams.set('size', String(params?.size || 100));

    const url = `/v1/profiles/${this.profileId}/activities?${queryParams.toString()}`;
    return this.request<any>(url);
  }

  // ==========================================
  // INCOMING PAYMENTS (for matching)
  // ==========================================

  /**
   * Parse Wise's formatted amount string like "1,500.00 EUR" or "150 JPY"
   * Returns { value: number, currency: string }
   */
  private parseAmountString(amountStr: string | undefined): { value: number; currency: string } | null {
    if (!amountStr || typeof amountStr !== 'string') return null;

    // Match pattern: optional negative, numbers with optional commas/dots, then currency code
    // Examples: "1,500.00 EUR", "150 JPY", "-500.00 GBP", "1.234,56 EUR" (European format)
    const match = amountStr.match(/^(-?)([0-9.,]+)\s*([A-Z]{3})$/);
    if (!match) return null;

    const [, negative, numPart, currency] = match;

    // Handle both US (1,234.56) and European (1.234,56) number formats
    let cleanNum = numPart;
    // If there's a comma after a dot, it's European format (1.234,56)
    if (numPart.includes('.') && numPart.includes(',') && numPart.lastIndexOf(',') > numPart.lastIndexOf('.')) {
      cleanNum = numPart.replace(/\./g, '').replace(',', '.');
    } else {
      // US format or simple number - just remove commas
      cleanNum = numPart.replace(/,/g, '');
    }

    const value = parseFloat(cleanNum);
    if (isNaN(value)) return null;

    return { value: negative ? -value : value, currency };
  }

  async getIncomingPayments(params?: {
    currency?: string;
    from?: string;
    to?: string;
  }): Promise<{ transactions: WiseTransaction[]; debug: string[] }> {
    const debug: string[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const since = params?.from || thirtyDaysAgo.toISOString();
    const until = params?.to || now.toISOString();

    debug.push(`Querying activities from ${since.split('T')[0]} to ${until.split('T')[0]}`);

    try {
      // Try the activities endpoint first (works with read-only tokens)
      const activities = await this.getActivities({ since, until, size: 100 });
      debug.push(`Got ${activities?.activities?.length || 0} activities`);

      const allTransactions: WiseTransaction[] = [];

      // Log first few activities to understand the data structure
      const sampleActivities = (activities?.activities || []).slice(0, 3).map((a: any) =>
        `${a.type}: "${a.primaryAmount}" (title: ${a.title?.substring(0, 30)})`
      );
      if (sampleActivities.length > 0) {
        debug.push(`Samples: ${sampleActivities.join(' | ')}`);
      }

      // Convert activities to our transaction format
      // TRANSFER type = incoming bank transfers
      for (const activity of activities?.activities || []) {
        // Include TRANSFER types (incoming bank transfers)
        if (activity.type === 'TRANSFER') {
          const parsed = this.parseAmountString(activity.primaryAmount);

          if (parsed && parsed.value > 0) {
            // Strip HTML tags from title for sender name
            const senderName = (activity.title || '').replace(/<[^>]*>/g, '').trim();

            const tx: WiseTransaction = {
              type: activity.type,
              date: activity.createdOn,
              amount: {
                value: parsed.value,
                currency: parsed.currency,
              },
              totalFees: { value: 0, currency: parsed.currency },
              details: {
                type: activity.type,
                description: activity.description || '',
                senderName: senderName,
                paymentReference: activity.resource?.id?.toString() || '',
              },
              runningBalance: { value: 0, currency: parsed.currency },
              referenceNumber: activity.resource?.id?.toString() || activity.id,
            };
            allTransactions.push(tx);
          }
        }
      }

      debug.push(`Found ${allTransactions.length} incoming TRANSFER payments`);

      // Sort by date descending
      const sorted = allTransactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return { transactions: sorted, debug };
    } catch (activitiesError: any) {
      debug.push(`Activities API failed: ${activitiesError.message}`);

      // Fall back to trying balance statements
      try {
        const balances = await this.getBalances();
        debug.push(`Fallback: Got ${balances.length} balances`);

        const currencies = params?.currency ? [params.currency] : ['EUR', 'GBP', 'USD'];
        const allTransactions: WiseTransaction[] = [];

        for (const currency of currencies) {
          const balance = balances.find((b) => b.currency === currency);
          if (!balance) continue;

          try {
            const statement = await this.getStatement({
              currency,
              intervalStart: since,
              intervalEnd: until,
              balanceId: balance.id,
            });

            const incoming = statement.transactions.filter((t) => t.amount.value > 0);
            debug.push(`${currency}: ${incoming.length} incoming`);
            allTransactions.push(...incoming);
          } catch (stmtError: any) {
            debug.push(`${currency} statement failed: ${stmtError.message}`);
          }
        }

        const sorted = allTransactions.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return { transactions: sorted, debug };
      } catch (fallbackError: any) {
        debug.push(`Fallback also failed: ${fallbackError.message}`);
        return { transactions: [], debug };
      }
    }
  }
}

// ==========================================
// SINGLETON INSTANCE
// ==========================================

let wiseClient: WiseClient | null = null;

export function getWiseClient(): WiseClient {
  if (!wiseClient) {
    wiseClient = new WiseClient();
  }
  return wiseClient;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Match a Wise transaction to an invoice by reference
 * Invoice numbers are expected in the reference field
 */
export function matchTransactionToInvoice(
  transaction: WiseTransaction,
  invoiceNumbers: string[]
): string | null {
  const reference = (
    transaction.details.paymentReference ||
    transaction.details.description ||
    ''
  ).toUpperCase();

  for (const invoiceNumber of invoiceNumbers) {
    if (reference.includes(invoiceNumber.toUpperCase())) {
      return invoiceNumber;
    }
  }

  return null;
}

/**
 * Format Wise transfer status for display
 */
export function formatWiseStatus(status: WiseTransferStatus): string {
  const statusMap: Record<WiseTransferStatus, string> = {
    incoming_payment_waiting: 'Waiting for Payment',
    incoming_payment_initiated: 'Payment Initiated',
    processing: 'Processing',
    funds_converted: 'Funds Converted',
    outgoing_payment_sent: 'Payment Sent',
    cancelled: 'Cancelled',
    funds_refunded: 'Refunded',
    bounced_back: 'Bounced Back',
    charged_back: 'Charged Back',
    unknown: 'Unknown',
  };

  return statusMap[status] || status;
}
