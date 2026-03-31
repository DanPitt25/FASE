'use client';

/**
 * RendezvousManageTab - MANAGE functions for Rendezvous registrations
 *
 * MANAGE functions:
 * - Add new registration (full form with company info and attendees)
 * - Edit attendees (EditAttendeesModal)
 * - Change payment status (StatusChangeModal)
 * - Delete registration (DeleteRegistrationModal)
 * - Send confirmation emails (full email form with preview)
 * - Generate/regenerate invoices (paid and unpaid)
 * - Edit invoice details (EditInvoiceModal)
 *
 * All VIEW functions are in RendezvousViewTab.tsx
 */

import { useState, useEffect, useMemo } from 'react';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
import AdminCountrySelect from './AdminCountrySelect';
import { authFetch, authPost } from '@/lib/auth-fetch';
import type {
  RendezvousRegistration,
  RendezvousAttendee,
  RendezvousPaymentStatus,
  RendezvousAttendeeType,
} from '@/lib/admin-types';
import { toDate } from '@/lib/admin-types';
import {
  StatusChangeModal,
  DeleteRegistrationModal,
  EditAttendeesModal,
  EditInvoiceModal,
  EditPriceModal,
} from './rendezvous/modals';
import { useInvoice, InvoiceData, generateLineItemId } from '@/lib/contexts/InvoiceContext';

type Attendee = RendezvousAttendee;
type PaymentStatus = RendezvousPaymentStatus;

