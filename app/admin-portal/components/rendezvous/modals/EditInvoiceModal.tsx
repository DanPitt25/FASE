'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import type { RendezvousRegistration } from '@/lib/admin-types';

interface EditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: RendezvousRegistration | null;
  onGenerate: (options: {
    ticketCount: number;
    unitPrice: number;
    memberDiscount: boolean;
    currency: 'auto' | 'EUR' | 'GBP' | 'USD';
    vatNumber?: string;
  }) => Promise<void>;
  generating: boolean;
}

export default function EditInvoiceModal({
  isOpen,
  onClose,
  registration,
  onGenerate,
  generating,
}: EditInvoiceModalProps) {
  const [ticketCount, setTicketCount] = useState(1);
  const [unitPrice, setUnitPrice] = useState(800);
  const [memberDiscount, setMemberDiscount] = useState(false);
  const [currency, setCurrency] = useState<'auto' | 'EUR' | 'GBP' | 'USD'>('auto');
  const [vatNumber, setVatNumber] = useState('');

  // Initialize form when modal opens - use actual registration values
  useEffect(() => {
    if (isOpen && registration) {
      const numAttendees = registration.numberOfAttendees || 1;
      setTicketCount(numAttendees);
      // Calculate unit price from actual registration subtotal
      const actualUnitPrice = registration.subtotal
        ? registration.subtotal / numAttendees
        : 800;
      setUnitPrice(actualUnitPrice);
      const hasMemberDiscount = registration.companyIsFaseMember ||
        registration.isAsaseMember ||
        (registration.discount !== undefined && registration.discount > 0);
      setMemberDiscount(hasMemberDiscount);
      setCurrency('auto');
      setVatNumber(registration.billingInfo?.vatNumber || '');
    }
  }, [isOpen, registration]);

  const handleMemberDiscountChange = (checked: boolean) => {
    setMemberDiscount(checked);
    // Apply or remove 50% discount from current unit price
    if (checked && !memberDiscount) {
      setUnitPrice(unitPrice * 0.5);
    } else if (!checked && memberDiscount) {
      setUnitPrice(unitPrice * 2);
    }
  };

  const handleGenerate = () => {
    onGenerate({
      ticketCount,
      unitPrice,
      memberDiscount,
      currency,
      vatNumber: vatNumber.trim() || undefined,
    });
  };

  if (!registration) return null;

  const subtotal = ticketCount * unitPrice;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Invoice - ${registration.invoiceNumber || ''}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Adjust the ticket quantity and unit price to generate a custom invoice.
        </p>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-2">
            Company: <span className="font-medium text-gray-900">{registration.billingInfo?.company}</span>
          </div>
          <div className="text-sm text-gray-600">
            Organization Type: <span className="font-medium text-gray-900">
              {registration.billingInfo?.organizationType === 'mga' ? 'MGA' :
               registration.billingInfo?.organizationType === 'carrier_broker' ? 'Carrier/Broker' :
               registration.billingInfo?.organizationType === 'service_provider' ? 'Service Provider' :
               registration.billingInfo?.organizationType}
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
                value={ticketCount}
                onChange={(e) => setTicketCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Price (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">Negative for credit/refund</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="memberDiscount"
              checked={memberDiscount}
              onChange={(e) => handleMemberDiscountChange(e.target.checked)}
              className="w-4 h-4 text-fase-navy border-gray-300 rounded focus:ring-fase-navy"
            />
            <label htmlFor="memberDiscount" className="text-sm text-gray-700">
              Apply 50% member discount (sets unit price to €400)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency / Bank Account
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'auto' | 'EUR' | 'GBP' | 'USD')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="auto">Auto (based on country: {registration.billingInfo?.country || 'Unknown'})</option>
              <option value="EUR">EUR - Wise Belgium (IBAN: BE90 9057 9070 7732)</option>
              <option value="GBP">GBP - Wise UK (Sort: 60-84-64, Acc: 34068846)</option>
              <option value="USD">USD - Wise US Inc (Routing: 101019628, Acc: 218936745391)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client VAT Number (optional)
            </label>
            <input
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder="e.g., NL123456789B01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">Will appear on invoice under company details</p>
          </div>
        </div>

        <div className="bg-fase-navy text-white p-4 rounded-lg space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span>{ticketCount} ticket{ticketCount !== 1 ? 's' : ''} × €{unitPrice.toFixed(2)}</span>
            {memberDiscount && (
              <span className="text-fase-gold text-xs">50% discount applied</span>
            )}
          </div>
          <div className="flex justify-between items-center border-t border-white/20 pt-2">
            <span className="text-sm">Subtotal:</span>
            <span className="text-xl font-bold">
              €{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate Invoice'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
