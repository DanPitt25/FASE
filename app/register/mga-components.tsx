'use client';

import { useState } from 'react';
import SearchableCountrySelect from '../../components/SearchableCountrySelect';

const linesOfBusinessOptions = [
  'Accident & Health',
  'Aviation',
  'Bloodstock',
  'Casualty',
  'Construction',
  'Cyber',
  'Energy',
  'Event Cancellation',
  'Fine Art & Specie',
  'Legal Expenses',
  'Life',
  'Livestock',
  'Marine',
  'Management Liability (D&O, EPLI etc)',
  'Motor, commercial',
  'Motor, personal lines',
  'Pet',
  'Political Risk',
  'Professional Indemnity / E&O',
  'Property, commercial',
  'Property, personal lines',
  'Surety',
  'Trade Credit',
  'Travel',
  'Warranty & Indemnity',
  'Other',
  'Other #2',
  'Other #3'
];

// MGA Portfolio Information Component
export const MGAPortfolioSection = ({
  grossWrittenPremiums,
  setGrossWrittenPremiums,
  gwpCurrency,
  setGwpCurrency,
  gwpBillions,
  setGwpBillions,
  gwpMillions,
  setGwpMillions,
  gwpThousands,
  setGwpThousands,
  selectedLinesOfBusiness,
  setSelectedLinesOfBusiness,
  otherLineOfBusiness1,
  setOtherLineOfBusiness1,
  otherLineOfBusiness2,
  setOtherLineOfBusiness2,
  otherLineOfBusiness3,
  setOtherLineOfBusiness3,
  selectedMarkets,
  setSelectedMarkets,
  hasOtherAssociations,
  setHasOtherAssociations,
  otherAssociations,
  setOtherAssociations,
  calculateTotalGWP
}: {
  grossWrittenPremiums: string;
  setGrossWrittenPremiums: (value: string) => void;
  gwpCurrency: string;
  setGwpCurrency: (value: string) => void;
  gwpBillions: string;
  setGwpBillions: (value: string) => void;
  gwpMillions: string;
  setGwpMillions: (value: string) => void;
  gwpThousands: string;
  setGwpThousands: (value: string) => void;
  selectedLinesOfBusiness: string[];
  setSelectedLinesOfBusiness: (lines: string[]) => void;
  otherLineOfBusiness1: string;
  setOtherLineOfBusiness1: (value: string) => void;
  otherLineOfBusiness2: string;
  setOtherLineOfBusiness2: (value: string) => void;
  otherLineOfBusiness3: string;
  setOtherLineOfBusiness3: (value: string) => void;
  selectedMarkets: string[];
  setSelectedMarkets: (markets: string[]) => void;
  hasOtherAssociations: boolean | null;
  setHasOtherAssociations: (value: boolean | null) => void;
  otherAssociations: string[];
  setOtherAssociations: (associations: string[]) => void;
  calculateTotalGWP: (gwpBillions: string, gwpMillions: string, gwpThousands: string) => number;
}) => {
  const [currentMarketSelection, setCurrentMarketSelection] = useState('');
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [attemptedNext, setAttemptedNext] = useState(false);
  
  const markFieldTouched = (fieldKey: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldKey]: true }));
  };
  
  const toggleLineOfBusiness = (line: string) => {
    if (selectedLinesOfBusiness.includes(line)) {
      setSelectedLinesOfBusiness(selectedLinesOfBusiness.filter(l => l !== line));
    } else {
      setSelectedLinesOfBusiness([...selectedLinesOfBusiness, line]);
    }
  };
  
  const addMarket = (countryCode: string) => {
    if (!selectedMarkets.includes(countryCode)) {
      setSelectedMarkets([...selectedMarkets, countryCode]);
    }
    setCurrentMarketSelection('');
  };
  
  const removeMarket = (countryCode: string) => {
    setSelectedMarkets(selectedMarkets.filter(m => m !== countryCode));
  };
  
  return (
    <div className="space-y-6">
      <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Portfolio Information</h4>
      
      <div>
        <label className="block text-sm font-medium text-fase-navy mb-2">
          Annual Gross Written Premiums *
        </label>
        <div className="space-y-3">
          {/* Currency Selection */}
          <div>
            <label className="block text-xs text-fase-black mb-1">Currency</label>
            <select
              value={gwpCurrency}
              onChange={(e) => setGwpCurrency(e.target.value)}
              className="w-32 px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            >
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          
          {/* Amount Builder - Separate inputs for each magnitude */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-fase-black mb-1">Billions</label>
              <input
                type="number"
                min="0"
                max="99"
                step="1"
                value={gwpBillions}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 99)) {
                    setGwpBillions(value);
                    markFieldTouched('grossWrittenPremiums');
                  }
                }}
                placeholder="0"
                className="w-full px-2 py-2 text-sm border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-xs text-fase-black mb-1">Millions</label>
              <input
                type="number"
                min="0"
                max="999"
                step="1"
                value={gwpMillions}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 999)) {
                    setGwpMillions(value);
                    markFieldTouched('grossWrittenPremiums');
                  }
                }}
                placeholder="0"
                className="w-full px-2 py-2 text-sm border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-xs text-fase-black mb-1">Thousands</label>
              <input
                type="number"
                min="0"
                max="999"
                step="1"
                value={gwpThousands}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 999)) {
                    setGwpThousands(value);
                    markFieldTouched('grossWrittenPremiums');
                  }
                }}
                placeholder="0"
                className="w-full px-2 py-2 text-sm border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Display Total */}
          <div className="bg-fase-cream/20 p-3 rounded-lg">
            <div className="text-sm text-fase-navy font-medium">
              Total: {gwpCurrency === 'EUR' ? '€' : gwpCurrency === 'GBP' ? '£' : '$'}{(() => {
                const billions = parseFloat(gwpBillions) || 0;
                const millions = parseFloat(gwpMillions) || 0;
                const thousands = parseFloat(gwpThousands) || 0;
                const total = (billions * 1000000000) + (millions * 1000000) + (thousands * 1000);
                return total.toLocaleString('en-US');
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Business Details Questions - Structured */}
      <div className="space-y-6">
        {/* Lines of Business Question */}
        <div>
          <label className="block text-sm font-medium text-fase-navy mb-3">
            1. Which of the following lines of business are you currently underwriting? *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
            {linesOfBusinessOptions.map((line) => (
              <label key={line} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedLinesOfBusiness.includes(line)}
                  onChange={() => toggleLineOfBusiness(line)}
                  className="h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
                />
                <span className="text-fase-black">{line}</span>
              </label>
            ))}
          </div>
          
          {/* Other fields */}
          {selectedLinesOfBusiness.includes('Other') && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-fase-navy mb-1">
                Please specify &quot;Other&quot;:
              </label>
              <input
                type="text"
                value={otherLineOfBusiness1}
                onChange={(e) => setOtherLineOfBusiness1(e.target.value)}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                placeholder="Please specify..."
              />
            </div>
          )}
          
          {selectedLinesOfBusiness.includes('Other #2') && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-fase-navy mb-1">
                Please specify &quot;Other #2&quot;:
              </label>
              <input
                type="text"
                value={otherLineOfBusiness2}
                onChange={(e) => setOtherLineOfBusiness2(e.target.value)}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                placeholder="Please specify..."
              />
            </div>
          )}
          
          {selectedLinesOfBusiness.includes('Other #3') && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-fase-navy mb-1">
                Please specify &quot;Other #3&quot;:
              </label>
              <input
                type="text"
                value={otherLineOfBusiness3}
                onChange={(e) => setOtherLineOfBusiness3(e.target.value)}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                placeholder="Please specify..."
              />
            </div>
          )}
        </div>

        {/* Markets Question */}
        <div>
          <label className="block text-sm font-medium text-fase-navy mb-3">
            2. In which European markets does your organisation do business? *
          </label>
          
          {/* Selected Markets Display */}
          {selectedMarkets.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-fase-navy mb-2">Selected markets:</p>
              <div className="flex flex-wrap gap-2">
                {selectedMarkets.map((countryCode) => {
                  return (
                    <span
                      key={countryCode}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-fase-navy text-white"
                    >
                      {countryCode}
                      <button
                        type="button"
                        onClick={() => removeMarket(countryCode)}
                        className="ml-2 text-white hover:text-gray-200"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Searchable Country Select */}
          <div>
            <SearchableCountrySelect
              label="Add market"
              fieldKey="currentMarketSelection"
              value={currentMarketSelection}
              onChange={(value) => {
                setCurrentMarketSelection(value);
                if (value) {
                  addMarket(value);
                }
              }}
              touchedFields={touchedFields}
              attemptedNext={attemptedNext}
              markFieldTouched={markFieldTouched}
              className="text-sm"
              europeanOnly={true}
            />
            <p className="text-xs text-fase-black mt-1">
              Search and select European countries/markets where you do business. Selected markets will appear as tokens above.
            </p>
          </div>
        </div>
      </div>
      
      {/* Other Associations */}
      <div>
        <label className="block text-sm font-medium text-fase-navy mb-3">
          Is your organization a member of other European MGA associations? *
        </label>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => {
              setHasOtherAssociations(true);
            }}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              hasOtherAssociations === true
                ? 'bg-fase-navy text-white border-fase-navy'
                : 'bg-white text-fase-black border-fase-light-gold hover:border-fase-navy'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => {
              setHasOtherAssociations(false);
              setOtherAssociations([]);
            }}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              hasOtherAssociations === false
                ? 'bg-fase-navy text-white border-fase-navy'
                : 'bg-white text-fase-black border-fase-light-gold hover:border-fase-navy'
            }`}
          >
            No
          </button>
        </div>

        {hasOtherAssociations && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-fase-navy mb-2">
              Select associations you are a member of *
            </label>
            <div className="space-y-2">
              {[
                { value: 'ASASE', label: 'ASASE' },
                { value: 'AIMGA', label: 'AIMGA' },
                { value: 'BAUA', label: 'BAUA' },
                { value: 'MGAA', label: 'MGAA' },
                { value: 'NVGA', label: 'NVGA' }
              ].map((association) => (
                <label key={association.value} className="flex items-center">
                  <input
                    type="checkbox"
                    value={association.value}
                    checked={otherAssociations.includes(association.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setOtherAssociations([...otherAssociations, association.value]);
                      } else {
                        setOtherAssociations(otherAssociations.filter(a => a !== association.value));
                      }
                    }}
                    className="mr-2 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
                  />
                  <span className="text-sm text-fase-black">{association.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};