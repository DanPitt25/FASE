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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newRegistration, setNewRegistration] = useState({
    company: '',
    billingEmail: '',
    country: '',
    address: '',
    organizationType: 'mga',
    companyIsFaseMember: false,
    isAsaseMember: false,
    totalPrice: 0,
    attendees: [{ firstName: '', lastName: '', email: '', jobTitle: '' }],
  });

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

  const handleDeleteRegistration = async () => {
    if (!selectedRegistration || deleteConfirmation !== 'DELETE') return;

    try {
      setDeleting(true);
      setDeleteError(null);

      const response = await fetch('/api/admin/delete-rendezvous-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: selectedRegistration.registrationId,
          confirmationPhrase: deleteConfirmation,
          invoiceNumber: selectedRegistration.invoiceNumber
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete registration');
      }

      // Remove from local state
      setRegistrations(prev =>
        prev.filter(reg => reg.registrationId !== selectedRegistration.registrationId)
      );

      setShowDeleteModal(false);
      setSelectedRegistration(null);
      setDeleteConfirmation('');
    } catch (error: any) {
      console.error('Error deleting registration:', error);
      setDeleteError(error.message || 'Failed to delete registration');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddRegistration = async () => {
    // Validate required fields
    if (!newRegistration.company || !newRegistration.billingEmail || !newRegistration.country) {
      setAddError('Please fill in all required company fields');
      return;
    }

    // Validate attendees
    for (const attendee of newRegistration.attendees) {
      if (!attendee.firstName || !attendee.lastName || !attendee.email || !attendee.jobTitle) {
        setAddError('Please fill in all required fields for each attendee');
        return;
      }
    }

    try {
      setAdding(true);
      setAddError(null);

      const response = await fetch('/api/admin/rendezvous-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingInfo: {
            company: newRegistration.company,
            billingEmail: newRegistration.billingEmail,
            country: newRegistration.country,
            address: newRegistration.address,
            organizationType: newRegistration.organizationType,
          },
          attendees: newRegistration.attendees,
          totalPrice: newRegistration.totalPrice,
          subtotal: newRegistration.totalPrice,
          numberOfAttendees: newRegistration.attendees.length,
          companyIsFaseMember: newRegistration.companyIsFaseMember,
          isAsaseMember: newRegistration.isAsaseMember,
          membershipType: newRegistration.isAsaseMember ? 'asase' : (newRegistration.companyIsFaseMember ? 'fase' : 'none'),
          discount: 0,
          paymentMethod: 'admin_manual',
          paymentStatus: 'confirmed',
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create registration');
      }

      // Add to local state
      setRegistrations(prev => [result.registration, ...prev]);

      // Reset form and close modal
      setShowAddModal(false);
      setNewRegistration({
        company: '',
        billingEmail: '',
        country: '',
        address: '',
        organizationType: 'mga',
        companyIsFaseMember: false,
        isAsaseMember: false,
        totalPrice: 0,
        attendees: [{ firstName: '', lastName: '', email: '', jobTitle: '' }],
      });
    } catch (error: any) {
      console.error('Error creating registration:', error);
      setAddError(error.message || 'Failed to create registration');
    } finally {
      setAdding(false);
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
            <Button variant="primary" size="small" onClick={() => setShowAddModal(true)}>
              + Add Registration
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

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDetailModal(false);
                  setShowDeleteModal(true);
                }}
                className="!bg-red-50 !text-red-700 !border-red-200 hover:!bg-red-100"
              >
                Delete Registration
              </Button>
              <div className="flex gap-2">
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedRegistration(null);
          setDeleteConfirmation('');
          setDeleteError(null);
        }}
        title="Delete Registration"
        maxWidth="md"
      >
        {selectedRegistration && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-red-800 font-semibold">
                    Warning: This action cannot be undone!
                  </p>
                  <p className="text-red-700 text-sm mt-1">
                    You are about to permanently delete this registration and all associated data.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-3">Registration to be deleted:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Company:</span>
                  <span className="font-medium">{selectedRegistration.billingInfo?.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice:</span>
                  <span className="font-mono">{selectedRegistration.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Attendees:</span>
                  <span>{selectedRegistration.attendees?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-medium">€{(selectedRegistration.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(selectedRegistration.paymentStatus)}`}>
                    {formatStatus(selectedRegistration.paymentStatus)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value.toUpperCase())}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Type DELETE here"
                disabled={deleting}
              />
            </div>

            {deleteError && (
              <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRegistration(null);
                  setDeleteConfirmation('');
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <button
                onClick={handleDeleteRegistration}
                disabled={deleting || deleteConfirmation !== 'DELETE'}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  deleteConfirmation === 'DELETE' && !deleting
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {deleting ? 'Deleting...' : 'Delete Registration'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Registration Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setAddError(null);
          setNewRegistration({
            company: '',
            billingEmail: '',
            country: '',
            address: '',
            organizationType: 'mga',
            companyIsFaseMember: false,
            isAsaseMember: false,
            totalPrice: 0,
            attendees: [{ firstName: '', lastName: '', email: '', jobTitle: '' }],
          });
        }}
        title="Add Registration"
        maxWidth="2xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Company Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-fase-navy mb-3">Company Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={newRegistration.company}
                  onChange={(e) => setNewRegistration({ ...newRegistration, company: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={adding}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Email *</label>
                <input
                  type="email"
                  value={newRegistration.billingEmail}
                  onChange={(e) => setNewRegistration({ ...newRegistration, billingEmail: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={adding}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                <input
                  type="text"
                  value={newRegistration.country}
                  onChange={(e) => setNewRegistration({ ...newRegistration, country: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={adding}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Type</label>
                <select
                  value={newRegistration.organizationType}
                  onChange={(e) => setNewRegistration({ ...newRegistration, organizationType: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={adding}
                >
                  <option value="mga">MGA</option>
                  <option value="carrier_broker">Carrier/Broker</option>
                  <option value="service_provider">Service Provider</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={newRegistration.address}
                  onChange={(e) => setNewRegistration({ ...newRegistration, address: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={adding}
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRegistration.companyIsFaseMember}
                    onChange={(e) => setNewRegistration({ ...newRegistration, companyIsFaseMember: e.target.checked })}
                    className="rounded border-gray-300 text-fase-navy focus:ring-fase-navy"
                    disabled={adding}
                  />
                  <span className="text-sm text-gray-700">FASE Member</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRegistration.isAsaseMember}
                    onChange={(e) => setNewRegistration({ ...newRegistration, isAsaseMember: e.target.checked })}
                    className="rounded border-gray-300 text-fase-navy focus:ring-fase-navy"
                    disabled={adding}
                  />
                  <span className="text-sm text-gray-700">ASASE Member</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Price (€)</label>
                <input
                  type="number"
                  value={newRegistration.totalPrice}
                  onChange={(e) => setNewRegistration({ ...newRegistration, totalPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={adding}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Attendees */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-fase-navy">Attendees ({newRegistration.attendees.length})</h4>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setNewRegistration({
                  ...newRegistration,
                  attendees: [...newRegistration.attendees, { firstName: '', lastName: '', email: '', jobTitle: '' }]
                })}
                disabled={adding}
              >
                + Add Attendee
              </Button>
            </div>
            <div className="space-y-4">
              {newRegistration.attendees.map((attendee, index) => (
                <div key={index} className="bg-white p-3 rounded border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Attendee {index + 1}</span>
                    {newRegistration.attendees.length > 1 && (
                      <button
                        onClick={() => setNewRegistration({
                          ...newRegistration,
                          attendees: newRegistration.attendees.filter((_, i) => i !== index)
                        })}
                        className="text-red-600 hover:text-red-800 text-sm"
                        disabled={adding}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="First Name *"
                      value={attendee.firstName}
                      onChange={(e) => {
                        const updated = [...newRegistration.attendees];
                        updated[index].firstName = e.target.value;
                        setNewRegistration({ ...newRegistration, attendees: updated });
                      }}
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      disabled={adding}
                    />
                    <input
                      type="text"
                      placeholder="Last Name *"
                      value={attendee.lastName}
                      onChange={(e) => {
                        const updated = [...newRegistration.attendees];
                        updated[index].lastName = e.target.value;
                        setNewRegistration({ ...newRegistration, attendees: updated });
                      }}
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      disabled={adding}
                    />
                    <input
                      type="email"
                      placeholder="Email *"
                      value={attendee.email}
                      onChange={(e) => {
                        const updated = [...newRegistration.attendees];
                        updated[index].email = e.target.value;
                        setNewRegistration({ ...newRegistration, attendees: updated });
                      }}
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      disabled={adding}
                    />
                    <input
                      type="text"
                      placeholder="Job Title *"
                      value={attendee.jobTitle}
                      onChange={(e) => {
                        const updated = [...newRegistration.attendees];
                        updated[index].jobTitle = e.target.value;
                        setNewRegistration({ ...newRegistration, attendees: updated });
                      }}
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      disabled={adding}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {addError && (
            <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm">
              {addError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setAddError(null);
                setNewRegistration({
                  company: '',
                  billingEmail: '',
                  country: '',
                  address: '',
                  organizationType: 'mga',
                  companyIsFaseMember: false,
                  isAsaseMember: false,
                  totalPrice: 0,
                  attendees: [{ firstName: '', lastName: '', email: '', jobTitle: '' }],
                });
              }}
              disabled={adding}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddRegistration}
              disabled={adding}
            >
              {adding ? 'Creating...' : 'Create Registration'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
