/**
 * State management for MemberEmailActions component
 *
 * Uses useReducer to consolidate 10+ useState hooks into a single state machine.
 * This makes the component easier to reason about and test.
 */

import { useReducer, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/auth-fetch';

// ============================================================================
// Types
// ============================================================================

export type EmailAction = 'invoice' | 'standalone_invoice' | 'welcome' | 'reminder' | 'rendezvous' | 'bulletin' | null;

export interface SubcollectionMember {
  id: string;
  email: string;
  personalName: string;
  jobTitle?: string;
  isPrimaryContact?: boolean;
  isAccountAdministrator?: boolean;
}

export interface EmailFormData {
  email: string;
  cc: string;
  fullName: string;
  greeting: string;
  gender: 'm' | 'f';
  organizationName: string;
  organizationType: string;
  hasOtherAssociations: boolean;
  userLocale: string;
  forceCurrency: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    county: string;
    postcode: string;
    country: string;
  };
  reminderAttachment: File | null;
  customLineItem: {
    description: string;
    amount: number;
    enabled: boolean;
  };
  rendezvousOverride: {
    enabled: boolean;
    passCount: number;
    unitPrice: number;
  };
  testPayment: boolean;
  rendezvous: {
    registrationId: string;
    numberOfAttendees: number;
    totalAmount: number;
    attendeeNames: string;
    isFaseMember: boolean;
    isComplimentary: boolean;
    specialRequests: string;
  };
  freeformSender: string;
}

export type EmailStep =
  | { name: 'select-action' }
  | { name: 'configure'; action: EmailAction }
  | { name: 'preview'; action: EmailAction; previewData: any }
  | { name: 'sending'; action: EmailAction }
  | { name: 'complete'; action: EmailAction; result: any }
  | { name: 'error'; action: EmailAction; error: string };

export interface EmailActionState {
  // Step in the workflow
  step: EmailStep;

  // Form data
  formData: EmailFormData;
  selectedRecipientIds: Set<string>;

  // External data
  subcollectionMembers: SubcollectionMember[];
  rendezvousRegistration: any;

  // Loading states
  loadingMembers: boolean;
  loadingRendezvous: boolean;

  // Preview data (stored separately from step for persistence)
  lastPreview: any;
}

// ============================================================================
// Actions
// ============================================================================

export type EmailActionAction =
  | { type: 'SELECT_ACTION'; action: EmailAction }
  | { type: 'BACK_TO_SELECT' }
  | { type: 'UPDATE_FORM'; updates: Partial<EmailFormData> }
  | { type: 'UPDATE_ADDRESS'; updates: Partial<EmailFormData['address']> }
  | { type: 'UPDATE_CUSTOM_LINE_ITEM'; updates: Partial<EmailFormData['customLineItem']> }
  | { type: 'UPDATE_RENDEZVOUS_OVERRIDE'; updates: Partial<EmailFormData['rendezvousOverride']> }
  | { type: 'UPDATE_RENDEZVOUS'; updates: Partial<EmailFormData['rendezvous']> }
  | { type: 'TOGGLE_RECIPIENT'; id: string }
  | { type: 'SELECT_ALL_RECIPIENTS'; ids: string[] }
  | { type: 'DESELECT_ALL_RECIPIENTS' }
  | { type: 'SET_MEMBERS'; members: SubcollectionMember[] }
  | { type: 'SET_MEMBERS_LOADING'; loading: boolean }
  | { type: 'SET_RENDEZVOUS_REGISTRATION'; registration: any }
  | { type: 'SET_RENDEZVOUS_LOADING'; loading: boolean }
  | { type: 'START_PREVIEW' }
  | { type: 'PREVIEW_SUCCESS'; previewData: any }
  | { type: 'PREVIEW_ERROR'; error: string }
  | { type: 'START_SEND' }
  | { type: 'SEND_SUCCESS'; result: any }
  | { type: 'SEND_ERROR'; error: string }
  | { type: 'RESET' }
  | { type: 'INIT_FROM_MEMBER_DATA'; memberData: any };

// ============================================================================
// Initial State
// ============================================================================

const initialFormData: EmailFormData = {
  email: '',
  cc: '',
  fullName: '',
  greeting: '',
  gender: 'm',
  organizationName: '',
  organizationType: 'MGA',
  hasOtherAssociations: false,
  userLocale: 'en',
  forceCurrency: '',
  address: {
    line1: '',
    line2: '',
    city: '',
    county: '',
    postcode: '',
    country: '',
  },
  reminderAttachment: null,
  customLineItem: {
    description: '',
    amount: 0,
    enabled: false,
  },
  rendezvousOverride: {
    enabled: false,
    passCount: 0,
    unitPrice: 0,
  },
  testPayment: false,
  rendezvous: {
    registrationId: '',
    numberOfAttendees: 1,
    totalAmount: 0,
    attendeeNames: '',
    isFaseMember: true,
    isComplimentary: false,
    specialRequests: '',
  },
  freeformSender: 'admin@fasemga.com',
};

