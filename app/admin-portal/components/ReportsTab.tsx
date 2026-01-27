'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Button from '../../../components/Button';
import { getLineOfBusinessDisplay } from '../../../lib/lines-of-business';

// Country code to name mapping
const countryNames: Record<string, string> = {
  'AT': 'Austria', 'BE': 'Belgium', 'BG': 'Bulgaria', 'HR': 'Croatia',
  'CY': 'Cyprus', 'CZ': 'Czech Republic', 'DK': 'Denmark', 'EE': 'Estonia',
  'FI': 'Finland', 'FR': 'France', 'DE': 'Germany', 'GR': 'Greece',
  'HU': 'Hungary', 'IE': 'Ireland', 'IT': 'Italy', 'LV': 'Latvia',
  'LT': 'Lithuania', 'LU': 'Luxembourg', 'MT': 'Malta', 'NL': 'Netherlands',
  'PL': 'Poland', 'PT': 'Portugal', 'RO': 'Romania', 'SK': 'Slovakia',
  'SI': 'Slovenia', 'ES': 'Spain', 'SE': 'Sweden', 'GB': 'United Kingdom',
  'CH': 'Switzerland', 'NO': 'Norway', 'IS': 'Iceland', 'LI': 'Liechtenstein'
};

// Service provider categories
const serviceLabels: Record<string, string> = {
  'actuarial': 'Actuarial',
  'claims': 'Claims Management',
  'compliance': 'Compliance',
  'consulting': 'Consulting',
  'data': 'Data & Analytics',
  'finance': 'Finance & Accounting',
  'hr': 'HR & Recruitment',
  'it': 'IT & Technology',
  'legal': 'Legal',
  'marketing': 'Marketing',
  'operations': 'Operations',
  'pricing': 'Pricing',
  'reinsurance': 'Reinsurance',
  'risk': 'Risk Management',
  'underwriting': 'Underwriting Support',
  'other': 'Other'
};

interface AccountData {
  id: string;
  organizationName: string;
  organizationType: 'MGA' | 'carrier' | 'provider';
  status: string;
  businessAddress?: {
    country?: string;
    city?: string;
    line1?: string;
  };
  registeredAddress?: {
    country?: string;
  };
  portfolio?: {
    grossWrittenPremiums?: string;
    grossWrittenPremiumsValue?: number;
    grossWrittenPremiumsCurrency?: string;
    grossWrittenPremiumsEUR?: number;
    linesOfBusiness?: string[];
    markets?: string[];
    otherLinesOfBusiness?: { other1?: string; other2?: string; other3?: string };
  };
  carrierInfo?: {
    organizationType?: string;
    isDelegatingInEurope?: string;
    numberOfMGAs?: string;
    delegatingCountries?: string[];
    frontingOptions?: string;
    considerStartupMGAs?: string;
    amBestRating?: string;
    otherRating?: string;
  };
  servicesProvided?: string[];
  hasOtherAssociations?: boolean;
  otherAssociations?: string[];
  createdAt?: any;
}

interface ReportData {
  // Totals
  totalAccounts: number;
  mgas: AccountData[];
  carriers: AccountData[];
  providers: AccountData[];

  // By organization type
  byOrganizationType: Record<string, number>;

  // By status
  byStatus: Record<string, number>;

  // By country (from businessAddress)
  byCountry: Record<string, number>;

  // By other associations
  byAssociation: Record<string, number>;
  withAssociations: number;

  // MGA-specific
  mgaByGWPBand: Record<string, number>;
  mgaByLinesOfBusiness: Record<string, number>;
  mgaByMarket: Record<string, number>;
  mgaTotalGWP: number;

  // Carrier-specific
  carrierByFronting: Record<string, number>;
  carrierByRating: Record<string, number>;
  carrierByStartupMGA: Record<string, number>;
  carrierDelegatingCountries: Record<string, number>;

