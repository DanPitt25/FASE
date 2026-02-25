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
  // STATEMENTS
  // ==========================================

  async getStatement(params: {
    currency: string;
    intervalStart: string;
    intervalEnd: string;
    balanceId: number; // Now required - caller must provide
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
  // INCOMING PAYMENTS (for matching)
  // ==========================================

  async getIncomingPayments(params?: {
    currency?: string;
    from?: string;
    to?: string;
  }): Promise<{ transactions: WiseTransaction[]; debug: string[] }> {
    const debug: string[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get balances ONCE upfront
    const balances = await this.getBalances();
    debug.push(`Got ${balances.length} balances: ${balances.map(b => `${b.currency}(id:${b.id})`).join(', ')}`);

    const currencies = params?.currency
      ? [params.currency]
      : ['EUR', 'GBP', 'USD'];

    const intervalStart = params?.from || thirtyDaysAgo.toISOString();
    const intervalEnd = params?.to || now.toISOString();

    // Query all currencies in parallel
    const results = await Promise.allSettled(
      currencies.map(async (currency) => {
        const balance = balances.find((b) => b.currency === currency);
        if (!balance) {
          return { currency, error: `No balance for ${currency}` };
        }

        debug.push(`${currency}: Querying ${intervalStart.split('T')[0]} to ${intervalEnd.split('T')[0]}`);

        const statement = await this.getStatement({
          currency,
          intervalStart,
          intervalEnd,
          balanceId: balance.id,
        });

        return { currency, statement };
      })
    );

    const allTransactions: WiseTransaction[] = [];

    for (const result of results) {
      if (result.status === 'rejected') {
        debug.push(`Error: ${result.reason}`);
        continue;
      }

      const { currency, statement, error } = result.value as any;
      if (error) {
        debug.push(error);
        continue;
      }

      debug.push(`${currency}: ${statement.transactions.length} total, ${statement.transactions.filter((t: any) => t.amount.value > 0).length} incoming`);

      // Filter for incoming payments (positive amounts)
      const incoming = statement.transactions.filter(
        (t: WiseTransaction) => t.amount.value > 0
      );

      allTransactions.push(...incoming);
    }

    // Sort by date descending
    const sorted = allTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return { transactions: sorted, debug };
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
