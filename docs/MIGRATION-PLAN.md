# Migration Plan: OrgMember → Contact/Admin Architecture

## 🎯 The Problem

We changed the schema to use **Contact + Admin** as source of truth, but the code still uses **OrgMember** patterns everywhere.

### Old Pattern (DEPRECATED)
```javascript
EventAttendee {
  orgMemberId: String  // ❌ WRONG - this field doesn't exist anymore!
}
```

### New Pattern (CURRENT - FROM PRISMA)
```javascript
EventAttendee {
  contactId: String    // ✅ Links to Contact (universal person)
}

Contact {
  id: String
  orgId: String
  firstName: String
  lastName: String
  email: String
  phone: String
}

OrgMember {
  id: String
  contactId: String    // ✅ Links to Contact
  // ... extended fields
}

Admin {
  id: String
  contactId: String    // ✅ Links to Contact
  orgId: String
  role: String
  permissions: Json
}
```

---

## 📊 Current Auth Flow (What EXISTS)

### 1. User Signs In (Splash → Signup)
```javascript
Firebase Auth → POST /api/auth/findOrCreate
{
  firebaseId: "firebase_uid",
  email: "user@example.com",
  firstName: "John",
  lastName: "Smith"
}

Backend creates:
1. OrgMember (with firebaseId)
2. Contact (linked via contactId)  ← NEW
3. Admin (for app users)           ← NEW

localStorage saves:
- firebaseId
- orgMemberId  ← Still used!
- email
```

### 2. Welcome Page Hydration
```javascript
GET /api/hydration/:orgMemberId

Returns:
- orgMember (with contactId)
- org
- events
- supporters
- admin (NEW)

localStorage saves:
- adminId      ← NEW
- contactId    ← NEW
- orgMemberId  ← DEPRECATED (but still needed for now)
- orgId
- eventId
```

### 3. Dashboard Usage
```javascript
// All routes currently use:
const orgMemberId = localStorage.getItem('orgMemberId');

// Should migrate to:
const contactId = localStorage.getItem('contactId');
const adminId = localStorage.getItem('adminId');
```

---

## 🔧 Files That Need Changes

### Backend Routes (7 files)

#### 1. `authRoute.js` ✅ MOSTLY CORRECT
**Current:** Creates OrgMember → Contact → Admin
**Status:** Good, but needs verification
**Action:** Verify it always creates Contact + Admin together

#### 2. `hydrationRoute.js` ⚠️ NEEDS UPDATE
**Current:** Uses `orgMemberId` parameter
**Issue:** Returns data but should emphasize contactId/adminId
**Action:** 
- Keep orgMemberId for backwards compatibility
- But STRONGLY return contactId + adminId in response
- Update docs to show new pattern

#### 3. `formSubmissionRoute.js` ❌ BROKEN
**Line 267:** Uses `eventId_orgMemberId` unique constraint
**Error:** Schema uses `eventId_contactId_audienceType`
**Action:** Replace with correct constraint

```javascript
// OLD (WRONG):
const eventAttendee = await prisma.eventAttendee.findUnique({
  where: {
    eventId_orgMemberId: {
      eventId: event.id,
      orgMemberId: orgMember.id
    }
  }
});

// NEW (CORRECT):
const eventAttendee = await prisma.eventAttendee.findUnique({
  where: {
    eventId_contactId_audienceType: {
      eventId: form.eventId,
      contactId: contact.id,
      audienceType: form.audienceType
    }
  }
});
```

#### 4. `orgMembersRoute.js` ⚠️ REVIEW NEEDED
**Action:** Check if it needs Contact updates

#### 5. `eventAttendeesRoute.js` ⚠️ REVIEW NEEDED
**Action:** Ensure it uses contactId not orgMemberId

#### 6. `formsRoute.js` ⚠️ REVIEW NEEDED
**Action:** Check CustomField creation uses adminId

#### 7. `adminRoute.js` ⚠️ REVIEW NEEDED
**Action:** Verify admin operations use contactId

---

## 🗄️ Database Migration Steps

### Step 1: Inspect Current State (Run in pgAdmin)
```sql
-- Check if we have orphaned OrgMembers without Contacts
SELECT 
  COUNT(*) as total,
  COUNT("contactId") as with_contact,
  COUNT(*) - COUNT("contactId") as without_contact
FROM "OrgMember";

-- Check if EventAttendees use contactId
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'EventAttendee' 
  AND column_name IN ('contactId', 'orgMemberId');
```

### Step 2: Create Missing Contacts (If Needed)
```sql
-- Create Contact for any OrgMember without one
INSERT INTO "Contact" (id, "orgId", "firstName", "lastName", email, phone, "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  om."orgId",
  COALESCE(om."firstName", ''),
  COALESCE(om."lastName", ''),
  om.email,
  om.phone,
  NOW(),
  NOW()
FROM "OrgMember" om
WHERE om."contactId" IS NULL
  AND om.email IS NOT NULL
  AND om."orgId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Contact" c 
    WHERE c.email = om.email AND c."orgId" = om."orgId"
  );

-- Link OrgMembers to their Contacts
UPDATE "OrgMember" om
SET "contactId" = c.id
FROM "Contact" c
WHERE om."contactId" IS NULL
  AND c.email = om.email
  AND c."orgId" = om."orgId";
```