  // Provider-specific
  providerByService: Record<string, number>;
}

type ReportView = 'summary' | 'mga' | 'carrier' | 'provider';
type StatusFilter = 'all' | 'approved' | 'pending' | 'invoice_sent' | 'pending_invoice' | 'paid' | 'flagged' | 'rejected';
type TypeFilter = 'all' | 'MGA' | 'carrier' | 'provider';

export default function ReportsTab() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeView, setActiveView] = useState<ReportView>('summary');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [allAccounts, setAllAccounts] = useState<AccountData[]>([]);

  useEffect(() => {
    loadAccounts();
  }, []);

  // Recalculate report data when filters change
  useEffect(() => {
    if (allAccounts.length > 0) {
      const filtered = calculateReportData(allAccounts, statusFilter, typeFilter);
      setReportData(filtered);
    }
  }, [allAccounts, statusFilter, typeFilter]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const accountsRef = collection(db, 'accounts');
      const snapshot = await getDocs(accountsRef);

      const accounts: AccountData[] = snapshot.docs.map((doc) => ({
        ...doc.data() as AccountData,
        id: doc.id
      }));

      setAllAccounts(accounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateReportData = (
    accounts: AccountData[],
    status: StatusFilter,
    type: TypeFilter
  ): ReportData => {
    // Apply filters
    let filtered = accounts;

    if (status !== 'all') {
      filtered = filtered.filter((a) => a.status === status);
    }

    if (type !== 'all') {
      filtered = filtered.filter((a) => a.organizationType === type);
    }

    const mgas: AccountData[] = [];
    const carriers: AccountData[] = [];
    const providers: AccountData[] = [];
    const byOrganizationType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const byAssociation: Record<string, number> = {};
    let withAssociations = 0;

    // MGA-specific aggregations
    const mgaByGWPBand: Record<string, number> = {};
    const mgaByLinesOfBusiness: Record<string, number> = {};
    const mgaByMarket: Record<string, number> = {};
    let mgaTotalGWP = 0;

    // Carrier-specific aggregations
    const carrierByFronting: Record<string, number> = {};
    const carrierByRating: Record<string, number> = {};
    const carrierByStartupMGA: Record<string, number> = {};
    const carrierDelegatingCountries: Record<string, number> = {};

    // Provider-specific aggregations
    const providerByService: Record<string, number> = {};

    filtered.forEach((account) => {
      // Count by status (all accounts)
      const accountStatus = account.status || 'unknown';
      byStatus[accountStatus] = (byStatus[accountStatus] || 0) + 1;

      // Count by organization type
      const orgType = account.organizationType || 'Unknown';
      byOrganizationType[orgType] = (byOrganizationType[orgType] || 0) + 1;

      // Count by country - check businessAddress first, fall back to registeredAddress
      const country = account.businessAddress?.country || account.registeredAddress?.country;
      if (country) {
        const countryName = countryNames[country] || country;
        byCountry[countryName] = (byCountry[countryName] || 0) + 1;
      } else {
        byCountry['Not Specified'] = (byCountry['Not Specified'] || 0) + 1;
      }

      // Count associations
      if (account.hasOtherAssociations && account.otherAssociations?.length) {
        withAssociations++;
        account.otherAssociations.forEach((assoc) => {
          byAssociation[assoc] = (byAssociation[assoc] || 0) + 1;
        });
      }

      // Categorize by type
      if (orgType === 'MGA') {
        mgas.push(account);

        // GWP Band
        if (account.portfolio?.grossWrittenPremiums) {
          const band = account.portfolio.grossWrittenPremiums;
          mgaByGWPBand[band] = (mgaByGWPBand[band] || 0) + 1;
        }

        // Total GWP (in EUR)
        if (account.portfolio?.grossWrittenPremiumsEUR) {
          mgaTotalGWP += account.portfolio.grossWrittenPremiumsEUR;
        }

        // Lines of Business - always use English labels
        if (account.portfolio?.linesOfBusiness) {
          account.portfolio.linesOfBusiness.forEach((lob) => {
            // Map raw key to English label, fallback to formatted key if not found
            const label = getLineOfBusinessDisplay(lob, 'en');
            mgaByLinesOfBusiness[label] = (mgaByLinesOfBusiness[label] || 0) + 1;
          });
        }

        // Markets
        if (account.portfolio?.markets) {
          account.portfolio.markets.forEach((market) => {
            const marketName = countryNames[market] || market;
            mgaByMarket[marketName] = (mgaByMarket[marketName] || 0) + 1;
          });
        }
      } else if (orgType === 'carrier') {
        carriers.push(account);

        // Fronting options
        if (account.carrierInfo?.frontingOptions) {
          const fronting = account.carrierInfo.frontingOptions;
          carrierByFronting[fronting] = (carrierByFronting[fronting] || 0) + 1;
        }

        // AM Best Rating
        if (account.carrierInfo?.amBestRating) {
          const rating = account.carrierInfo.amBestRating;
          carrierByRating[rating] = (carrierByRating[rating] || 0) + 1;
        }

        // Considers Startup MGAs
        if (account.carrierInfo?.considerStartupMGAs) {
          const startup = account.carrierInfo.considerStartupMGAs;
          carrierByStartupMGA[startup] = (carrierByStartupMGA[startup] || 0) + 1;
        }

        // Delegating Countries
        if (account.carrierInfo?.delegatingCountries) {
          account.carrierInfo.delegatingCountries.forEach((c) => {
            const countryName = countryNames[c] || c;
            carrierDelegatingCountries[countryName] = (carrierDelegatingCountries[countryName] || 0) + 1;
          });
        }
      } else if (orgType === 'provider') {
        providers.push(account);

        // Services provided
        if (account.servicesProvided) {
          account.servicesProvided.forEach((service) => {
            const label = serviceLabels[service] || service;
            providerByService[label] = (providerByService[label] || 0) + 1;
          });
        }
      }
    });

    return {
      totalAccounts: filtered.length,
      mgas,
      carriers,
      providers,
      byOrganizationType,
      byStatus,
      byCountry,
      byAssociation,
      withAssociations,
      mgaByGWPBand,
      mgaByLinesOfBusiness,
      mgaByMarket,
      mgaTotalGWP,
      carrierByFronting,
      carrierByRating,
      carrierByStartupMGA,
      carrierDelegatingCountries,
      providerByService
    };
  };

  const generatePDF = async () => {
    if (!reportData) return;

    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;

      const checkNewPage = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      const addSectionHeader = (title: string) => {
        checkNewPage(20);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 85, 116);
        doc.text(title, margin, yPos);
        yPos += 8;
      };

      const addDataRow = (label: string, value: string | number) => {
        checkNewPage(8);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        doc.text(`${label}: ${value}`, margin + 5, yPos);
        yPos += 5;
      };

      // Title
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 85, 116);
      doc.text('FASE Membership Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      // Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
      })}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Summary Box
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 30, 3, 3, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 85, 116);
      doc.text(`Total: ${reportData.totalAccounts} Organizations`, pageWidth / 2, yPos + 10, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`MGAs: ${reportData.mgas.length} | Carriers: ${reportData.carriers.length} | Providers: ${reportData.providers.length}`, pageWidth / 2, yPos + 20, { align: 'center' });
      yPos += 40;

      // By Status
      addSectionHeader('By Status');
      Object.entries(reportData.byStatus)
        .sort((a, b) => b[1] - a[1])
        .forEach(([status, count]) => addDataRow(status, count));
      yPos += 5;

      // By Country
      addSectionHeader('By Country');
      Object.entries(reportData.byCountry)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .forEach(([country, count]) => {
          const pct = ((count / reportData.totalAccounts) * 100).toFixed(1);
          addDataRow(country, `${count} (${pct}%)`);
        });
      yPos += 5;

      // MGA Section
      if (reportData.mgas.length > 0) {
        doc.addPage();
        yPos = margin;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 85, 116);
        doc.text('MGA Analysis', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        // GWP Summary
        addSectionHeader('Gross Written Premiums');
        addDataRow('Total GWP (EUR)', `€${(reportData.mgaTotalGWP / 1000000).toFixed(1)}M`);
        yPos += 3;
        Object.entries(reportData.mgaByGWPBand)
          .sort((a, b) => b[1] - a[1])
          .forEach(([band, count]) => addDataRow(band, count));
        yPos += 5;

        // Lines of Business
        addSectionHeader('Lines of Business');
        Object.entries(reportData.mgaByLinesOfBusiness)
          .sort((a, b) => b[1] - a[1])
          .forEach(([lob, count]) => addDataRow(lob, count));
        yPos += 5;

        // Target Markets
        addSectionHeader('Target Markets');
        Object.entries(reportData.mgaByMarket)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .forEach(([market, count]) => addDataRow(market, count));
      }

      // Carrier Section
      if (reportData.carriers.length > 0) {
        doc.addPage();
        yPos = margin;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 85, 116);
        doc.text('Carrier Analysis', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        addSectionHeader('Fronting Options');
        Object.entries(reportData.carrierByFronting)
          .sort((a, b) => b[1] - a[1])
          .forEach(([option, count]) => addDataRow(option, count));
        yPos += 5;

        addSectionHeader('AM Best Ratings');
        Object.entries(reportData.carrierByRating)
          .sort((a, b) => b[1] - a[1])
          .forEach(([rating, count]) => addDataRow(rating, count));
        yPos += 5;

        addSectionHeader('Considers Startup MGAs');
        Object.entries(reportData.carrierByStartupMGA)
          .forEach(([answer, count]) => addDataRow(answer, count));
      }

      // Provider Section
      if (reportData.providers.length > 0) {
        doc.addPage();
        yPos = margin;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 85, 116);
        doc.text('Service Provider Analysis', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        addSectionHeader('Services Provided');
        Object.entries(reportData.providerByService)
          .sort((a, b) => b[1] - a[1])
          .forEach(([service, count]) => addDataRow(service, count));
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          'FASE - Fédération des Agences de Souscription Européennes',
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      const fileName = `FASE-Report-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setGenerating(false);
    }
  };

  const renderBarChart = (data: Record<string, number>, total: number, color: string = 'bg-fase-navy') => {
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) {
      return <p className="text-sm text-gray-500 italic">No data available</p>;
    }

    return (
      <div className="space-y-2">
        {sorted.map(([label, count]) => {
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-40 truncate" title={label}>{label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className={`${color} h-full rounded-full transition-all duration-500`}
                  style={{ width: `${Math.max(percentage, 2)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-fase-navy w-20 text-right">
                {count} ({percentage.toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load report data</p>
        <Button onClick={loadAccounts} variant="secondary" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Membership Reports</h3>
          <p className="text-sm text-gray-600">
            Comprehensive analytics on {reportData.totalAccounts} organizations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="MGA">MGAs Only</option>
            <option value="carrier">Carriers Only</option>
            <option value="provider">Providers Only</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="flagged">Flagged</option>
            <option value="invoice_sent">Invoice Sent</option>
            <option value="pending_invoice">Pending Invoice</option>
            <option value="rejected">Rejected</option>
          </select>
          <Button onClick={generatePDF} disabled={generating} variant="primary">
            {generating ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'summary', label: 'Summary' },
          { id: 'mga', label: `MGAs (${reportData.mgas.length})` },
          { id: 'carrier', label: `Carriers (${reportData.carriers.length})` },
          { id: 'provider', label: `Providers (${reportData.providers.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as ReportView)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeView === tab.id
                ? 'border-fase-navy text-fase-navy'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary View */}
      {activeView === 'summary' && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-fase-navy text-white rounded-lg p-4">
              <div className="text-2xl font-bold">{reportData.totalAccounts}</div>
              <div className="text-fase-cream/80 text-sm">Total Organizations</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-fase-navy">{reportData.mgas.length}</div>
              <div className="text-gray-600 text-sm">MGAs</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-fase-navy">{reportData.carriers.length}</div>
              <div className="text-gray-600 text-sm">Carriers</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-fase-navy">{reportData.providers.length}</div>
              <div className="text-gray-600 text-sm">Service Providers</div>
            </div>
          </div>

          {/* Status & Country */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-fase-navy mb-4">By Status</h4>
              {renderBarChart(reportData.byStatus, reportData.totalAccounts)}
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-fase-navy mb-4">By Country</h4>
              <div className="max-h-80 overflow-y-auto">
                {renderBarChart(reportData.byCountry, reportData.totalAccounts, 'bg-fase-gold')}
              </div>
            </div>
          </div>

          {/* Associations */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-fase-navy mb-4">
              Other Association Memberships
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({reportData.withAssociations} organizations)
              </span>
            </h4>
            {Object.keys(reportData.byAssociation).length > 0 ? (
              renderBarChart(reportData.byAssociation, reportData.withAssociations, 'bg-green-500')
            ) : (
              <p className="text-sm text-gray-500 italic">No association data</p>
            )}
          </div>
        </div>
      )}

      {/* MGA View */}
      {activeView === 'mga' && (
        <div className="space-y-6">
          {/* GWP Summary */}
          <div className="bg-fase-navy text-white rounded-lg p-6">
            <div className="text-sm text-fase-cream/80 mb-1">Total Gross Written Premiums</div>
            <div className="text-3xl font-bold">
              €{(reportData.mgaTotalGWP / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm text-fase-cream/60 mt-1">
              Across {reportData.mgas.length} MGAs
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GWP Bands */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-fase-navy mb-4">By GWP Band</h4>
              {renderBarChart(reportData.mgaByGWPBand, reportData.mgas.length)}
            </div>

            {/* Lines of Business */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-fase-navy mb-4">Lines of Business</h4>
              <div className="max-h-80 overflow-y-auto">
                {renderBarChart(reportData.mgaByLinesOfBusiness, reportData.mgas.length, 'bg-blue-500')}
              </div>
            </div>
          </div>

          {/* Target Markets */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-fase-navy mb-4">Target Markets</h4>
            <div className="max-h-80 overflow-y-auto">
              {renderBarChart(reportData.mgaByMarket, reportData.mgas.length, 'bg-fase-gold')}
            </div>
          </div>
        </div>
      )}

      {/* Carrier View */}
      {activeView === 'carrier' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fronting Options */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-fase-navy mb-4">Fronting Options</h4>
              {renderBarChart(reportData.carrierByFronting, reportData.carriers.length)}
            </div>

            {/* AM Best Ratings */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-fase-navy mb-4">AM Best Ratings</h4>
              {renderBarChart(reportData.carrierByRating, reportData.carriers.length, 'bg-green-500')}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Startup MGAs */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-fase-navy mb-4">Considers Startup MGAs</h4>
              {renderBarChart(reportData.carrierByStartupMGA, reportData.carriers.length, 'bg-purple-500')}
            </div>

            {/* Delegating Countries */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-fase-navy mb-4">Delegating Countries</h4>
              <div className="max-h-64 overflow-y-auto">
                {renderBarChart(reportData.carrierDelegatingCountries, reportData.carriers.length, 'bg-fase-gold')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provider View */}
      {activeView === 'provider' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-fase-navy mb-4">Services Provided</h4>
            {renderBarChart(reportData.providerByService, reportData.providers.length, 'bg-orange-500')}
          </div>
        </div>
      )}
    </div>
  );
}
