'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import type { RendezvousRegistration } from '@/lib/admin-types';

interface EditPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: RendezvousRegistration | null;
  onSave: (priceData: {
    totalPrice: number;
    subtotal: number;
    discount: number;
    companyIsFaseMember: boolean;
    isAsaseMember: boolean;
  }) => Promise<void>;
  saving: boolean;
  error: string | null;
}

export default function EditPriceModal({
  isOpen,
  onClose,
  registration,
  onSave,
  saving,
  error,
}: EditPriceModalProps) {
  const [totalPrice, setTotalPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [isFaseMember, setIsFaseMember] = useState(false);
  const [isAsaseMember, setIsAsaseMember] = useState(false);

  useEffect(() => {
    if (isOpen && registration) {
      setTotalPrice(registration.totalPrice || 0);
      setDiscount(registration.discount || 0);
      setIsFaseMember(registration.companyIsFaseMember || false);
      setIsAsaseMember(registration.isAsaseMember || false);
    }
  }, [isOpen, registration]);

  const handleSave = () => {
    onSave({
      totalPrice,
      subtotal: totalPrice,
      discount,
      companyIsFaseMember: isFaseMember,
      isAsaseMember,
    });
  };

  if (!registration) return null;

  const numAttendees = registration.numberOfAttendees || registration.attendees?.length || 1;
  const pricePerTicket = totalPrice / numAttendees;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Price - ${registration.invoiceNumber || registration.billingInfo?.company || ''}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-2">
            Company: <span className="font-medium text-gray-900">{registration.billingInfo?.company}</span>
          </div>
          <div className="text-sm text-gray-600">
            Attendees: <span className="font-medium text-gray-900">{numAttendees}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Price (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={totalPrice}
              onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              €{pricePerTicket.toFixed(2)} per attendee
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Applied (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="flex items-center gap-6 p-3 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isFaseMember}
                onChange={(e) => setIsFaseMember(e.target.checked)}
                className="w-4 h-4 text-fase-navy border-gray-300 rounded focus:ring-fase-navy"
              />
              <span className="text-sm text-gray-700">FASE Member</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAsaseMember}
                onChange={(e) => setIsAsaseMember(e.target.checked)}
                className="w-4 h-4 text-fase-navy border-gray-300 rounded focus:ring-fase-navy"
              />
              <span className="text-sm text-gray-700">ASASE Member</span>
            </label>
          </div>
        </div>

        <div className="bg-fase-navy text-white p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm">Total Price:</span>
            <span className="text-xl font-bold">
              €{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Note: This only updates the stored price. To generate a new invoice with the updated price, use &quot;Edit Invoice&quot; instead.
        </p>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Price'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
