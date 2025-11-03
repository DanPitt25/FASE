'use client';

import { useState } from 'react';
import PhoneInputComponent from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useTranslations } from 'next-intl';

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
  
  const isValid = !required || value.trim() !== '';
  const shouldShowValidation = required && ((touchedFields[fieldKey] || attemptedNext) && !isValid);

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-fase-navy mb-2">
          {label} {required && '*'}
        </label>
      )}
      
      <PhoneInputComponent
        value={value}
        onChange={(value) => {
          onChange(value || '');
          markFieldTouched(fieldKey);
        }}
        defaultCountry="GB"
        international
        countryCallingCodeEditable={false}
        className={`phone-input ${shouldShowValidation ? 'phone-input--error' : ''}`}
        disabled={disabled}
        placeholder={t('phone_placeholder')}
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
          border: 1px solid #E6C77A;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 1rem;
          line-height: 1.5;
          color: #374151;
          background-color: white;
          transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        }
        
        .phone-input .PhoneInputInput:focus {
          outline: none;
          border-color: #2D5574;
          box-shadow: 0 0 0 2px rgba(45, 85, 116, 0.2);
        }
        
        .phone-input--error .PhoneInputInput {
          border-color: #ef4444;
        }
        
        .phone-input .PhoneInputCountrySelect {
          border: 1px solid #E6C77A;
          border-radius: 0.5rem 0 0 0.5rem;
          border-right: none;
          background-color: white;
          padding: 0.5rem;
        }
        
        .phone-input .PhoneInputCountrySelect:focus {
          outline: none;
          border-color: #2D5574;
          box-shadow: 0 0 0 2px rgba(45, 85, 116, 0.2);
        }
        
        .phone-input--error .PhoneInputCountrySelect {
          border-color: #ef4444;
        }
        
        .phone-input .PhoneInputInput {
          border-radius: 0 0.5rem 0.5rem 0;
          border-left: none;
        }
        
        .phone-input .PhoneInputCountryIcon {
          width: 1.25rem;
          height: 1rem;
        }
      `}</style>
    </div>
  );
}