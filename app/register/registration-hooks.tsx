'use client';

import { useReducer, useCallback } from "react";
import { useSearchParams } from 'next/navigation';

// Member interface
export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  isPrimaryContact: boolean;
}

// Rendezvous attendee
export interface RendezvousAttendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
}

// Form state - mirrors Firestore account structure where possible
export interface RegistrationFormData {
  // Auth
  email: string;
  password: string;
  confirmPassword: string;

  // Personal info (for account administrator)
  firstName: string;
  surname: string;

  // Organization
  organizationName: string;
  organizationType: 'MGA' | 'carrier' | 'provider' | '';

  // Team members
  members: Member[];

  // Address (maps to businessAddress in Firestore)
  address: {
    line1: string;
    line2: string;
    city: string;
    county: string;
    postcode: string;
    country: string;
  };

  // MGA Portfolio (maps to portfolio in Firestore)
  portfolio: {
    gwpBillions: string;
    gwpMillions: string;
    gwpThousands: string;
    gwpCurrency: string;
    linesOfBusiness: string[];
    otherLinesOfBusiness: { other1: string; other2: string; other3: string };
    markets: string[];
  };

  // Carrier info (maps to carrierInfo in Firestore)
  carrierInfo: {
    organizationType: string;
    isDelegatingInEurope: string;
    numberOfMGAs: string;
    delegatingCountries: string[];
    frontingOptions: string;
    considerStartupMGAs: string;
    amBestRating: string;
    otherRating: string;
  };

  // Service provider
  servicesProvided: string[];

  // Associations
  hasOtherAssociations: boolean | null;
  otherAssociations: string[];

  // Rendezvous
  reserveRendezvousPasses: boolean;
  rendezvousPassCount: number;
  rendezvousAttendees: RendezvousAttendee[];

  // Consent
  dataNoticeConsent: boolean;
  codeOfConductConsent: boolean;
}

// UI state - not persisted to Firestore
export interface RegistrationUIState {
  step: number;
  error: string;
  attemptedNext: boolean;
  touchedFields: Record<string, boolean>;
  showPasswordReqs: boolean;
  submitting: boolean;
}

// Combined state
export interface RegistrationState {
  form: RegistrationFormData;
  ui: RegistrationUIState;
}

// Action types
type FormAction =
  | { type: 'SET_FIELD'; path: string; value: unknown }
  | { type: 'SET_MEMBERS'; members: Member[] }
  | { type: 'ADD_MEMBER'; member: Member }
  | { type: 'UPDATE_MEMBER'; id: string; updates: Partial<Member> }
  | { type: 'REMOVE_MEMBER'; id: string }
  | { type: 'SET_RENDEZVOUS_ATTENDEES'; attendees: RendezvousAttendee[] }
  | { type: 'UPDATE_RENDEZVOUS_ATTENDEE'; id: string; field: keyof RendezvousAttendee; value: string }
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'SET_ATTEMPTED_NEXT'; value: boolean }
  | { type: 'TOUCH_FIELD'; field: string }
  | { type: 'SET_SHOW_PASSWORD_REQS'; value: boolean }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'RESET_FORM' };

// Step definitions - now 0-4 instead of -1 to 5
// Step 0: Organization type + data consent
// Step 1: Account info (name, email, password)
// Step 2: Organization details (name, team, address)
// Step 3: Type-specific info + associations + rendezvous
// Step 4: Review & submit
export const TOTAL_STEPS = 5; // 0-4

// Initial state
const createInitialState = (typeFromUrl: string | null): RegistrationState => ({
  form: {
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    surname: '',
    organizationName: '',
    organizationType: (typeFromUrl as 'MGA' | 'carrier' | 'provider') || '',
    members: [],
    address: {
      line1: '',
      line2: '',
      city: '',
      county: '',
      postcode: '',
      country: '',
    },
    portfolio: {
      gwpBillions: '',
      gwpMillions: '',
      gwpThousands: '',
      gwpCurrency: 'EUR',
      linesOfBusiness: [],
      otherLinesOfBusiness: { other1: '', other2: '', other3: '' },
      markets: [],
    },
    carrierInfo: {
      organizationType: '',
      isDelegatingInEurope: '',
      numberOfMGAs: '',
      delegatingCountries: [],
      frontingOptions: '',
      considerStartupMGAs: '',
      amBestRating: '',
      otherRating: '',
    },
    servicesProvided: [],
    hasOtherAssociations: null,
    otherAssociations: [],
    reserveRendezvousPasses: false,
    rendezvousPassCount: 1,
    rendezvousAttendees: [{ id: '1', firstName: '', lastName: '', email: '', jobTitle: '' }],
    dataNoticeConsent: false,
    codeOfConductConsent: false,
  },
  ui: {
    step: 0, // Always start at 0 now
    error: '',
    attemptedNext: false,
    touchedFields: {},
    showPasswordReqs: false,
    submitting: false,
  },
});

