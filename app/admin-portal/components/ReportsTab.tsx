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

    // Exclude flagged and rejected unless explicitly filtering for them
    if (status === 'all') {
      filtered = filtered.filter((a) => a.status !== 'flagged' && a.status !== 'rejected');
    } else {
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

      // Helper to parse hex color to RGB
      const hexToRgb = (hex: string): [number, number, number] => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
      };

      // Draw a donut chart - returns the Y position after the chart
      const drawDonutChart = (
        data: Record<string, number>,
        total: number,
        centerX: number,
        centerY: number,
        radius: number
      ) => {
        if (total === 0) return;
        const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);

        let startAngle = -Math.PI / 2;
        sorted.forEach(([, count], index) => {
          const sliceAngle = (count / total) * 2 * Math.PI;
          const color = hexToRgb(CHART_COLORS[index % CHART_COLORS.length]);
          doc.setFillColor(...color);

          // Draw pie slice using triangle fan
          const segments = Math.max(Math.ceil(sliceAngle * 20), 3);
          for (let i = 0; i < segments; i++) {
            const angle1 = startAngle + (sliceAngle * i) / segments;
            const angle2 = startAngle + (sliceAngle * (i + 1)) / segments;
            doc.triangle(
              centerX, centerY,
              centerX + radius * Math.cos(angle1), centerY + radius * Math.sin(angle1),
              centerX + radius * Math.cos(angle2), centerY + radius * Math.sin(angle2),
              'F'
            );
          }
          startAngle += sliceAngle;
        });

        // Donut hole
        doc.setFillColor(255, 255, 255);
        doc.circle(centerX, centerY, radius * 0.55, 'F');
      };

      // Track if we need to use the first page or add a new one
      let needsFirstPage = true;

      // Draw a complete section page with title, optional pie chart, and full list
      const drawSectionPage = (
        title: string,
        data: Record<string, number>,
        total: number,
        headerColor: [number, number, number],
        subtitle?: string,
        showChart: boolean = true
      ) => {
        if (needsFirstPage) {
          needsFirstPage = false;
          // Use the existing first page
        } else {
          doc.addPage();
        }

        // Header bar
        doc.setFillColor(...headerColor);
        doc.rect(0, 0, pageWidth, 30, 'F');

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(title, pageWidth / 2, 18, { align: 'center' });

        if (subtitle) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(255, 255, 255);
          doc.text(subtitle, pageWidth / 2, 26, { align: 'center' });
        }

        const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0 || total === 0) {
          doc.setFontSize(12);
          doc.setTextColor(150, 150, 150);
          doc.text('No data available', pageWidth / 2, 80, { align: 'center' });
          return;
        }

        let tableY = 45;

        if (showChart) {
          // Pie chart centered at the top
          const chartCenterX = pageWidth / 2;
          const chartCenterY = 70;
          const chartRadius = 28;
          drawDonutChart(data, total, chartCenterX, chartCenterY, chartRadius);

          tableY = 110;
        }

        // Full data table

        // Table header
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, tableY, pageWidth - margin * 2, 8, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text('Item', margin + 3, tableY + 5.5);
        doc.text('Count', pageWidth - margin - 35, tableY + 5.5, { align: 'right' });
        doc.text('Percentage', pageWidth - margin - 3, tableY + 5.5, { align: 'right' });

        tableY += 10;

        // Table rows
        sorted.forEach(([label, count], index) => {
          if (tableY > pageHeight - 25) {
            doc.addPage();
            tableY = margin;

            // Continuation header
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...headerColor);
            doc.text(`${title} (continued)`, margin, tableY + 5);
            tableY += 12;

            // Continue table header on new page
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, tableY, pageWidth - margin * 2, 8, 'F');
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 80);
            doc.text('Item', margin + 3, tableY + 5.5);
            doc.text('Count', pageWidth - margin - 35, tableY + 5.5, { align: 'right' });
            doc.text('Percentage', pageWidth - margin - 3, tableY + 5.5, { align: 'right' });
            tableY += 10;
          }

          const pct = ((count / total) * 100).toFixed(1);

          // Alternating row background
          if (index % 2 === 0) {
            doc.setFillColor(252, 252, 252);
            doc.rect(margin, tableY - 1, pageWidth - margin * 2, 7, 'F');
          }

          // Color indicator only for items shown in chart (top 10)
          const labelX = showChart && index < 10 ? margin + 8 : margin + 3;
          if (showChart && index < 10) {
            const color = hexToRgb(CHART_COLORS[index % CHART_COLORS.length]);
            doc.setFillColor(...color);
            doc.rect(margin + 2, tableY + 0.5, 3, 3, 'F');
          }

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(50, 50, 50);
          const displayLabel = label.length > 50 ? label.substring(0, 48) + '...' : label;
          doc.text(displayLabel, labelX, tableY + 4);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(45, 85, 116);
          doc.text(String(count), pageWidth - margin - 35, tableY + 4, { align: 'right' });

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          doc.text(`${pct}%`, pageWidth - margin - 3, tableY + 4, { align: 'right' });

          tableY += 7;
        });
      };

      // ===== PAGE 1: TITLE PAGE WITH SUMMARY =====
      const typeLabel = typeFilter === 'all' ? 'All Organizations' :
        typeFilter === 'MGA' ? 'MGAs' :
        typeFilter === 'carrier' ? 'Carriers' : 'Service Providers';
      const statusLabel = statusFilter === 'all' ? '' : ` (${statusFilter.replace('_', ' ')})`;

      // Only generate title page if summary is selected
      if (pdfSections.summary) {
        needsFirstPage = false;

        // Title page header
        doc.setFillColor(45, 85, 116);
        doc.rect(0, 0, pageWidth, 50, 'F');

        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('FASE Membership Report', pageWidth / 2, 22, { align: 'center' });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(200, 200, 200);
        doc.text(`${typeLabel}${statusLabel}`, pageWidth / 2, 35, { align: 'center' });

        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', {
          day: 'numeric', month: 'long', year: 'numeric'
        })}`, pageWidth / 2, 45, { align: 'center' });

        // Summary cards
        const cardY = 65;
        const cardHeight = 35;
        const cardWidth = (pageWidth - margin * 2 - 15) / 4;

        const cards = [
          { count: reportData.totalAccounts, label: 'Total', color: [45, 85, 116] as [number, number, number] },
          { count: reportData.mgas.length, label: 'MGAs', color: [30, 136, 229] as [number, number, number] },
          { count: reportData.carriers.length, label: 'Carriers', color: [67, 160, 71] as [number, number, number] },
          { count: reportData.providers.length, label: 'Providers', color: [244, 81, 30] as [number, number, number] },
        ];

        cards.forEach((card, i) => {
          const x = margin + i * (cardWidth + 5);
          doc.setFillColor(...card.color);
          doc.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'F');

          doc.setFontSize(22);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(String(card.count), x + cardWidth / 2, cardY + 18, { align: 'center' });

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(card.label, x + cardWidth / 2, cardY + 28, { align: 'center' });
        });
      }

      // ===== SECTION PAGES =====

      // Helper to format large numbers
      const formatGWP = (value: number): string => {
        if (value >= 1000000000) {
          return `€${(value / 1000000000).toFixed(1)}B`;
        } else if (value >= 1000000) {
          return `€${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
          return `€${(value / 1000).toFixed(0)}K`;
        }
        return `€${value.toLocaleString()}`;
      };

      // Status page
      if (pdfSections.status && Object.keys(reportData.byStatus).length > 0) {
        drawSectionPage('By Status', reportData.byStatus, reportData.totalAccounts, [45, 85, 116]);
      }

      // Country page
      if (pdfSections.country && Object.keys(reportData.byCountry).length > 0) {
        drawSectionPage('By Country', reportData.byCountry, reportData.totalAccounts, [45, 85, 116]);
      }

      // Associations page
      if (pdfSections.associations && Object.keys(reportData.byAssociation).length > 0) {
        drawSectionPage('Other Association Memberships', reportData.byAssociation, reportData.withAssociations, [45, 85, 116], `${reportData.withAssociations} organizations with other memberships`);
      }

      // MGA pages
      const showMGA = (typeFilter === 'all' || typeFilter === 'MGA') && reportData.mgas.length > 0;
      if (showMGA) {
        if (pdfSections.mgaGWP && Object.keys(reportData.mgaByGWPBand).length > 0) {
          const gwpSubtitle = `Total GWP: ${formatGWP(reportData.mgaTotalGWP)} across ${reportData.mgas.length} MGAs`;
          drawSectionPage('MGA: GWP Bands', reportData.mgaByGWPBand, reportData.mgas.length, [30, 136, 229], gwpSubtitle);
        }
        if (pdfSections.mgaLinesOfBusiness && Object.keys(reportData.mgaByLinesOfBusiness).length > 0) {
          drawSectionPage('MGA: Lines of Business', reportData.mgaByLinesOfBusiness, reportData.mgas.length, [30, 136, 229], undefined, false);
        }
        if (pdfSections.mgaMarkets && Object.keys(reportData.mgaByMarket).length > 0) {
          drawSectionPage('MGA: Target Markets', reportData.mgaByMarket, reportData.mgas.length, [30, 136, 229], undefined, false);
        }
      }

      // Carrier pages
      const showCarrier = (typeFilter === 'all' || typeFilter === 'carrier') && reportData.carriers.length > 0;
      if (showCarrier) {
        if (pdfSections.carrierFronting && Object.keys(reportData.carrierByFronting).length > 0) {
          drawSectionPage('Carrier: Fronting Options', reportData.carrierByFronting, reportData.carriers.length, [67, 160, 71]);
        }
        if (pdfSections.carrierRatings && Object.keys(reportData.carrierByRating).length > 0) {
          drawSectionPage('Carrier: AM Best Ratings', reportData.carrierByRating, reportData.carriers.length, [67, 160, 71]);
        }
        if (pdfSections.carrierStartups && Object.keys(reportData.carrierByStartupMGA).length > 0) {
          drawSectionPage('Carrier: Considers Startup MGAs', reportData.carrierByStartupMGA, reportData.carriers.length, [67, 160, 71]);
        }
        if (pdfSections.carrierCountries && Object.keys(reportData.carrierDelegatingCountries).length > 0) {
          drawSectionPage('Carrier: Delegating Countries', reportData.carrierDelegatingCountries, reportData.carriers.length, [67, 160, 71], undefined, false);
        }
      }

      // Provider pages
      const showProvider = (typeFilter === 'all' || typeFilter === 'provider') && reportData.providers.length > 0;
      if (showProvider && pdfSections.providerServices) {
        drawSectionPage('Provider: Services Offered', reportData.providerByService, reportData.providers.length, [244, 81, 30]);
      }

      // Footer on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('FASE - Fédération des Agences de Souscription Européennes', pageWidth / 2, pageHeight - 8, { align: 'center' });
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
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
