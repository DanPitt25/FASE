'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

interface InviteTranslations {
  page: {
    validating: string;
    invalid_invitation: string;
    return_home: string;
    welcome_title: string;
    welcome_message: string;
    email_label: string;
    account_question: string;
    have_account: string;
    need_account: string;
    signin_title: string;
    signin_message: string;
    password_label: string;
    password_placeholder: string;
    signin_button: string;
    signin_loading: string;
    back_button: string;
    create_title: string;
    create_message: string;
    email_address_label: string;
    password_requirements: {
      length: string;
      capital: string;
      special: string;
    };
    confirm_password_label: string;
    confirm_password_placeholder: string;
    password_placeholder_create: string;
    passwords_no_match: string;
    create_account_button: string;
    creating_account: string;
    account_created_title: string;
    account_created_message: string;
    errors: {
      invalid_link: string;
      expired_link: string;
      passwords_no_match: string;
      weak_password: string;
      create_account_failed: string;
      signin_failed: string;
      wrong_password: string;
      user_not_found: string;
      join_team_failed: string;
    };
  };
  email: {
    subject: string;
    title: string;
    greeting: string;
    invitation_text: string;
    instruction: string;
    button_text: string;
    guide_text: string;
    regards: string;
    team_signature: string;
    help_text: string;
    help_email: string;
  };
}

export function useInviteTranslations() {
  const [translations, setTranslations] = useState<InviteTranslations | null>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        // Get locale from localStorage or default to English
        const savedLocale = localStorage.getItem('fase-locale') || 'en';
        setLocale(savedLocale);
        
        // Load translations for the locale
        const translations = await import(`../../../messages/${savedLocale}/invite.json`);
        setTranslations(translations.default);
      } catch (error) {
        console.warn(`Failed to load translations for locale ${locale}, falling back to English:`, error);
        try {
          const translations = await import(`../../../messages/en/invite.json`);
          setTranslations(translations.default);
        } catch (fallbackError) {
          console.error('Failed to load English translations:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadTranslations();
  }, [locale]);

  // Template interpolation function
  const t = (key: string, variables?: Record<string, string>) => {
    if (!translations) return key;
    
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    
    if (typeof value !== 'string') return key;
    
    // Replace variables in the string
    if (variables) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return variables[varName] || match;
      });
    }
    
    return value;
  };

  return { t, loading, locale, setLocale };
}