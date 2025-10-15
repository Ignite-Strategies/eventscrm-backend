# Upsert Tracking Pattern

## The Problem

Prisma's `upsert` is a black box - you can't tell if it created or updated a record.

```javascript
const contact = await prisma.contact.upsert({
  where: { email: 'john@example.com' },
  update: contactData,
  create: contactData
});

// ❌ Did it create or update? You can't tell!
```

---

## The Solution

**Check existence BEFORE upsert:**

```javascript
// 1. Check if record exists
const existingContact = await prisma.contact.findUnique({
  where: { email: contactData.email }
});

// 2. Perform upsert
const contact = await prisma.contact.upsert({
  where: { email: contactData.email },
  update: contactData,
  create: contactData
});

// 3. Track what happened
if (existingContact) {
  contactsUpdated++;  // ✅ It existed, so it was updated
} else {
  contactsCreated++;  // ✅ It didn't exist, so it was created
}
```

---

## Implementation in Universal Upload Route

**File:** `routes/universalContactUploadRoute.js`

**Tracking Variables:**
```javascript
let contactsCreated = 0;
let contactsUpdated = 0;
let orgMembersCreated = 0;
let orgMembersUpdated = 0;
```

**For Each Record:**
```javascript
// Track Contact creation/update
const existingContact = await prisma.contact.findUnique({
  where: { email: contactData.email }
});

const contact = await prisma.contact.upsert({...});

if (existingContact) {
  contactsUpdated++;
} else {
  contactsCreated++;
}

// Track OrgMember creation/update
if (uploadType === 'orgMember') {
  const existingOrgMember = await prisma.orgMember.findUnique({
    where: { contactId: contact.id }
  });
  
  const orgMember = await prisma.orgMember.upsert({...});
  
  if (existingOrgMember) {
    orgMembersUpdated++;
  } else {
    orgMembersCreated++;
  }
}
```

**Response:**
```javascript
res.json({
  success: true,
  contacts: contactResults.length,
  contactsCreated,      // NEW!
  contactsUpdated,      // NEW!
  orgMembers: orgMemberResults.length,
  orgMembersCreated,    // NEW!
  orgMembersUpdated,    // NEW!
  ...
});
```

---

## Frontend Display

**Success Page:** `OrgMemberUploadSuccess.jsx`

**Before:**
```javascript
// Only showed total
"2 contacts · 2 org members"
```

**After:**
```javascript
// Shows breakdown
"1 new · 1 updated contacts · 2 new org members"
```

**Code:**
```javascript
const contactsCreated = uploadResults.contactsCreated || 0;
const contactsUpdated = uploadResults.contactsUpdated || 0;
const orgMembersCreated = uploadResults.orgMembersCreated || 0;
const orgMembersUpdated = uploadResults.orgMembersUpdated || 0;

// Display logic
{contactsCreated > 0 && `${contactsCreated} new`}
{contactsCreated > 0 && contactsUpdated > 0 && ' · '}
{contactsUpdated > 0 && `${contactsUpdated} updated`}
{(contactsCreated > 0 || contactsUpdated > 0) && ' contacts'}
```

---

## Use Cases

### Scenario 1: First Upload (All New)
**Input:** 10 contacts, none exist in system  
**Result:**
```
contacts: 10
contactsCreated: 10
contactsUpdated: 0
```
**Display:** "10 new contacts · 10 new org members"

---

### Scenario 2: Re-Upload (All Existing)
**Input:** 10 contacts, all already exist  
**Result:**
```
contacts: 10
contactsCreated: 0
contactsUpdated: 10
```
**Display:** "10 updated contacts · 10 updated org members"

---

### Scenario 3: Mixed Upload
**Input:** 10 contacts, 6 new + 4 existing  
**Result:**
```
contacts: 10
contactsCreated: 6
contactsUpdated: 4
```
**Display:** "6 new · 4 updated contacts · 6 new · 4 updated org members"

---

## Performance Considerations

### Extra Query Cost

**Before:** 1 query per record (upsert)  
**After:** 2 queries per record (findUnique + upsert)

**Impact:** 
- For 100 records: 100 extra queries
- For 1000 records: 1000 extra queries

**Mitigation:**
- Use batch operations for large uploads
- Or accept the cost for accurate tracking
- Queries are fast (indexed on email/contactId)

**Verdict:** Worth it for user clarity! Users need to know what changed.

---

## Alternative Approaches Considered

### Option 1: Compare updatedAt timestamps
**Rejected:** Upsert always updates timestamp, even if data unchanged

### Option 2: Return record metadata from upsert
**Rejected:** Prisma doesn't provide "created vs updated" info

### Option 3: Use raw SQL with ON CONFLICT
**Rejected:** Loses Prisma's type safety and migrations

### Option 4: Pre-check existence (CHOSEN) ✅
**Why:** Clean, explicit, works with Prisma, accurate tracking

---

## Testing

### Test Cases

1. **Upload new contacts:**
   - Should see `contactsCreated > 0`, `contactsUpdated = 0`

2. **Upload existing contacts:**
   - Should see `contactsCreated = 0`, `contactsUpdated > 0`

3. **Upload mix:**
   - Should see both `contactsCreated` and `contactsUpdated` > 0

4. **Upload with errors:**
   - Should show errorCount, errors array with details

---

## Related Files

- `routes/universalContactUploadRoute.js` - Backend implementation
- `pages/OrgMemberUploadSuccess.jsx` - Frontend display
- `services/universalCsvFieldMapperService.js` - CSV parsing
- `CONTACT_UPLOAD_ARCHITECTURE.md` - Overall architecture

---

**Date:** October 15, 2025  
**Status:** ✅ Implemented  
**Pattern:** Pre-check existence, track separately  
**Cost:** 2x queries, worth it for UX clarity