export default function RendezvousManageTab() {
  const { prepareInvoice } = useInvoice();
  const [registrations, setRegistrations] = useState<RendezvousRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('company');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Suppression state
  const [suppressedIds, setSuppressedIds] = useState<Set<string>>(new Set());
  const [showSuppressed, setShowSuppressed] = useState(false);

  // Selected registration for actions
  const [selectedRegistration, setSelectedRegistration] = useState<RendezvousRegistration | null>(null);
  const [selectedCompanyRegistrations, setSelectedCompanyRegistrations] = useState<RendezvousRegistration[]>([]);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditAttendeesModal, setShowEditAttendeesModal] = useState(false);
  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [showEditPriceModal, setShowEditPriceModal] = useState(false);

  // Loading/action states
  const [updating, setUpdating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [previewingEmail, setPreviewingEmail] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [adding, setAdding] = useState(false);
  const [savingAttendees, setSavingAttendees] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);

  // Error states
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editAttendeesError, setEditAttendeesError] = useState<string | null>(null);
  const [editPriceError, setEditPriceError] = useState<string | null>(null);

  // Email form state
  const [emailResult, setEmailResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string | null>(null);
  const [emailForm, setEmailForm] = useState({
    to: '',
    cc: 'admin@fasemga.com',
    sender: 'admin@fasemga.com',
    language: 'en' as 'en' | 'fr' | 'de' | 'es' | 'it' | 'nl',
    companyName: '',
    organizationType: '',
    registrationId: '',
    attendeeNames: '',
    numberOfAttendees: 1,
    totalAmount: 0,
    isFaseMember: true,
    isComplimentary: false,
    specialRequests: ''
  });

  // Edit attendees state
  const [editingRegistration, setEditingRegistration] = useState<RendezvousRegistration | null>(null);

  // Edit invoice state
  const [invoiceEditRegistration, setInvoiceEditRegistration] = useState<RendezvousRegistration | null>(null);

  // Edit price state
  const [priceEditRegistration, setPriceEditRegistration] = useState<RendezvousRegistration | null>(null);

  // New registration form
  const [newRegistration, setNewRegistration] = useState<{
    registrationType: 'corporate' | 'personal';
    company: string;
    billingEmail: string;
    country: string;
    address: string;
    organizationType: string;
    companyIsFaseMember: boolean;
    isAsaseMember: boolean;
    totalPrice: number;
    attendees: { firstName: string; lastName: string; email: string; jobTitle: string; attendeeType: RendezvousAttendeeType }[];
  }>({
    registrationType: 'corporate',
    company: '',
    billingEmail: '',
    country: '',
    address: '',
    organizationType: 'mga',
    companyIsFaseMember: false,
    isAsaseMember: false,
    totalPrice: 0,
    attendees: [{ firstName: '', lastName: '', email: '', jobTitle: '', attendeeType: 'corporate' }],
  });

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/admin/rendezvous-registrations');
      if (!response.ok) throw new Error('Failed to fetch registrations');
      const data = await response.json();
      const allRegistrations = data.registrations || [];

      // Only actual registrations (not interest)
      const actual = allRegistrations.filter((r: any) => r.registrationType !== 'interest');
      setRegistrations(actual);
    } catch (error) {
      console.error('Error loading registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load registrations and suppressed IDs in parallel on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [registrationsResponse, suppressionResponse] = await Promise.all([
          authFetch('/api/admin/rendezvous-registrations'),
          authFetch('/api/admin/rendezvous/suppress').then(r => r.json()).catch(() => ({ success: false }))
        ]);

        if (!registrationsResponse.ok) throw new Error('Failed to fetch registrations');
        const data = await registrationsResponse.json();
        const allRegistrations = data.registrations || [];
        const actual = allRegistrations.filter((r: any) => r.registrationType !== 'interest');
        setRegistrations(actual);

        if (suppressionResponse.success && suppressionResponse.suppressedIds) {
          setSuppressedIds(new Set(suppressionResponse.suppressedIds));
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Handle suppress/unsuppress
  const handleToggleSuppressed = async (registrationId: string) => {
    const isSuppressed = suppressedIds.has(registrationId);
    try {
      const response = await authPost('/api/admin/rendezvous/suppress', {
        registrationId,
        suppressed: !isSuppressed,
      });

      if (!response.ok) {
        throw new Error('Failed to update suppression');
      }

      // Update local state
      setSuppressedIds(prev => {
        const newSet = new Set(prev);
        if (isSuppressed) {
          newSet.delete(registrationId);
        } else {
          newSet.add(registrationId);
        }
        return newSet;
      });
    } catch (err: any) {
      console.error('Failed to toggle suppressed:', err);
      alert(`Error: ${err.message}`);
    }
  };

  // Filter and sort registrations
  const filteredRegistrations = useMemo(() => {
    let filtered = registrations;

    // Filter by suppression status
    if (!showSuppressed) {
      filtered = filtered.filter(r => !suppressedIds.has(r.registrationId));
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending_bank_transfer') {
        filtered = filtered.filter(r => r.paymentStatus === 'pending_bank_transfer' || r.paymentStatus === 'pending');
      } else {
        filtered = filtered.filter(r => r.paymentStatus === statusFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        (r.billingInfo?.company || '').toLowerCase().includes(q) ||
        (r.billingInfo?.billingEmail || '').toLowerCase().includes(q) ||
        (r.invoiceNumber || '').toLowerCase().includes(q) ||
        r.attendees?.some(a =>
          a.firstName.toLowerCase().includes(q) ||
          a.lastName.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q)
        )
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortColumn) {
        case 'company':
          aVal = (a.billingInfo?.company || '').toLowerCase();
          bVal = (b.billingInfo?.company || '').toLowerCase();
          break;
        case 'status':
          aVal = a.paymentStatus;
          bVal = b.paymentStatus;
          break;
        case 'date':
          aVal = toDate(a.createdAt)?.getTime() || 0;
          bVal = toDate(b.createdAt)?.getTime() || 0;
          break;
        case 'amount':
          aVal = a.totalPrice || 0;
          bVal = b.totalPrice || 0;
          break;
        default:
          aVal = (a.billingInfo?.company || '').toLowerCase();
          bVal = (b.billingInfo?.company || '').toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [registrations, statusFilter, searchQuery, sortColumn, sortDirection, showSuppressed, suppressedIds]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Group registrations by company
  const getCompanyRegistrations = (registration: RendezvousRegistration): RendezvousRegistration[] => {
    const company = registration.billingInfo?.company?.toLowerCase().trim() || '';
    return registrations.filter(r =>
      (r.billingInfo?.company?.toLowerCase().trim() || '') === company
    );
  };

  // Email functions
  const initEmailForm = (registration: RendezvousRegistration) => {
    const attendeeNames = registration.attendees
      ?.map(a => `${a.firstName} ${a.lastName}`.trim())
      .join(', ') || '';

    setEmailForm({
      to: registration.billingInfo?.billingEmail || '',
      cc: 'admin@fasemga.com',
      sender: 'admin@fasemga.com',
      language: 'en',
      companyName: registration.billingInfo?.company || '',
      organizationType: registration.billingInfo?.organizationType || '',
      registrationId: registration.registrationId || '',
      attendeeNames,
      numberOfAttendees: registration.attendees?.length || 1,
      totalAmount: registration.totalPrice || 0,
      isFaseMember: registration.companyIsFaseMember ?? true,
      isComplimentary: registration.isAsaseMember ?? false,
      specialRequests: registration.additionalInfo?.specialRequests || ''
    });
    setEmailPreviewHtml(null);
    setEmailResult(null);
  };

  const buildEmailPayload = (isPreview: boolean) => ({
    preview: isPreview,
    email: emailForm.to,
    cc: emailForm.cc,
    freeformSender: emailForm.sender,
    registrationId: emailForm.registrationId,
    companyName: emailForm.companyName,
    organizationType: emailForm.organizationType,
    numberOfAttendees: emailForm.numberOfAttendees,
    totalAmount: emailForm.totalAmount,
    attendeeNames: emailForm.attendeeNames,
    isFaseMember: emailForm.isFaseMember,
    isComplimentary: emailForm.isComplimentary,
    specialRequests: emailForm.specialRequests,
    userLocale: emailForm.language
  });

  const handlePreviewEmail = async () => {
    try {
      setPreviewingEmail(true);
      setEmailPreviewHtml(null);

      const response = await fetch('/api/send-rendezvous-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildEmailPayload(true))
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate preview');
      }

      setEmailPreviewHtml(result.htmlContent);
    } catch (error: any) {
      console.error('Error previewing email:', error);
      setEmailResult({ error: error.message || 'Failed to generate preview' });
    } finally {
      setPreviewingEmail(false);
    }
  };

  const handleSendConfirmationEmail = async () => {
    try {
      setSendingEmail(true);
      setEmailResult(null);

      const response = await fetch('/api/send-rendezvous-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildEmailPayload(false))
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

  // Status update
  const handleStatusUpdate = async (registrationId: string, newStatus: PaymentStatus) => {
    try {
      setUpdating(true);
      const response = await authPost('/api/admin/update-rendezvous-status', { registrationId, status: newStatus });

      if (!response.ok) throw new Error('Failed to update status');

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

  // Delete registration
  const handleDeleteRegistration = async () => {
    if (!selectedRegistration) return;

    try {
      setDeleting(true);
      setDeleteError(null);

      const response = await authPost('/api/admin/delete-rendezvous-registration', {
        registrationId: selectedRegistration.registrationId,
        confirmationPhrase: 'DELETE',
        invoiceNumber: selectedRegistration.invoiceNumber
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete registration');
      }

      setRegistrations(prev =>
        prev.filter(reg => reg.registrationId !== selectedRegistration.registrationId)
      );

      setShowDeleteModal(false);
      setSelectedRegistration(null);
    } catch (error: any) {
      console.error('Error deleting registration:', error);
      setDeleteError(error.message || 'Failed to delete registration');
    } finally {
      setDeleting(false);
    }
  };

  // Invoice generation - opens unified Invoice Generator with pre-populated data
  const handleGeneratePaidInvoice = (registration: RendezvousRegistration) => {
    const pricePerTicket = registration.subtotal / (registration.numberOfAttendees || 1);

    // Parse address - split by comma into separate lines
    const addressString = registration.billingInfo?.address || '';
    const addressParts = addressString.split(',').map(part => part.trim()).filter(Boolean);

    // Distribute across line1, line2, and city (postcode often embedded in last part)
    const line1 = addressParts[0] || '';
    const line2 = addressParts.slice(1, -1).join(', ') || '';
    const cityPostcode = addressParts[addressParts.length - 1] || '';

    const invoiceData: InvoiceData = {
      type: 'rendezvous_paid',
      isPaid: true,
      sourceType: 'rendezvous',
      sourceId: registration.registrationId,

      // Bill To
      organizationName: registration.billingInfo?.company || '',
      email: registration.billingInfo?.billingEmail || '',
      address: {
        line1: line1,
        line2: line2,
        city: addressParts.length > 1 ? cityPostcode : '',
        postcode: '',
        country: registration.billingInfo?.country || '',
      },
      vatNumber: registration.billingInfo?.vatNumber || '',

      // Line Items
      lineItems: [{
        id: generateLineItemId(),
        description: `MGA Rendezvous 2026 - ${registration.billingInfo?.organizationType === 'mga' ? 'MGA' : registration.billingInfo?.organizationType === 'carrier_broker' ? 'Carrier/Broker' : 'Service Provider'} Pass`,
        quantity: registration.numberOfAttendees || 1,
        unitPrice: pricePerTicket,
      }],

      // Settings
      currency: 'EUR',
      locale: 'en',

      // Rendezvous-specific
      organizationType: (registration.billingInfo?.organizationType as 'mga' | 'carrier_broker' | 'service_provider') || 'mga',
      isFaseMember: registration.companyIsFaseMember || false,
      isAsaseMember: registration.isAsaseMember || false,
      invoiceNumber: registration.invoiceNumber,
      registrationId: registration.registrationId,

      // Attendees for reference
      attendees: registration.attendees?.map(a => ({
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        jobTitle: a.jobTitle,
      })) || [],
    };

    prepareInvoice(invoiceData);
  };

  const handleRegenerateUnpaidInvoice = (registration: RendezvousRegistration) => {
    const pricePerTicket = registration.subtotal / (registration.numberOfAttendees || 1);

    // Parse address - split by comma into separate lines
    const addressString = registration.billingInfo?.address || '';
    const addressParts = addressString.split(',').map(part => part.trim()).filter(Boolean);

    // Distribute across line1, line2, and city (postcode often embedded in last part)
    const line1 = addressParts[0] || '';
    const line2 = addressParts.slice(1, -1).join(', ') || '';
    const cityPostcode = addressParts[addressParts.length - 1] || '';

    const invoiceData: InvoiceData = {
      type: 'rendezvous',
      isPaid: false,
      sourceType: 'rendezvous',
      sourceId: registration.registrationId,

      // Bill To
      organizationName: registration.billingInfo?.company || '',
      email: registration.billingInfo?.billingEmail || '',
      address: {
        line1: line1,
        line2: line2,
        city: addressParts.length > 1 ? cityPostcode : '',
        postcode: '',
        country: registration.billingInfo?.country || '',
      },
      vatNumber: registration.billingInfo?.vatNumber || '',

      // Line Items
      lineItems: [{
        id: generateLineItemId(),
        description: `MGA Rendezvous 2026 - ${registration.billingInfo?.organizationType === 'mga' ? 'MGA' : registration.billingInfo?.organizationType === 'carrier_broker' ? 'Carrier/Broker' : 'Service Provider'} Pass`,
        quantity: registration.numberOfAttendees || 1,
        unitPrice: pricePerTicket,
      }],

      // Settings
      currency: 'EUR',
      locale: 'en',

      // Rendezvous-specific
      organizationType: (registration.billingInfo?.organizationType as 'mga' | 'carrier_broker' | 'service_provider') || 'mga',
      isFaseMember: registration.companyIsFaseMember || false,
      isAsaseMember: registration.isAsaseMember || false,
      invoiceNumber: registration.invoiceNumber,
      registrationId: registration.registrationId,

      // Attendees for reference
      attendees: registration.attendees?.map(a => ({
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        jobTitle: a.jobTitle,
      })) || [],
    };

    prepareInvoice(invoiceData);
  };

  // Edit attendees
  const openEditAttendeesModal = (registration: RendezvousRegistration) => {
    setEditingRegistration(registration);
    setEditAttendeesError(null);
    setShowEditAttendeesModal(true);
  };

  const handleSaveAttendees = async (attendees: Attendee[], billingInfo?: { address?: string }) => {
    if (!editingRegistration) return;

    // Validate
    for (const attendee of attendees) {
      if (!attendee.firstName?.trim() || !attendee.lastName?.trim() || !attendee.email?.trim()) {
        setEditAttendeesError('Each attendee must have first name, last name, and email');
        return;
      }
    }

    try {
      setSavingAttendees(true);
      setEditAttendeesError(null);

      const response = await authFetch('/api/admin/rendezvous-registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: editingRegistration.registrationId,
          attendees: attendees,
          billingInfo: billingInfo,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update attendees');
      }

      // Update local state
      setRegistrations(prev =>
        prev.map(reg =>
          reg.registrationId === editingRegistration.registrationId
            ? {
                ...reg,
                attendees: result.attendees,
                numberOfAttendees: result.attendees.length,
                billingInfo: result.billingInfo || reg.billingInfo,
              }
            : reg
        )
      );

      // Also update selectedCompanyRegistrations if viewing
      setSelectedCompanyRegistrations(prev =>
        prev.map(reg =>
          reg.registrationId === editingRegistration.registrationId
            ? {
                ...reg,
                attendees: result.attendees,
                numberOfAttendees: result.attendees.length,
                billingInfo: result.billingInfo || reg.billingInfo,
              }
            : reg
        )
      );

      setShowEditAttendeesModal(false);
      setEditingRegistration(null);
    } catch (error: any) {
      console.error('Error saving attendees:', error);
      setEditAttendeesError(error.message || 'Failed to save attendees');
    } finally {
      setSavingAttendees(false);
    }
  };

  // Edit invoice
  const openEditInvoiceModal = (registration: RendezvousRegistration) => {
    setInvoiceEditRegistration(registration);
    setShowEditInvoiceModal(true);
  };

  const handleGenerateCustomInvoice = async (options: {
    ticketCount: number;
    unitPrice: number;
    memberDiscount: boolean;
    currency: 'auto' | 'EUR' | 'GBP' | 'USD';
    vatNumber?: string;
  }) => {
    if (!invoiceEditRegistration) return;

    try {
      setGeneratingInvoice(true);

      const newSubtotal = options.ticketCount * options.unitPrice;

      const response = await authPost('/api/admin/regenerate-rendezvous-invoice', {
        invoiceNumber: invoiceEditRegistration.invoiceNumber,
        registrationId: invoiceEditRegistration.registrationId,
        companyName: invoiceEditRegistration.billingInfo?.company || '',
        billingEmail: invoiceEditRegistration.billingInfo?.billingEmail || '',
        address: invoiceEditRegistration.billingInfo?.address || '',
        country: invoiceEditRegistration.billingInfo?.country || '',
        attendees: invoiceEditRegistration.attendees || [],
        pricePerTicket: options.unitPrice,
        numberOfTickets: options.ticketCount,
        subtotal: newSubtotal,
        vatAmount: 0,
        vatRate: 21,
        totalPrice: newSubtotal,
        discount: options.memberDiscount ? 50 : 0,
        isFaseMember: options.memberDiscount,
        isAsaseMember: false,
        organizationType: invoiceEditRegistration.billingInfo?.organizationType || 'mga',
        forceCurrency: options.currency === 'auto' ? undefined : options.currency,
        vatNumber: options.vatNumber
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate invoice');
      }

      // Download the PDF
      const pdfBlob = new Blob(
        [Uint8Array.from(atob(result.pdfBase64), c => c.charCodeAt(0))],
        { type: 'application/pdf' }
      );
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename || `${invoiceEditRegistration.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setShowEditInvoiceModal(false);
      setInvoiceEditRegistration(null);
      loadRegistrations();

    } catch (error: any) {
      console.error('Error generating custom invoice:', error);
      alert('Failed to generate invoice: ' + (error.message || 'Unknown error'));
    } finally {
      setGeneratingInvoice(false);
    }
  };

  // Edit price
  const openEditPriceModal = (registration: RendezvousRegistration) => {
    setPriceEditRegistration(registration);
    setEditPriceError(null);
    setShowEditPriceModal(true);
  };

  const handleSavePrice = async (priceData: {
    totalPrice: number;
    subtotal: number;
    discount: number;
    companyIsFaseMember: boolean;
    isAsaseMember: boolean;
  }) => {
    if (!priceEditRegistration) return;

    try {
      setSavingPrice(true);
      setEditPriceError(null);

      const response = await authFetch('/api/admin/rendezvous-registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: priceEditRegistration.registrationId,
          priceData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update price');
      }

      // Update local state
      setRegistrations(prev =>
        prev.map(reg =>
          reg.registrationId === priceEditRegistration.registrationId
            ? {
                ...reg,
                totalPrice: priceData.totalPrice,
                subtotal: priceData.subtotal,
                discount: priceData.discount,
                companyIsFaseMember: priceData.companyIsFaseMember,
                isAsaseMember: priceData.isAsaseMember,
              }
            : reg
        )
      );

      // Also update selectedCompanyRegistrations if viewing
      setSelectedCompanyRegistrations(prev =>
        prev.map(reg =>
          reg.registrationId === priceEditRegistration.registrationId
            ? {
                ...reg,
                totalPrice: priceData.totalPrice,
                subtotal: priceData.subtotal,
                discount: priceData.discount,
                companyIsFaseMember: priceData.companyIsFaseMember,
                isAsaseMember: priceData.isAsaseMember,
              }
            : reg
        )
      );

      setShowEditPriceModal(false);
      setPriceEditRegistration(null);
    } catch (error: any) {
      console.error('Error saving price:', error);
      setEditPriceError(error.message || 'Failed to save price');
    } finally {
      setSavingPrice(false);
    }
  };

  // Add registration
  const handleAddRegistration = async () => {
    const isPersonalRegistration = newRegistration.registrationType === 'personal';

    // Validate required fields - company fields only required for corporate registrations
    if (!isPersonalRegistration) {
      if (!newRegistration.company || !newRegistration.billingEmail || !newRegistration.country) {
        setAddError('Please fill in all required company fields');
        return;
      }
    } else {
      // Personal registration needs at least an email for billing
      if (!newRegistration.billingEmail) {
        setAddError('Please provide a billing email');
        return;
      }
    }

    // Validate attendees
    for (const attendee of newRegistration.attendees) {
      // Personal attendees don't require job title
      const requiresJobTitle = attendee.attendeeType !== 'personal';
      if (!attendee.firstName || !attendee.lastName || !attendee.email || (requiresJobTitle && !attendee.jobTitle)) {
        setAddError('Please fill in all required fields for each attendee');
        return;
      }
    }

    try {
      setAdding(true);
      setAddError(null);

      const response = await authPost('/api/admin/rendezvous-registrations', {
        billingInfo: {
          company: isPersonalRegistration ? 'Personal Registration' : newRegistration.company,
          billingEmail: newRegistration.billingEmail,
          country: newRegistration.country || 'N/A',
          address: newRegistration.address,
          organizationType: isPersonalRegistration ? 'personal' : newRegistration.organizationType,
        },
        attendees: newRegistration.attendees,
        totalPrice: newRegistration.totalPrice,
        subtotal: newRegistration.totalPrice,
        numberOfAttendees: newRegistration.attendees.length,
        companyIsFaseMember: isPersonalRegistration ? false : newRegistration.companyIsFaseMember,
        isAsaseMember: isPersonalRegistration ? false : newRegistration.isAsaseMember,
        membershipType: isPersonalRegistration ? 'none' : (newRegistration.isAsaseMember ? 'asase' : (newRegistration.companyIsFaseMember ? 'fase' : 'none')),
        discount: 0,
        paymentMethod: 'admin_manual',
        paymentStatus: 'confirmed',
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
        registrationType: 'corporate',
        company: '',
        billingEmail: '',
        country: '',
        address: '',
        organizationType: 'mga',
        companyIsFaseMember: false,
        isAsaseMember: false,
        totalPrice: 0,
        attendees: [{ firstName: '', lastName: '', email: '', jobTitle: '', attendeeType: 'corporate' }],
      });
    } catch (error: any) {
      console.error('Error creating registration:', error);
      setAddError(error.message || 'Failed to create registration');
    } finally {
      setAdding(false);
    }
  };

  // Helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'complimentary':
        return 'bg-purple-100 text-purple-800';
      case 'pending_bank_transfer':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'confirmed':
        return 'Confirmed';
      case 'complimentary':
        return 'Complimentary';
      case 'pending_bank_transfer':
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const getOrgTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'mga': 'MGA',
      'carrier_broker': 'Carrier/Broker',
      'service_provider': 'Service Provider'
    };
    return labels[type] || type;
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
      {/* Header with Add button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-fase-navy">Manage Registrations</h2>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          + Add Registration
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search company, email, invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="confirmed">Confirmed</option>
            <option value="complimentary">Complimentary</option>
            <option value="pending_bank_transfer">Pending</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showSuppressed}
              onChange={(e) => setShowSuppressed(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show suppressed {suppressedIds.size > 0 && `(${suppressedIds.size})`}
          </label>
          <Button variant="secondary" size="small" onClick={loadRegistrations}>
            Refresh
          </Button>
          <div className="text-sm text-gray-500 ml-auto">
            {filteredRegistrations.length} registrations
          </div>
        </div>
      </div>

      {/* Registrations Table */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-fase-light-gold">
            <thead className="bg-fase-navy">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-fase-navy/80"
                  onClick={() => handleSort('company')}
                >
                  Company {sortColumn === 'company' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Invoice</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Attendees</th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-fase-navy/80"
                  onClick={() => handleSort('amount')}
                >
                  Amount {sortColumn === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-fase-navy/80"
                  onClick={() => handleSort('status')}
                >
                  Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRegistrations.map((reg) => {
                const isSuppressed = suppressedIds.has(reg.registrationId);
                return (
                  <tr key={reg.registrationId} className={`hover:bg-gray-50 ${isSuppressed ? 'opacity-50 bg-gray-100' : ''}`}>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{reg.billingInfo?.company}</div>
                        <div className="text-gray-500 text-xs">{reg.billingInfo?.billingEmail}</div>
                        <div className="flex gap-1 mt-0.5">
                          {reg.companyIsFaseMember && (
                            <span className="inline-flex px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">FASE</span>
                          )}
                          {reg.isAsaseMember && (
                            <span className="inline-flex px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded">ASASE</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <div className="font-mono text-gray-900">{reg.invoiceNumber}</div>
                        {reg.invoiceUrl && (
                          <a
                            href={reg.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-fase-navy hover:text-fase-orange text-xs underline"
                          >
                            View PDF
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">{reg.attendees?.length || 0}</td>
                    <td className="px-3 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        €{(reg.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reg.paymentStatus)}`}>
                          {formatStatus(reg.paymentStatus)}
                        </span>
                        {isSuppressed && (
                          <span className="inline-flex px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                            Hidden
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => {
                            setSelectedRegistration(reg);
                            setSelectedCompanyRegistrations(getCompanyRegistrations(reg));
                            setShowDetailModal(true);
                          }}
                        >
                          Manage
                        </Button>
                        {(reg.paymentStatus === 'pending_bank_transfer' || reg.paymentStatus === 'pending') && (
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => {
                              setSelectedRegistration(reg);
                              setShowStatusModal(true);
                            }}
                          >
                            Confirm
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredRegistrations.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-fase-black">No registrations found.</p>
          </div>
        )}
      </div>

      {/* Detail/Manage Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedRegistration(null);
          setSelectedCompanyRegistrations([]);
        }}
        title={`Manage: ${selectedRegistration?.billingInfo?.company}`}
        maxWidth="3xl"
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
              <h4 className="font-semibold text-fase-navy mb-3">
                Attendees ({selectedCompanyRegistrations.reduce((sum, r) => sum + (r.attendees?.length || 0), 0)})
              </h4>
              <div className="space-y-2">
                {selectedCompanyRegistrations.flatMap((reg, regIndex) =>
                  reg.attendees?.map((attendee, index) => (
                    <div key={`${regIndex}-${attendee.id || index}`} className="flex justify-between items-center text-sm bg-white p-2 rounded">
                      <div>
                        <div className="font-medium">{attendee.firstName} {attendee.lastName}</div>
                        <div className="text-gray-500 text-xs">{attendee.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {attendee.attendeeType === 'personal' && (
                          <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                            Personal
                          </span>
                        )}
                        <div className="text-gray-500 text-xs">{attendee.jobTitle || (attendee.attendeeType === 'personal' ? '—' : '')}</div>
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(reg.paymentStatus)}`}>
                          {formatStatus(reg.paymentStatus)}
                        </span>
                      </div>
                    </div>
                  )) || []
                )}
              </div>
            </div>

            {/* Registrations with action buttons */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-fase-navy mb-3">
                Registrations ({selectedCompanyRegistrations.length})
              </h4>
              <div className="space-y-3">
                {selectedCompanyRegistrations.map((reg, index) => (
                  <div key={reg.registrationId || index} className="bg-white p-3 rounded border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-mono text-sm font-medium">{reg.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">{reg.attendees?.length || 0} attendees</div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reg.paymentStatus)}`}>
                        {formatStatus(reg.paymentStatus)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs">Subtotal</div>
                        <div className="font-medium">€{(reg.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">VAT</div>
                        <div className="font-medium">€{(reg.vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Total</div>
                        <div className="font-medium">€{(reg.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => openEditAttendeesModal(reg)}
                        className="text-fase-navy hover:text-fase-orange text-xs underline"
                      >
                        Edit Attendees
                      </button>
                      <button
                        onClick={() => openEditPriceModal(reg)}
                        className="text-fase-navy hover:text-fase-orange text-xs underline"
                      >
                        Edit Price
                      </button>
                      {reg.invoiceUrl && (
                        <a
                          href={reg.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-fase-navy hover:text-fase-orange text-xs underline"
                        >
                          View Invoice
                        </a>
                      )}
                      <button
                        onClick={() => handleRegenerateUnpaidInvoice(reg)}
                        disabled={generatingInvoice}
                        className="text-fase-navy hover:text-fase-orange text-xs underline disabled:opacity-50"
                      >
                        {generatingInvoice ? 'Generating...' : 'New Invoice'}
                      </button>
                      <button
                        onClick={() => openEditInvoiceModal(reg)}
                        disabled={generatingInvoice}
                        className="text-purple-600 hover:text-purple-800 text-xs underline disabled:opacity-50"
                      >
                        Edit Invoice
                      </button>
                      <button
                        onClick={() => handleGeneratePaidInvoice(reg)}
                        disabled={generatingInvoice}
                        className="text-green-600 hover:text-green-800 text-xs underline disabled:opacity-50"
                      >
                        {generatingInvoice ? 'Generating...' : 'PAID Invoice'}
                      </button>
                      {(reg.paymentStatus === 'pending_bank_transfer' || reg.paymentStatus === 'pending') && (
                        <button
                          onClick={() => {
                            setSelectedRegistration(reg);
                            setShowDetailModal(false);
                            setShowStatusModal(true);
                          }}
                          className="text-green-600 hover:text-green-800 text-xs underline"
                        >
                          Confirm Payment
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedRegistration(reg);
                          setShowDetailModal(false);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-800 text-xs underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-fase-navy text-white p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-300">Total Revenue</div>
                  <div className="text-2xl font-bold">
                    €{selectedCompanyRegistrations.reduce((sum, r) => sum + (r.totalPrice || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-300">Total Attendees</div>
                  <div className="text-2xl font-bold">
                    {selectedCompanyRegistrations.reduce((sum, r) => sum + (r.attendees?.length || 0), 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Suppress Toggle */}
            {(() => {
              const isSuppressed = suppressedIds.has(selectedRegistration.registrationId);
              return (
                <div className={`${isSuppressed ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`text-sm font-semibold ${isSuppressed ? 'text-yellow-800' : 'text-gray-700'}`}>
                        {isSuppressed ? 'Registration is suppressed' : 'Suppress this registration'}
                      </h4>
                      <p className={`text-xs mt-1 ${isSuppressed ? 'text-yellow-700' : 'text-gray-500'}`}>
                        {isSuppressed
                          ? 'This registration is hidden from the View tab. Click to restore visibility.'
                          : 'Hide this registration from the View tab without deleting it.'}
                      </p>
                    </div>
                    <Button
                      variant={isSuppressed ? 'primary' : 'secondary'}
                      size="small"
                      onClick={() => handleToggleSuppressed(selectedRegistration.registrationId)}
                    >
                      {isSuppressed ? 'Unsuppress' : 'Suppress'}
                    </Button>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDetailModal(false);
                    if (selectedRegistration) initEmailForm(selectedRegistration);
                    setShowEmailModal(true);
                  }}
                >
                  Send Confirmation Email
                </Button>
                <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Change Modal */}
      <StatusChangeModal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSelectedRegistration(null);
        }}
        registration={selectedRegistration}
        onConfirm={handleStatusUpdate}
        updating={updating}
      />

      {/* Email Confirmation Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => {
          setShowEmailModal(false);
          setSelectedRegistration(null);
          setEmailResult(null);
          setEmailPreviewHtml(null);
        }}
        title="Send Confirmation Email"
        maxWidth="2xl"
      >
        {selectedRegistration && (
          <div className="space-y-5">
            {/* Row 1: Send From + Language */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Send From</label>
                <select
                  value={emailForm.sender}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, sender: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={sendingEmail}
                >
                  <option value="admin@fasemga.com">FASE Admin &lt;admin@fasemga.com&gt;</option>
                  <option value="william.pitt@fasemga.com">William Pitt &lt;william.pitt@fasemga.com&gt;</option>
                  <option value="info@fasemga.com">FASE Info &lt;info@fasemga.com&gt;</option>
                  <option value="media@fasemga.com">FASE Media &lt;media@fasemga.com&gt;</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  value={emailForm.language}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, language: e.target.value as typeof emailForm.language }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={sendingEmail}
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="es">Español</option>
                  <option value="it">Italiano</option>
                  <option value="nl">Nederlands</option>
                </select>
              </div>
            </div>

            {/* Row 2: To + CC */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
                <input
                  type="email"
                  value={emailForm.to}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={sendingEmail}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CC</label>
                <input
                  type="email"
                  value={emailForm.cc}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, cc: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={sendingEmail}
                />
              </div>
            </div>

            {/* Row 3: Company + Org Type + Registration ID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  value={emailForm.companyName}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={sendingEmail}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Org Type</label>
                <select
                  value={emailForm.organizationType}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, organizationType: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={sendingEmail}
                >
                  <option value="mga">MGA</option>
                  <option value="carrier_broker">Carrier/Broker</option>
                  <option value="service_provider">Service Provider</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration ID</label>
                <input
                  type="text"
                  value={emailForm.registrationId}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, registrationId: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={sendingEmail}
                />
              </div>
            </div>

            {/* Row 4: Attendees + Count + Amount */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Attendee Names</label>
                <input
                  type="text"
                  value={emailForm.attendeeNames}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, attendeeNames: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  placeholder="Name 1, Name 2, ..."
                  disabled={sendingEmail}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No. Attendees</label>
                <input
                  type="number"
                  value={emailForm.numberOfAttendees}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, numberOfAttendees: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={sendingEmail}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (€)</label>
                <input
                  type="number"
                  value={emailForm.totalAmount}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, totalAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={sendingEmail}
                />
              </div>
            </div>

            {/* Row 5: Checkboxes + Special Requests */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-6 pt-5">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={emailForm.isFaseMember}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, isFaseMember: e.target.checked }))}
                    disabled={sendingEmail}
                  />
                  FASE Member
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={emailForm.isComplimentary}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, isComplimentary: e.target.checked }))}
                    disabled={sendingEmail}
                  />
                  Complimentary
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                <input
                  type="text"
                  value={emailForm.specialRequests}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, specialRequests: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={sendingEmail}
                />
              </div>
            </div>

            {/* Preview */}
            {emailPreviewHtml && (
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 border-b">Email Preview</div>
                <iframe
                  srcDoc={emailPreviewHtml}
                  className="w-full bg-white"
                  style={{ height: '500px' }}
                  title="Email Preview"
                />
              </div>
            )}

            {/* Result */}
            {emailResult && (
              <div className={`p-4 rounded-lg ${emailResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {emailResult.success
                  ? 'Confirmation email sent successfully!'
                  : `Error: ${emailResult.error}`
                }
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEmailModal(false);
                  setSelectedRegistration(null);
                  setEmailResult(null);
                  setEmailPreviewHtml(null);
                }}
                disabled={sendingEmail}
              >
                {emailResult?.success ? 'Close' : 'Cancel'}
              </Button>
              {!emailResult?.success && (
                <>
                  <Button
                    variant="secondary"
                    onClick={handlePreviewEmail}
                    disabled={sendingEmail || previewingEmail}
                  >
                    {previewingEmail ? 'Loading...' : 'Preview'}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSendConfirmationEmail}
                    disabled={sendingEmail || previewingEmail}
                  >
                    {sendingEmail ? 'Sending...' : 'Send Email'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteRegistrationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedRegistration(null);
          setDeleteError(null);
        }}
        registration={selectedRegistration}
        onDelete={handleDeleteRegistration}
        deleting={deleting}
        error={deleteError}
      />

      {/* Add Registration Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setAddError(null);
          setNewRegistration({
            registrationType: 'corporate',
            company: '',
            billingEmail: '',
            country: '',
            address: '',
            organizationType: 'mga',
            companyIsFaseMember: false,
            isAsaseMember: false,
            totalPrice: 0,
            attendees: [{ firstName: '', lastName: '', email: '', jobTitle: '', attendeeType: 'corporate' }],
          });
        }}
        title="Add Registration"
        maxWidth="2xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Registration Type Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNewRegistration({
                ...newRegistration,
                registrationType: 'corporate',
                attendees: newRegistration.attendees.map(a => ({ ...a, attendeeType: 'corporate' as RendezvousAttendeeType }))
              })}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                newRegistration.registrationType === 'corporate'
                  ? 'bg-fase-navy text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              disabled={adding}
            >
              Corporate Registration
            </button>
            <button
              type="button"
              onClick={() => setNewRegistration({
                ...newRegistration,
                registrationType: 'personal',
                attendees: newRegistration.attendees.map(a => ({ ...a, attendeeType: 'personal' as RendezvousAttendeeType }))
              })}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                newRegistration.registrationType === 'personal'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              disabled={adding}
            >
              Personal Registration
            </button>
          </div>

          {newRegistration.registrationType === 'personal' && (
            <div className="bg-purple-50 border border-purple-200 text-purple-800 px-4 py-3 rounded-lg text-sm">
              Personal registrations are for individuals not representing a company (e.g., people between jobs).
            </div>
          )}

          {/* Company/Billing Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-fase-navy mb-3">
              {newRegistration.registrationType === 'personal' ? 'Billing Information' : 'Company Information'}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {newRegistration.registrationType === 'corporate' && (
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
              )}
              <div className={newRegistration.registrationType === 'personal' ? 'col-span-2' : ''}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Email *</label>
                <input
                  type="email"
                  value={newRegistration.billingEmail}
                  onChange={(e) => setNewRegistration({ ...newRegistration, billingEmail: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={adding}
                />
              </div>
              {newRegistration.registrationType === 'corporate' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                    <AdminCountrySelect
                      value={newRegistration.country}
                      onChange={(value) => setNewRegistration({ ...newRegistration, country: value })}
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
                </>
              )}
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
                  attendees: [...newRegistration.attendees, { firstName: '', lastName: '', email: '', jobTitle: '', attendeeType: newRegistration.registrationType as RendezvousAttendeeType }]
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
                    <select
                      value={attendee.attendeeType || 'corporate'}
                      onChange={(e) => {
                        const updated = [...newRegistration.attendees];
                        updated[index].attendeeType = e.target.value as 'corporate' | 'personal';
                        setNewRegistration({ ...newRegistration, attendees: updated });
                      }}
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      disabled={adding}
                    >
                      <option value="corporate">Corporate</option>
                      <option value="personal">Personal</option>
                    </select>
                    <input
                      type="text"
                      placeholder={attendee.attendeeType === 'personal' ? 'Job Title (optional)' : 'Job Title *'}
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
                  registrationType: 'corporate',
                  company: '',
                  billingEmail: '',
                  country: '',
                  address: '',
                  organizationType: 'mga',
                  companyIsFaseMember: false,
                  isAsaseMember: false,
                  totalPrice: 0,
                  attendees: [{ firstName: '', lastName: '', email: '', jobTitle: '', attendeeType: 'corporate' }],
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

      {/* Edit Attendees Modal */}
      <EditAttendeesModal
        isOpen={showEditAttendeesModal}
        onClose={() => {
          setShowEditAttendeesModal(false);
          setEditingRegistration(null);
          setEditAttendeesError(null);
        }}
        registration={editingRegistration}
        onSave={handleSaveAttendees}
        saving={savingAttendees}
        error={editAttendeesError}
      />

      {/* Edit Invoice Modal */}
      <EditInvoiceModal
        isOpen={showEditInvoiceModal}
        onClose={() => {
          setShowEditInvoiceModal(false);
          setInvoiceEditRegistration(null);
        }}
        registration={invoiceEditRegistration}
        onGenerate={handleGenerateCustomInvoice}
        generating={generatingInvoice}
      />

      {/* Edit Price Modal */}
      <EditPriceModal
        isOpen={showEditPriceModal}
        onClose={() => {
          setShowEditPriceModal(false);
          setPriceEditRegistration(null);
          setEditPriceError(null);
        }}
        registration={priceEditRegistration}
        onSave={handleSavePrice}
        saving={savingPrice}
        error={editPriceError}
      />
    </div>
  );
}
