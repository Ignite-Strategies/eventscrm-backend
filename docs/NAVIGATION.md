# Navigation Architecture - Final

## 🎯 Navigation Keys (CRM User)

### Primary Keys
- **`orgMemberId`** = All CRM operations (contacts, events, etc.)
- **`orgId`** = Organization context
- **`eventId`** = Current event
- **`phone`** = Profile completion check

### Optional Keys (Advanced Operations)
- **`adminId`** = Higher-end admin operations (not required for basic CRM)

### External Only (Not Used by CRM User)
- **`contactId`** = External forms only

---

## 🔄 Navigation Flow

### Splash.jsx - SIMPLE Firebase Check:
```javascript
// NO backend calls, NO localStorage checks, NO hallucinations!
if (!firebaseUser) {
  navigate("/signup");
} else {
  navigate("/welcome");
}
```

### Welcome.jsx - Hydration with Firebase Token:
```javascript
// Get Firebase user's UID
const firebaseId = auth.currentUser.uid;

// Call hydration with firebaseId (the TOKEN!)
const hydrationRes = await api.get(`/hydration/${firebaseId}`);

// Backend finds OrgMember by firebaseId
// Returns all data (orgMemberId, contactId, adminId, org, events, etc.)
```

### Welcome.jsx Saves to localStorage:
```javascript
localStorage.setItem('orgId', org.id);
localStorage.setItem('orgName', org.name);
localStorage.setItem('orgMemberId', orgMember.id); // Primary CRM key
localStorage.setItem('phone', orgMember.phone); // For profile check
localStorage.setItem('eventId', eventId); // Current event
localStorage.setItem('adminId', admin.id); // Optional - advanced operations
```

### Navigation Logic:
```javascript
// Check completion status
if (!phone) redirect('/profile-setup');
if (!orgId) redirect('/org/choose');
if (!eventId) redirect('/event/create');
// All good → /dashboard
```

---

## 🎯 Usage Patterns

### CRM Operations (orgMemberId user)
```javascript
// Primary pattern - use orgMemberId for all CRM operations
const orgMemberId = localStorage.getItem('orgMemberId');

// Update contact info
PATCH /api/org-members/${orgMemberId}

// Get extended contact details
GET /api/org-members/${orgMemberId}

// Manage events
GET /api/orgs/${orgId}/events
POST /api/orgs/${orgId}/events
```

### Advanced Operations (adminId user)
```javascript
// Optional - only for higher-end admin operations
const adminId = localStorage.getItem('adminId');

if (adminId) {
  // Admin-only operations
  POST /api/admin/advanced-operation
}
```

### External Operations (contactId)
```javascript
// External forms only - not used by CRM user
const contactId = localStorage.getItem('contactId');

// Form submissions
POST /api/public/forms/submit
```

---

## 🏗️ Architecture Summary

### Contact/Admin System Purpose:
- **Contact** = Universal person record (external forms)
- **Admin** = Advanced permissions (higher-end operations)
- **OrgMember** = CRM operations (primary for orgMemberId user)

### The Flow:
```
External Forms → Contact (contactId)
CRM Operations → OrgMember (orgMemberId)
Advanced Admin → Admin (adminId)
```

### Key Insight:
**orgMemberId is still the primary key for CRM operations.** Contact/Admin system doesn't replace it - it adds external form capability and advanced admin operations.

---

## ✅ Final State

- ✅ **orgMemberId** = Primary CRM key (all operations)
- ✅ **contactId** = External forms only
- ✅ **adminId** = Advanced operations only
- ✅ **Navigation** = Clean, uses orgMemberId as primary
- ✅ **No breaking changes** = CRM operations unchanged

**Result**: Clean architecture with orgMemberId as primary, Contact/Admin as supplementary systems.

---

## 🚨 CRITICAL FIX: Hydration Key Discovery

### The Original Problem (The Loop):
- Hydration route was looking up by `orgMemberId`
- Frontend tried to get `orgMemberId` from localStorage
- But `orgMemberId` wasn't saved yet on first load!
- Created infinite loop: "Need orgMemberId to hydrate, need to hydrate to get orgMemberId"
- Splash kept trying to call backend because it had the token but we were using the wrong key!

### The Breakthrough:
**"That's the damn token!"** ← The firebaseId IS the token!

We don't need to store, lookup, or create the firebaseId - it's already in the Firebase auth object!

### The Fix:
1. Hydration route now accepts `:firebaseId` (not `:orgMemberId`)
2. Backend finds OrgMember by `firebaseId` (unique key!)
3. Returns ALL data including `orgMemberId`, `contactId`, `adminId`, etc.
4. Frontend saves everything to localStorage

## 🚨 Secondary Fix: Splash Simplification

### The Problem:
- Splash was calling backend `/auth/findOrCreate` 
- Causing navigation loops and hallucinations
- Overcomplicated Firebase auth check

### The Solution:
```javascript
// OLD (BROKEN):
checkAuthAndRoute(firebaseUser) {
  // Complex localStorage checks
  // Backend calls
  // Multiple routing paths
}

// NEW (SIMPLE):
checkAuthAndRoute(firebaseUser) {
  if (!firebaseUser) {
    navigate("/signup");
  } else {
    navigate("/welcome");
  }
}
```

### Key Insight:
**Splash = Firebase auth check ONLY**
- No backend calls
- No localStorage checks  
- No orgMemberId checks
- Just Firebase → Route

**Welcome = Hydration using firebaseId (the TOKEN!)**
- Gets Firebase user's UID
- Calls `/hydration/:firebaseId`
- Backend finds OrgMember by firebaseId
- Returns ALL data (orgMemberId, contactId, adminId, org, events, etc.)
- Saves everything to localStorage

This is why the old code kept trying to call hydration from Splash - because Splash has the Firebase token! But we fixed it by:
1. Splash → Only checks Firebase auth
2. Welcome → Calls hydration with firebaseId
3. Backend → Finds OrgMember by firebaseId
4. Returns all data → Frontend saves to localStorage
