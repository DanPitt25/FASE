import { useState } from 'react';
import { StepComponentProps } from '../../../lib/registration/types';
import { validatePassword } from '../../../lib/registration/validation';
import Button from '../../Button';

export default function AccountInfoStep({ state, actions }: StepComponentProps) {
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  
  const passwordRequirements = validatePassword(state.password);
  const allPasswordReqsMet = Object.values(passwordRequirements).every(Boolean);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Create Your Account</h3>
        <p className="text-fase-black text-sm">Enter your personal information and create a secure password</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-fase-navy mb-2">
            First Name *
          </label>
          <input
            type="text"
            value={state.firstName}
            onChange={(e) => {
              actions.updateField('firstName', e.target.value);
              actions.markFieldTouched('firstName');
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
              state.touchedFields.firstName || state.attemptedNext
                ? state.firstName.trim() === '' ? 'border-red-300' : 'border-fase-light-gold'
                : 'border-fase-light-gold'
            }`}
            placeholder="Your first name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fase-navy mb-2">
            Last Name *
          </label>
          <input
            type="text"
            value={state.surname}
            onChange={(e) => {
              actions.updateField('surname', e.target.value);
              actions.markFieldTouched('surname');
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
              state.touchedFields.surname || state.attemptedNext
                ? state.surname.trim() === '' ? 'border-red-300' : 'border-fase-light-gold'
                : 'border-fase-light-gold'
            }`}
            placeholder="Your last name"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-fase-navy mb-2">
          Email Address *
        </label>
        <input
          type="email"
          value={state.email}
          onChange={(e) => {
            actions.updateField('email', e.target.value);
            actions.markFieldTouched('email');
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
            state.touchedFields.email || state.attemptedNext
              ? state.email.trim() === '' ? 'border-red-300' : 'border-fase-light-gold'
              : 'border-fase-light-gold'
          }`}
          placeholder="your.email@company.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-fase-navy mb-2">
          Password *
        </label>
        <input
          type="password"
          value={state.password}
          onChange={(e) => {
            actions.updateField('password', e.target.value);
            actions.markFieldTouched('password');
          }}
          onFocus={() => setShowPasswordReqs(true)}
          onBlur={() => setShowPasswordReqs(false)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
            state.touchedFields.password || state.attemptedNext
              ? !allPasswordReqsMet ? 'border-red-300' : 'border-fase-light-gold'
              : 'border-fase-light-gold'
          }`}
          placeholder="Create a secure password"
        />
        
        {(showPasswordReqs || (state.touchedFields.password && !allPasswordReqsMet)) && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
            <div className="space-y-1">
              <div className={`text-sm flex items-center ${passwordRequirements.length ? 'text-green-600' : 'text-gray-500'}`}>
                <span className="mr-2">{passwordRequirements.length ? '✓' : '○'}</span>
                At least 8 characters
              </div>
              <div className={`text-sm flex items-center ${passwordRequirements.capital ? 'text-green-600' : 'text-gray-500'}`}>
                <span className="mr-2">{passwordRequirements.capital ? '✓' : '○'}</span>
                One uppercase letter
              </div>
              <div className={`text-sm flex items-center ${passwordRequirements.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                <span className="mr-2">{passwordRequirements.lowercase ? '✓' : '○'}</span>
                One lowercase letter
              </div>
              <div className={`text-sm flex items-center ${passwordRequirements.number ? 'text-green-600' : 'text-gray-500'}`}>
                <span className="mr-2">{passwordRequirements.number ? '✓' : '○'}</span>
                One number
              </div>
              <div className={`text-sm flex items-center ${passwordRequirements.special ? 'text-green-600' : 'text-gray-500'}`}>
                <span className="mr-2">{passwordRequirements.special ? '✓' : '○'}</span>
                One special character
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-fase-navy mb-2">
          Confirm Password *
        </label>
        <input
          type="password"
          value={state.confirmPassword}
          onChange={(e) => {
            actions.updateField('confirmPassword', e.target.value);
            actions.markFieldTouched('confirmPassword');
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
            state.touchedFields.confirmPassword || state.attemptedNext
              ? state.password !== state.confirmPassword ? 'border-red-300' : 'border-fase-light-gold'
              : 'border-fase-light-gold'
          }`}
          placeholder="Confirm your password"
        />
        {state.touchedFields.confirmPassword && state.password !== state.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
        )}
      </div>

      {/* Admin Test Toggle */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={state.isAdminTest}
            onChange={(e) => actions.updateField('isAdminTest', e.target.checked)}
            className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
          />
          <span className="text-sm text-yellow-800">
            <strong>Admin Test Mode</strong> - Use 1 cent test payment (for testing only)
          </span>
        </label>
      </div>
    </div>
  );
}