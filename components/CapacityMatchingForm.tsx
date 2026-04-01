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

interface CapacityMatchingTranslations {
  title?: string;
  intro?: string;
  contact_info?: string;
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  growth_targets?: string;
  add_row?: string;
  entry?: string;
  remove?: string;
  line_of_business?: string;
  country?: string;
  select?: string;
  gwp_2025?: string;
  gwp_placeholder?: string;
  target_year_1?: string;
  target_year_2?: string;
  target_year_3?: string;
  notes?: string;
  notes_placeholder?: string;
  submit?: string;
  submitting?: string;
  success_title?: string;
  success_message?: string;
  submit_another?: string;
  errors?: {
    company_required?: string;
    contact_name_required?: string;
    contact_email_required?: string;
    line_of_business_required?: string;
    country_required?: string;
  };
  lines_of_business_options?: Record<string, string>;
}

interface CapacityMatchingFormProps {
  translations?: CapacityMatchingTranslations;
  // Magic link mode props
  magicLinkMode?: boolean;
  lockedCompanyName?: string;
  initialContactEmail?: string;
  magicLinkToken?: string;
  onSubmit?: (data: {
    contactName: string;
    contactEmail: string;
    entries: Omit<FormEntry, 'id'>[];
  }) => Promise<void>;
}

export default function CapacityMatchingForm({
  translations = {},
  magicLinkMode = false,
  lockedCompanyName,
  initialContactEmail = '',
  magicLinkToken,
  onSubmit,
}: CapacityMatchingFormProps) {
  // Helper for translations with fallbacks
  const t = (key: keyof CapacityMatchingTranslations, fallback: string): string => {
    return (translations[key] as string) || fallback;
  };
  const tError = (key: keyof NonNullable<CapacityMatchingTranslations['errors']>, fallback: string): string => {
    return translations.errors?.[key] || fallback;
  };
  // Get translated line of business label (falls back to English key)
  const tLob = (englishKey: string): string => {
    return translations.lines_of_business_options?.[englishKey] || englishKey;
  };
  const { member } = useUnifiedAuth();

  // Company name: use locked name for magic link mode, otherwise from member account
  const companyName = magicLinkMode ? (lockedCompanyName || '') : (member?.organizationName || '');

  // Contact info (pre-populated but editable)
  const [contactName, setContactName] = useState(member?.personalName || '');
  const [contactEmail, setContactEmail] = useState(
    magicLinkMode ? initialContactEmail : (member?.email || '')
  );

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
    if (!contactName.trim()) {
      setError(tError('contact_name_required', 'Contact name is required'));
      return;
    }
    if (!contactEmail.trim()) {
      setError(tError('contact_email_required', 'Contact email is required'));
      return;
    }

    // Validate entries
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.lineOfBusiness) {
        const errorMsg = tError('line_of_business_required', 'Row {{row}}: Line of Business is required');
        setError(errorMsg.replace('{{row}}', String(i + 1)));
        return;
      }
      if (!entry.country) {
        const errorMsg = tError('country_required', 'Row {{row}}: Country is required');
        setError(errorMsg.replace('{{row}}', String(i + 1)));
        return;
      }
    }

    try {
      setSubmitting(true);

      const entriesData = entries.map(({ id, ...rest }) => rest);

      if (magicLinkMode && onSubmit) {
        // Use custom submit handler for magic link mode
        await onSubmit({
          contactName,
          contactEmail,
          entries: entriesData,
        });
      } else {
        // Use authenticated API for member submissions
        const response = await authPost('/api/member/capacity-matching', {
          companyName,
          contactName,
          contactEmail,
          entries: entriesData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to submit');
        }
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
          {t('success_title', 'Submission Received')}
        </h3>
        <p className="text-green-700 mb-4">
          {t('success_message', 'Thank you for submitting your growth ambitions. Our team will review your submission and work to connect you with suitable capacity providers.')}
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
          {t('submit_another', 'Submit Another')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro text */}
      <p className="text-fase-black leading-relaxed">
        {t('intro', 'Help us connect you with the right capacity providers. Share your growth ambitions below and we will work to match you with carriers whose risk appetite aligns with your business.')}
      </p>

      {/* Contact Information */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-fase-navy mb-4">{t('contact_info', 'Contact Information')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('company_name', 'Company Name')}
            </label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700">
              {companyName}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('contact_name', 'Contact Name')} *
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
              {t('contact_email', 'Contact Email')} *
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
          <h3 className="text-lg font-semibold text-fase-navy">{t('growth_targets', 'Growth Targets')}</h3>
          <Button onClick={addEntry} variant="secondary" size="small" disabled={submitting}>
            {t('add_row', '+ Add Row')}
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
                  {t('entry', 'Entry')} {index + 1}
                </span>
                {entries.length > 1 && (
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    disabled={submitting}
                  >
                    {t('remove', 'Remove')}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {/* Row 1: Line of Business + Country */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('line_of_business', 'Line of Business')} *
                    </label>
                    <select
                      value={entry.lineOfBusiness}
                      onChange={(e) =>
                        updateEntry(entry.id, 'lineOfBusiness', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      disabled={submitting}
                    >
                      <option value="">{t('select', 'Select...')}</option>
                      {[...LINES_OF_BUSINESS]
                        .sort((a, b) => tLob(a).localeCompare(tLob(b)))
                        .map((lob) => (
                          <option key={lob} value={lob}>
                            {tLob(lob)}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('country', 'Country')} *
                    </label>
                    <select
                      value={entry.country}
                      onChange={(e) =>
                        updateEntry(entry.id, 'country', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      disabled={submitting}
                    >
                      <option value="">{t('select', 'Select...')}</option>
                      {EUROPEAN_COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: GWP + Year targets (always 4 columns) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('gwp_2025', 'GWP 2025 (€)')}
                    </label>
                    <input
                      type="number"
                      value={entry.gwp2025 || ''}
                      onChange={(e) =>
                        updateEntry(entry.id, 'gwp2025', parseFloat(e.target.value) || 0)
                      }
                      placeholder={t('gwp_placeholder', '0 if new')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      disabled={submitting}
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('target_year_1', 'Target Year 1 (€)')}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('target_year_2', 'Target Year 2 (€)')}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('target_year_3', 'Target Year 3 (€)')}
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
                </div>

                {/* Row 3: Notes (full width) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('notes', 'Notes')}
                  </label>
                  <input
                    type="text"
                    value={entry.notes}
                    onChange={(e) =>
                      updateEntry(entry.id, 'notes', e.target.value)
                    }
                    placeholder={t('notes_placeholder', 'Optional')}
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
          {submitting ? t('submitting', 'Submitting...') : t('submit', 'Submit')}
        </Button>
      </div>
    </div>
  );
}
