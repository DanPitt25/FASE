'use client';

import { useState } from "react";
import { createAccountWithVerification } from "../../lib/auth";
import Button from "../../components/Button";
import { handleAuthError } from "../../lib/auth-errors";

// Password validation function
const validatePassword = (password: string) => {
  const requirements = {
    length: password.length >= 8,
    capital: /[A-Z]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const isValid = requirements.length && requirements.capital && requirements.special;
  return { requirements, isValid };
};

export default function RegisterForm() {
  const [personalName, setPersonalName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    if (!personalName.trim()) {
      setError("Personal name is required");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const { isValid, requirements } = validatePassword(password);
    if (!isValid) {
      let errorMsg = "Password must include: ";
      const missing = [];
      if (!requirements.length) missing.push("at least 8 characters");
      if (!requirements.capital) missing.push("one capital letter");
      if (!requirements.special) missing.push("one special character");
      setError(errorMsg + missing.join(", "));
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      await createAccountWithVerification(email, password, personalName.trim(), organisation.trim() || undefined);
      setEmailSent(true);
    } catch (error: any) {
      setError(handleAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-fase-navy rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">Check Your Email</h2>
        <p className="text-fase-steel mb-6">
          Click the verification link sent to <strong>{email}</strong>
        </p>
        
        <div className="text-center mb-4">
          <a
            href="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-fase-navy hover:bg-fase-platinum focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fase-navy"
          >
            Continue to Sign In
          </a>
        </div>
        
        <p className="text-xs text-fase-steel text-center">
          Check your spam folder if you don&apos;t see the email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="personalName" className="block text-sm font-medium text-fase-steel">
          Personal Name
        </label>
        <input
          id="personalName"
          type="text"
          value={personalName}
          onChange={(e) => setPersonalName(e.target.value)}
          required
          placeholder="Your full name"
          className="mt-1 block w-full px-3 py-2 border border-fase-silver rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
        />
      </div>
      
      <div>
        <label htmlFor="organisation" className="block text-sm font-medium text-fase-steel">
          Organisation
        </label>
        <input
          id="organisation"
          type="text"
          value={organisation}
          onChange={(e) => setOrganisation(e.target.value)}
          placeholder="Company or organisation name (optional)"
          className="mt-1 block w-full px-3 py-2 border border-fase-silver rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
        />
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-fase-steel">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-fase-silver rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-fase-steel">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setShowPasswordReqs(e.target.value.length > 0);
          }}
          onFocus={() => setShowPasswordReqs(true)}
          onBlur={() => setShowPasswordReqs(password.length > 0)}
          required
          className="mt-1 block w-full px-3 py-2 border border-fase-silver rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
        />
        
        {/* Password Requirements */}
        {showPasswordReqs && (
          <div className="mt-2 p-3 bg-fase-paper rounded-md border border-fase-silver">
            <p className="text-xs font-medium text-fase-steel mb-2">Password must include:</p>
            {(() => {
              const { requirements } = validatePassword(password);
              return (
                <div className="space-y-1">
                  <div className={`text-xs flex items-center ${requirements.length ? "text-green-600" : "text-fase-steel"}`}>
                    <span className="mr-2">{requirements.length ? "✓" : "○"}</span>
                    At least 8 characters
                  </div>
                  <div className={`text-xs flex items-center ${requirements.capital ? "text-green-600" : "text-fase-steel"}`}>
                    <span className="mr-2">{requirements.capital ? "✓" : "○"}</span>
                    One capital letter (A-Z)
                  </div>
                  <div className={`text-xs flex items-center ${requirements.special ? "text-green-600" : "text-fase-steel"}`}>
                    <span className="mr-2">{requirements.special ? "✓" : "○"}</span>
                    One special character (!@#$%^&*...)
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-fase-steel">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-fase-silver rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <Button 
        type="submit" 
        variant="primary" 
        size="large" 
        className="w-full"
        disabled={loading}
      >
        {loading ? "Creating Account..." : "Create Account"}
      </Button>
    </form>
  );
}