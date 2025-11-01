import { StepComponentProps } from '../../../lib/registration/types';
import GWPInputForm from '../forms/GWPInputForm';

interface ValidatedInputProps {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  touchedFields: Record<string, boolean>;
  attemptedNext: boolean;
  markFieldTouched: (field: string) => void;
}

interface SearchableCountrySelectProps {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  touchedFields: Record<string, boolean>;
  attemptedNext: boolean;
  markFieldTouched: (field: string) => void;
}

// These components would normally be imported from shared components
const ValidatedInput = ({ label, fieldKey, value, onChange, placeholder, required, touchedFields, attemptedNext, markFieldTouched }: ValidatedInputProps) => {
  const hasError = required && (touchedFields[fieldKey] || attemptedNext) && !value.trim();
  
  return (
    <div>
      <label className="block text-sm font-medium text-fase-navy mb-2">
        {label} {required && '*'}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          markFieldTouched(fieldKey);
        }}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
          hasError ? 'border-red-300' : 'border-fase-light-gold'
        }`}
      />
    </div>
  );
};

const SearchableCountrySelect = ({ label, fieldKey, value, onChange, required, touchedFields, attemptedNext, markFieldTouched }: SearchableCountrySelectProps) => {
  const hasError = required && (touchedFields[fieldKey] || attemptedNext) && !value;
  
  return (
    <div>
      <label className="block text-sm font-medium text-fase-navy mb-2">
        {label} {required && '*'}
      </label>
      <select
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          markFieldTouched(fieldKey);
        }}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
          hasError ? 'border-red-300' : 'border-fase-light-gold'
        }`}
      >
        <option value="">Select country...</option>
        <option value="AT">Austria</option>
        <option value="BE">Belgium</option>
        <option value="BG">Bulgaria</option>
        <option value="HR">Croatia</option>
        <option value="CY">Cyprus</option>
        <option value="CZ">Czech Republic</option>
        <option value="DK">Denmark</option>
        <option value="EE">Estonia</option>
        <option value="FI">Finland</option>
        <option value="FR">France</option>
        <option value="DE">Germany</option>
        <option value="GR">Greece</option>
        <option value="HU">Hungary</option>
        <option value="IE">Ireland</option>
        <option value="IT">Italy</option>
        <option value="LV">Latvia</option>
        <option value="LT">Lithuania</option>
        <option value="LU">Luxembourg</option>
        <option value="MT">Malta</option>
        <option value="NL">Netherlands</option>
        <option value="PL">Poland</option>
        <option value="PT">Portugal</option>
        <option value="RO">Romania</option>
        <option value="SK">Slovakia</option>
        <option value="SI">Slovenia</option>
        <option value="ES">Spain</option>
        <option value="SE">Sweden</option>
        <option value="GB">United Kingdom</option>
        <option value="US">United States</option>
        <option value="CA">Canada</option>
        <option value="AU">Australia</option>
        <option value="NZ">New Zealand</option>
        <option value="CH">Switzerland</option>
        <option value="NO">Norway</option>
        <option value="IS">Iceland</option>
      </select>
    </div>
  );
};

const associationOptions = [
  { value: 'ASASE', label: 'ASASE' },
  { value: 'AIMGA', label: 'AIMGA' },
  { value: 'BAUA', label: 'BAUA' },
  { value: 'MGAA', label: 'MGAA' },
  { value: 'NVGA', label: 'NVGA' }
];