export const initialState: EmailActionState = {
  step: { name: 'select-action' },
  formData: initialFormData,
  selectedRecipientIds: new Set(['account_admin']),
  subcollectionMembers: [],
  rendezvousRegistration: null,
  loadingMembers: false,
  loadingRendezvous: false,
  lastPreview: null,
};

// ============================================================================
// Reducer
// ============================================================================

export function emailActionReducer(
  state: EmailActionState,
  action: EmailActionAction
): EmailActionState {
  switch (action.type) {
    case 'SELECT_ACTION':
      return {
        ...state,
        step: { name: 'configure', action: action.action },
      };

    case 'BACK_TO_SELECT':
      return {
        ...state,
        step: { name: 'select-action' },
        lastPreview: null,
      };

    case 'UPDATE_FORM':
      return {
        ...state,
        formData: { ...state.formData, ...action.updates },
      };

    case 'UPDATE_ADDRESS':
      return {
        ...state,
        formData: {
          ...state.formData,
          address: { ...state.formData.address, ...action.updates },
        },
      };

    case 'UPDATE_CUSTOM_LINE_ITEM':
      return {
        ...state,
        formData: {
          ...state.formData,
          customLineItem: { ...state.formData.customLineItem, ...action.updates },
        },
      };

    case 'UPDATE_RENDEZVOUS_OVERRIDE':
      return {
        ...state,
        formData: {
          ...state.formData,
          rendezvousOverride: { ...state.formData.rendezvousOverride, ...action.updates },
        },
      };

    case 'UPDATE_RENDEZVOUS':
      return {
        ...state,
        formData: {
          ...state.formData,
          rendezvous: { ...state.formData.rendezvous, ...action.updates },
        },
      };

    case 'TOGGLE_RECIPIENT': {
      const newSet = new Set(state.selectedRecipientIds);
      if (newSet.has(action.id)) {
        newSet.delete(action.id);
      } else {
        newSet.add(action.id);
      }
      return {
        ...state,
        selectedRecipientIds: newSet,
      };
    }

    case 'SELECT_ALL_RECIPIENTS':
      return {
        ...state,
        selectedRecipientIds: new Set(action.ids),
      };

    case 'DESELECT_ALL_RECIPIENTS':
      return {
        ...state,
        selectedRecipientIds: new Set(),
      };

    case 'SET_MEMBERS':
      return {
        ...state,
        subcollectionMembers: action.members,
        loadingMembers: false,
      };

    case 'SET_MEMBERS_LOADING':
      return {
        ...state,
        loadingMembers: action.loading,
      };

    case 'SET_RENDEZVOUS_REGISTRATION':
      return {
        ...state,
        rendezvousRegistration: action.registration,
        loadingRendezvous: false,
      };

    case 'SET_RENDEZVOUS_LOADING':
      return {
        ...state,
        loadingRendezvous: action.loading,
      };

    case 'START_PREVIEW': {
      const currentAction = state.step.name === 'configure' ? state.step.action : null;
      return {
        ...state,
        step: { name: 'sending', action: currentAction }, // Use 'sending' for preview loading too
      };
    }

    case 'PREVIEW_SUCCESS': {
      const currentAction =
        state.step.name === 'sending' || state.step.name === 'configure'
          ? (state.step as any).action
          : null;
      return {
        ...state,
        step: { name: 'preview', action: currentAction, previewData: action.previewData },
        lastPreview: action.previewData,
      };
    }

    case 'PREVIEW_ERROR': {
      const currentAction = (state.step as any).action || null;
      return {
        ...state,
        step: { name: 'error', action: currentAction, error: action.error },
      };
    }

    case 'START_SEND': {
      const currentAction =
        state.step.name === 'preview' ? state.step.action : (state.step as any).action || null;
      return {
        ...state,
        step: { name: 'sending', action: currentAction },
      };
    }

    case 'SEND_SUCCESS': {
      const currentAction = (state.step as any).action || null;
      return {
        ...state,
        step: { name: 'complete', action: currentAction, result: action.result },
      };
    }

    case 'SEND_ERROR': {
      const currentAction = (state.step as any).action || null;
      return {
        ...state,
        step: { name: 'error', action: currentAction, error: action.error },
      };
    }

    case 'RESET':
      return {
        ...initialState,
        // Preserve loaded data
        subcollectionMembers: state.subcollectionMembers,
        rendezvousRegistration: state.rendezvousRegistration,
        formData: state.formData, // Keep form data for convenience
      };

    case 'INIT_FROM_MEMBER_DATA': {
      const memberData = action.memberData;
      if (!memberData) return state;

      return {
        ...state,
        formData: {
          ...state.formData,
          email: memberData.email || '',
          fullName:
            memberData?.accountAdministrator?.name ||
            memberData.personalName ||
            memberData?.fullName ||
            '',
          organizationName: memberData.organizationName || '',
          organizationType: memberData.organizationType || 'MGA',
          hasOtherAssociations: memberData.hasOtherAssociations || false,
          address: {
            line1:
              memberData.invoicingAddress?.line1 ||
              memberData.businessAddress?.line1 ||
              memberData.registeredAddress?.line1 ||
              '',
            line2:
              memberData.invoicingAddress?.line2 ||
              memberData.businessAddress?.line2 ||
              memberData.registeredAddress?.line2 ||
              '',
            city:
              memberData.invoicingAddress?.city ||
              memberData.businessAddress?.city ||
              memberData.registeredAddress?.city ||
              '',
            county:
              memberData.invoicingAddress?.county ||
              memberData.businessAddress?.county ||
              memberData.registeredAddress?.county ||
              '',
            postcode:
              memberData.invoicingAddress?.postcode ||
              memberData.businessAddress?.postcode ||
              memberData.registeredAddress?.postcode ||
              '',
            country:
              memberData.invoicingAddress?.country ||
              memberData.businessAddress?.country ||
              memberData.registeredAddress?.country ||
              '',
          },
        },
      };
    }

    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

export interface UseEmailActionStateOptions {
  memberData: any;
  companyId: string;
}

export function useEmailActionState({ memberData, companyId }: UseEmailActionStateOptions) {
  const [state, dispatch] = useReducer(emailActionReducer, initialState);

  // Initialize form data from memberData
  useEffect(() => {
    if (memberData) {
      dispatch({ type: 'INIT_FROM_MEMBER_DATA', memberData });
    }
  }, [memberData]);

  // Fetch rendezvous registration
  useEffect(() => {
    const fetchRendezvousRegistration = async () => {
      if (!memberData?.email && !memberData?.organizationName) return;

      dispatch({ type: 'SET_RENDEZVOUS_LOADING', loading: true });

      try {
        const response = await authFetch(
          `/api/admin/rendezvous-lookup?email=${encodeURIComponent(memberData.email || '')}&company=${encodeURIComponent(memberData.organizationName || '')}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.registration) {
            dispatch({ type: 'SET_RENDEZVOUS_REGISTRATION', registration: data.registration });
          } else {
            dispatch({ type: 'SET_RENDEZVOUS_LOADING', loading: false });
          }
        } else {
          dispatch({ type: 'SET_RENDEZVOUS_LOADING', loading: false });
        }
      } catch (error) {
        console.error('Failed to fetch rendezvous registration:', error);
        dispatch({ type: 'SET_RENDEZVOUS_LOADING', loading: false });
      }
    };

    fetchRendezvousRegistration();
  }, [memberData?.email, memberData?.organizationName]);

  // Fetch subcollection members
  useEffect(() => {
    const fetchSubcollectionMembers = async () => {
      if (!companyId) return;

      dispatch({ type: 'SET_MEMBERS_LOADING', loading: true });

      try {
        const response = await authFetch(`/api/admin/company-members?companyId=${companyId}`);
        if (response.ok) {
          const data = await response.json();
          dispatch({ type: 'SET_MEMBERS', members: data.members || [] });
        } else {
          dispatch({ type: 'SET_MEMBERS_LOADING', loading: false });
        }
      } catch (error) {
        console.error('Failed to fetch subcollection members:', error);
        dispatch({ type: 'SET_MEMBERS_LOADING', loading: false });
      }
    };

    fetchSubcollectionMembers();
  }, [companyId]);

  // Helper to get all recipients
  const getAllRecipients = useCallback(() => {
    const recipients: { id: string; email: string; name: string; role?: string; isAdmin?: boolean }[] = [];

    if (memberData?.email) {
      recipients.push({
        id: 'account_admin',
        email: memberData.email,
        name:
          memberData.accountAdministrator?.name ||
          memberData.personalName ||
          memberData.fullName ||
          'Account Admin',
        role: memberData.accountAdministrator?.role || memberData.jobTitle,
        isAdmin: true,
      });
    }

    state.subcollectionMembers.forEach((member) => {
      if (member.email !== memberData?.email) {
        recipients.push({
          id: member.id,
          email: member.email,
          name: member.personalName,
          role: member.jobTitle,
        });
      }
    });

    return recipients;
  }, [memberData, state.subcollectionMembers]);

  // Helper to get selected emails
  const getSelectedEmails = useCallback(() => {
    const allRecipients = getAllRecipients();
    return allRecipients.filter((r) => state.selectedRecipientIds.has(r.id)).map((r) => r.email);
  }, [getAllRecipients, state.selectedRecipientIds]);

  // Helper to get current action
  const getCurrentAction = useCallback((): EmailAction => {
    switch (state.step.name) {
      case 'configure':
      case 'preview':
      case 'sending':
      case 'complete':
      case 'error':
        return state.step.action;
      default:
        return null;
    }
  }, [state.step]);

  // Helper booleans for step checks
  const isSelectingAction = state.step.name === 'select-action';
  const isConfiguring = state.step.name === 'configure';
  const isPreviewing = state.step.name === 'preview';
  const isSending = state.step.name === 'sending';
  const isComplete = state.step.name === 'complete';
  const hasError = state.step.name === 'error';

  return {
    state,
    dispatch,
    // Helpers
    getAllRecipients,
    getSelectedEmails,
    getCurrentAction,
    // Step checks
    isSelectingAction,
    isConfiguring,
    isPreviewing,
    isSending,
    isComplete,
    hasError,
  };
}
