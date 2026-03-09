'use client';

/**
 * EmailContext - Shared context for email workflows in the admin portal
 *
 * Provides:
 * - Centralized email sending state
 * - Email preview management
 * - Send history tracking
 * - Toast notifications for email results
 *
 * Usage:
 * 1. Wrap admin portal with <EmailProvider>
 * 2. Use useEmail() hook in components
 */

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { authPost } from '@/lib/auth-fetch';

// ============================================================================
// Types
// ============================================================================

export type EmailType =
  | 'invoice'
  | 'standalone_invoice'
  | 'welcome'
  | 'reminder'
  | 'rendezvous'
  | 'bulletin'
  | 'mass_email'
  | 'freeform';

export interface EmailRecipient {
  email: string;
  name?: string;
  organizationName?: string;
}

export interface EmailSendRequest {
  type: EmailType;
  recipients: EmailRecipient[];
  subject?: string;
  body?: string;
  templateData?: Record<string, unknown>;
  apiEndpoint: string;
  payload: Record<string, unknown>;
}

export interface EmailSendResult {
  id: string;
  type: EmailType;
  recipients: EmailRecipient[];
  success: boolean;
  sentAt: Date;
  error?: string;
  response?: Record<string, unknown>;
}

export interface EmailPreview {
  subject: string;
  htmlBody: string;
  textBody?: string;
  recipients: EmailRecipient[];
}

export interface EmailState {
  // Current operation
  isSending: boolean;
  isPreviewing: boolean;
  currentRequest: EmailSendRequest | null;

  // Preview
  preview: EmailPreview | null;

  // History (last N sends)
  sendHistory: EmailSendResult[];

  // Toast notification
  toast: {
    show: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  } | null;
}

// ============================================================================
// Actions
// ============================================================================

type EmailAction =
  | { type: 'START_PREVIEW'; request: EmailSendRequest }
  | { type: 'PREVIEW_SUCCESS'; preview: EmailPreview }
  | { type: 'PREVIEW_ERROR'; error: string }
  | { type: 'CLEAR_PREVIEW' }
  | { type: 'START_SEND'; request: EmailSendRequest }
  | { type: 'SEND_SUCCESS'; result: EmailSendResult }
  | { type: 'SEND_ERROR'; error: string; request: EmailSendRequest }
  | { type: 'CLEAR_TOAST' }
  | { type: 'SHOW_TOAST'; toast: EmailState['toast'] }
  | { type: 'CLEAR_HISTORY' };

// ============================================================================
// Reducer
// ============================================================================

const initialState: EmailState = {
  isSending: false,
  isPreviewing: false,
  currentRequest: null,
  preview: null,
  sendHistory: [],
  toast: null,
};

