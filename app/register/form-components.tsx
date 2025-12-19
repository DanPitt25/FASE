'use client';

import { useState } from "react";
import { useTranslations } from 'next-intl';

// Email validation function
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Password validation function
export const validatePassword = (password: string) => {
  const requirements = {
    length: password.length >= 8,
    capital: /[A-Z]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const isValid = requirements.length && requirements.capital && requirements.special;
  return { requirements, isValid };
};

// Validated input component
export const ValidatedInput = ({ 
  label, 
  fieldKey, 
  value, 
  onChange, 
  type = "text", 
  placeholder, 
  required = false,
  className = "",
  touchedFields,
  attemptedNext,
  markFieldTouched,
  ...props 
}: {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  touchedFields: Record<string, boolean>;
  attemptedNext: boolean;
  markFieldTouched: (fieldKey: string) => void;
  [key: string]: any;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isValid = value.trim() !== '';
  const shouldShowValidation = required && ((touchedFields[fieldKey] || attemptedNext) && !isValid);
  const isPasswordField = type === "password";
  const inputType = isPasswordField ? (showPassword ? "text" : "password") : type;
  
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-fase-navy mb-2">
          {label} {required && '*'}
        </label>
      )}
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            markFieldTouched(fieldKey);
          }}
          onBlur={() => markFieldTouched(fieldKey)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
            shouldShowValidation ? 'border-red-300' : 'border-fase-light-gold'
          } ${props.disabled ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''} ${
            isPasswordField ? 'pr-10' : ''
          }`}
          {...props}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-fase-navy hover:text-fase-gold transition-colors"
          >
            {showPassword ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// Validated select component
export const ValidatedSelect = ({ 
  label, 
  fieldKey, 
  value, 
  onChange, 
  options,
  required = false,
  className = "",
  touchedFields,
  attemptedNext,
  markFieldTouched
}: {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{value: string, label: string}>;
  required?: boolean;
  className?: string;
  touchedFields: Record<string, boolean>;
  attemptedNext: boolean;
  markFieldTouched: (fieldKey: string) => void;
}) => {
  const tCommon = useTranslations('common');
  const isValid = value.trim() !== '';
  const shouldShowValidation = required && ((touchedFields[fieldKey] || attemptedNext) && !isValid);
  
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-fase-navy mb-2">
        {label} {required && '*'}
      </label>
      <select
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          markFieldTouched(fieldKey);
        }}
        onBlur={() => markFieldTouched(fieldKey)}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
          shouldShowValidation ? 'border-red-300' : 'border-fase-light-gold'
        }`}
      >
        <option value="">{tCommon('select')}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};