'use client';

import { useTranslations } from 'next-intl';
import SearchableCountrySelect from '../../components/SearchableCountrySelect';
import { ValidatedInput } from './form-components';

// Address Information Component
export const AddressSection = ({
  addressLine1,
  setAddressLine1,
  addressLine2,
  setAddressLine2,
  city,
  setCity,
  state,
  setState,
  postalCode,
  setPostalCode,
  country,
  setCountry,
  touchedFields,
  attemptedNext,
  markFieldTouched,
  membershipType = 'corporate'
}: {
  addressLine1: string;
  setAddressLine1: (value: string) => void;
  addressLine2: string;
  setAddressLine2: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  state: string;
  setState: (value: string) => void;
  postalCode: string;
  setPostalCode: (value: string) => void;
  country: string;
  setCountry: (value: string) => void;
  touchedFields: Record<string, boolean>;
  attemptedNext: boolean;
  markFieldTouched: (fieldKey: string) => void;
  membershipType?: 'individual' | 'corporate';
}) => {
  const t = useTranslations('register_form.address');
  
  return (
    <div className="space-y-4">
      <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">
        {membershipType === 'individual' ? t('personal_title') : t('business_title')}
      </h4>
      
      <ValidatedInput
        label={t('address_line_1')}
        fieldKey="addressLine1"
        value={addressLine1}
        onChange={setAddressLine1}
        placeholder={t('address_line_1_placeholder')}
        required
        touchedFields={touchedFields}
        attemptedNext={attemptedNext}
        markFieldTouched={markFieldTouched}
      />
      
      <ValidatedInput
        label={t('address_line_2')}
        fieldKey="addressLine2"
        value={addressLine2}
        onChange={setAddressLine2}
        placeholder={t('address_line_2_placeholder')}
        touchedFields={touchedFields}
        attemptedNext={attemptedNext}
        markFieldTouched={markFieldTouched}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ValidatedInput
          label={t('city')}
          fieldKey="city"
          value={city}
          onChange={setCity}
          placeholder={t('city_placeholder')}
          required
          touchedFields={touchedFields}
          attemptedNext={attemptedNext}
          markFieldTouched={markFieldTouched}
        />
        
        <ValidatedInput
          label={t('state_province')}
          fieldKey="state"
          value={state}
          onChange={setState}
          placeholder={t('state_placeholder')}
          touchedFields={touchedFields}
          attemptedNext={attemptedNext}
          markFieldTouched={markFieldTouched}
        />
        
        <ValidatedInput
          label={t('postal_code')}
          fieldKey="postalCode"
          value={postalCode}
          onChange={setPostalCode}
          placeholder={t('postal_code_placeholder')}
          touchedFields={touchedFields}
          attemptedNext={attemptedNext}
          markFieldTouched={markFieldTouched}
        />
      </div>
      
      <SearchableCountrySelect
        label={t('country')}
        fieldKey="country"
        value={country}
        onChange={setCountry}
        required
        touchedFields={touchedFields}
        attemptedNext={attemptedNext}
        markFieldTouched={markFieldTouched}
      />
    </div>
  );
};