function emailReducer(state: EmailState, action: EmailAction): EmailState {
  switch (action.type) {
    case 'START_PREVIEW':
      return {
        ...state,
        isPreviewing: true,
        currentRequest: action.request,
        preview: null,
      };

    case 'PREVIEW_SUCCESS':
      return {
        ...state,
        isPreviewing: false,
        preview: action.preview,
      };

    case 'PREVIEW_ERROR':
      return {
        ...state,
        isPreviewing: false,
        toast: {
          show: true,
          type: 'error',
          message: `Preview failed: ${action.error}`,
        },
      };

    case 'CLEAR_PREVIEW':
      return {
        ...state,
        preview: null,
        currentRequest: null,
      };

    case 'START_SEND':
      return {
        ...state,
        isSending: true,
        currentRequest: action.request,
      };

    case 'SEND_SUCCESS': {
      const newHistory = [action.result, ...state.sendHistory].slice(0, 50); // Keep last 50
      return {
        ...state,
        isSending: false,
        currentRequest: null,
        sendHistory: newHistory,
        toast: {
          show: true,
          type: 'success',
          message: `Email sent to ${action.result.recipients.length} recipient(s)`,
        },
      };
    }

    case 'SEND_ERROR': {
      const errorResult: EmailSendResult = {
        id: crypto.randomUUID(),
        type: action.request.type,
        recipients: action.request.recipients,
        success: false,
        sentAt: new Date(),
        error: action.error,
      };
      const newHistory = [errorResult, ...state.sendHistory].slice(0, 50);
      return {
        ...state,
        isSending: false,
        currentRequest: null,
        sendHistory: newHistory,
        toast: {
          show: true,
          type: 'error',
          message: `Send failed: ${action.error}`,
        },
      };
    }

    case 'CLEAR_TOAST':
      return {
        ...state,
        toast: null,
      };

    case 'SHOW_TOAST':
      return {
        ...state,
        toast: action.toast,
      };

    case 'CLEAR_HISTORY':
      return {
        ...state,
        sendHistory: [],
      };

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface EmailContextValue {
  state: EmailState;

  // Actions
  previewEmail: (request: EmailSendRequest) => Promise<EmailPreview | null>;
  sendEmail: (request: EmailSendRequest) => Promise<EmailSendResult>;
  clearPreview: () => void;
  clearToast: () => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;

  // Convenience helpers
  sendWithPreview: (request: EmailSendRequest) => Promise<void>;
}

const EmailContext = createContext<EmailContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface EmailProviderProps {
  children: ReactNode;
}

export function EmailProvider({ children }: EmailProviderProps) {
  const [state, dispatch] = useReducer(emailReducer, initialState);

  const previewEmail = useCallback(async (request: EmailSendRequest): Promise<EmailPreview | null> => {
    dispatch({ type: 'START_PREVIEW', request });

    try {
      const response = await authPost(request.apiEndpoint, {
        ...request.payload,
        preview: true,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Preview failed');
      }

      const data = await response.json();
      const preview: EmailPreview = {
        subject: data.subject || data.preview?.subject || '',
        htmlBody: data.htmlBody || data.preview?.html || data.html || '',
        textBody: data.textBody || data.preview?.text,
        recipients: request.recipients,
      };

      dispatch({ type: 'PREVIEW_SUCCESS', preview });
      return preview;
    } catch (error: any) {
      dispatch({ type: 'PREVIEW_ERROR', error: error.message });
      return null;
    }
  }, []);

  const sendEmail = useCallback(async (request: EmailSendRequest): Promise<EmailSendResult> => {
    dispatch({ type: 'START_SEND', request });

    try {
      const response = await authPost(request.apiEndpoint, {
        ...request.payload,
        preview: false,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Send failed');
      }

      const data = await response.json();
      const result: EmailSendResult = {
        id: crypto.randomUUID(),
        type: request.type,
        recipients: request.recipients,
        success: true,
        sentAt: new Date(),
        response: data,
      };

      dispatch({ type: 'SEND_SUCCESS', result });
      return result;
    } catch (error: any) {
      dispatch({ type: 'SEND_ERROR', error: error.message, request });
      throw error;
    }
  }, []);

  const clearPreview = useCallback(() => {
    dispatch({ type: 'CLEAR_PREVIEW' });
  }, []);

  const clearToast = useCallback(() => {
    dispatch({ type: 'CLEAR_TOAST' });
  }, []);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    dispatch({ type: 'SHOW_TOAST', toast: { show: true, type, message } });
  }, []);

  const sendWithPreview = useCallback(async (request: EmailSendRequest): Promise<void> => {
    const preview = await previewEmail(request);
    if (preview) {
      // Preview is now available in state.preview
      // Component can show confirmation modal and then call sendEmail
    }
  }, [previewEmail]);

  const value: EmailContextValue = {
    state,
    previewEmail,
    sendEmail,
    clearPreview,
    clearToast,
    showToast,
    sendWithPreview,
  };

  return <EmailContext.Provider value={value}>{children}</EmailContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useEmail(): EmailContextValue {
  const context = useContext(EmailContext);
  if (!context) {
    throw new Error('useEmail must be used within an EmailProvider');
  }
  return context;
}

// ============================================================================
// Toast Component (optional, can be used at app level)
// ============================================================================

export function EmailToast() {
  const { state, clearToast } = useEmail();

  if (!state.toast?.show) return null;

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[state.toast.type];

  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50`}>
      <span>{state.toast.message}</span>
      <button
        onClick={clearToast}
        className="text-white/80 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