// Helper to set nested field by path (e.g., 'address.city' or 'portfolio.gwpCurrency')
function setNestedField(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.');
  const result = { ...obj };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    current[key] = { ...(current[key] as Record<string, unknown>) };
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

// Reducer
function registrationReducer(state: RegistrationState, action: FormAction): RegistrationState {
  switch (action.type) {
    case 'SET_FIELD': {
      const newForm = setNestedField(state.form as unknown as Record<string, unknown>, action.path, action.value);
      return { ...state, form: newForm as unknown as RegistrationFormData };
    }

    case 'SET_MEMBERS':
      return { ...state, form: { ...state.form, members: action.members } };

    case 'ADD_MEMBER':
      return { ...state, form: { ...state.form, members: [...state.form.members, action.member] } };

    case 'UPDATE_MEMBER':
      return {
        ...state,
        form: {
          ...state.form,
          members: state.form.members.map(m =>
            m.id === action.id ? { ...m, ...action.updates, name: `${action.updates.firstName ?? m.firstName} ${action.updates.lastName ?? m.lastName}`.trim() } : m
          ),
        },
      };

    case 'REMOVE_MEMBER':
      return { ...state, form: { ...state.form, members: state.form.members.filter(m => m.id !== action.id) } };

    case 'SET_RENDEZVOUS_ATTENDEES':
      return { ...state, form: { ...state.form, rendezvousAttendees: action.attendees } };

    case 'UPDATE_RENDEZVOUS_ATTENDEE':
      return {
        ...state,
        form: {
          ...state.form,
          rendezvousAttendees: state.form.rendezvousAttendees.map(a =>
            a.id === action.id ? { ...a, [action.field]: action.value } : a
          ),
        },
      };

    case 'SET_STEP':
      return { ...state, ui: { ...state.ui, step: action.step, error: '', attemptedNext: false } };

    case 'SET_ERROR':
      return { ...state, ui: { ...state.ui, error: action.error } };

    case 'SET_ATTEMPTED_NEXT':
      return { ...state, ui: { ...state.ui, attemptedNext: action.value } };

    case 'TOUCH_FIELD':
      return { ...state, ui: { ...state.ui, touchedFields: { ...state.ui.touchedFields, [action.field]: true } } };

    case 'SET_SHOW_PASSWORD_REQS':
      return { ...state, ui: { ...state.ui, showPasswordReqs: action.value } };

    case 'SET_SUBMITTING':
      return { ...state, ui: { ...state.ui, submitting: action.value } };

    case 'RESET_FORM':
      return createInitialState(null);

    default:
      return state;
  }
}

// Main hook
export function useRegistrationForm() {
  const searchParams = useSearchParams();
  const typeFromUrl = searchParams.get('type');
  const isTestMode = searchParams.get('test') === 'true';

  const [state, dispatch] = useReducer(registrationReducer, typeFromUrl, createInitialState);

  // Convenience setters
  const setField = useCallback((path: string, value: unknown) => {
    dispatch({ type: 'SET_FIELD', path, value });
  }, []);

  const setStep = useCallback((step: number) => {
    dispatch({ type: 'SET_STEP', step });
  }, []);

  const setError = useCallback((error: string) => {
    dispatch({ type: 'SET_ERROR', error });
  }, []);

  const touchField = useCallback((field: string) => {
    dispatch({ type: 'TOUCH_FIELD', field });
  }, []);

  const setAttemptedNext = useCallback((value: boolean) => {
    dispatch({ type: 'SET_ATTEMPTED_NEXT', value });
  }, []);

  const setSubmitting = useCallback((value: boolean) => {
    dispatch({ type: 'SET_SUBMITTING', value });
  }, []);

  // Member management
  const setMembers = useCallback((members: Member[]) => {
    dispatch({ type: 'SET_MEMBERS', members });
  }, []);

  const addMember = useCallback((member: Member) => {
    dispatch({ type: 'ADD_MEMBER', member });
  }, []);

  const updateMember = useCallback((id: string, updates: Partial<Member>) => {
    dispatch({ type: 'UPDATE_MEMBER', id, updates });
  }, []);

  const removeMember = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_MEMBER', id });
  }, []);

  // Rendezvous attendee management
  const updateRendezvousAttendee = useCallback((id: string, field: keyof RendezvousAttendee, value: string) => {
    dispatch({ type: 'UPDATE_RENDEZVOUS_ATTENDEE', id, field, value });
  }, []);

  const syncRendezvousAttendeesWithCount = useCallback((count: number) => {
    const current = state.form.rendezvousAttendees;
    if (count > current.length) {
      const newAttendees = [...current];
      for (let i = current.length; i < count; i++) {
        newAttendees.push({ id: `${Date.now()}-${i}`, firstName: '', lastName: '', email: '', jobTitle: '' });
      }
      dispatch({ type: 'SET_RENDEZVOUS_ATTENDEES', attendees: newAttendees });
    } else if (count < current.length) {
      dispatch({ type: 'SET_RENDEZVOUS_ATTENDEES', attendees: current.slice(0, count) });
    }
  }, [state.form.rendezvousAttendees]);

  // Computed: calculate total GWP from magnitude inputs
  const getTotalGWP = useCallback(() => {
    const { gwpBillions, gwpMillions, gwpThousands } = state.form.portfolio;
    const billions = parseFloat(gwpBillions) || 0;
    const millions = parseFloat(gwpMillions) || 0;
    const thousands = parseFloat(gwpThousands) || 0;
    return (billions * 1_000_000_000) + (millions * 1_000_000) + (thousands * 1_000);
  }, [state.form.portfolio]);

  // Check if ASASE member (complimentary Rendezvous)
  const isAsaseMember = useCallback(() => {
    return state.form.otherAssociations.includes('ASASE');
  }, [state.form.otherAssociations]);

  return {
    // State
    form: state.form,
    ui: state.ui,

    // Field setters
    setField,
    touchField,

    // UI state
    setStep,
    setError,
    setAttemptedNext,
    setSubmitting,

    // Member management
    setMembers,
    addMember,
    updateMember,
    removeMember,

    // Rendezvous
    updateRendezvousAttendee,
    syncRendezvousAttendeesWithCount,

    // Computed
    getTotalGWP,
    isAsaseMember,

    // URL params
    typeFromUrl,
    isTestMode,

    // Raw dispatch for edge cases
    dispatch,
  };
}

// Export type for the hook return value
export type UseRegistrationForm = ReturnType<typeof useRegistrationForm>;
