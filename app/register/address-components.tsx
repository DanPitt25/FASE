'use client';

import { useTranslations } from 'next-intl';
import SearchableCountrySelect from '../../components/SearchableCountrySelect';
import { ValidatedInput } from './form-components';
import { UseRegistrationForm } from './registration-hooks';

// Address Information Component
export const AddressSection = ({ reg }: { reg: UseRegistrationForm }) => {
  const t = useTranslations('register_form.address');
  const { form, ui, setField, touchField } = reg;
  const address = form.address;

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">
        {t('business_title')}
      </h4>

      <ValidatedInput
        label={t('address_line_1')}
        fieldKey="address.line1"
        value={address.line1}
        onChange={(v) => setField('address.line1', v)}
        placeholder={t('address_line_1_placeholder')}
        required
        touchedFields={ui.touchedFields}
        attemptedNext={ui.attemptedNext}
        markFieldTouched={touchField}
      />

      <ValidatedInput
        label={t('address_line_2')}
        fieldKey="address.line2"
        value={address.line2}
        onChange={(v) => setField('address.line2', v)}
        placeholder={t('address_line_2_placeholder')}
        touchedFields={ui.touchedFields}
        attemptedNext={ui.attemptedNext}
        markFieldTouched={touchField}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ValidatedInput
          label={t('city')}
          fieldKey="address.city"
          value={address.city}
          onChange={(v) => setField('address.city', v)}
          placeholder={t('city_placeholder')}
          required
          touchedFields={ui.touchedFields}
          attemptedNext={ui.attemptedNext}
          markFieldTouched={touchField}
        />

        <ValidatedInput
          label={t('state_province')}
          fieldKey="address.county"
          value={address.county}
          onChange={(v) => setField('address.county', v)}
          placeholder={t('state_placeholder')}
          touchedFields={ui.touchedFields}
          attemptedNext={ui.attemptedNext}
          markFieldTouched={touchField}
        />

        <ValidatedInput
          label={t('postal_code')}
          fieldKey="address.postcode"
          value={address.postcode}
          onChange={(v) => setField('address.postcode', v)}
          placeholder={t('postal_code_placeholder')}
          touchedFields={ui.touchedFields}
          attemptedNext={ui.attemptedNext}
          markFieldTouched={touchField}
        />
      </div>

      <SearchableCountrySelect
        label={t('country')}
        fieldKey="address.country"
        value={address.country}
        onChange={(v) => setField('address.country', v)}
        required
        touchedFields={ui.touchedFields}
        attemptedNext={ui.attemptedNext}
        markFieldTouched={touchField}
      />
    </div>
  );
};
