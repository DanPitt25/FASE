'use client';

import { useTranslations } from 'next-intl';

// European MGA Associations Component
export const EuropeanAssociationsSection = ({
  hasOtherAssociations,
  setHasOtherAssociations,
  otherAssociations,
  setOtherAssociations
}: {
  hasOtherAssociations: boolean | null;
  setHasOtherAssociations: (value: boolean | null) => void;
  otherAssociations: string[];
  setOtherAssociations: (associations: string[]) => void;
}) => {
  const t = useTranslations('register_form.associations');
  
  return (
    <div>
      <label className="block text-sm font-medium text-fase-navy mb-3">
        {t('question')} *
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
          {t('yes')}
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
          {t('no')}
        </button>
      </div>

      {hasOtherAssociations && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-fase-navy mb-2">
            {t('select_associations')} *
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
  );
};