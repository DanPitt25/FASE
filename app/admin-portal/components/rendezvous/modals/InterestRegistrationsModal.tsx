'use client';

import Modal from '@/components/Modal';
import Button from '@/components/Button';
import type { RendezvousInterestRegistration } from '@/lib/admin-types';

interface InterestRegistrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  registrations: RendezvousInterestRegistration[];
}

export default function InterestRegistrationsModal({
  isOpen,
  onClose,
  registrations,
}: InterestRegistrationsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Interest Signups (${registrations.length})`}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Companies that expressed interest but have not registered or paid.
        </p>

        {registrations.length === 0 ? (
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
                {registrations.map((reg) => (
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
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
