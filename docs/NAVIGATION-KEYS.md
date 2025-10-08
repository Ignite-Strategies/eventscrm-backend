# Navigation Keys - Frontend Guide

## 🎯 Navigation Source of Truth

The frontend should check these keys in localStorage for routing decisions:

### Primary Navigation Keys (from hydration)
```javascript
const contactId = localStorage.getItem('contactId');     // Universal person
const adminId = localStorage.getItem('adminId');         // App user permissions  
const orgId = localStorage.getItem('orgId');             // Organization
const phone = localStorage.getItem('phone');             // Profile completion
const eventId = localStorage.getItem('eventId');         // Current event
```

### CRM Operations (still use orgMemberId)
```javascript
const orgMemberId = localStorage.getItem('orgMemberId'); // CRM operations
```

---

## 🔄 Navigation Logic

### Welcome.jsx Routing
```javascript
// Check completion status in order
if (!contactId) {
  // No person record - should never happen after signup
  redirect('/signup');
}

if (!phone) {
  // Profile incomplete
  redirect('/profile-setup');
}

if (!orgId) {
  // No organization
  redirect('/org/choose');
}

if (!eventId) {
  // No current event
  redirect('/event/create');
}

// All good - go to dashboard
redirect('/dashboard');
```

### Dashboard Access
```javascript
// Check if user can access dashboard
const adminId = localStorage.getItem('adminId');
const contactId = localStorage.getItem('contactId');
const orgId = localStorage.getItem('orgId');

if (!adminId || !contactId || !orgId) {
  redirect('/welcome');
}
```

---

## 📝 localStorage Keys

### After Hydration (Welcome.jsx)
```javascript
// Save navigation keys
localStorage.setItem('contactId', hydrationData.contactId);
localStorage.setItem('adminId', hydrationData.adminId);
localStorage.setItem('orgId', hydrationData.orgId);
localStorage.setItem('phone', hydrationData.phone);

// Keep CRM key for backwards compatibility
localStorage.setItem('orgMemberId', hydrationData.orgMember.id);

// Save current event if exists
if (hydrationData.events.length > 0) {
  localStorage.setItem('eventId', hydrationData.events[0].id);
}
```

### After Auth (Signup/Signin)
```javascript
// Basic auth keys
localStorage.setItem('firebaseId', firebaseId);
localStorage.setItem('orgMemberId', orgMember.id);
localStorage.setItem('email', email);

// Navigation keys will be set after hydration
```

---

## 🔧 API Usage

### Navigation Operations
```javascript
// Use contactId for person-based operations
const contactId = localStorage.getItem('contactId');

// Use adminId for permission checks
const adminId = localStorage.getItem('adminId');
```

### CRM Operations
```javascript
// Use orgMemberId for CRM operations (still needed!)
const orgMemberId = localStorage.getItem('orgMemberId');

// Update contact info
PATCH /api/org-members/${orgMemberId}

// Get extended contact details
GET /api/org-members/${orgMemberId}
```

### Event Operations
```javascript
// Use contactId for event attendees (NEW!)
const contactId = localStorage.getItem('contactId');

// Add person to event
POST /api/events/${eventId}/attendees
{
  contactId: contactId,
  audienceType: "org_members",
  currentStage: "in_funnel"
}
```

---

## 🚨 Migration Notes

### What Changed:
- **EventAttendee** uses `contactId` (not `orgMemberId`)
- **Navigation** uses `contactId` + `adminId` as source of truth
- **CRM operations** still use `orgMemberId` (has extended info)

### What Stays the Same:
- **OrgMember** is still the master CRM contact list
- **CRM operations** still use `orgMemberId`
- **Auth flow** still creates OrgMember

### Backwards Compatibility:
- Keep `orgMemberId` in localStorage for CRM operations
- Add new keys (`contactId`, `adminId`) for navigation
- Both patterns work during migration

---

## 🎯 Summary

**Navigation:** `contactId` + `adminId` + `orgId` + `phone` + `eventId`
**CRM:** `orgMemberId` (still the master contact list)
**Events:** `contactId` (links people to events)

The key insight: **OrgMember is still super important** - it's your CRM with all the extended contact information. We just changed how people link to events (via Contact instead of OrgMember).
