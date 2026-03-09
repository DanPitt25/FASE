'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import type { RendezvousRegistration, RendezvousAttendee } from '@/lib/admin-types';

interface EditAttendeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: RendezvousRegistration | null;
  onSave: (attendees: RendezvousAttendee[]) => Promise<void>;
  saving: boolean;
  error: string | null;
}

export default function EditAttendeesModal({
  isOpen,
  onClose,
  registration,
  onSave,
  saving,
  error,
}: EditAttendeesModalProps) {
  const [editedAttendees, setEditedAttendees] = useState<RendezvousAttendee[]>([]);

  // Initialize attendees when modal opens
  useEffect(() => {
    if (isOpen && registration) {
      setEditedAttendees(
        (registration.attendees || []).map(a => ({ ...a }))
      );
    }
  }, [isOpen, registration]);

  const handleClose = () => {
    setEditedAttendees([]);
    onClose();
  };

  const handleAddAttendee = () => {
    setEditedAttendees([
      ...editedAttendees,
      { id: `new_${Date.now()}`, firstName: '', lastName: '', email: '', jobTitle: '' }
    ]);
  };

  const handleRemoveAttendee = (index: number) => {
    setEditedAttendees(editedAttendees.filter((_, i) => i !== index));
  };

  const handleUpdateAttendee = (index: number, field: keyof RendezvousAttendee, value: string) => {
    const updated = [...editedAttendees];
    updated[index] = { ...updated[index], [field]: value };
    setEditedAttendees(updated);
  };

  const handleSave = () => {
    onSave(editedAttendees);
  };

  if (!registration) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Edit Attendees - ${registration.invoiceNumber || ''}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {editedAttendees.length} attendee{editedAttendees.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleAddAttendee}
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
                    onClick={() => handleRemoveAttendee(index)}
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
                    onChange={(e) => handleUpdateAttendee(index, 'firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={attendee.lastName}
                    onChange={(e) => handleUpdateAttendee(index, 'lastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                  <input
                    type="email"
                    value={attendee.email}
                    onChange={(e) => handleUpdateAttendee(index, 'email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={attendee.jobTitle}
                    onChange={(e) => handleUpdateAttendee(index, 'jobTitle', e.target.value)}
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
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
