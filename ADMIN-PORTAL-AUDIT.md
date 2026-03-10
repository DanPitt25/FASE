# Admin Portal Audit & Refactoring Guide

**Date:** March 2026
**Total Lines:** 15,890 (12,042 components + 3,848 API routes)
**Status:** Needs significant refactoring for maintainability

---

## Quick Reference

| Component | Lines | Priority | Notes |
|-----------|-------|----------|-------|
| RendezvousTab | 2,521 | **CRITICAL** | Split into 5+ components |
| ReportsTab | 1,283 | Medium | Works but bloated |
| BioReviewTab | 1,255 | Medium | Complex workflow |
| FinanceTab | 1,216 | High | Duplicate invoice logic |
| MemberEmailActions | 1,188 | High | 20+ state variables |
| InvoicesTab | 567 | Low | Manageable |
| CompanyMembersModal | 562 | Medium | Good candidate for context |
| FreeformEmailTab | 547 | Low | Could merge with UtilitiesDrawer |
| SponsorsTab | 490 | Low | Self-contained |
| UtilitiesDrawer | 469 | Low | Contains mass email duplicate |
| CompanyDetailsTab | 427 | Low | Clean |
| MembersTab | 371 | Low | Clean |
| TasksTab | 307 | Low | Clean |
| page.tsx | 261 | Medium | Tab orchestration |
| TempAccountTab | 212 | Low | Clean |
| EmailEditorModal | 205 | Low | Clean |
| AdminCountrySelect | 112 | Low | Clean |
| ContentTab | 49 | Low | Stub only |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    /admin-portal/page.tsx                    │
│  (Tab Router + Member Data Orchestration)                   │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌──────────┐       ┌──────────┐       ┌──────────┐
    │ MembersTab│       │FinanceTab│       │Rendezvous│
    │  (371)   │       │ (1,216)  │       │  (2,521) │
    └────┬─────┘       └────┬─────┘       └────┬─────┘
         │                  │                  │
         ▼                  ▼                  ▼
    ┌──────────────────────────────────────────────┐
    │              authFetch() / authPost()         │
    │           (lib/auth-fetch.ts - 60 lines)     │
    └──────────────────────────────────────────────┘
                              │
                              ▼
    ┌──────────────────────────────────────────────┐
    │          /api/admin/* Routes (27 routes)     │
    │    verifyAdminAccess() → adminDb queries     │
    └──────────────────────────────────────────────┘
                              │
                              ▼
    ┌──────────────────────────────────────────────┐
    │              Firebase Firestore              │
    │  accounts / rendezvous-registrations / etc   │
    └──────────────────────────────────────────────┘
```

---

## Critical Issues (Fix First)

### 1. RendezvousTab.tsx (2,521 lines)

**Problem:** Single file doing too much - list view, 8 modals, data analysis, Excel export, invoice regeneration.

**Current structure:**
- Lines 1-150: Imports, interfaces, state (25+ useState calls)
- Lines 151-300: Data loading & computed values
- Lines 301-500: Event handlers (status, delete, email)
- Lines 501-700: Invoice generation handlers
- Lines 701-900: Attendee editing handlers
- Lines 901-1100: Add registration handler
- Lines 1101-1500: Helper functions & UI utilities
- Lines 1501-2521: JSX render (8 modals inline)

**Suggested split:**
```
rendezvous/
├── RendezvousTab.tsx         (300 lines - orchestration only)
├── RegistrationList.tsx      (400 lines - table + filters)
├── AttendeeView.tsx          (300 lines - flattened attendee list)
├── DataQualityPanel.tsx      (200 lines - duplicate detection)
├── modals/
│   ├── RegistrationDetailModal.tsx
│   ├── StatusChangeModal.tsx
│   ├── DeleteConfirmModal.tsx
│   ├── AddRegistrationModal.tsx
│   ├── EditAttendeesModal.tsx
│   └── EditInvoiceModal.tsx
└── hooks/
    └── useRendezvousData.ts  (data fetching + computed values)
```

### 2. Duplicate Invoice Logic

**Problem:** Invoice generation exists in 3+ places:
- `MemberEmailActions.tsx` (membership invoices)
- `FinanceTab.tsx` (paid invoice from transaction)
- `RendezvousTab.tsx` (rendezvous invoice regeneration)
- API: `/api/admin/generate-paid-invoice` (Rendezvous) AND `/api/admin/finance/generate-paid-invoice` (Membership)

**Note:** The two API routes are NOT true duplicates - they serve different purposes:
- `/api/admin/generate-paid-invoice` → Rendezvous event invoices (uses `rendezvous-invoice-generator.ts`)
- `/api/admin/finance/generate-paid-invoice` → Membership payment invoices (uses `paid-invoice-generator.ts`)

**Solution:** Create `lib/invoice-service.ts` to consolidate shared logic:
```typescript
// Shared invoice generation service
export async function generateInvoice(type: 'membership' | 'rendezvous' | 'paid', data: InvoiceData) { ... }
export async function regenerateInvoice(invoiceId: string, overrides: InvoiceOverrides) { ... }
```

### 3. MemberEmailActions.tsx (1,188 lines, 20+ state variables)

**Problem:** Massive component with complex multi-step email workflows.

**State explosion:**
```typescript
// Current - 20+ individual states
const [selectedAction, setSelectedAction] = useState<EmailAction | null>(null);
const [formData, setFormData] = useState({ ... }); // 15+ fields
const [sending, setSending] = useState(false);
const [preview, setPreview] = useState(null);
const [rendezvousRegistration, setRendezvousRegistration] = useState(null);
const [subcollectionMembers, setSubcollectionMembers] = useState([]);
// ... many more
```

**Solution:** Use reducer or context:
```typescript
// Suggested - single state machine
type EmailState =
  | { step: 'select-action' }
  | { step: 'configure', action: EmailAction, form: EmailForm }
  | { step: 'preview', action: EmailAction, preview: PreviewData }
  | { step: 'sending', action: EmailAction }
  | { step: 'complete', result: SendResult };

const [state, dispatch] = useReducer(emailReducer, { step: 'select-action' });
```

---

## API Routes Audit

### Routes by Category

**Member Management:**
| Route | Method | Lines | Purpose |
|-------|--------|-------|---------|
| `/admin/accounts` | GET | ~80 | List accounts by status |
| `/admin/account/[id]` | GET | ~50 | Get single account |
| `/admin/search` | GET | 263 | Full-text search (SLOW - needs optimization) |
| `/admin/delete-member` | POST | 101 | Delete account + cascade |
| `/admin/company-members` | GET | ~60 | Get org's team members |
| `/admin/company-details` | GET/PATCH | ~100 | Account details CRUD |
| `/admin/temp-account` | POST | ~80 | Create temp directory entry |

**Finance:**
| Route | Method | Lines | Purpose |
|-------|--------|-------|---------|
| `/admin/finance/transactions` | GET | ~120 | Stripe + Wise payments |
| `/admin/finance/generate-paid-invoice` | POST | ~90 | Invoice from payment |
| `/admin/finance/notes` | GET/POST/DELETE | ~80 | Payment notes |
| `/admin/finance/activities` | GET/POST | ~70 | Payment timeline |

**Rendezvous:**
| Route | Method | Lines | Purpose |
|-------|--------|-------|---------|
| `/admin/rendezvous-registrations` | GET/POST/PATCH | 213 | Registration CRUD |
| `/admin/rendezvous-lookup` | GET | ~40 | Find by email/company |
| `/admin/regenerate-rendezvous-invoice` | POST | 131 | Recalculate invoice |
| `/admin/generate-paid-invoice` | POST | 91 | Paid invoice PDF |
| `/admin/update-rendezvous-status` | POST | ~50 | Status change |
| `/admin/delete-rendezvous-registration` | POST | ~60 | Delete registration |

**Content & Email:**
| Route | Method | Lines | Purpose |
|-------|--------|-------|---------|
| `/admin/bio-review` | GET/POST | 193 | Bio/logo workflow |
| `/admin/sponsors` | GET/POST/PATCH/DELETE | ~150 | Sponsor CRUD |
| `/admin/send-mass-email` | POST | 171 | Bulk email |
| `/admin/get-filtered-accounts` | POST | ~60 | Filter for mass email |

**Other:**
| Route | Method | Lines | Purpose |
|-------|--------|-------|---------|
| `/admin/tasks` | GET/POST/PATCH/DELETE | 323 | Task management |
| `/admin/activities` | GET/POST | ~80 | Account timeline |
| `/admin/notes` | GET/POST/PATCH/DELETE | ~100 | Account notes |
| `/admin/storage-invoices` | GET | ~70 | List stored invoices |
| `/admin/account-invoices` | GET | ~50 | Invoices for account |

### Performance Issues

**`/admin/search` (263 lines) - CRITICAL:**
```typescript
// Current: O(n*m) - loads ALL accounts, then queries ALL members subcollections
const accountsSnapshot = await adminDb.collection('accounts').get();
for (const doc of accountsSnapshot.docs) {
  // For each account, query members subcollection
  const membersSnapshot = await adminDb.collection('accounts').doc(doc.id).collection('members').get();
}
```

**Solution:** Use Firestore composite indexes + proper queries:
```typescript
// Better: Use indexed queries with pagination
const query = adminDb.collection('accounts')
  .where('status', 'in', ['approved', 'pending'])
  .orderBy('organizationName')
  .limit(50)
  .startAfter(cursor);
```

---

## Data Models

### Firestore Collections

```
accounts/
├── {accountId}
│   ├── organizationName: string
│   ├── organizationType: 'MGA' | 'carrier' | 'provider'
│   ├── status: 'pending' | 'pending_invoice' | 'approved' | 'invoice_sent' | 'admin' | 'internal' | 'guest' | 'flagged'
│   ├── country: string
│   ├── website?: string
│   ├── logoURL?: string
│   ├── businessAddress?: { line1, line2, city, postcode, country }
│   ├── accountAdministrator?: { name, email }
│   ├── primaryContact?: { name, email }
│   ├── companySummary?: { text, status, translations }
│   ├── createdAt: Timestamp
│   └── members/
│       └── {memberId}
│           ├── personalName: string
│           ├── email: string
│           ├── jobTitle?: string
│           └── createdAt: Timestamp

rendezvous-registrations/
├── {registrationId}
│   ├── registrationId: string
│   ├── invoiceNumber: string
│   ├── billingInfo: { company, billingEmail, country, address?, organizationType }
│   ├── attendees: [{ id, firstName, lastName, email, jobTitle }]
│   ├── numberOfAttendees: number
│   ├── totalPrice: number
│   ├── subtotal: number
│   ├── vatAmount: number
│   ├── discount: number
│   ├── paymentStatus: 'paid' | 'pending_bank_transfer' | 'confirmed' | 'pending' | 'complimentary'
│   ├── paymentMethod: 'card' | 'bank_transfer' | 'admin_manual'
│   ├── companyIsFaseMember: boolean
│   ├── isAsaseMember: boolean
│   ├── invoiceUrl?: string
│   └── createdAt: Timestamp

invoices/
├── {invoiceId}
│   ├── invoiceNumber: string
│   ├── accountId?: string
│   ├── amount: number
│   ├── currency: string
│   ├── status: 'sent' | 'paid' | 'overdue'
│   ├── sentAt: Timestamp
│   └── paidAt?: Timestamp

tasks/
├── {taskId}
│   ├── title: string
│   ├── description?: string
│   ├── priority: 'low' | 'medium' | 'high' | 'urgent'
│   ├── status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
│   ├── dueDate?: Timestamp
│   └── createdAt: Timestamp
```

---

## Refactoring Roadmap

### Phase 1: Critical (Week 1-2)
1. [x] Split RendezvousTab into 6+ components
2. [x] Create `lib/invoice-service.ts` to consolidate invoice logic
3. [x] Add pagination to `/admin/search` route
4. [x] Reduce MemberEmailActions state with useReducer (hook created: `lib/hooks/useEmailActionState.ts`)

### Phase 2: High Priority (Week 3-4)
1. [x] Create shared `EmailContext` for member email workflows (`lib/contexts/EmailContext.tsx`)
2. [x] Consolidate duplicate API routes (`generate-paid-invoice`) - via `lib/invoice-service.ts`
3. [x] Add error boundaries to all tabs (`AdminErrorBoundary.tsx`)
4. [x] Implement proper TypeScript interfaces (remove `any`) - `MemberData`, `FirestoreTimestamp` types added

### Phase 3: Medium Priority (Week 5-6)
1. [ ] Add audit logging for admin actions
2. [ ] Implement Firestore composite indexes
3. [ ] Add pagination to member list
4. [ ] Create `lib/email-service.ts` for unified email sending

### Phase 4: Polish (Week 7+)
1. [ ] Add form draft persistence (localStorage)
2. [ ] Optimize modal data loading (lazy load on tab change)
3. [ ] Add proper loading skeletons
4. [ ] Consider state management library (Zustand/Jotai)

---

## File Locations

```
app/admin-portal/
├── page.tsx                          # Main entry, tab router
└── components/
    ├── AdminCountrySelect.tsx        # Reusable country dropdown
    ├── BioReviewTab.tsx              # Bio/logo approval workflow
    ├── CompanyDetailsTab.tsx         # Account details editor
    ├── CompanyMembersModal.tsx       # Company member list modal
    ├── ContentTab.tsx                # Content management (stub)
    ├── EmailEditorModal.tsx          # Rich email composition
    ├── FinanceTab.tsx                # Payment tracking
    ├── FreeformEmailTab.tsx          # Mass + single email
    ├── InvoicesTab.tsx               # Invoice storage
    ├── MemberEmailActions.tsx        # Multi-email action system
    ├── MembersTab.tsx                # Member directory
    ├── RendezvousTab.tsx             # Event registrations (NEEDS SPLIT)
    ├── ReportsTab.tsx                # Data analytics
    ├── SponsorsTab.tsx               # Sponsor management
    ├── TasksTab.tsx                  # Admin tasks
    ├── TempAccountTab.tsx            # Temp account creation
    └── UtilitiesDrawer.tsx           # Admin utilities

app/api/admin/
├── account/[id]/route.ts
├── account-invoices/route.ts
├── accounts/route.ts
├── activities/route.ts
├── bio-review/route.ts
├── company-details/route.ts
├── company-members/route.ts
├── delete-member/route.ts
├── delete-rendezvous-registration/route.ts
├── finance/
│   ├── activities/route.ts
│   ├── generate-paid-invoice/route.ts
│   ├── notes/route.ts
│   └── transactions/route.ts
├── generate-paid-invoice/route.ts
├── get-filtered-accounts/route.ts
├── notes/route.ts
├── regenerate-rendezvous-invoice/route.ts
├── rendezvous-lookup/route.ts
├── rendezvous-registrations/route.ts
├── search/route.ts
├── send-mass-email/route.ts
├── sponsors/route.ts
├── storage-invoices/route.ts
├── tasks/route.ts
├── temp-account/route.ts
└── update-rendezvous-status/route.ts

lib/
├── admin-auth.ts                     # verifyAdminAccess()
├── auth-fetch.ts                     # authFetch(), authPost(), authDelete()
├── firebase-admin.ts                 # adminDb, adminAuth, adminStorage
├── rendezvous-invoice-generator.ts   # PDF generation
└── currency-conversion.ts            # Exchange rates + bank details
```

---

## Authentication Flow

```
1. User visits /admin-portal
   ↓
2. useUnifiedAuth() checks Firebase Auth state
   ↓
3. If user.uid exists, check accounts/{uid}.status === 'admin'
   ↓
4. If not direct admin, search all accounts' members subcollections
   ↓
5. If admin found, render admin portal
   ↓
6. Each API call includes: Authorization: Bearer {idToken}
   ↓
7. API route calls verifyAdminAccess(request)
   ↓
8. verifyAdminAccess extracts token, verifies with Firebase Admin
   ↓
9. Checks user is member of admin org (same logic as client)
   ↓
10. Returns { userId, isAdmin: true } or error
```

---

## External Dependencies

| Service | Purpose | Env Variable |
|---------|---------|--------------|
| Firebase | Auth + Database | `FIREBASE_SERVICE_ACCOUNT_KEY` |
| Stripe | Payment data | `STRIPE_SECRET_KEY` |
| Wise | Payment data | `WISE_API_KEY`, `WISE_PROFILE_ID` |
| Resend | Email sending | `RESEND_API_KEY` |

---

## Shared Code (Created During Refactoring)

The following files were created to reduce duplication:

### `lib/admin-types.ts`
Consolidated TypeScript interfaces for all admin portal data types:
- Account/member types (`AccountStatus`, `OrganizationType`, `Address`)
- Rendezvous types (`RendezvousRegistration`, `RendezvousAttendee`, `FlattenedAttendee`)
- Finance types (`Transaction`, `PaymentActivity`, `PaymentNote`)
- Task/Sponsor types (`AdminTask`, `Sponsor`)
- Email types (`EmailAction`, `EmailFormData`)
- API response types (`ApiResponse`, `ApiSuccessResponse`, `ApiErrorResponse`)
- Type guards (`isApiSuccess`, `isApiError`, `hasMemberAccess`)

### `lib/hooks/useAdminData.ts`
Shared React hooks for data fetching:
- `useAdminFetch<T>()` - Generic fetch hook
- `useRendezvousData()` - Registrations with computed stats and data issues
- `useFinanceData()` - Transactions with filters
- `usePaymentCrmData()` - Activities and notes for payments
- `useMemberSearch()` - Member search for linking payments
- `useAdminTasks()` - Task CRUD operations
- `useSponsors()` - Sponsor data
- `useBioReview()` - Bio/logo review workflow

### `lib/auth-fetch.ts`
Authentication wrapper for fetch calls:
- `authFetch()` - GET requests with auth header
- `authPost()` - POST requests with auth header
- `authDelete()` - DELETE requests with auth header

### `lib/invoice-service.ts`
Consolidated invoice utilities:
- `generateInvoiceNumber()` - Generate invoice numbers by type (FASE-XXXXX or RDV-YYYY-XXXXXXXX)
- `uploadInvoicePDF()` - Upload PDF to Firebase Storage with signed URL
- `createInvoiceRecord()` - Store invoice record in Firestore
- `logInvoiceActivity()` - Log invoice-related activities
- `generateAndStore()` - High-level helper for complete invoice workflow

### `lib/hooks/useEmailActionState.ts`
State machine for MemberEmailActions component:
- `useEmailActionState()` - Hook with reducer-based state management
- `emailActionReducer()` - Reducer for email workflow state
- Types: `EmailAction`, `EmailFormData`, `EmailStep`, `SubcollectionMember`
- Handles: action selection, form data, recipient management, preview/send states

### `app/admin-portal/components/rendezvous/modals/`
Extracted modal components from RendezvousTab:
- `StatusChangeModal.tsx` - Change registration payment status
- `DeleteRegistrationModal.tsx` - Delete with confirmation
- `EditAttendeesModal.tsx` - Edit attendee list
- `EditInvoiceModal.tsx` - Regenerate invoice with custom pricing
- `InterestRegistrationsModal.tsx` - View interest signups

---

## Notes for AI Agents

When working on this codebase:

1. **Always use `authFetch()`** for admin API calls - it's in `lib/auth-fetch.ts`
2. **Use shared types** - import from `lib/admin-types.ts` instead of defining locally
3. **Use shared hooks** - import from `lib/hooks/useAdminData.ts` for data fetching
4. **Don't duplicate invoice logic** - use `lib/invoice-service.ts` for shared utilities
5. **RendezvousTab has been partially refactored** - modals extracted to `rendezvous/modals/`
6. **API routes use Firebase Admin** - import from `lib/firebase-admin.ts`
7. **Status values matter** - 'admin' status grants portal access
8. **Payment statuses differ from account statuses** - don't confuse them
9. **Email templates** are in `messages/{locale}/email.json`
10. **Bank details** are in `lib/currency-conversion.ts`

---

*Last updated: March 2026*
