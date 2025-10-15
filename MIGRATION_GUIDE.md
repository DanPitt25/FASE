# Unified User/Member Architecture Migration Guide

## Overview

This migration consolidates the split `users` and `members` collections into a single `accounts` collection, using Firebase Custom Claims for admin access and a status-based access control system.

## Migration Steps

### 1. Prepare Firebase Custom Claims (Server-side required)

You'll need to set up Firebase Functions or run a one-time script with Admin SDK:

```javascript
// Firebase Functions example
import * as admin from 'firebase-admin';

export const setUserClaims = functions.https.onCall(async (data, context) => {
  // Verify admin privileges first
  const uid = data.uid;
  const claims = data.claims; // { admin: true, member: true }
  
  await admin.auth().setCustomUserClaims(uid, claims);
  return { success: true };
});
```

### 2. Run Data Migration

Execute the migration script to move existing data:

```bash
# You'll need to adapt the script for your environment
node scripts/migrate-to-unified.ts
```

### 3. Update Application Code

Replace imports throughout your application:

**OLD:**
```typescript
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { getUserProfile, MemberApplication } from '../lib/firestore';
```

**NEW:**
```typescript
import { useUnifiedAuth } from '../contexts/UnifiedAuthContext';
import { useUnifiedAdmin } from '../hooks/useUnifiedAdmin';
import { UnifiedMember } from '../lib/unified-member';
```

### 4. Update Component Usage

**OLD:**
```typescript
const { user, loading } = useAuth();
const { isAdmin } = useAdmin();
```

**NEW:**
```typescript
const { user, member, loading, isAdmin, hasMemberAccess } = useUnifiedAuth();
```

### 5. Update Firebase Security Rules

Add rules for the new `accounts` collection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Unified Members Collection
    match /accounts/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        (request.auth.token.admin == true || 
         get(/databases/$(database)/documents/accounts/$(request.auth.uid)).data.status in ['approved', 'admin']);
    }
    
    // Admin access to all unified members
    match /accounts/{userId} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

### 6. Deploy and Test

1. Deploy the new code
2. Test authentication flows
3. Test member portal access
4. Test admin functionality
5. Test messaging/alerts system

### 7. Clean Up (After Verification)

Once everything is working:

1. Archive old `users` and `members` collections
2. Remove old import statements
3. Remove old context/hook files
4. Update documentation

## New Architecture Benefits

- **Single source of truth**: All user data in one place
- **Simplified access control**: Status-based with Firebase Claims
- **Better messaging**: Admins automatically included in member communications
- **Consistent data**: No more sync issues between users/members
- **Cleaner code**: Fewer context providers and data fetching

## Key Changes

### Access Levels

- `guest`: Basic user, no special access
- `pending`: Applied for membership, limited access  
- `approved`: Full member access
- `admin`: Full admin access + Custom Claim

### Component Updates Required

1. `app/admin-portal/page.tsx` - Update to use `useUnifiedAuth`
2. `app/member-portal/member-content.tsx` - Update to use `useUnifiedAuth`
3. `app/directory/page.tsx` - Update to use `useUnifiedAuth`
4. All components using `useAuth` and `useAdmin`

### Messaging System

- Now automatically includes admins in "all_members" messages
- Uses unified member status for recipient filtering
- Simplified recipient logic

## Rollback Plan

If issues arise:

1. Keep old collections as backup
2. Revert to old context providers
3. Update imports back to old system
4. Old collections remain functional

## Testing Checklist

- [ ] User registration works
- [ ] Login/logout works
- [ ] Member portal access for approved members
- [ ] Admin portal access for admins
- [ ] Message creation and delivery
- [ ] Alert creation and delivery
- [ ] Member directory filtering
- [ ] Custom claims are set correctly
- [ ] Access control works as expected