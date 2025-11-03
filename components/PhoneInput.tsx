'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import 'react-phone-number-input/style.css';

// Dynamically import the phone input to avoid SSR issues
const PhoneInputComponent = dynamic(() => import('react-phone-number-input'), {
  ssr: false,
  loading: () => <div className="h-12 bg-gray-100 animate-pulse rounded-lg"></div>
});

interface PhoneInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  fieldKey: string;
  touchedFields: Record<string, boolean>;
  attemptedNext: boolean;
  markFieldTouched: (fieldKey: string) => void;
  disabled?: boolean;
}

export default function PhoneInput({
  label,
  value,
  onChange,
  required = false,
  className = "",
  fieldKey,
  touchedFields,
  attemptedNext,
  markFieldTouched,
  disabled = false
}: PhoneInputProps) {
  const t = useTranslations('register_form.team_members');
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isValid = !required || value.trim() !== '';
  const shouldShowValidation = required && ((touchedFields[fieldKey] || attemptedNext) && !isValid);

  console.log('PhoneInput value:', value, 'type:', typeof value);

  if (!mounted) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-fase-navy mb-2">
            {label} {required && '*'}
          </label>
        )}
        <div className="h-12 bg-gray-100 animate-pulse rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-fase-navy mb-2">
          {label} {required && '*'}
        </label>
      )}
      
      <PhoneInputComponent
        value={value || undefined}
        onChange={(newValue) => {
          console.log('Phone onChange:', newValue);
          onChange(newValue || '');
          markFieldTouched(fieldKey);
        }}
        defaultCountry="GB"
        international
        countryCallingCodeEditable={true}
        className={`phone-input ${shouldShowValidation ? 'phone-input--error' : ''}`}
        disabled={disabled}
        placeholder={t('phone_placeholder')}
        withCountryCallingCode={true}
        addInternationalOption={false}
      />
      
      {shouldShowValidation && (
        <p className="mt-1 text-sm text-red-600">{t('phone_required')}</p>
      )}
      
      <style jsx global>{`
        .phone-input {
          --PhoneInputCountrySelectArrow-color: #6b7280;
          --PhoneInputCountrySelectArrow-color--focus: #2D5574;
          --PhoneInput-color--focus: #2D5574;
        }
        
        .phone-input .PhoneInputInput {
          border: 1px solid #E6C77A !important;
          border-radius: 0 0.5rem 0.5rem 0 !important;
          border-left: none !important;
          padding: 0.5rem 0.75rem !important;
          font-size: 1rem !important;
          line-height: 1.5 !important;
          color: #374151 !important;
          background-color: white !important;
        }
        
        .phone-input .PhoneInputInput:focus {
          outline: none !important;
          border-color: #2D5574 !important;
          box-shadow: 0 0 0 2px rgba(45, 85, 116, 0.2) !important;
        }
        
        .phone-input .PhoneInputCountrySelect {
          border: 1px solid #E6C77A !important;
          border-radius: 0.5rem 0 0 0.5rem !important;
          border-right: none !important;
          background-color: white !important;
          padding: 0.5rem !important;
          cursor: pointer !important;
          position: relative !important;
        }
        
        .phone-input .PhoneInputCountrySelect:focus {
          outline: none !important;
          border-color: #2D5574 !important;
          box-shadow: 0 0 0 2px rgba(45, 85, 116, 0.2) !important;
        }
        
        .phone-input .PhoneInputCountrySelectDropdown {
          z-index: 1000 !important;
          position: absolute !important;
          top: 100% !important;
          left: 0 !important;
          background: white !important;
          border: 1px solid #E6C77A !important;
          border-radius: 0.5rem !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          max-height: 200px !important;
          overflow-y: auto !important;
        }
        
        .phone-input--error .PhoneInputInput {
          border-color: #ef4444 !important;
        }
        
        .phone-input--error .PhoneInputCountrySelect {
          border-color: #ef4444 !important;
        }
        
        .phone-input .PhoneInputCountryIcon {
          width: 1.25rem !important;
          height: 1rem !important;
        }
      `}</style>
    </div>
  );
}