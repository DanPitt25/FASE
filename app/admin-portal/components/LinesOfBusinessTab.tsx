'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import { hasCustomLOBTranslation, getCustomLOBTranslation } from '@/lib/custom-lines-of-business';

interface OtherLOBEntry {
  accountId: string;
  organizationName: string;
  other1: string;
  other2: string;
  other3: string;
}

const LOCALES = ['en', 'de', 'fr', 'es', 'it', 'nl'] as const;
const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  nl: 'Dutch',
};

export default function LinesOfBusinessTab() {
  const [entries, setEntries] = useState<OtherLOBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  // Load all accounts with otherLinesOfBusiness
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await authFetch('/api/admin/lines-of-business');
        const data = await response.json();
        if (data.success) {
          setEntries(data.entries);
        }
      } catch (error) {
        console.error('Error loading lines of business:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter to only show entries with at least one non-empty other value
  const entriesWithValues = entries.filter(
    entry => entry.other1 || entry.other2 || entry.other3
  );

  const toggleExpand = (cellId: string) => {
    setExpandedCell(prev => prev === cellId ? null : cellId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-fase-navy">Custom Lines of Business</h2>
        <div className="text-sm text-gray-500">
          {entriesWithValues.length} entries with custom values
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Other 1
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Other 2
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Other 3
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entriesWithValues.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No custom lines of business entries found.
                  </td>
                </tr>
              ) : (
                entriesWithValues.map(entry => (
                  <tr key={entry.accountId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {entry.organizationName || 'Unknown'}
                    </td>
                    {(['other1', 'other2', 'other3'] as const).map(field => {
                      const cellId = `${entry.accountId}-${field}`;
                      const isExpanded = expandedCell === cellId;
                      const hasTranslation = entry[field] && hasCustomLOBTranslation(entry[field]);

                      return (
                        <td key={field} className="px-4 py-3 text-sm text-gray-700">
                          {entry[field] ? (
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => hasTranslation && toggleExpand(cellId)}
                                className={`text-left ${hasTranslation ? 'cursor-pointer hover:bg-fase-navy/5 rounded px-1 -mx-1' : ''}`}
                              >
                                <div className="flex items-center gap-1">
                                  <span>{entry[field]}</span>
                                  {hasTranslation && (
                                    <svg
                                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  )}
                                </div>
                                {hasTranslation ? (
                                  <span className="text-xs text-green-600">
                                    → {getCustomLOBTranslation(entry[field], 'en')}
                                  </span>
                                ) : (
                                  <span className="text-xs text-amber-600">
                                    (no translation)
                                  </span>
                                )}
                              </button>

                              {isExpanded && hasTranslation && (
                                <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 text-xs space-y-1">
                                  {LOCALES.map(locale => (
                                    <div key={locale} className="flex gap-2">
                                      <span className="font-medium text-gray-500 w-16">{LOCALE_LABELS[locale]}:</span>
                                      <span className="text-gray-700">{getCustomLOBTranslation(entry[field], locale)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 italic">(empty)</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
