'use client';

import { useState, useRef, useEffect } from 'react';
import { getLineOfBusinessDisplay } from '../lib/lines-of-business';

// All available lines of business keys
const ALL_LINES_OF_BUSINESS = [
  'accident_health', 'aviation', 'bloodstock', 'casualty', 'construction',
  'cyber', 'energy', 'event_cancellation', 'fine_art_specie', 'legal_expenses',
  'life', 'livestock', 'marine', 'management_liability', 'motor_commercial',
  'motor_personal', 'pet', 'political_risk', 'professional_indemnity',
  'property_commercial', 'property_personal', 'surety', 'trade_credit',
  'travel', 'warranty_indemnity'
];

interface LinesOfBusinessFilterProps {
  selectedLines: string[];
  onSelectionChange: (lines: string[]) => void;
  locale: string;
  translations?: {
    filter_by_lob?: string;
    lines_selected?: string;
    clear_filters?: string;
    all_lines?: string;
  };
}

export default function LinesOfBusinessFilter({
  selectedLines,
  onSelectionChange,
  locale,
  translations
}: LinesOfBusinessFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleLine = (line: string) => {
    if (selectedLines.includes(line)) {
      onSelectionChange(selectedLines.filter(l => l !== line));
    } else {
      onSelectionChange([...selectedLines, line]);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleRemoveLine = (line: string) => {
    onSelectionChange(selectedLines.filter(l => l !== line));
  };

  // Sort lines alphabetically by display name
  const sortedLines = [...ALL_LINES_OF_BUSINESS].sort((a, b) =>
    getLineOfBusinessDisplay(a, locale).localeCompare(getLineOfBusinessDisplay(b, locale))
  );

  return (
    <div className="space-y-2">
      <div className="relative" ref={dropdownRef}>
        {/* Filter Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm bg-white flex items-center justify-between gap-2 hover:border-gray-400 transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-gray-700">
              {selectedLines.length > 0
                ? `${selectedLines.length} ${translations?.lines_selected || 'selected'}`
                : (translations?.filter_by_lob || 'Lines of Business')
              }
            </span>
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg">
            {/* Header with clear button */}
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {translations?.filter_by_lob || 'Lines of Business'}
              </span>
              {selectedLines.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-fase-navy hover:text-fase-orange font-medium"
                >
                  {translations?.clear_filters || 'Clear all'}
                </button>
              )}
            </div>

            {/* Scrollable checkbox list */}
            <div className="max-h-64 overflow-y-auto">
              {sortedLines.map(line => (
                <label
                  key={line}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedLines.includes(line)}
                    onChange={() => handleToggleLine(line)}
                    className="w-4 h-4 text-fase-navy border-gray-300 rounded focus:ring-fase-navy focus:ring-offset-0"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {getLineOfBusinessDisplay(line, locale)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active filter badges */}
      {selectedLines.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLines.map(line => (
            <span
              key={line}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-fase-navy/10 text-fase-navy rounded-full"
            >
              {getLineOfBusinessDisplay(line, locale)}
              <button
                type="button"
                onClick={() => handleRemoveLine(line)}
                className="hover:text-fase-orange transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-gray-500 hover:text-fase-navy font-medium px-2"
          >
            {translations?.clear_filters || 'Clear all'}
          </button>
        </div>
      )}
    </div>
  );
}