export default function AddressPortfolioStep({ state, actions }: StepComponentProps) {
  const { 
    membershipType, 
    organizationType,
    address,
    hasOtherAssociations,
    otherAssociations,
    principalLines,
    additionalLines,
    targetClients,
    currentMarkets,
    plannedMarkets,
    logoFile,
    isAdminTest,
    touchedFields,
    attemptedNext
  } = state;

  const validateLogoFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only PNG, JPG, and SVG files are allowed');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        validateLogoFile(file);
        actions.updateField('logoFile', file);
      } catch (error: any) {
        // In a real implementation, this would show an error message
        console.error('Logo upload error:', error.message);
        actions.updateField('logoFile', null);
      }
    }
  };

  const toggleAssociation = (associationValue: string, checked: boolean) => {
    if (checked) {
      actions.updateField('otherAssociations', [...otherAssociations, associationValue]);
    } else {
      actions.updateField('otherAssociations', otherAssociations.filter(a => a !== associationValue));
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Additional Details</h3>
        <p className="text-fase-black text-sm">Complete your membership application</p>
      </div>

      {/* Address Information */}
      <div className="space-y-4">
        <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">
          {membershipType === 'individual' ? 'Personal Address' : 'Business Address'}
        </h4>
        
        <ValidatedInput
          label="Address Line 1"
          fieldKey="addressLine1"
          value={address.line1}
          onChange={(value) => actions.updateField('address', { ...address, line1: value })}
          placeholder="Street address"
          required
          touchedFields={touchedFields}
          attemptedNext={attemptedNext}
          markFieldTouched={actions.markFieldTouched}
        />
        
        <ValidatedInput
          label="Address Line 2"
          fieldKey="addressLine2"
          value={address.line2}
          onChange={(value) => actions.updateField('address', { ...address, line2: value })}
          placeholder="Apartment, suite, etc. (optional)"
          touchedFields={touchedFields}
          attemptedNext={attemptedNext}
          markFieldTouched={actions.markFieldTouched}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ValidatedInput
            label="City"
            fieldKey="city"
            value={address.city}
            onChange={(value) => actions.updateField('address', { ...address, city: value })}
            placeholder="City"
            required
            touchedFields={touchedFields}
            attemptedNext={attemptedNext}
            markFieldTouched={actions.markFieldTouched}
          />
          
          <ValidatedInput
            label="State/Province"
            fieldKey="state"
            value={address.state}
            onChange={(value) => actions.updateField('address', { ...address, state: value })}
            placeholder="State or province"
            touchedFields={touchedFields}
            attemptedNext={attemptedNext}
            markFieldTouched={actions.markFieldTouched}
          />
          
          <ValidatedInput
            label="Postal Code"
            fieldKey="postalCode"
            value={address.postalCode}
            onChange={(value) => actions.updateField('address', { ...address, postalCode: value })}
            placeholder="Postal code"
            touchedFields={touchedFields}
            attemptedNext={attemptedNext}
            markFieldTouched={actions.markFieldTouched}
          />
        </div>
        
        <SearchableCountrySelect
          label="Country"
          fieldKey="country"
          value={address.country}
          onChange={(value) => actions.updateField('address', { ...address, country: value })}
          required
          touchedFields={touchedFields}
          attemptedNext={attemptedNext}
          markFieldTouched={actions.markFieldTouched}
        />
      </div>

      {/* Portfolio Information for MGAs */}
      {membershipType === 'corporate' && organizationType === 'MGA' && (
        <div className="space-y-4">
          <GWPInputForm state={state} actions={actions} />

          {/* Business Details Questions */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                1. Please list the principal lines of business you are currently underwriting?
              </label>
              <textarea
                value={principalLines}
                onChange={(e) => actions.updateField('principalLines', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                placeholder="Describe your current lines of business..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                2. Do you have current plans to write additional lines of business in the coming year? If so, please describe them?
              </label>
              <textarea
                value={additionalLines}
                onChange={(e) => actions.updateField('additionalLines', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                placeholder="Describe any planned new lines of business..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                3. Please list, in as much detail as possible, your principal target client populations?
              </label>
              <textarea
                value={targetClients}
                onChange={(e) => actions.updateField('targetClients', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                placeholder="Describe your target client populations in detail..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                4. Please list the national market[s] in which you currently do business?
              </label>
              <textarea
                value={currentMarkets}
                onChange={(e) => actions.updateField('currentMarkets', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                placeholder="List the countries/markets where you currently operate..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                5. Do you have plans to write business in additional national markets in the coming year? If so where?
              </label>
              <textarea
                value={plannedMarkets}
                onChange={(e) => actions.updateField('plannedMarkets', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                placeholder="Describe any planned market expansion..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Additional Questions */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-fase-navy mb-3">
            Is your organization a member of other European MGA associations? *
          </label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => actions.updateField('hasOtherAssociations', true)}
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
                actions.updateField('hasOtherAssociations', false);
                actions.updateField('otherAssociations', []);
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
                {associationOptions.map((association) => (
                  <label key={association.value} className="flex items-center">
                    <input
                      type="checkbox"
                      value={association.value}
                      checked={otherAssociations.includes(association.value)}
                      onChange={(e) => toggleAssociation(association.value, e.target.checked)}
                      className="mr-2 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
                    />
                    <span className="text-sm text-fase-black">{association.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Admin Test Option */}
        <div>
          <label className="block text-sm font-medium text-fase-navy mb-3">
            Admin Test Payment (Remove after testing)
          </label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => actions.updateField('isAdminTest', false)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                !isAdminTest
                  ? 'bg-fase-navy text-white border-fase-navy'
                  : 'bg-white text-fase-black border-fase-light-gold hover:border-fase-navy'
              }`}
            >
              Normal Payment
            </button>
            <button
              type="button"
              onClick={() => actions.updateField('isAdminTest', true)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                isAdminTest
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-red-600 border-red-300 hover:border-red-600'
              }`}
            >
              Admin Test (€0.01)
            </button>
          </div>
          {isAdminTest && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>WARNING:</strong> This will create a 1 cent test payment. Remove this option after testing.
              </p>
            </div>
          )}
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-fase-navy mb-3">
            Organization Logo (Optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          />
          <p className="text-xs text-fase-black mt-1">
            PNG, JPG, or SVG. Max 5MB. Recommended: 200x200px or larger.
          </p>
        </div>
      </div>
    </div>
  );
}