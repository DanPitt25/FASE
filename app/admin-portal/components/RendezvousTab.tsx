'use client';

import { useState, useEffect, useMemo } from 'react';
import { getAuth } from 'firebase/auth';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
import AdminCountrySelect from './AdminCountrySelect';
import * as XLSX from 'xlsx';

// Helper to get auth token
const getAuthToken = async (): Promise<string | null> => {
  const auth = getAuth();
  return auth.currentUser?.getIdToken() || null;
};

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
  additionalInfo?: { specialRequests?: string };
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
  paymentStatus: 'paid' | 'pending_bank_transfer' | 'confirmed' | 'pending' | 'complimentary';
  stripeSessionId?: string;
  invoiceUrl?: string;
  createdAt: any;
  status: string;
}

interface InterestRegistration {
  id: string;
  billingInfo: {
    company: string;
    billingEmail: string;
  };
  additionalContacts?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
  registrationType: string;
  submittedAt: string;
  createdAt: any;
  status: string;
  source: string;
}

type PaymentStatus = 'paid' | 'pending_bank_transfer' | 'confirmed' | 'pending' | 'complimentary';
type ViewMode = 'attendees' | 'companies' | 'issues';

// Flattened attendee for the attendee view
interface FlatAttendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  company: string;
  country: string;
  organizationType: string;
  paymentStatus: PaymentStatus;
  invoiceNumber: string;
  registrationId: string;
  isFaseMember: boolean;
  isAsaseMember: boolean;
  totalPrice: number;
  createdAt: any;
}

