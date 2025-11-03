'use client';

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
  return (
    <div className="space-y-4">
      <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">
        {membershipType === 'individual' ? 'Personal Address' : 'Business Address'}
      </h4>
      
      <ValidatedInput
        label="Address Line 1"
        fieldKey="addressLine1"
        value={addressLine1}
        onChange={setAddressLine1}
        placeholder="Street address"
        required
        touchedFields={touchedFields}
        attemptedNext={attemptedNext}
        markFieldTouched={markFieldTouched}
      />
      
      <ValidatedInput
        label="Address Line 2"
        fieldKey="addressLine2"
        value={addressLine2}
        onChange={setAddressLine2}
        placeholder="Apartment, suite, etc. (optional)"
        touchedFields={touchedFields}
        attemptedNext={attemptedNext}
        markFieldTouched={markFieldTouched}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ValidatedInput
          label="City"
          fieldKey="city"
          value={city}
          onChange={setCity}
          placeholder="City"
          required
          touchedFields={touchedFields}
          attemptedNext={attemptedNext}
          markFieldTouched={markFieldTouched}
        />
        
        <ValidatedInput
          label="State/Province"
          fieldKey="state"
          value={state}
          onChange={setState}
          placeholder="State or province"
          touchedFields={touchedFields}
          attemptedNext={attemptedNext}
          markFieldTouched={markFieldTouched}
        />
        
        <ValidatedInput
          label="Postal Code"
          fieldKey="postalCode"
          value={postalCode}
          onChange={setPostalCode}
          placeholder="Postal code"
          touchedFields={touchedFields}
          attemptedNext={attemptedNext}
          markFieldTouched={markFieldTouched}
        />
      </div>
      
      <SearchableCountrySelect
        label="Country"
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