'use client';

import Modal from '@/components/Modal';
import Button from '@/components/Button';
import type { RendezvousRegistration, RendezvousPaymentStatus } from '@/lib/admin-types';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: RendezvousRegistration | null;
  onConfirm: (registrationId: string, newStatus: RendezvousPaymentStatus) => Promise<void>;
  updating: boolean;
}

export default function StatusChangeModal({
  isOpen,
  onClose,
  registration,
  onConfirm,
  updating,
}: StatusChangeModalProps) {
  if (!registration) return null;

  const handleConfirm = () => {
    onConfirm(registration.registrationId, 'confirmed');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Payment Received"
      maxWidth="md"
    >
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <p className="text-yellow-800">
            You are about to confirm that payment has been received for:
          </p>
          <div className="mt-2 font-medium text-yellow-900">
            {registration.billingInfo?.company} - €{(registration.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-sm text-yellow-700 mt-1">
            Invoice: {registration.invoiceNumber}
          </div>
        </div>

        <p className="text-gray-600 text-sm">
          This will update the registration status to &quot;Confirmed&quot; and the attendees will be marked as registered for the event.
        </p>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={updating}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={updating}
          >
            {updating ? 'Updating...' : 'Confirm Payment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
