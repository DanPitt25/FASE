'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import SearchableCountrySelect from '../../components/SearchableCountrySelect';

const linesOfBusinessKeys = [
  'accident_health',
  'aviation',
  'bloodstock',
  'casualty',
  'construction',
  'cyber',
  'energy',
  'event_cancellation',
  'fine_art_specie',
  'legal_expenses',
  'life',
  'livestock',
  'marine',
  'management_liability',
  'motor_commercial',
  'motor_personal',
  'pet',
  'political_risk',
  'professional_indemnity',
  'property_commercial',
  'property_personal',
  'surety',
  'trade_credit',
  'travel',
  'warranty_indemnity',
  'other',
  'other_2',
  'other_3'
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
  calculateTotalGWP: (gwpBillions: string, gwpMillions: string, gwpThousands: string) => number;
}) => {
  const t = useTranslations('register_form.portfolio');
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
      <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">{t('title')}</h4>
      
      <div>
        <label className="block text-sm font-medium text-fase-navy mb-2">
          {t('annual_gwp')} *
        </label>
        <div className="space-y-3">
          {/* Currency Selection */}
          <div>
            <label className="block text-xs text-fase-black mb-1">{t('currency_label')}</label>
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
              <label className="block text-xs text-fase-black mb-1">{t('billions')}</label>
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
              <label className="block text-xs text-fase-black mb-1">{t('millions')}</label>
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
              <label className="block text-xs text-fase-black mb-1">{t('thousands')}</label>
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
              {t('total')}: {gwpCurrency === 'EUR' ? '€' : gwpCurrency === 'GBP' ? '£' : '$'}{(() => {
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
            1. {t('lines_of_business_question')} *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
            {linesOfBusinessKeys.map((lineKey) => (
              <label key={lineKey} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedLinesOfBusiness.includes(t(`lines_of_business.${lineKey}`))}
                  onChange={() => toggleLineOfBusiness(t(`lines_of_business.${lineKey}`))}
                  className="h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
                />
                <span className="text-fase-black">{t(`lines_of_business.${lineKey}`)}</span>
              </label>
            ))}
          </div>
          
          {/* Other fields */}
          {selectedLinesOfBusiness.includes(t('lines_of_business.other')) && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-fase-navy mb-1">
                {t('specify_other')}
              </label>
              <input
                type="text"
                value={otherLineOfBusiness1}
                onChange={(e) => setOtherLineOfBusiness1(e.target.value)}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                placeholder={t('specify_placeholder')}
              />
            </div>
          )}
          
          {selectedLinesOfBusiness.includes(t('lines_of_business.other_2')) && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-fase-navy mb-1">
                {t('specify_other_2')}
              </label>
              <input
                type="text"
                value={otherLineOfBusiness2}
                onChange={(e) => setOtherLineOfBusiness2(e.target.value)}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                placeholder={t('specify_placeholder')}
              />
            </div>
          )}
          
          {selectedLinesOfBusiness.includes(t('lines_of_business.other_3')) && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-fase-navy mb-1">
                {t('specify_other_3')}
              </label>
              <input
                type="text"
                value={otherLineOfBusiness3}
                onChange={(e) => setOtherLineOfBusiness3(e.target.value)}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                placeholder={t('specify_placeholder')}
              />
            </div>
          )}
        </div>

        {/* Markets Question */}
        <div>
          <label className="block text-sm font-medium text-fase-navy mb-3">
            2. {t('european_markets_question')} *
          </label>
          
          {/* Selected Markets Display */}
          {selectedMarkets.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-fase-navy mb-2">{t('selected_markets')}</p>
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
              label={t('add_market')}
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
              {t('market_search_help')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};