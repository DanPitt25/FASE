'use client';

/**
 * InvoiceContext - Shared context for invoice generation in the admin portal
 *
 * Provides:
 * - Centralized invoice data for pre-population
 * - Navigation trigger to switch to Invoices tab
 * - Support for all invoice types (membership, rendezvous, paid, etc.)
 *
 * Usage:
 * 1. Wrap admin portal with <InvoiceProvider>
 * 2. Use useInvoice() hook in components
 * 3. Call prepareInvoice() to pre-populate and navigate to Invoices tab
 */

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export type InvoiceType =
  | 'membership'           // Regular FASE membership invoice
  | 'membership_paid'      // PAID confirmation for membership
  | 'rendezvous'           // MGA Rendezvous registration invoice
  | 'rendezvous_paid'      // PAID confirmation for rendezvous
  | 'custom'               // Fully custom invoice
  | 'credit_note';         // Credit/refund

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  isDiscount?: boolean;
}

export interface InvoiceAddress {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}

export interface InvoiceAttendee {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
}

export interface InvoiceData {
  // Type
  type: InvoiceType;
  isPaid: boolean;

  // Source reference (for linking back)
  sourceType?: 'member' | 'rendezvous' | 'transaction';
  sourceId?: string;

  // Bill To
  organizationName: string;
  contactName?: string;
  email?: string;
  address?: InvoiceAddress;
  vatNumber?: string;

  // Line Items
  lineItems: InvoiceLineItem[];

  // Currency & Language
  currency: 'EUR' | 'GBP' | 'USD' | 'auto';
  locale: 'en' | 'fr' | 'de' | 'es' | 'it' | 'nl';

  // Rendezvous-specific
  attendees?: InvoiceAttendee[];
  organizationType?: 'mga' | 'carrier_broker' | 'service_provider';
  isFaseMember?: boolean;
  isAsaseMember?: boolean;

  // Payment info (for PAID invoices)
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;

  // Existing invoice number (for regeneration)
  invoiceNumber?: string;
  registrationId?: string;
}

export interface InvoiceContextValue {
  // Pending invoice data (set by other tabs, consumed by InvoicesTab)
  pendingInvoice: InvoiceData | null;

  // Navigation callback (set by AdminConsoleDashboard)
  navigateToInvoices: (() => void) | null;
  setNavigateCallback: (callback: () => void) => void;

  // Actions
  prepareInvoice: (data: InvoiceData) => void;
  clearPendingInvoice: () => void;

  // Toast
  toast: { show: boolean; type: 'success' | 'error' | 'info'; message: string } | null;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  clearToast: () => void;
}

// ============================================================================
// Helper to generate line item ID
// ============================================================================

export function generateLineItemId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ============================================================================
// Default invoice data factory
// ============================================================================

export function createDefaultInvoiceData(type: InvoiceType = 'custom'): InvoiceData {
  return {
    type,
    isPaid: type.endsWith('_paid'),
    organizationName: '',
    lineItems: [],
    currency: 'EUR',
    locale: 'en',
  };
}

// ============================================================================
// Context
// ============================================================================

const InvoiceContext = createContext<InvoiceContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface InvoiceProviderProps {
  children: ReactNode;
}

export function InvoiceProvider({ children }: InvoiceProviderProps) {
  const [pendingInvoice, setPendingInvoice] = useState<InvoiceData | null>(null);
  const navigateCallbackRef = useRef<(() => void) | null>(null);
  const [toast, setToast] = useState<InvoiceContextValue['toast']>(null);

  // Use ref to avoid re-render loops - this function identity never changes
  const setNavigateCallbackHandler = useCallback((callback: () => void) => {
    navigateCallbackRef.current = callback;
  }, []);

  const prepareInvoice = useCallback((data: InvoiceData) => {
    // Ensure line items have IDs
    const dataWithIds: InvoiceData = {
      ...data,
      lineItems: data.lineItems.map(item => ({
        ...item,
        id: item.id || generateLineItemId(),
      })),
    };

    setPendingInvoice(dataWithIds);

    // Navigate to invoices tab if callback is set
    if (navigateCallbackRef.current) {
      navigateCallbackRef.current();
    }
  }, []);

  const clearPendingInvoice = useCallback(() => {
    setPendingInvoice(null);
  }, []);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ show: true, type, message });
    // Auto-clear after 5 seconds
    setTimeout(() => setToast(null), 5000);
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  const value: InvoiceContextValue = {
    pendingInvoice,
    navigateToInvoices: navigateCallbackRef.current,
    setNavigateCallback: setNavigateCallbackHandler,
    prepareInvoice,
    clearPendingInvoice,
    toast,
    showToast,
    clearToast,
  };

  return (
    <InvoiceContext.Provider value={value}>
      {children}
    </InvoiceContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useInvoice(): InvoiceContextValue {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoice must be used within an InvoiceProvider');
  }
  return context;
}

// ============================================================================
// Toast Component
// ============================================================================

export function InvoiceToast() {
  const { toast, clearToast } = useInvoice();

  if (!toast?.show) return null;

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[toast.type];

  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50`}>
      <span>{toast.message}</span>
      <button
        onClick={clearToast}
        className="text-white/80 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
