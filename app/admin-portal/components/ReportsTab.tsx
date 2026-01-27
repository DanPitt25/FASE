'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Button from '../../../components/Button';
import { getLineOfBusinessDisplay } from '../../../lib/lines-of-business';

// Professional color palette
const CHART_COLORS = [
  '#2D5574', // fase-navy
  '#C9A227', // fase-gold
  '#1E88E5', // blue
  '#43A047', // green
  '#8E24AA', // purple
  '#F4511E', // orange
  '#00ACC1', // cyan
  '#D81B60', // pink
  '#6D4C41', // brown
  '#546E7A', // blue-grey
  '#FFB300', // amber
  '#00897B', // teal
];

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
  totalAccounts: number;
  mgas: AccountData[];
  carriers: AccountData[];
  providers: AccountData[];
  byOrganizationType: Record<string, number>;
  byStatus: Record<string, number>;
  byCountry: Record<string, number>;
  byAssociation: Record<string, number>;
  withAssociations: number;
  mgaByGWPBand: Record<string, number>;
  mgaByLinesOfBusiness: Record<string, number>;
  mgaByMarket: Record<string, number>;
  mgaTotalGWP: number;
  carrierByFronting: Record<string, number>;
  carrierByRating: Record<string, number>;
  carrierByStartupMGA: Record<string, number>;
  carrierDelegatingCountries: Record<string, number>;
  providerByService: Record<string, number>;
}

interface PDFSections {
  summary: boolean;
  status: boolean;
  country: boolean;
  associations: boolean;
  mgaGWP: boolean;
  mgaLinesOfBusiness: boolean;
  mgaMarkets: boolean;
  carrierFronting: boolean;
  carrierRatings: boolean;
  carrierStartups: boolean;
  carrierCountries: boolean;
  providerServices: boolean;
}

type StatusFilter = 'all' | 'approved' | 'pending' | 'invoice_sent' | 'pending_invoice' | 'paid' | 'flagged' | 'rejected';
type TypeFilter = 'all' | 'MGA' | 'carrier' | 'provider';

