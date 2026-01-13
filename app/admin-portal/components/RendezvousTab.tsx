'use client';

import { useState, useEffect } from 'react';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';

interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
}

interface RendezvousRegistration {
  id: string;
  registrationId: string;
  invoiceNumber: string;
  billingInfo: {
    company: string;
    billingEmail: string;
    country: string;
    address?: string;
    organizationType: string;
  };
  attendees: Attendee[];
  totalPrice: number;
  subtotal: number;
  vatAmount: number;
  currency: string;
  numberOfAttendees: number;
  companyIsFaseMember: boolean;
  isAsaseMember: boolean;
  membershipType: string;
  discount: number;
  paymentMethod: 'card' | 'bank_transfer';
  paymentStatus: 'paid' | 'pending_bank_transfer' | 'confirmed';
  stripeSessionId?: string;
  invoiceUrl?: string;
  createdAt: any;
  status: string;
}

type PaymentStatus = 'paid' | 'pending_bank_transfer' | 'confirmed';

export default function RendezvousTab() {
  const [registrations, setRegistrations] = useState<RendezvousRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [selectedRegistration, setSelectedRegistration] = useState<RendezvousRegistration | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success?: boolean; error?: string } | null>(null);

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/rendezvous-registrations');
      if (!response.ok) throw new Error('Failed to fetch registrations');
      const data = await response.json();
      setRegistrations(data.registrations || []);
    } catch (error) {
      console.error('Error loading registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendConfirmationEmail = async (registration: RendezvousRegistration) => {
    try {
      setSendingEmail(true);
      setEmailResult(null);

      // Build attendee names from the attendees array
      const attendeeNames = registration.attendees
        ?.map(a => `${a.firstName} ${a.lastName}`.trim())
        .join(', ') || '';

      const response = await fetch('/api/send-rendezvous-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registration.billingInfo?.billingEmail,
          registrationId: registration.registrationId,
          companyName: registration.billingInfo?.company,
          organizationType: registration.billingInfo?.organizationType,
          numberOfAttendees: registration.attendees?.length || 1,
          totalAmount: registration.totalPrice || 0,
          attendeeNames,
          isFaseMember: registration.companyIsFaseMember,
          isComplimentary: registration.isAsaseMember,
          userLocale: 'en'
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      setEmailResult({ success: true });
    } catch (error: any) {
      console.error('Error sending confirmation email:', error);
      setEmailResult({ error: error.message || 'Failed to send email' });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleStatusUpdate = async (registrationId: string, newStatus: PaymentStatus) => {
    try {
      setUpdating(true);
      const response = await fetch('/api/admin/update-rendezvous-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');

      // Update local state
      setRegistrations(prev =>
        prev.map(reg =>
          reg.registrationId === registrationId
            ? { ...reg, paymentStatus: newStatus }
            : reg
        )
      );

      setShowStatusModal(false);
      setSelectedRegistration(null);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'pending_bank_transfer':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid (Stripe)';
      case 'confirmed':
        return 'Confirmed';
      case 'pending_bank_transfer':
        return 'Pending Payment';
      default:
        return status;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    return method === 'card' ? 'Card (Stripe)' : 'Bank Transfer';
  };

  const getOrgTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'mga': 'MGA',
      'carrier_broker': 'Carrier/Broker',
      'service_provider': 'Service Provider'
    };
    return labels[type] || type;
  };

  // Filter registrations
  const filteredRegistrations = statusFilter === 'all'
    ? registrations
    : registrations.filter(reg => reg.paymentStatus === statusFilter);

  // Calculate stats
  const stats = {
    total: registrations.length,
    totalAttendees: registrations.reduce((sum, reg) => sum + (reg.attendees?.length || 0), 0),
    paid: registrations.filter(r => r.paymentStatus === 'paid' || r.paymentStatus === 'confirmed').length,
    pending: registrations.filter(r => r.paymentStatus === 'pending_bank_transfer').length,
    revenue: registrations
      .filter(r => r.paymentStatus === 'paid' || r.paymentStatus === 'confirmed')
      .reduce((sum, r) => sum + (r.totalPrice || 0), 0)
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
        <p className="text-fase-black">Loading registrations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow border border-fase-light-gold p-4">
          <div className="text-2xl font-bold text-fase-navy">{stats.total}</div>
          <div className="text-sm text-gray-600">Registrations</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-fase-light-gold p-4">
          <div className="text-2xl font-bold text-fase-navy">{stats.totalAttendees}</div>
          <div className="text-sm text-gray-600">Total Attendees</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-fase-light-gold p-4">
          <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          <div className="text-sm text-gray-600">Paid</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-fase-light-gold p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">Pending Payment</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-fase-light-gold p-4">
          <div className="text-2xl font-bold text-fase-navy">€{stats.revenue.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Revenue</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">
            MGA Rendezvous Registrations ({filteredRegistrations.length})
          </h3>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
              className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            >
              <option value="all">All Statuses ({registrations.length})</option>
              <option value="paid">Paid - Stripe ({registrations.filter(r => r.paymentStatus === 'paid').length})</option>
              <option value="confirmed">Confirmed ({registrations.filter(r => r.paymentStatus === 'confirmed').length})</option>
              <option value="pending_bank_transfer">Pending Payment ({registrations.filter(r => r.paymentStatus === 'pending_bank_transfer').length})</option>
            </select>
            <Button variant="secondary" size="small" onClick={loadRegistrations}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Registrations Table */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-fase-light-gold">
            <thead className="bg-fase-navy">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Attendees
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRegistrations.map((registration) => (
                <tr key={registration.registrationId} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{registration.billingInfo?.company}</div>
                      <div className="text-gray-500 text-xs">{getOrgTypeLabel(registration.billingInfo?.organizationType)}</div>
                      {registration.companyIsFaseMember && (
                        <span className="inline-flex px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded mt-1">FASE</span>
                      )}
                      {registration.isAsaseMember && (
                        <span className="inline-flex px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded mt-1 ml-1">ASASE</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <div className="font-mono text-gray-900">{registration.invoiceNumber}</div>
                      {registration.invoiceUrl && (
                        <a
                          href={registration.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-fase-navy hover:text-fase-orange text-xs underline"
                        >
                          View PDF
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900">
                    {registration.attendees?.length || 0}
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      €{(registration.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    {registration.discount > 0 && (
                      <div className="text-xs text-green-600">-{registration.discount}%</div>
                    )}
                  </td>
                  <td className="px-3 py-4 text-xs text-gray-600">
                    {getPaymentMethodLabel(registration.paymentMethod)}
                  </td>
                  <td className="px-3 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(registration.paymentStatus)}`}>
                      {formatStatus(registration.paymentStatus)}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-xs text-gray-500">
                    {registration.createdAt?.toDate
                      ? registration.createdAt.toDate().toLocaleDateString('en-GB')
                      : registration.createdAt
                        ? new Date(registration.createdAt).toLocaleDateString('en-GB')
                        : 'Unknown'}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => {
                          setSelectedRegistration(registration);
                          setShowDetailModal(true);
                        }}
                      >
                        View
                      </Button>
                      {registration.paymentStatus === 'pending_bank_transfer' && (
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => {
                            setSelectedRegistration(registration);
                            setShowStatusModal(true);
                          }}
                        >
                          Confirm
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRegistrations.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-fase-black">No registrations found.</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedRegistration(null);
        }}
        title={`Registration Details - ${selectedRegistration?.billingInfo?.company}`}
        maxWidth="2xl"
      >
        {selectedRegistration && (
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-fase-navy mb-3">Company Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Company</div>
                  <div className="font-medium">{selectedRegistration.billingInfo?.company}</div>
                </div>
                <div>
                  <div className="text-gray-500">Type</div>
                  <div className="font-medium">{getOrgTypeLabel(selectedRegistration.billingInfo?.organizationType)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Billing Email</div>
                  <div className="font-medium">{selectedRegistration.billingInfo?.billingEmail}</div>
                </div>
                <div>
                  <div className="text-gray-500">Country</div>
                  <div className="font-medium">{selectedRegistration.billingInfo?.country}</div>
                </div>
                {selectedRegistration.billingInfo?.address && (
                  <div className="col-span-2">
                    <div className="text-gray-500">Address</div>
                    <div className="font-medium">{selectedRegistration.billingInfo?.address}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Attendees */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-fase-navy mb-3">Attendees ({selectedRegistration.attendees?.length || 0})</h4>
              <div className="space-y-2">
                {selectedRegistration.attendees?.map((attendee, index) => (
                  <div key={attendee.id || index} className="flex justify-between items-center text-sm bg-white p-2 rounded">
                    <div>
                      <div className="font-medium">{attendee.firstName} {attendee.lastName}</div>
                      <div className="text-gray-500 text-xs">{attendee.email}</div>
                    </div>
                    <div className="text-gray-500 text-xs">{attendee.jobTitle}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-fase-navy mb-3">Payment Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Invoice Number</div>
                  <div className="font-mono font-medium">{selectedRegistration.invoiceNumber}</div>
                </div>
                <div>
                  <div className="text-gray-500">Payment Method</div>
                  <div className="font-medium">{getPaymentMethodLabel(selectedRegistration.paymentMethod)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Subtotal</div>
                  <div className="font-medium">€{(selectedRegistration.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <div className="text-gray-500">VAT</div>
                  <div className="font-medium">€{(selectedRegistration.vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <div className="text-gray-500">Total</div>
                  <div className="font-medium text-lg">€{(selectedRegistration.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <div className="text-gray-500">Status</div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedRegistration.paymentStatus)}`}>
                    {formatStatus(selectedRegistration.paymentStatus)}
                  </span>
                </div>
                {selectedRegistration.discount > 0 && (
                  <div>
                    <div className="text-gray-500">Discount</div>
                    <div className="font-medium text-green-600">{selectedRegistration.discount}%</div>
                  </div>
                )}
                {selectedRegistration.invoiceUrl && (
                  <div className="col-span-2">
                    <div className="text-gray-500">Invoice PDF</div>
                    <a
                      href={selectedRegistration.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fase-navy hover:text-fase-orange underline"
                    >
                      Download Invoice
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDetailModal(false);
                  setShowEmailModal(true);
                }}
              >
                Send Confirmation Email
              </Button>
              {selectedRegistration.paymentStatus === 'pending_bank_transfer' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowDetailModal(false);
                    setShowStatusModal(true);
                  }}
                >
                  Confirm Payment
                </Button>
              )}
              <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Change Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSelectedRegistration(null);
        }}
        title="Confirm Payment Received"
        maxWidth="md"
      >
        {selectedRegistration && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-yellow-800">
                You are about to confirm that payment has been received for:
              </p>
              <div className="mt-2 font-medium text-yellow-900">
                {selectedRegistration.billingInfo?.company} - €{(selectedRegistration.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-yellow-700 mt-1">
                Invoice: {selectedRegistration.invoiceNumber}
              </div>
            </div>

            <p className="text-gray-600 text-sm">
              This will update the registration status to &quot;Confirmed&quot; and the attendees will be marked as registered for the event.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedRegistration(null);
                }}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleStatusUpdate(selectedRegistration.registrationId, 'confirmed')}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Confirm Payment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Email Confirmation Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => {
          setShowEmailModal(false);
          setSelectedRegistration(null);
          setEmailResult(null);
        }}
        title="Send Confirmation Email"
        maxWidth="md"
      >
        {selectedRegistration && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-blue-800 font-medium mb-2">
                Send MGA Rendezvous ticket confirmation to:
              </p>
              <div className="text-sm space-y-1">
                <p><span className="text-blue-600">Company:</span> {selectedRegistration.billingInfo?.company}</p>
                <p><span className="text-blue-600">Email:</span> {selectedRegistration.billingInfo?.billingEmail}</p>
                <p><span className="text-blue-600">Attendees:</span> {selectedRegistration.attendees?.length || 0}</p>
                <p>
                  <span className="text-blue-600">Amount:</span>{' '}
                  {selectedRegistration.isAsaseMember
                    ? <span className="text-green-600 font-medium">Complimentary (ASASE Member)</span>
                    : `€${(selectedRegistration.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  }
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Attendee List:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {selectedRegistration.attendees?.map((attendee, index) => (
                  <li key={attendee.id || index}>
                    {attendee.firstName} {attendee.lastName} ({attendee.email})
                  </li>
                ))}
              </ul>
            </div>

            {emailResult && (
              <div className={`p-4 rounded-lg ${emailResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {emailResult.success
                  ? 'Confirmation email sent successfully!'
                  : `Error: ${emailResult.error}`
                }
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEmailModal(false);
                  setSelectedRegistration(null);
                  setEmailResult(null);
                }}
                disabled={sendingEmail}
              >
                {emailResult?.success ? 'Close' : 'Cancel'}
              </Button>
              {!emailResult?.success && (
                <Button
                  variant="primary"
                  onClick={() => handleSendConfirmationEmail(selectedRegistration)}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