### Step 3: Create Admin Records
```sql
-- Create Admin for app users (those with firebaseId)
INSERT INTO "Admin" (id, "contactId", "orgId", role, permissions, "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  om."contactId",
  om."orgId",
  'super_admin',
  '{"canCreateForms":true,"canEditForms":true,"canDeleteForms":true,"canManageUsers":true,"canViewAnalytics":true}'::jsonb,
  true,
  NOW(),
  NOW()
FROM "OrgMember" om
WHERE om."firebaseId" IS NOT NULL
  AND om."contactId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Admin" a WHERE a."contactId" = om."contactId"
  );
```

---

## 🎨 Frontend Migration

### Phase 1: Add New Keys to localStorage (Backwards Compatible)
```javascript
// In Welcome.jsx after hydration
const hydrationData = await fetch(`/api/hydration/${orgMemberId}`);

// Save NEW keys (don't remove old ones yet)
localStorage.setItem('contactId', hydrationData.orgMember.contactId);
localStorage.setItem('adminId', hydrationData.admin?.id || '');

// Keep old key for backwards compatibility
localStorage.setItem('orgMemberId', orgMemberId);
```

### Phase 2: Update Components to Use New Keys
```javascript
// OLD:
const orgMemberId = localStorage.getItem('orgMemberId');

// NEW (but fallback to old for migration):
const contactId = localStorage.getItem('contactId') || null;
const adminId = localStorage.getItem('adminId') || null;
const orgMemberId = localStorage.getItem('orgMemberId'); // Fallback
```

### Phase 3: Update All API Calls
```javascript
// When creating EventAttendees, use contactId
POST /api/events/:eventId/attendees
{
  contactId: contactId,  // ✅ NEW
  audienceType: "org_members",
  currentStage: "in_funnel"
}

// When checking permissions, use adminId
const admin = await fetch(`/api/admins/${adminId}`);
```

---

## 📝 Critical Routes to Fix

### 1. Form Submission Route (HIGHEST PRIORITY)
**File:** `routes/formSubmissionRoute.js`
**Lines:** 92-100, 265-272, 309-321
**Issue:** Uses wrong unique constraint
**Fix:** Change to `eventId_contactId_audienceType`

### 2. Hydration Route
**File:** `routes/hydrationRoute.js`
**Issue:** Needs to return adminId clearly
**Fix:** Add admin data to response

### 3. Auth Route
**File:** `routes/authRoute.js`
**Issue:** Verify Contact + Admin creation
**Fix:** Ensure both are always created

---

## 🚀 Rollout Plan

### Phase 1: Database Migration (DO THIS FIRST)
1. Run `MIGRATION-QUERIES.sql` in pgAdmin
2. Verify all OrgMembers have Contacts
3. Verify all app users have Admin records

### Phase 2: Backend Code Fixes
1. Fix `formSubmissionRoute.js` (critical!)
2. Fix `hydrationRoute.js` (return adminId)
3. Fix `authRoute.js` (verify creation)
4. Review other routes

### Phase 3: Frontend Updates
1. Update Welcome.jsx to save contactId/adminId
2. Update components to use new keys
3. Test full auth flow

### Phase 4: Testing
1. New user signup
2. Returning user login
3. Form submission
4. Event attendee creation

### Phase 5: Cleanup (AFTER TESTING)
1. Remove deprecated OrgMember fields
2. Update all documentation
3. Remove backwards compatibility code

---

## ⚠️ Backwards Compatibility

**During Migration:** Keep both patterns working
```javascript
// EventAttendee lookup
let attendee = await prisma.eventAttendee.findUnique({
  where: {
    eventId_contactId_audienceType: { // ✅ NEW WAY
      eventId,
      contactId,
      audienceType
    }
  }
});
```

**After Migration:** Remove old patterns
```javascript
// Remove orgMemberId from localStorage
// Remove orgMemberId-based API calls
// Remove deprecated fields from OrgMember model
```

---

## 📊 Verification Checklist

After migration, verify:

- [ ] All OrgMembers have contactId
- [ ] All app users have Admin records
- [ ] EventAttendees use contactId (not orgMemberId)
- [ ] Forms submit correctly
- [ ] Welcome page loads adminId
- [ ] Dashboard uses contactId for operations
- [ ] No database errors in logs

---

## 🆘 Rollback Plan

If something breaks:

1. **Database:** Contacts/Admins are additive - won't break existing data
2. **Code:** Old code still works if you don't deploy new backend
3. **localStorage:** Old keys still exist, just add new ones
4. **Full Rollback:** Delete Contacts/Admins created after migration timestamp

---

## 📞 Key Takeaways

1. **Contact = Universal Person** (everyone, including admins)
2. **Admin = App User** (subset of Contacts with permissions)
3. **OrgMember = Extended Contact** (master list with extra fields)
4. **EventAttendee uses contactId** (not orgMemberId!)

**The Flow:**
```
Contact (WHO) → Admin (CAN LOGIN?) → OrgMember (EXTENDED INFO)
                     ↓
              EventAttendee (links Contact to Event)
```