// Donut/Pie Chart Component
function DonutChart({ data, total, size = 180 }: { data: Record<string, number>; total: number; size?: number }) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (sorted.length === 0 || total === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>;
  }

  const radius = size / 2 - 10;
  const innerRadius = radius * 0.6;
  const center = size / 2;

  let currentAngle = -90;
  const segments = sorted.map(([label, count], index) => {
    const percentage = (count / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const x1Inner = center + innerRadius * Math.cos(endRad);
    const y1Inner = center + innerRadius * Math.sin(endRad);
    const x2Inner = center + innerRadius * Math.cos(startRad);
    const y2Inner = center + innerRadius * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x1Inner} ${y1Inner}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}
      Z
    `;

    return { path, color: CHART_COLORS[index % CHART_COLORS.length], label, count, percentage };
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="flex-shrink-0">
        {segments.map((seg, i) => (
          <path key={i} d={seg.path} fill={seg.color} className="hover:opacity-80 transition-opacity cursor-pointer">
            <title>{seg.label}: {seg.count} ({seg.percentage.toFixed(1)}%)</title>
          </path>
        ))}
        <text x={center} y={center - 5} textAnchor="middle" className="text-2xl font-bold fill-gray-800">{total}</text>
        <text x={center} y={center + 15} textAnchor="middle" className="text-xs fill-gray-500">total</text>
      </svg>
      <div className="flex-1 space-y-1 min-w-0">
        {segments.slice(0, 6).map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="truncate text-gray-600" title={seg.label}>{seg.label}</span>
            <span className="ml-auto font-medium text-gray-800 flex-shrink-0">{seg.percentage.toFixed(0)}%</span>
          </div>
        ))}
        {sorted.length > 6 && (
          <div className="text-xs text-gray-400 pl-5">+{sorted.length - 6} more</div>
        )}
      </div>
    </div>
  );
}

// Enhanced Bar Chart with colors
function ColoredBarChart({ data, total, maxItems = 10 }: { data: Record<string, number>; total: number; maxItems?: number }) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, maxItems);
  if (sorted.length === 0) {
    return <p className="text-sm text-gray-500 italic">No data available</p>;
  }

  return (
    <div className="space-y-2">
      {sorted.map(([label, count], index) => {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        const color = CHART_COLORS[index % CHART_COLORS.length];
        return (
          <div key={label} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-36 truncate" title={label}>{label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(percentage, 3)}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-sm font-semibold w-20 text-right" style={{ color }}>
              {count} <span className="text-gray-400 font-normal">({percentage.toFixed(0)}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// PDF Export Modal
function PDFExportModal({
  isOpen,
  onClose,
  onExport,
  sections,
  setSections,
  typeFilter,
  reportData
}: {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  sections: PDFSections;
  setSections: (s: PDFSections) => void;
  typeFilter: TypeFilter;
  reportData: ReportData;
}) {
  if (!isOpen) return null;

  const toggleSection = (key: keyof PDFSections) => {
    setSections({ ...sections, [key]: !sections[key] });
  };

  const selectAll = () => {
    const all: PDFSections = {
      summary: true,
      status: true,
      country: true,
      associations: true,
      mgaGWP: (typeFilter === 'all' || typeFilter === 'MGA') && reportData.mgas.length > 0,
      mgaLinesOfBusiness: (typeFilter === 'all' || typeFilter === 'MGA') && reportData.mgas.length > 0,
      mgaMarkets: (typeFilter === 'all' || typeFilter === 'MGA') && reportData.mgas.length > 0,
      carrierFronting: (typeFilter === 'all' || typeFilter === 'carrier') && reportData.carriers.length > 0,
      carrierRatings: (typeFilter === 'all' || typeFilter === 'carrier') && reportData.carriers.length > 0,
      carrierStartups: (typeFilter === 'all' || typeFilter === 'carrier') && reportData.carriers.length > 0,
      carrierCountries: (typeFilter === 'all' || typeFilter === 'carrier') && reportData.carriers.length > 0,
      providerServices: (typeFilter === 'all' || typeFilter === 'provider') && reportData.providers.length > 0,
    };
    setSections(all);
  };

  const selectNone = () => {
    setSections({
      summary: false, status: false, country: false, associations: false,
      mgaGWP: false, mgaLinesOfBusiness: false, mgaMarkets: false,
      carrierFronting: false, carrierRatings: false, carrierStartups: false, carrierCountries: false,
      providerServices: false,
    });
  };

  const SectionCheckbox = ({ label, sectionKey, disabled = false }: { label: string; sectionKey: keyof PDFSections; disabled?: boolean }) => (
    <label className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      <input
        type="checkbox"
        checked={sections[sectionKey] && !disabled}
        onChange={() => !disabled && toggleSection(sectionKey)}
        disabled={disabled}
        className="w-4 h-4 text-fase-navy rounded border-gray-300 focus:ring-fase-navy"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );

  const showMGA = (typeFilter === 'all' || typeFilter === 'MGA') && reportData.mgas.length > 0;
  const showCarrier = (typeFilter === 'all' || typeFilter === 'carrier') && reportData.carriers.length > 0;
  const showProvider = (typeFilter === 'all' || typeFilter === 'provider') && reportData.providers.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-fase-navy text-white px-6 py-4">
          <h3 className="text-lg font-semibold">Export PDF Report</h3>
          <p className="text-fase-cream/70 text-sm mt-1">Select which sections to include</p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="flex gap-3 mb-4">
            <button onClick={selectAll} className="text-sm text-fase-navy hover:underline">Select All</button>
            <span className="text-gray-300">|</span>
            <button onClick={selectNone} className="text-sm text-gray-500 hover:underline">Clear All</button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">General</h4>
              <div className="space-y-1">
                <SectionCheckbox label="Summary Statistics" sectionKey="summary" />
                <SectionCheckbox label="By Status" sectionKey="status" />
                <SectionCheckbox label="By Country" sectionKey="country" />
                <SectionCheckbox label="Other Associations" sectionKey="associations" />
              </div>
            </div>

            {showMGA && (
              <div>
                <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">MGA Analysis</h4>
                <div className="space-y-1">
                  <SectionCheckbox label="GWP Overview & Bands" sectionKey="mgaGWP" />
                  <SectionCheckbox label="Lines of Business" sectionKey="mgaLinesOfBusiness" />
                  <SectionCheckbox label="Target Markets" sectionKey="mgaMarkets" />
                </div>
              </div>
            )}

            {showCarrier && (
              <div>
                <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Carrier Analysis</h4>
                <div className="space-y-1">
                  <SectionCheckbox label="Fronting Options" sectionKey="carrierFronting" />
                  <SectionCheckbox label="AM Best Ratings" sectionKey="carrierRatings" />
                  <SectionCheckbox label="Considers Startup MGAs" sectionKey="carrierStartups" />
                  <SectionCheckbox label="Delegating Countries" sectionKey="carrierCountries" />
                </div>
              </div>
            )}

            {showProvider && (
              <div>
                <h4 className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">Provider Analysis</h4>
                <div className="space-y-1">
                  <SectionCheckbox label="Services Provided" sectionKey="providerServices" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-3 bg-gray-50">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onExport}>Generate PDF</Button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsTab() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [allAccounts, setAllAccounts] = useState<AccountData[]>([]);
  const [pdfSections, setPdfSections] = useState<PDFSections>({
    summary: true,
    status: true,
    country: true,
    associations: true,
    mgaGWP: true,
    mgaLinesOfBusiness: true,
    mgaMarkets: true,
    carrierFronting: true,
    carrierRatings: true,
    carrierStartups: true,
    carrierCountries: true,
    providerServices: true,
  });

  useEffect(() => {
    loadAccounts();
  }, []);

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
    const mgaByGWPBand: Record<string, number> = {};
    const mgaByLinesOfBusiness: Record<string, number> = {};
    const mgaByMarket: Record<string, number> = {};
    let mgaTotalGWP = 0;
    const carrierByFronting: Record<string, number> = {};
    const carrierByRating: Record<string, number> = {};
    const carrierByStartupMGA: Record<string, number> = {};
    const carrierDelegatingCountries: Record<string, number> = {};
    const providerByService: Record<string, number> = {};

    filtered.forEach((account) => {
      const accountStatus = account.status || 'unknown';
      byStatus[accountStatus] = (byStatus[accountStatus] || 0) + 1;

      const orgType = account.organizationType || 'Unknown';
      byOrganizationType[orgType] = (byOrganizationType[orgType] || 0) + 1;

      const country = account.businessAddress?.country || account.registeredAddress?.country;
      if (country) {
        const countryName = countryNames[country] || country;
        byCountry[countryName] = (byCountry[countryName] || 0) + 1;
      } else {
        byCountry['Not Specified'] = (byCountry['Not Specified'] || 0) + 1;
      }

      if (account.hasOtherAssociations && account.otherAssociations?.length) {
        withAssociations++;
        account.otherAssociations.forEach((assoc) => {
          byAssociation[assoc] = (byAssociation[assoc] || 0) + 1;
        });
      }

      if (orgType === 'MGA') {
        mgas.push(account);
        if (account.portfolio?.grossWrittenPremiums) {
          const band = account.portfolio.grossWrittenPremiums;
          mgaByGWPBand[band] = (mgaByGWPBand[band] || 0) + 1;
        }
        if (account.portfolio?.grossWrittenPremiumsEUR) {
          mgaTotalGWP += account.portfolio.grossWrittenPremiumsEUR;
        }
        if (account.portfolio?.linesOfBusiness) {
          account.portfolio.linesOfBusiness.forEach((lob) => {
            const label = getLineOfBusinessDisplay(lob, 'en');
            mgaByLinesOfBusiness[label] = (mgaByLinesOfBusiness[label] || 0) + 1;
          });
        }
        if (account.portfolio?.markets) {
          account.portfolio.markets.forEach((market) => {
            const marketName = countryNames[market] || market;
            mgaByMarket[marketName] = (mgaByMarket[marketName] || 0) + 1;
          });
        }
      } else if (orgType === 'carrier') {
        carriers.push(account);
        if (account.carrierInfo?.frontingOptions) {
          carrierByFronting[account.carrierInfo.frontingOptions] = (carrierByFronting[account.carrierInfo.frontingOptions] || 0) + 1;
        }
        if (account.carrierInfo?.amBestRating) {
          carrierByRating[account.carrierInfo.amBestRating] = (carrierByRating[account.carrierInfo.amBestRating] || 0) + 1;
        }
        if (account.carrierInfo?.considerStartupMGAs) {
          carrierByStartupMGA[account.carrierInfo.considerStartupMGAs] = (carrierByStartupMGA[account.carrierInfo.considerStartupMGAs] || 0) + 1;
        }
        if (account.carrierInfo?.delegatingCountries) {
          account.carrierInfo.delegatingCountries.forEach((c) => {
            const countryName = countryNames[c] || c;
            carrierDelegatingCountries[countryName] = (carrierDelegatingCountries[countryName] || 0) + 1;
          });
        }
      } else if (orgType === 'provider') {
        providers.push(account);
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
      mgas, carriers, providers,
      byOrganizationType, byStatus, byCountry, byAssociation, withAssociations,
      mgaByGWPBand, mgaByLinesOfBusiness, mgaByMarket, mgaTotalGWP,
      carrierByFronting, carrierByRating, carrierByStartupMGA, carrierDelegatingCountries,
      providerByService
    };
  };

  const generatePDF = async () => {
    if (!reportData) return;
    setShowPDFModal(false);
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

      const addSectionHeader = (title: string, color: [number, number, number] = [45, 85, 116]) => {
        checkNewPage(20);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...color);
        doc.text(title, margin, yPos);
        yPos += 8;
      };

      const addDataRow = (label: string, value: string | number, color?: [number, number, number]) => {
        checkNewPage(8);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        doc.text(`${label}:`, margin + 5, yPos);
        if (color) doc.setTextColor(...color);
        doc.text(String(value), margin + 80, yPos);
        doc.setTextColor(50, 50, 50);
        yPos += 5;
      };

      // Title
      const typeLabel = typeFilter === 'all' ? 'All Organizations' :
        typeFilter === 'MGA' ? 'MGAs' :
        typeFilter === 'carrier' ? 'Carriers' : 'Service Providers';
      const statusLabel = statusFilter === 'all' ? '' : ` - ${statusFilter.replace('_', ' ')}`;

      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 85, 116);
      doc.text(`FASE Report: ${typeLabel}${statusLabel}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
      })}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Summary
      if (pdfSections.summary) {
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 3, 3, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 85, 116);
        doc.text(`Total: ${reportData.totalAccounts} Organizations`, pageWidth / 2, yPos + 10, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`MGAs: ${reportData.mgas.length} | Carriers: ${reportData.carriers.length} | Providers: ${reportData.providers.length}`, pageWidth / 2, yPos + 18, { align: 'center' });
        yPos += 35;
      }

      // Status
      if (pdfSections.status) {
        addSectionHeader('By Status');
        Object.entries(reportData.byStatus)
          .sort((a, b) => b[1] - a[1])
          .forEach(([status, count]) => addDataRow(status, count));
        yPos += 5;
      }

      // Country
      if (pdfSections.country) {
        addSectionHeader('By Country');
        Object.entries(reportData.byCountry)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .forEach(([country, count]) => {
            const pct = ((count / reportData.totalAccounts) * 100).toFixed(1);
            addDataRow(country, `${count} (${pct}%)`);
          });
        yPos += 5;
      }

      // Associations
      if (pdfSections.associations && Object.keys(reportData.byAssociation).length > 0) {
        addSectionHeader('Other Associations');
        Object.entries(reportData.byAssociation)
          .sort((a, b) => b[1] - a[1])
          .forEach(([assoc, count]) => addDataRow(assoc, count));
        yPos += 5;
      }

      // MGA Section
      const showMGA = (typeFilter === 'all' || typeFilter === 'MGA') && reportData.mgas.length > 0;
      if (showMGA && (pdfSections.mgaGWP || pdfSections.mgaLinesOfBusiness || pdfSections.mgaMarkets)) {
        doc.addPage();
        yPos = margin;
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 136, 229);
        doc.text('MGA Analysis', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        if (pdfSections.mgaGWP) {
          addSectionHeader('Gross Written Premiums', [30, 136, 229]);
          addDataRow('Total GWP (EUR)', `€${(reportData.mgaTotalGWP / 1000000).toFixed(1)}M`, [30, 136, 229]);
          yPos += 3;
          Object.entries(reportData.mgaByGWPBand)
            .sort((a, b) => b[1] - a[1])
            .forEach(([band, count]) => addDataRow(band, count));
          yPos += 5;
        }

        if (pdfSections.mgaLinesOfBusiness) {
          addSectionHeader('Lines of Business', [30, 136, 229]);
          Object.entries(reportData.mgaByLinesOfBusiness)
            .sort((a, b) => b[1] - a[1])
            .forEach(([lob, count]) => addDataRow(lob, count));
          yPos += 5;
        }

        if (pdfSections.mgaMarkets) {
          addSectionHeader('Target Markets', [30, 136, 229]);
          Object.entries(reportData.mgaByMarket)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .forEach(([market, count]) => addDataRow(market, count));
        }
      }

      // Carrier Section
      const showCarrier = (typeFilter === 'all' || typeFilter === 'carrier') && reportData.carriers.length > 0;
      if (showCarrier && (pdfSections.carrierFronting || pdfSections.carrierRatings || pdfSections.carrierStartups || pdfSections.carrierCountries)) {
        doc.addPage();
        yPos = margin;
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(67, 160, 71);
        doc.text('Carrier Analysis', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        if (pdfSections.carrierFronting) {
          addSectionHeader('Fronting Options', [67, 160, 71]);
          Object.entries(reportData.carrierByFronting)
            .sort((a, b) => b[1] - a[1])
            .forEach(([opt, count]) => addDataRow(opt, count));
          yPos += 5;
        }

        if (pdfSections.carrierRatings) {
          addSectionHeader('AM Best Ratings', [67, 160, 71]);
          Object.entries(reportData.carrierByRating)
            .sort((a, b) => b[1] - a[1])
            .forEach(([rating, count]) => addDataRow(rating, count));
          yPos += 5;
        }

        if (pdfSections.carrierStartups) {
          addSectionHeader('Considers Startup MGAs', [67, 160, 71]);
          Object.entries(reportData.carrierByStartupMGA)
            .forEach(([answer, count]) => addDataRow(answer, count));
          yPos += 5;
        }

        if (pdfSections.carrierCountries) {
          addSectionHeader('Delegating Countries', [67, 160, 71]);
          Object.entries(reportData.carrierDelegatingCountries)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .forEach(([country, count]) => addDataRow(country, count));
        }
      }

      // Provider Section
      const showProvider = (typeFilter === 'all' || typeFilter === 'provider') && reportData.providers.length > 0;
      if (showProvider && pdfSections.providerServices) {
        doc.addPage();
        yPos = margin;
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(244, 81, 30);
        doc.text('Service Provider Analysis', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        addSectionHeader('Services Provided', [244, 81, 30]);
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
        doc.text('FASE - Fédération des Agences de Souscription Européennes', pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      const fileTypeLabel = typeFilter === 'all' ? 'All' : typeFilter;
      const fileStatusLabel = statusFilter === 'all' ? '' : `-${statusFilter}`;
      doc.save(`FASE-Report-${fileTypeLabel}${fileStatusLabel}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fase-navy"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load report data</p>
        <Button onClick={loadAccounts} variant="secondary" className="mt-4">Retry</Button>
      </div>
    );
  }

  const getReportTitle = () => {
    const typeLabel = typeFilter === 'all' ? 'All Organizations' :
      typeFilter === 'MGA' ? 'MGAs' :
      typeFilter === 'carrier' ? 'Carriers' : 'Service Providers';
    const statusLabel = statusFilter === 'all' ? '' : ` (${statusFilter.replace('_', ' ')})`;
    return `${typeLabel}${statusLabel}`;
  };

  const showMGA = (typeFilter === 'all' || typeFilter === 'MGA') && reportData.mgas.length > 0;
  const showCarrier = (typeFilter === 'all' || typeFilter === 'carrier') && reportData.carriers.length > 0;
  const showProvider = (typeFilter === 'all' || typeFilter === 'provider') && reportData.providers.length > 0;

  return (
    <div className="space-y-6">
      {/* PDF Export Modal */}
      <PDFExportModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        onExport={generatePDF}
        sections={pdfSections}
        setSections={setPdfSections}
        typeFilter={typeFilter}
        reportData={reportData}
      />

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Membership Reports</h3>
          <p className="text-sm text-gray-500">{getReportTitle()} - {reportData.totalAccounts} organizations</p>
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
          <Button onClick={() => setShowPDFModal(true)} disabled={generating} variant="primary">
            {generating ? 'Generating...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-fase-navy text-white rounded-xl p-5 shadow-lg">
          <div className="text-3xl font-bold">{reportData.totalAccounts}</div>
          <div className="text-fase-cream/70 text-sm mt-1">Total Organizations</div>
        </div>
        {(typeFilter === 'all' || typeFilter === 'MGA') && (
          <div className="bg-white border-2 border-blue-200 rounded-xl p-5 shadow-sm">
            <div className="text-3xl font-bold text-blue-600">{reportData.mgas.length}</div>
            <div className="text-gray-500 text-sm mt-1">MGAs</div>
          </div>
        )}
        {(typeFilter === 'all' || typeFilter === 'carrier') && (
          <div className="bg-white border-2 border-green-200 rounded-xl p-5 shadow-sm">
            <div className="text-3xl font-bold text-green-600">{reportData.carriers.length}</div>
            <div className="text-gray-500 text-sm mt-1">Carriers</div>
          </div>
        )}
        {(typeFilter === 'all' || typeFilter === 'provider') && (
          <div className="bg-white border-2 border-orange-200 rounded-xl p-5 shadow-sm">
            <div className="text-3xl font-bold text-orange-600">{reportData.providers.length}</div>
            <div className="text-gray-500 text-sm mt-1">Service Providers</div>
          </div>
        )}
      </div>

      {/* Status & Country with Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">By Status</h4>
          <DonutChart data={reportData.byStatus} total={reportData.totalAccounts} />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">By Country</h4>
          <DonutChart data={reportData.byCountry} total={reportData.totalAccounts} />
        </div>
      </div>

      {/* Associations */}
      {Object.keys(reportData.byAssociation).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-800 mb-1">Other Association Memberships</h4>
          <p className="text-sm text-gray-500 mb-4">{reportData.withAssociations} organizations with other memberships</p>
          <ColoredBarChart data={reportData.byAssociation} total={reportData.withAssociations} />
        </div>
      )}

      {/* MGA Section */}
      {showMGA && (
        <>
          <div className="flex items-center gap-3 pt-4">
            <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
            <h3 className="text-xl font-bold text-gray-800">MGA Analysis</h3>
          </div>

          <div className="bg-blue-600 text-white rounded-xl p-6 shadow-lg">
            <div className="text-sm text-blue-100 mb-1">Total Gross Written Premiums</div>
            <div className="text-4xl font-bold">€{(reportData.mgaTotalGWP / 1000000).toFixed(1)}M</div>
            <div className="text-sm text-blue-200 mt-2">Across {reportData.mgas.length} MGAs</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">By GWP Band</h4>
              <DonutChart data={reportData.mgaByGWPBand} total={reportData.mgas.length} />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Lines of Business</h4>
              <div className="max-h-72 overflow-y-auto">
                <ColoredBarChart data={reportData.mgaByLinesOfBusiness} total={reportData.mgas.length} maxItems={12} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Target Markets</h4>
            <div className="max-h-72 overflow-y-auto">
              <ColoredBarChart data={reportData.mgaByMarket} total={reportData.mgas.length} maxItems={15} />
            </div>
          </div>
        </>
      )}

      {/* Carrier Section */}
      {showCarrier && (
        <>
          <div className="flex items-center gap-3 pt-4">
            <div className="w-1 h-6 bg-green-500 rounded-full"></div>
            <h3 className="text-xl font-bold text-gray-800">Carrier Analysis</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Fronting Options</h4>
              <DonutChart data={reportData.carrierByFronting} total={reportData.carriers.length} />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">AM Best Ratings</h4>
              <DonutChart data={reportData.carrierByRating} total={reportData.carriers.length} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Considers Startup MGAs</h4>
              <DonutChart data={reportData.carrierByStartupMGA} total={reportData.carriers.length} />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Delegating Countries</h4>
              <div className="max-h-64 overflow-y-auto">
                <ColoredBarChart data={reportData.carrierDelegatingCountries} total={reportData.carriers.length} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Provider Section */}
      {showProvider && (
        <>
          <div className="flex items-center gap-3 pt-4">
            <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
            <h3 className="text-xl font-bold text-gray-800">Service Provider Analysis</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Services Provided</h4>
              <DonutChart data={reportData.providerByService} total={reportData.providers.length} />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Service Distribution</h4>
              <ColoredBarChart data={reportData.providerByService} total={reportData.providers.length} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
