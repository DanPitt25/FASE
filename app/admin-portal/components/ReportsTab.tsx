'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Button from '../../../components/Button';
import { OrganizationAccount } from '../../../lib/unified-member';

interface ReportData {
  totalMembers: number;
  byOrganizationType: Record<string, number>;
  byCountry: Record<string, number>;
  byLinesOfBusiness: Record<string, number>;
  byStatus: Record<string, number>;
  members: OrganizationAccount[];
}

export default function ReportsTab() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<'summary' | 'detailed'>('summary');

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const accountsRef = collection(db, 'accounts');
      const snapshot = await getDocs(accountsRef);

      const members: OrganizationAccount[] = [];
      const byOrganizationType: Record<string, number> = {};
      const byCountry: Record<string, number> = {};
      const byLinesOfBusiness: Record<string, number> = {};
      const byStatus: Record<string, number> = {};

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as OrganizationAccount;
        const account = { ...data, id: doc.id };

        // Only include approved members in reports
        if (data.status !== 'approved' && data.status !== 'admin') return;

        members.push(account);

        // Count by organization type
        const orgType = data.organizationType || 'Unknown';
        byOrganizationType[orgType] = (byOrganizationType[orgType] || 0) + 1;

        // Count by country
        const country = data.registeredAddress?.country || 'Unknown';
        byCountry[country] = (byCountry[country] || 0) + 1;

        // Count by lines of business
        if (data.linesOfBusiness) {
          data.linesOfBusiness.forEach((lob) => {
            byLinesOfBusiness[lob] = (byLinesOfBusiness[lob] || 0) + 1;
          });
        }

        // Count by status
        byStatus[data.status] = (byStatus[data.status] || 0) + 1;
      });

      setReportData({
        totalMembers: members.length,
        byOrganizationType,
        byCountry,
        byLinesOfBusiness,
        byStatus,
        members
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!reportData) return;

    setGenerating(true);
    try {
      // Dynamically import jsPDF
      const { jsPDF } = await import('jspdf');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;

      // Helper function to add new page if needed
      const checkNewPage = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // Title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 85, 116); // FASE navy
      doc.text('FASE Membership Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Summary Box
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 85, 116);
      doc.text(`Total Active Members: ${reportData.totalMembers}`, pageWidth / 2, yPos + 15, { align: 'center' });
      yPos += 35;

      // Organization Types Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 85, 116);
      doc.text('Organization Types', margin, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);

      const sortedOrgTypes = Object.entries(reportData.byOrganizationType)
        .sort((a, b) => b[1] - a[1]);

      sortedOrgTypes.forEach(([type, count]) => {
        const percentage = ((count / reportData.totalMembers) * 100).toFixed(1);
        doc.text(`${type}: ${count} (${percentage}%)`, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 10;

      // Countries Section
      checkNewPage(50);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 85, 116);
      doc.text('Countries', margin, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);

      const sortedCountries = Object.entries(reportData.byCountry)
        .sort((a, b) => b[1] - a[1]);

      sortedCountries.forEach(([country, count]) => {
        checkNewPage(8);
        const percentage = ((count / reportData.totalMembers) * 100).toFixed(1);
        doc.text(`${country}: ${count} (${percentage}%)`, margin + 5, yPos);
        yPos += 6;
      });
      yPos += 10;

      // Lines of Business Section
      checkNewPage(50);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 85, 116);
      doc.text('Lines of Business', margin, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);

      const sortedLoB = Object.entries(reportData.byLinesOfBusiness)
        .sort((a, b) => b[1] - a[1]);

      if (sortedLoB.length === 0) {
        doc.text('No lines of business data available', margin + 5, yPos);
        yPos += 6;
      } else {
        sortedLoB.forEach(([lob, count]) => {
          checkNewPage(8);
          doc.text(`${lob}: ${count} members`, margin + 5, yPos);
          yPos += 6;
        });
      }

      // Detailed Member List (if detailed report selected)
      if (selectedReportType === 'detailed') {
        doc.addPage();
        yPos = margin;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 85, 116);
        doc.text('Member Directory', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        // Sort members alphabetically
        const sortedMembers = [...reportData.members].sort((a, b) =>
          (a.organizationName || '').localeCompare(b.organizationName || '')
        );

        sortedMembers.forEach((member, index) => {
          checkNewPage(25);

          // Member name
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(45, 85, 116);
          doc.text(`${index + 1}. ${member.organizationName || 'Unknown'}`, margin, yPos);
          yPos += 5;

          // Member details
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 80);

          const details = [];
          if (member.organizationType) details.push(`Type: ${member.organizationType}`);
          if (member.registeredAddress?.country) details.push(`Country: ${member.registeredAddress.country}`);
          if (member.linesOfBusiness?.length) {
            details.push(`Lines: ${member.linesOfBusiness.slice(0, 3).join(', ')}${member.linesOfBusiness.length > 3 ? '...' : ''}`);
          }

          if (details.length > 0) {
            doc.text(details.join(' | '), margin + 5, yPos);
            yPos += 8;
          } else {
            yPos += 3;
          }
        });
      }

      // Footer on last page
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        'FASE - Fédération des Agences de Souscription Européennes',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      // Save the PDF
      const fileName = `FASE-Membership-Report-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setGenerating(false);
    }
  };

  const formatPercentage = (count: number, total: number) => {
    return ((count / total) * 100).toFixed(1);
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
        <Button onClick={loadReportData} variant="secondary" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const sortedOrgTypes = Object.entries(reportData.byOrganizationType).sort((a, b) => b[1] - a[1]);
  const sortedCountries = Object.entries(reportData.byCountry).sort((a, b) => b[1] - a[1]);
  const sortedLoB = Object.entries(reportData.byLinesOfBusiness).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Generate Reports</h3>
          <p className="text-sm text-gray-600">
            View membership statistics and generate PDF reports
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedReportType}
            onChange={(e) => setSelectedReportType(e.target.value as 'summary' | 'detailed')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          >
            <option value="summary">Summary Report</option>
            <option value="detailed">Detailed Report (with member list)</option>
          </select>
          <Button
            onClick={generatePDF}
            disabled={generating}
            variant="primary"
          >
            {generating ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-fase-navy text-white rounded-lg p-6">
        <div className="text-3xl font-bold">{reportData.totalMembers}</div>
        <div className="text-fase-cream/80">Active Members</div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Organization Types */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-fase-navy mb-4">Organization Types</h4>
          <div className="space-y-3">
            {sortedOrgTypes.map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-sm text-gray-700">{type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-fase-navy">{count}</span>
                  <span className="text-xs text-gray-500">
                    ({formatPercentage(count, reportData.totalMembers)}%)
                  </span>
                </div>
              </div>
            ))}
            {sortedOrgTypes.length === 0 && (
              <p className="text-sm text-gray-500 italic">No data available</p>
            )}
          </div>
        </div>

        {/* Countries */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-fase-navy mb-4">Countries</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {sortedCountries.map(([country, count]) => (
              <div key={country} className="flex justify-between items-center">
                <span className="text-sm text-gray-700">{country}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-fase-navy">{count}</span>
                  <span className="text-xs text-gray-500">
                    ({formatPercentage(count, reportData.totalMembers)}%)
                  </span>
                </div>
              </div>
            ))}
            {sortedCountries.length === 0 && (
              <p className="text-sm text-gray-500 italic">No data available</p>
            )}
          </div>
        </div>

        {/* Lines of Business */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-fase-navy mb-4">Lines of Business</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {sortedLoB.map(([lob, count]) => (
              <div key={lob} className="flex justify-between items-center">
                <span className="text-sm text-gray-700">{lob}</span>
                <span className="text-sm font-medium text-fase-navy">{count}</span>
              </div>
            ))}
            {sortedLoB.length === 0 && (
              <p className="text-sm text-gray-500 italic">No lines of business data</p>
            )}
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-fase-navy mb-4">Distribution Overview</h4>

        {/* Organization Type Bar Chart */}
        <div className="mb-6">
          <h5 className="text-sm font-medium text-gray-700 mb-3">By Organization Type</h5>
          <div className="space-y-2">
            {sortedOrgTypes.map(([type, count]) => {
              const percentage = (count / reportData.totalMembers) * 100;
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24 truncate">{type}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-fase-navy h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-fase-navy w-16 text-right">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Country Distribution */}
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-3">Top Countries</h5>
          <div className="space-y-2">
            {sortedCountries.slice(0, 10).map(([country, count]) => {
              const percentage = (count / reportData.totalMembers) * 100;
              return (
                <div key={country} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-32 truncate">{country}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-fase-gold h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-fase-navy w-16 text-right">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
