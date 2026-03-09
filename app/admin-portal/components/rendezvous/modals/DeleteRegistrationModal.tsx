'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import type { RendezvousRegistration, RendezvousPaymentStatus } from '@/lib/admin-types';

interface DeleteRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: RendezvousRegistration | null;
  onDelete: () => Promise<void>;
  deleting: boolean;
  error: string | null;
}

const getStatusColor = (status: RendezvousPaymentStatus) => {
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

const formatStatus = (status: RendezvousPaymentStatus) => {
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

export default function DeleteRegistrationModal({
  isOpen,
  onClose,
  registration,
  onDelete,
  deleting,
  error,
}: DeleteRegistrationModalProps) {
  const [confirmation, setConfirmation] = useState('');

  const handleClose = () => {
    setConfirmation('');
    onClose();
  };

  if (!registration) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Registration"
      maxWidth="md"
    >
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
              <span className="font-medium">{registration.billingInfo?.company}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice:</span>
              <span className="font-mono">{registration.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Attendees:</span>
              <span>{registration.attendees?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount:</span>
              <span className="font-medium">€{(registration.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(registration.paymentStatus)}`}>
                {formatStatus(registration.paymentStatus)}
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
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Type DELETE here"
            disabled={deleting}
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={deleting}
          >
            Cancel
          </Button>
          <button
            onClick={onDelete}
            disabled={deleting || confirmation !== 'DELETE'}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              confirmation === 'DELETE' && !deleting
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {deleting ? 'Deleting...' : 'Delete Registration'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
