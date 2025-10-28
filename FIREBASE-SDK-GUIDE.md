# Firebase SDK Usage Guide

## **CRITICAL: Two Different SDKs**

### **Client SDK** (Frontend - React components, pages)
- **Files**: Components, pages, client-side lib files
- **Import**: `import { db } from '../lib/firebase'`
- **Methods**: `.exists()`, `.data()` (functions)
- **Example**: `if (doc.exists()) { const data = doc.data(); }`

### **Admin SDK** (Backend - API routes)
- **Files**: `/app/api/*/route.ts` files only
- **Import**: `import * as admin from 'firebase-admin'`
- **Methods**: `.exists`, `.data()` (properties/functions)
- **Example**: `if (doc.exists) { const data = doc.data(); }`

## **Key Differences**

| Operation | Client SDK | Admin SDK |
|-----------|------------|-----------|
| Document exists | `doc.exists()` | `doc.exists` |
| Get data | `doc.data()` | `doc.data()` |
| Timestamp | `serverTimestamp()` | `admin.firestore.FieldValue.serverTimestamp()` |
| Collection ref | `collection(db, 'accounts')` | `db.collection('accounts')` |
| Document ref | `doc(db, 'accounts', id)` | `db.collection('accounts').doc(id)` |

## **File Classification**

### **Use Client SDK:**
- `/components/**/*.tsx`
- `/app/**/page.tsx` (except API routes)
- `/lib/**/*.ts` (except auth-middleware, admin-claims)
- `/contexts/**/*.tsx`

### **Use Admin SDK:**
- `/app/api/**/*.ts`
- `/lib/auth-middleware.ts`
- `/lib/admin-claims.ts`
- `/functions/**/*.ts`

## **Common Mistakes to Avoid**

1. **NEVER** use `doc.exists()` in Admin SDK - use `doc.exists`
2. **NEVER** use `import { db } from '../lib/firebase'` in API routes
3. **ALWAYS** use `admin.firestore.FieldValue.serverTimestamp()` in Admin SDK
4. **ALWAYS** use `serverTimestamp()` from 'firebase/firestore' in Client SDK

## **Error Patterns**

- `i.exists is not a function` → Using Client syntax in Admin SDK
- `Cannot read property 'exists' of undefined` → Wrong SDK import
- `serverTimestamp is not defined` → Missing import or wrong SDK