export default function RendezvousTab() {
  const [registrations, setRegistrations] = useState<RendezvousRegistration[]>([]);
  const [interestRegistrations, setInterestRegistrations] = useState<InterestRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('attendees');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegistration, setSelectedRegistration] = useState<RendezvousRegistration | null>(null);
  const [selectedCompanyRegistrations, setSelectedCompanyRegistrations] = useState<RendezvousRegistration[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [previewingEmail, setPreviewingEmail] = useState(false);
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showEditAttendeesModal, setShowEditAttendeesModal] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<RendezvousRegistration | null>(null);
  const [editedAttendees, setEditedAttendees] = useState<Attendee[]>([]);
  const [savingAttendees, setSavingAttendees] = useState(false);
  const [editAttendeesError, setEditAttendeesError] = useState<string | null>(null);
  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [invoiceEditRegistration, setInvoiceEditRegistration] = useState<RendezvousRegistration | null>(null);
  const [invoiceTicketCount, setInvoiceTicketCount] = useState(1);
  const [invoiceUnitPrice, setInvoiceUnitPrice] = useState(0);
  const [invoiceMemberDiscount, setInvoiceMemberDiscount] = useState(false);
  const [invoiceCurrency, setInvoiceCurrency] = useState<'auto' | 'EUR' | 'GBP' | 'USD'>('auto');
  const [sortColumn, setSortColumn] = useState<string>('company');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
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
      const token = await getAuthToken();
      if (!token) {
        console.error('Not authenticated');
        return;
      }
      const response = await fetch('/api/admin/rendezvous-registrations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch registrations');
      const data = await response.json();
      const allRegistrations = data.registrations || [];

      // Separate interest registrations from actual paid/pending registrations
      const interest = allRegistrations.filter((r: any) => r.registrationType === 'interest');
      const actual = allRegistrations.filter((r: any) => r.registrationType !== 'interest');

      setInterestRegistrations(interest);
      setRegistrations(actual);
    } catch (error) {
      console.error('Error loading registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Flatten all attendees from all registrations
  const allAttendees = useMemo((): FlatAttendee[] => {
    const attendees: FlatAttendee[] = [];
    registrations.forEach(reg => {
      (reg.attendees || []).forEach(att => {
        attendees.push({
          id: att.id,
          firstName: att.firstName,
          lastName: att.lastName,
          email: att.email,
          jobTitle: att.jobTitle,
          company: reg.billingInfo?.company || '',
          country: reg.billingInfo?.country || '',
          organizationType: reg.billingInfo?.organizationType || '',
          paymentStatus: reg.paymentStatus,
          invoiceNumber: reg.invoiceNumber,
          registrationId: reg.registrationId,
          isFaseMember: reg.companyIsFaseMember,
          isAsaseMember: reg.isAsaseMember,
          totalPrice: reg.totalPrice,
          createdAt: reg.createdAt,
        });
      });
    });
    return attendees;
  }, [registrations]);

  // Calculate stats - simple and accurate
  const stats = useMemo(() => {
    const confirmed = registrations.filter(r => r.paymentStatus === 'paid' || r.paymentStatus === 'confirmed' || r.paymentStatus === 'complimentary');
    const pending = registrations.filter(r => r.paymentStatus === 'pending_bank_transfer' || r.paymentStatus === 'pending');

    const confirmedAttendees = confirmed.reduce((sum, r) => sum + (r.attendees?.length || 0), 0);
    const pendingAttendees = pending.reduce((sum, r) => sum + (r.attendees?.length || 0), 0);

    const confirmedRevenue = confirmed.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
    const pendingRevenue = pending.reduce((sum, r) => sum + (r.totalPrice || 0), 0);

    return {
      totalRegistrations: registrations.length,
      confirmedRegistrations: confirmed.length,
      pendingRegistrations: pending.length,
      totalAttendees: confirmedAttendees + pendingAttendees,
      confirmedAttendees,
      pendingAttendees,
      confirmedRevenue,
      pendingRevenue,
      totalRevenue: confirmedRevenue + pendingRevenue,
    };
  }, [registrations]);

  // Identify data quality issues
  const dataIssues = useMemo(() => {
    const issues: {
      duplicateEmails: { email: string; count: number; attendees: FlatAttendee[] }[];
      similarCompanies: { normalized: string; companies: string[] }[];
      missingData: { type: string; count: number; items: any[] }[];
    } = {
      duplicateEmails: [],
      similarCompanies: [],
      missingData: [],
    };

    // Find duplicate emails across all attendees
    const emailMap = new Map<string, FlatAttendee[]>();
    allAttendees.forEach(att => {
      const email = (att.email || '').toLowerCase().trim();
      if (email) {
        if (!emailMap.has(email)) emailMap.set(email, []);
        emailMap.get(email)!.push(att);
      }
    });
    emailMap.forEach((attendees, email) => {
      if (attendees.length > 1) {
        issues.duplicateEmails.push({ email, count: attendees.length, attendees });
      }
    });

    // Find similar company names (potential duplicates)
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const companyMap = new Map<string, Set<string>>();
    registrations.forEach(reg => {
      const company = reg.billingInfo?.company || '';
      const normalized = normalize(company);
      if (normalized.length > 3) {
        if (!companyMap.has(normalized)) companyMap.set(normalized, new Set());
        companyMap.get(normalized)!.add(company);
      }
    });
    companyMap.forEach((companies, normalized) => {
      if (companies.size > 1) {
        issues.similarCompanies.push({ normalized, companies: Array.from(companies) });
      }
    });

    // Find registrations with missing critical data
    const missingAttendees = registrations.filter(r => !r.attendees || r.attendees.length === 0);
    if (missingAttendees.length > 0) {
      issues.missingData.push({ type: 'Registrations without attendees', count: missingAttendees.length, items: missingAttendees });
    }

    const missingStatus = registrations.filter(r => !r.paymentStatus);
    if (missingStatus.length > 0) {
      issues.missingData.push({ type: 'Registrations without payment status', count: missingStatus.length, items: missingStatus });
    }

    return issues;
  }, [allAttendees, registrations]);

  const totalIssuesCount = dataIssues.duplicateEmails.length + dataIssues.similarCompanies.length +
    dataIssues.missingData.reduce((sum, m) => sum + m.count, 0);

  // Filter and sort attendees
  const filteredAttendees = useMemo(() => {
    let filtered = allAttendees;

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending_bank_transfer') {
        filtered = filtered.filter(a => a.paymentStatus === 'pending_bank_transfer' || a.paymentStatus === 'pending');
      } else {
        filtered = filtered.filter(a => a.paymentStatus === statusFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.firstName.toLowerCase().includes(q) ||
        a.lastName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.company.toLowerCase().includes(q) ||
        a.jobTitle.toLowerCase().includes(q)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortColumn) {
        case 'name':
          aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
          bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'company':
          aVal = a.company.toLowerCase();
          bVal = b.company.toLowerCase();
          break;
        case 'country':
          aVal = a.country.toLowerCase();
          bVal = b.country.toLowerCase();
          break;
        case 'status':
          aVal = a.paymentStatus;
          bVal = b.paymentStatus;
          break;
        default:
          aVal = a.company.toLowerCase();
          bVal = b.company.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allAttendees, statusFilter, searchQuery, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Group registrations by company for company view
  const companyGroups = useMemo(() => {
    const groups: { company: string; registrations: RendezvousRegistration[] }[] = [];
    const companyMap = new Map<string, RendezvousRegistration[]>();

    let filtered = registrations;
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending_bank_transfer') {
        filtered = filtered.filter(r => r.paymentStatus === 'pending_bank_transfer' || r.paymentStatus === 'pending');
      } else {
        filtered = filtered.filter(r => r.paymentStatus === statusFilter);
      }
    }

    filtered.forEach(reg => {
      const company = reg.billingInfo?.company?.toLowerCase().trim() || '';
      if (company) {
        if (!companyMap.has(company)) companyMap.set(company, []);
        companyMap.get(company)!.push(reg);
      }
    });

    companyMap.forEach((regs) => {
      groups.push({
        company: regs[0].billingInfo?.company || '',
        registrations: regs,
      });
    });

    groups.sort((a, b) => a.company.localeCompare(b.company));
    return groups;
  }, [registrations, statusFilter]);

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

  const handleStatusUpdate = async (registrationId: string, newStatus: PaymentStatus) => {
    try {
      setUpdating(true);
      const token = await getAuthToken();
      if (!token) {
        alert('Not authenticated');
        return;
      }
      const response = await fetch('/api/admin/update-rendezvous-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

      const token = await getAuthToken();
      if (!token) {
        setDeleteError('Not authenticated');
        return;
      }

      const response = await fetch('/api/admin/delete-rendezvous-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

  const handleGeneratePaidInvoice = async (registration: RendezvousRegistration) => {
    try {
      setGeneratingInvoice(true);

      const token = await getAuthToken();
      if (!token) {
        alert('Not authenticated');
        return;
      }

      const response = await fetch('/api/admin/generate-paid-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invoiceNumber: registration.invoiceNumber,
          registrationId: registration.registrationId,
          companyName: registration.billingInfo?.company || '',
          billingEmail: registration.billingInfo?.billingEmail || '',
          address: registration.billingInfo?.address || '',
          country: registration.billingInfo?.country || '',
          attendees: registration.attendees || [],
          pricePerTicket: registration.subtotal / (registration.numberOfAttendees || 1),
          numberOfTickets: registration.numberOfAttendees || 1,
          subtotal: registration.subtotal || 0,
          vatAmount: registration.vatAmount || 0,
          vatRate: 21,
          totalPrice: registration.totalPrice || 0,
          discount: registration.discount || 0,
          isFaseMember: registration.companyIsFaseMember || false,
          isAsaseMember: registration.isAsaseMember || false,
          organizationType: registration.billingInfo?.organizationType || 'mga'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate invoice');
      }

      // Create a download link for the PDF
      const pdfBlob = new Blob(
        [Uint8Array.from(atob(result.pdfBase64), c => c.charCodeAt(0))],
        { type: 'application/pdf' }
      );
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename || `${registration.invoiceNumber}-PAID.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error: any) {
      console.error('Error generating paid invoice:', error);
      alert('Failed to generate invoice: ' + (error.message || 'Unknown error'));
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleRegenerateUnpaidInvoice = async (registration: RendezvousRegistration) => {
    try {
      setGeneratingInvoice(true);

      const token = await getAuthToken();
      if (!token) {
        alert('Not authenticated');
        return;
      }

      const response = await fetch('/api/admin/regenerate-rendezvous-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invoiceNumber: registration.invoiceNumber,
          registrationId: registration.registrationId,
          companyName: registration.billingInfo?.company || '',
          billingEmail: registration.billingInfo?.billingEmail || '',
          address: registration.billingInfo?.address || '',
          country: registration.billingInfo?.country || '',
          attendees: registration.attendees || [],
          pricePerTicket: registration.subtotal / (registration.numberOfAttendees || 1),
          numberOfTickets: registration.numberOfAttendees || 1,
          subtotal: registration.subtotal || 0,
          vatAmount: registration.vatAmount || 0,
          vatRate: 21,
          totalPrice: registration.totalPrice || 0,
          discount: registration.discount || 0,
          isFaseMember: registration.companyIsFaseMember || false,
          isAsaseMember: registration.isAsaseMember || false,
          organizationType: registration.billingInfo?.organizationType || 'mga'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to regenerate invoice');
      }

      // Create a download link for the PDF
      const pdfBlob = new Blob(
        [Uint8Array.from(atob(result.pdfBase64), c => c.charCodeAt(0))],
        { type: 'application/pdf' }
      );
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename || `${registration.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Reload registrations to get updated invoice URL
      loadRegistrations();

    } catch (error: any) {
      console.error('Error regenerating invoice:', error);
      alert('Failed to regenerate invoice: ' + (error.message || 'Unknown error'));
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const openEditAttendeesModal = (registration: RendezvousRegistration) => {
    setEditingRegistration(registration);
    setEditedAttendees(
      (registration.attendees || []).map(a => ({ ...a }))
    );
    setEditAttendeesError(null);
    setShowEditAttendeesModal(true);
  };

  const handleSaveAttendees = async () => {
    if (!editingRegistration) return;

    // Validate
    for (const attendee of editedAttendees) {
      if (!attendee.firstName?.trim() || !attendee.lastName?.trim() || !attendee.email?.trim()) {
        setEditAttendeesError('Each attendee must have first name, last name, and email');
        return;
      }
    }

    try {
      setSavingAttendees(true);
      setEditAttendeesError(null);

      const token = await getAuthToken();
      if (!token) {
        setEditAttendeesError('Not authenticated');
        return;
      }

      const response = await fetch('/api/admin/rendezvous-registrations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          registrationId: editingRegistration.registrationId,
          attendees: editedAttendees,
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
            ? { ...reg, attendees: result.attendees, numberOfAttendees: result.attendees.length }
            : reg
        )
      );

      // Also update selectedCompanyRegistrations if viewing
      setSelectedCompanyRegistrations(prev =>
        prev.map(reg =>
          reg.registrationId === editingRegistration.registrationId
            ? { ...reg, attendees: result.attendees, numberOfAttendees: result.attendees.length }
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

  const openEditInvoiceModal = (registration: RendezvousRegistration) => {
    setInvoiceEditRegistration(registration);
    setInvoiceTicketCount(registration.numberOfAttendees || 1);
    // Base price is €800 for non-members, €400 for members (50% discount)
    const basePrice = 800;
    const hasMemberDiscount = registration.companyIsFaseMember || registration.isAsaseMember || (registration.discount !== undefined && registration.discount > 0);
    setInvoiceMemberDiscount(hasMemberDiscount);
    setInvoiceUnitPrice(hasMemberDiscount ? basePrice * 0.5 : basePrice);
    setInvoiceCurrency('auto');
    setShowEditInvoiceModal(true);
  };

  const handleGenerateCustomInvoice = async () => {
    if (!invoiceEditRegistration) return;

    try {
      setGeneratingInvoice(true);

      const token = await getAuthToken();
      if (!token) {
        alert('Not authenticated');
        return;
      }

      const newSubtotal = invoiceTicketCount * invoiceUnitPrice;

      const response = await fetch('/api/admin/regenerate-rendezvous-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invoiceNumber: invoiceEditRegistration.invoiceNumber,
          registrationId: invoiceEditRegistration.registrationId,
          companyName: invoiceEditRegistration.billingInfo?.company || '',
          billingEmail: invoiceEditRegistration.billingInfo?.billingEmail || '',
          address: invoiceEditRegistration.billingInfo?.address || '',
          country: invoiceEditRegistration.billingInfo?.country || '',
          attendees: invoiceEditRegistration.attendees || [],
          pricePerTicket: invoiceUnitPrice,
          numberOfTickets: invoiceTicketCount,
          subtotal: newSubtotal,
          vatAmount: 0,
          vatRate: 21,
          totalPrice: newSubtotal,
          discount: invoiceMemberDiscount ? 50 : 0,
          isFaseMember: invoiceMemberDiscount,
          isAsaseMember: false,
          organizationType: invoiceEditRegistration.billingInfo?.organizationType || 'mga',
          forceCurrency: invoiceCurrency === 'auto' ? undefined : invoiceCurrency
        })
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

      const token = await getAuthToken();
      if (!token) {
        setAddError('Not authenticated');
        return;
      }

      const response = await fetch('/api/admin/rendezvous-registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

  const findRegistrationByAttendee = (attendee: FlatAttendee): RendezvousRegistration | undefined => {
    return registrations.find(r => r.registrationId === attendee.registrationId);
  };

  const exportToExcel = () => {
    const data = allAttendees.map(a => ({
      'First Name': a.firstName,
      'Last Name': a.lastName,
      'Email': a.email,
      'Job Title': a.jobTitle,
      'Company': a.company,
      'Country': a.country,
      'Organization Type': getOrgTypeLabel(a.organizationType),
      'Payment Status': formatStatus(a.paymentStatus)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendees');
    XLSX.writeFile(workbook, `rendezvous-attendees-${new Date().toISOString().split('T')[0]}.xlsx`);
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
      {/* Stats Cards - Redesigned for clarity */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow border border-fase-light-gold p-4">
          <div className="text-3xl font-bold text-fase-navy">{stats.totalAttendees}</div>
          <div className="text-sm font-medium text-gray-700">Total Attendees</div>
          <div className="text-xs text-gray-500 mt-1">
            <span className="text-green-600">{stats.confirmedAttendees} confirmed</span>
            {stats.pendingAttendees > 0 && (
              <span className="text-yellow-600"> + {stats.pendingAttendees} pending</span>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-fase-light-gold p-4">
          <div className="text-3xl font-bold text-fase-navy">{stats.totalRegistrations}</div>
          <div className="text-sm font-medium text-gray-700">Registrations</div>
          <div className="text-xs text-gray-500 mt-1">
            <span className="text-green-600">{stats.confirmedRegistrations} confirmed</span>
            {stats.pendingRegistrations > 0 && (
              <span className="text-yellow-600"> + {stats.pendingRegistrations} pending</span>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-fase-light-gold p-4">
          <div className="text-3xl font-bold text-green-600">€{stats.confirmedRevenue.toLocaleString()}</div>
          <div className="text-sm font-medium text-gray-700">Confirmed Revenue</div>
          {stats.pendingRevenue > 0 && (
            <div className="text-xs text-yellow-600 mt-1">
              +€{stats.pendingRevenue.toLocaleString()} pending
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow border border-fase-light-gold p-4">
          <div className="text-3xl font-bold text-gray-500">{interestRegistrations.length}</div>
          <div className="text-sm font-medium text-gray-700">Interest Signups</div>
          <button
            onClick={() => setShowInterestModal(true)}
            className="text-xs text-fase-navy hover:text-fase-orange underline mt-1"
          >
            View list
          </button>
        </div>
      </div>

      {/* View Controls */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* View Mode Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('attendees')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'attendees'
                  ? 'bg-white text-fase-navy shadow-sm'
                  : 'text-gray-600 hover:text-fase-navy'
              }`}
            >
              Attendees ({stats.totalAttendees})
            </button>
            <button
              onClick={() => setViewMode('companies')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'companies'
                  ? 'bg-white text-fase-navy shadow-sm'
                  : 'text-gray-600 hover:text-fase-navy'
              }`}
            >
              Companies ({companyGroups.length})
            </button>
            <button
              onClick={() => setViewMode('issues')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'issues'
                  ? 'bg-white text-fase-navy shadow-sm'
                  : 'text-gray-600 hover:text-fase-navy'
              } ${totalIssuesCount > 0 ? 'relative' : ''}`}
            >
              Data Issues
              {totalIssuesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalIssuesCount}
                </span>
              )}
            </button>
          </div>

          {/* Filters and Actions */}
          <div className="flex flex-wrap gap-2 items-center">
            {viewMode !== 'issues' && (
              <>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-sm w-48 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
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
              </>
            )}
            <Button variant="secondary" size="small" onClick={loadRegistrations}>
              Refresh
            </Button>
            <Button variant="secondary" size="small" onClick={exportToExcel}>
              Export CSV
            </Button>
            <Button variant="primary" size="small" onClick={() => setShowAddModal(true)}>
              + Add Registration
            </Button>
          </div>
        </div>
      </div>

      {/* Attendees View */}
      {viewMode === 'attendees' && (
        <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-fase-light-gold">
              <thead className="bg-fase-navy">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-fase-navy/80"
                    onClick={() => handleSort('name')}
                  >
                    Name {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-fase-navy/80"
                    onClick={() => handleSort('company')}
                  >
                    Company {sortColumn === 'company' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Job Title</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Type</th>
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
                {filteredAttendees.map((attendee, index) => (
                  <tr key={`${attendee.registrationId}-${attendee.id}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {attendee.firstName} {attendee.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{attendee.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{attendee.company}</div>
                      <div className="flex gap-1 mt-0.5">
                        {attendee.isFaseMember && (
                          <span className="inline-flex px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">FASE</span>
                        )}
                        {attendee.isAsaseMember && (
                          <span className="inline-flex px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded">ASASE</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{attendee.jobTitle}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{getOrgTypeLabel(attendee.organizationType)}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(attendee.paymentStatus)}`}>
                        {formatStatus(attendee.paymentStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => {
                          const reg = findRegistrationByAttendee(attendee);
                          if (reg) {
                            const company = reg.billingInfo?.company?.toLowerCase().trim() || '';
                            const companyRegs = registrations.filter(r =>
                              (r.billingInfo?.company?.toLowerCase().trim() || '') === company
                            );
                            setSelectedCompanyRegistrations(companyRegs);
                            setSelectedRegistration(reg);
                            setShowDetailModal(true);
                          }
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredAttendees.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-fase-black">No attendees found.</p>
            </div>
          )}
        </div>
      )}

      {/* Companies View */}
      {viewMode === 'companies' && (
        <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-fase-light-gold">
              <thead className="bg-fase-navy">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Invoice</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Attendees</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companyGroups.map((group) => {
                  const totalAttendees = group.registrations.reduce((sum, r) => sum + (r.attendees?.length || 0), 0);
                  const totalAmount = group.registrations.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
                  const primaryReg = group.registrations[0];
                  const allConfirmed = group.registrations.every(r => r.paymentStatus === 'paid' || r.paymentStatus === 'confirmed' || r.paymentStatus === 'complimentary');
                  const hasPending = group.registrations.some(r => r.paymentStatus === 'pending_bank_transfer' || r.paymentStatus === 'pending');
                  const isSingleReg = group.registrations.length === 1;

                  return (
                    <tr key={group.company} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{group.company}</div>
                          <div className="text-gray-500 text-xs">{getOrgTypeLabel(primaryReg.billingInfo?.organizationType)}</div>
                          <div className="flex gap-1 mt-0.5">
                            {primaryReg.companyIsFaseMember && (
                              <span className="inline-flex px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">FASE</span>
                            )}
                            {primaryReg.isAsaseMember && (
                              <span className="inline-flex px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded">ASASE</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          {isSingleReg ? (
                            <>
                              <div className="font-mono text-gray-900">{primaryReg.invoiceNumber}</div>
                              {primaryReg.invoiceUrl && (
                                <a
                                  href={primaryReg.invoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-fase-navy hover:text-fase-orange text-xs underline"
                                >
                                  View PDF
                                </a>
                              )}
                            </>
                          ) : (
                            <div className="text-gray-500">{group.registrations.length} registrations</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">{totalAttendees}</td>
                      <td className="px-3 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          €{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          getStatusColor(isSingleReg ? primaryReg.paymentStatus : (allConfirmed ? 'paid' : 'pending_bank_transfer'))
                        }`}>
                          {isSingleReg ? formatStatus(primaryReg.paymentStatus) : (allConfirmed ? 'Confirmed' : 'Partial')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium">
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => {
                              setSelectedCompanyRegistrations(group.registrations);
                              setSelectedRegistration(group.registrations[0]);
                              setShowDetailModal(true);
                            }}
                          >
                            View
                          </Button>
                          {hasPending && (
                            <Button
                              variant="primary"
                              size="small"
                              onClick={() => {
                                const pendingReg = group.registrations.find(r => r.paymentStatus === 'pending_bank_transfer' || r.paymentStatus === 'pending');
                                if (pendingReg) {
                                  setSelectedRegistration(pendingReg);
                                  setShowStatusModal(true);
                                }
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
          {companyGroups.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-fase-black">No companies found.</p>
            </div>
          )}
        </div>
      )}

      {/* Data Issues View */}
      {viewMode === 'issues' && (
        <div className="space-y-6">
          {totalIssuesCount === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
              <div className="text-green-600 text-lg font-medium">No data issues detected</div>
              <p className="text-green-700 text-sm mt-1">All registration data looks clean.</p>
            </div>
          ) : (
            <>
              {/* Duplicate Emails */}
              {dataIssues.duplicateEmails.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Duplicate Email Addresses ({dataIssues.duplicateEmails.length})
                  </h3>
                  <p className="text-sm text-orange-700 mb-4">
                    These email addresses appear multiple times across registrations. This may indicate the same person registered multiple times, or someone entered their own email for multiple attendees.
                  </p>
                  <div className="space-y-3">
                    {dataIssues.duplicateEmails.map(({ email, count, attendees }) => (
                      <div key={email} className="bg-white rounded p-3 border border-orange-100">
                        <div className="font-medium text-gray-900 mb-2">
                          {email} <span className="text-orange-600 text-sm">({count} occurrences)</span>
                        </div>
                        <div className="space-y-1">
                          {attendees.map((att, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                              <div>
                                <span className="font-medium">{att.firstName} {att.lastName}</span>
                                <span className="text-gray-400 mx-2">·</span>
                                <span className="text-gray-500">{att.company}</span>
                              </div>
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(att.paymentStatus)}`}>
                                {formatStatus(att.paymentStatus)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Company Names */}
              {dataIssues.similarCompanies.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Similar Company Names ({dataIssues.similarCompanies.length})
                  </h3>
                  <p className="text-sm text-yellow-700 mb-4">
                    These company names are very similar and may be the same company registered with slightly different names.
                  </p>
                  <div className="space-y-2">
                    {dataIssues.similarCompanies.map(({ normalized, companies }) => (
                      <div key={normalized} className="bg-white rounded p-3 border border-yellow-100">
                        <div className="flex flex-wrap gap-2">
                          {companies.map((company, idx) => (
                            <span key={idx} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                              {company}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Data */}
              {dataIssues.missingData.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Missing Data
                  </h3>
                  <div className="space-y-2">
                    {dataIssues.missingData.map((issue, idx) => (
                      <div key={idx} className="bg-white rounded p-3 border border-red-100">
                        <div className="font-medium text-gray-900">
                          {issue.type}: <span className="text-red-600">{issue.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedRegistration(null);
          setSelectedCompanyRegistrations([]);
        }}
        title={`${selectedRegistration?.billingInfo?.company}`}
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

            {/* All Attendees from all registrations */}
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
                        <div className="text-gray-500 text-xs">{attendee.jobTitle}</div>
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(reg.paymentStatus)}`}>
                          {formatStatus(reg.paymentStatus)}
                        </span>
                      </div>
                    </div>
                  )) || []
                )}
              </div>
            </div>

            {/* Registrations */}
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

      {/* Interest Registrations Modal */}
      <Modal
        isOpen={showInterestModal}
        onClose={() => setShowInterestModal(false)}
        title={`Interest Signups (${interestRegistrations.length})`}
        maxWidth="4xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Companies that expressed interest but have not registered or paid.
          </p>

          {interestRegistrations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No interest signups found.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacts</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {interestRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {reg.billingInfo?.company}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {reg.billingInfo?.billingEmail}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {reg.additionalContacts?.length ? (
                          <div className="space-y-1">
                            {reg.additionalContacts.map((contact, idx) => (
                              <div key={contact.id || idx} className="text-xs">
                                {contact.firstName} {contact.lastName}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {reg.submittedAt
                          ? new Date(reg.submittedAt).toLocaleDateString('en-GB')
                          : reg.createdAt?._seconds
                            ? new Date(reg.createdAt._seconds * 1000).toLocaleDateString('en-GB')
                            : 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowInterestModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Attendees Modal */}
      <Modal
        isOpen={showEditAttendeesModal}
        onClose={() => {
          setShowEditAttendeesModal(false);
          setEditingRegistration(null);
          setEditedAttendees([]);
          setEditAttendeesError(null);
        }}
        title={`Edit Attendees - ${editingRegistration?.invoiceNumber || ''}`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {editAttendeesError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {editAttendeesError}
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{editedAttendees.length} attendee{editedAttendees.length !== 1 ? 's' : ''}</span>
            <button
              onClick={() => setEditedAttendees([...editedAttendees, { id: `new_${Date.now()}`, firstName: '', lastName: '', email: '', jobTitle: '' }])}
              className="text-fase-navy hover:text-fase-orange text-sm underline"
            >
              + Add Attendee
            </button>
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {editedAttendees.map((attendee, index) => (
              <div key={attendee.id || index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-600">Attendee {index + 1}</span>
                  {editedAttendees.length > 1 && (
                    <button
                      onClick={() => setEditedAttendees(editedAttendees.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={attendee.firstName}
                      onChange={(e) => {
                        const updated = [...editedAttendees];
                        updated[index] = { ...updated[index], firstName: e.target.value };
                        setEditedAttendees(updated);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={attendee.lastName}
                      onChange={(e) => {
                        const updated = [...editedAttendees];
                        updated[index] = { ...updated[index], lastName: e.target.value };
                        setEditedAttendees(updated);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                    <input
                      type="email"
                      value={attendee.email}
                      onChange={(e) => {
                        const updated = [...editedAttendees];
                        updated[index] = { ...updated[index], email: e.target.value };
                        setEditedAttendees(updated);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Job Title</label>
                    <input
                      type="text"
                      value={attendee.jobTitle}
                      onChange={(e) => {
                        const updated = [...editedAttendees];
                        updated[index] = { ...updated[index], jobTitle: e.target.value };
                        setEditedAttendees(updated);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditAttendeesModal(false);
                setEditingRegistration(null);
                setEditedAttendees([]);
                setEditAttendeesError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAttendees}
              disabled={savingAttendees}
            >
              {savingAttendees ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Invoice Modal */}
      <Modal
        isOpen={showEditInvoiceModal}
        onClose={() => {
          setShowEditInvoiceModal(false);
          setInvoiceEditRegistration(null);
        }}
        title={`Edit Invoice - ${invoiceEditRegistration?.invoiceNumber || ''}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Adjust the ticket quantity and unit price to generate a custom invoice.
          </p>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">
              Company: <span className="font-medium text-gray-900">{invoiceEditRegistration?.billingInfo?.company}</span>
            </div>
            <div className="text-sm text-gray-600">
              Organization Type: <span className="font-medium text-gray-900">
                {invoiceEditRegistration?.billingInfo?.organizationType === 'mga' ? 'MGA' :
                 invoiceEditRegistration?.billingInfo?.organizationType === 'carrier_broker' ? 'Carrier/Broker' :
                 invoiceEditRegistration?.billingInfo?.organizationType === 'service_provider' ? 'Service Provider' :
                 invoiceEditRegistration?.billingInfo?.organizationType}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Tickets
                </label>
                <input
                  type="number"
                  min="0"
                  value={invoiceTicketCount}
                  onChange={(e) => setInvoiceTicketCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price (€)
                </label>
                <div className="text-lg font-semibold text-gray-900 py-2">€800.00</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="memberDiscount"
                checked={invoiceMemberDiscount}
                onChange={(e) => {
                  setInvoiceMemberDiscount(e.target.checked);
                  setInvoiceUnitPrice(e.target.checked ? 400 : 800);
                }}
                className="w-4 h-4 text-fase-navy border-gray-300 rounded focus:ring-fase-navy"
              />
              <label htmlFor="memberDiscount" className="text-sm text-gray-700">
                Apply 50% member discount (FASE/ASASE member)
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency / Bank Account
              </label>
              <select
                value={invoiceCurrency}
                onChange={(e) => setInvoiceCurrency(e.target.value as 'auto' | 'EUR' | 'GBP' | 'USD')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="auto">Auto (based on country: {invoiceEditRegistration?.billingInfo?.country || 'Unknown'})</option>
                <option value="EUR">EUR - Wise Belgium (IBAN: BE90 9057 9070 7732)</option>
                <option value="GBP">GBP - Wise UK (Sort: 60-84-64, Acc: 34068846)</option>
                <option value="USD">USD - Wise US Inc (Routing: 101019628, Acc: 218936745391)</option>
              </select>
            </div>
          </div>

          <div className="bg-fase-navy text-white p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>{invoiceTicketCount} ticket{invoiceTicketCount !== 1 ? 's' : ''} × €{invoiceUnitPrice.toFixed(2)}</span>
              {invoiceMemberDiscount && (
                <span className="text-fase-gold text-xs">50% discount applied</span>
              )}
            </div>
            <div className="flex justify-between items-center border-t border-white/20 pt-2">
              <span className="text-sm">Subtotal:</span>
              <span className="text-xl font-bold">
                €{(invoiceTicketCount * invoiceUnitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditInvoiceModal(false);
                setInvoiceEditRegistration(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateCustomInvoice}
              disabled={generatingInvoice}
            >
              {generatingInvoice ? 'Generating...' : 'Generate Invoice'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
