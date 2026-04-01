'use client';

import { useState } from 'react';
import { useUnifiedAuth } from '../contexts/UnifiedAuthContext';
import { authPost, authFetch } from '../lib/auth-fetch';
import Button from './Button';
import {
  LINES_OF_BUSINESS,
  EUROPEAN_COUNTRIES,
  CapacityMatchingEntry,
} from '../lib/capacity-matching-constants';

interface FormEntry extends CapacityMatchingEntry {
  id: string;
}

export default function CapacityMatchingForm() {
  const { member } = useUnifiedAuth();

  // Contact info (pre-populated but editable for redundancy)
  const [companyName, setCompanyName] = useState(member?.organizationName || '');
  const [contactName, setContactName] = useState(member?.personalName || '');
  const [contactEmail, setContactEmail] = useState(member?.email || '');

  // Entries
  const [entries, setEntries] = useState<FormEntry[]>([
    {
      id: Date.now().toString(),
      lineOfBusiness: '',
      country: '',
      gwp2025: 0,
      targetYear1: 0,
      targetYear2: 0,
      targetYear3: 0,
      notes: '',
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addEntry = () => {
    setEntries([
      ...entries,
      {
        id: Date.now().toString(),
        lineOfBusiness: '',
        country: '',
        gwp2025: 0,
        targetYear1: 0,
        targetYear2: 0,
        targetYear3: 0,
        notes: '',
      },
    ]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  const updateEntry = (id: string, field: keyof FormEntry, value: string | number) => {
    setEntries(
      entries.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }
    if (!contactName.trim()) {
      setError('Contact name is required');
      return;
    }
    if (!contactEmail.trim()) {
      setError('Contact email is required');
      return;
    }

    // Validate entries
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.lineOfBusiness) {
        setError(`Row ${i + 1}: Line of Business is required`);
        return;
      }
      if (!entry.country) {
        setError(`Row ${i + 1}: Country is required`);
        return;
      }
    }

    try {
      setSubmitting(true);

      const response = await authPost('/api/member/capacity-matching', {
        companyName,
        contactName,
        contactEmail,
        entries: entries.map(({ id, ...rest }) => rest),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <svg
          className="w-16 h-16 text-green-600 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-xl font-semibold text-green-800 mb-2">
          Submission Received
        </h3>
        <p className="text-green-700 mb-4">
          Thank you for submitting your growth ambitions. Our team will review your submission.
        </p>
        <Button
          onClick={() => {
            setSuccess(false);
            setEntries([
              {
                id: Date.now().toString(),
                lineOfBusiness: '',
                country: '',
                gwp2025: 0,
                targetYear1: 0,
                targetYear2: 0,
                targetYear3: 0,
                notes: '',
              },
            ]);
          }}
          variant="secondary"
        >
          Submit Another
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-fase-navy mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name *
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Email *
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              disabled={submitting}
            />
          </div>
        </div>
      </div>

      {/* Growth Targets */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-fase-navy">Growth Targets</h3>
          <Button onClick={addEntry} variant="secondary" size="small" disabled={submitting}>
            + Add Row
          </Button>
        </div>

        <div className="space-y-4">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">
                  Entry {index + 1}
                </span>
                {entries.length > 1 && (
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    disabled={submitting}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Line of Business */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Line of Business *
                  </label>
                  <select
                    value={entry.lineOfBusiness}
                    onChange={(e) =>
                      updateEntry(entry.id, 'lineOfBusiness', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    disabled={submitting}
                  >
                    <option value="">Select...</option>
                    {LINES_OF_BUSINESS.map((lob) => (
                      <option key={lob} value={lob}>
                        {lob}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country *
                  </label>
                  <select
                    value={entry.country}
                    onChange={(e) =>
                      updateEntry(entry.id, 'country', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    disabled={submitting}
                  >
                    <option value="">Select...</option>
                    {EUROPEAN_COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                {/* GWP 2025 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GWP 2025 (€)
                  </label>
                  <input
                    type="number"
                    value={entry.gwp2025 || ''}
                    onChange={(e) =>
                      updateEntry(entry.id, 'gwp2025', parseFloat(e.target.value) || 0)
                    }
                    placeholder="0 if new line"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    disabled={submitting}
                    min="0"
                  />
                </div>

                {/* Target Year 1 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Year 1 (€)
                  </label>
                  <input
                    type="number"
                    value={entry.targetYear1 || ''}
                    onChange={(e) =>
                      updateEntry(entry.id, 'targetYear1', parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    disabled={submitting}
                    min="0"
                  />
                </div>

                {/* Target Year 2 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Year 2 (€)
                  </label>
                  <input
                    type="number"
                    value={entry.targetYear2 || ''}
                    onChange={(e) =>
                      updateEntry(entry.id, 'targetYear2', parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    disabled={submitting}
                    min="0"
                  />
                </div>

                {/* Target Year 3 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Year 3 (€)
                  </label>
                  <input
                    type="number"
                    value={entry.targetYear3 || ''}
                    onChange={(e) =>
                      updateEntry(entry.id, 'targetYear3', parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    disabled={submitting}
                    min="0"
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={entry.notes}
                    onChange={(e) =>
                      updateEntry(entry.id, 'notes', e.target.value)
                    }
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Submit button */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit'}
        </Button>
      </div>
    </div>
  );
}
