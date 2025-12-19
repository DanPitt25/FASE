'use client';

import { UnifiedMember } from '../../../lib/unified-member';

interface OverviewTabProps {
  memberApplications: UnifiedMember[];
  loading: boolean;
}

// Calculate membership fee helper function
const calculateMembershipFee = (member: UnifiedMember): number => {
  // All memberships are corporate
  
  let baseFee = 900; // Default for MGA
  
  if (member.organizationType === 'MGA' && member.portfolio?.grossWrittenPremiums) {
    switch (member.portfolio.grossWrittenPremiums) {
      case '<10m': baseFee = 900; break;
      case '10-20m': baseFee = 1500; break;
      case '20-50m': baseFee = 2200; break; // Updated from 2000 to 2200
      case '50-100m': baseFee = 2800; break;
      case '100-500m': baseFee = 4200; break;
      case '500m+': baseFee = 7000; break; // Updated from 6400 to 7000
      default: baseFee = 900; break;
    }
  } else if (member.organizationType === 'carrier') {
    baseFee = 4000;
  } else if (member.organizationType === 'provider') {
    baseFee = 5000;
  }
  
  // Apply discount if member has other associations
  if (member.hasOtherAssociations) {
    baseFee = Math.round(baseFee * 0.8);
  }
  
  return baseFee;
};

export default function OverviewTab({ memberApplications, loading }: OverviewTabProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
        <p className="text-fase-black">Loading admin data...</p>
      </div>
    );
  }

  // Filter applications by status
  const pendingApplications = memberApplications.filter(member => member.status === 'pending');
  const pendingInvoiceApplications = memberApplications.filter(member => member.status === 'pending_invoice');
  const approvedApplications = memberApplications.filter(member => member.status === 'approved');
  const invoiceSentApplications = memberApplications.filter(member => member.status === 'invoice_sent');
  const flaggedApplications = memberApplications.filter(member => member.status === 'flagged');
  
  // Calculate expected revenue
  const totalExpectedRevenue = memberApplications
    .filter(member => ['pending', 'pending_invoice', 'invoice_sent'].includes(member.status))
    .reduce((total, member) => total + calculateMembershipFee(member), 0);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
          <h3 className="text-sm font-noto-serif font-semibold text-fase-navy mb-2">Pending Applications</h3>
          <p className="text-2xl font-bold text-yellow-600 mb-2">{pendingApplications.length}</p>
          <p className="text-fase-black text-xs">New applications</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
          <h3 className="text-sm font-noto-serif font-semibold text-fase-navy mb-2">Pending Invoice</h3>
          <p className="text-2xl font-bold text-orange-600 mb-2">{pendingInvoiceApplications.length}</p>
          <p className="text-fase-black text-xs">Awaiting invoice</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
          <h3 className="text-sm font-noto-serif font-semibold text-fase-navy mb-2">Active Members</h3>
          <p className="text-2xl font-bold text-green-600 mb-2">{approvedApplications.length}</p>
          <p className="text-fase-black text-xs">Approved members</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
          <h3 className="text-sm font-noto-serif font-semibold text-fase-navy mb-2">Invoice Sent</h3>
          <p className="text-2xl font-bold text-purple-600 mb-2">{invoiceSentApplications.length}</p>
          <p className="text-fase-black text-xs">Invoices sent</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
          <h3 className="text-sm font-noto-serif font-semibold text-fase-navy mb-2">Flagged</h3>
          <p className="text-2xl font-bold text-red-600 mb-2">{flaggedApplications.length}</p>
          <p className="text-fase-black text-xs">Flagged for review</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
          <h3 className="text-sm font-noto-serif font-semibold text-fase-navy mb-2">Expected Revenue</h3>
          <p className="text-2xl font-bold text-indigo-600 mb-2">€{totalExpectedRevenue.toLocaleString()}</p>
          <p className="text-fase-black text-xs">From pending apps</p>
        </div>
      </div>
      
      {/* Revenue Breakdown */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
        <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">Revenue Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-xl font-bold text-yellow-600">€{pendingApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
            <p className="text-sm text-yellow-800">Pending ({pendingApplications.length})</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-xl font-bold text-orange-600">€{pendingInvoiceApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
            <p className="text-sm text-orange-800">Pending Invoice ({pendingInvoiceApplications.length})</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-xl font-bold text-purple-600">€{invoiceSentApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
            <p className="text-sm text-purple-800">Invoice Sent ({invoiceSentApplications.length})</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-xl font-bold text-red-600">€{flaggedApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
            <p className="text-sm text-red-800">Flagged ({flaggedApplications.length})</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-xl font-bold text-green-600">€{approvedApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
            <p className="text-sm text-green-800">Approved ({approvedApplications.length})</p>
          </div>
        </div>
      </div>
    </div>
  );
}