# 🔧 Service Audit - The CSV Nightmare

**Date:** October 12, 2025

---

## 🎯 THE ARCHITECTURE TRUTH

```
Contact (Universal Personhood - contactId)
  ├── OrgMember? (Extended CRM fields)
  └── EventAttendee[] (Event participation)
```

**Reality:** Everything creates a Contact first. Then:
- **OrgMember ingest** = Contact + OrgMember (deep CRM data)
- **EventAttendee ingest** = Contact + EventAttendee (event participation)

---

## 📊 THE SERVICE FORK

### Old Services (OrgMember Flow)
```
services/
├── csvReader.js              # Generic CSV reader
├── csvNormalizer.js          # Maps to OrgMember fields (goesBy, employer, etc.)
└── csvValidator.js           # Validates OrgMember fields
```

**Used by:**
- `routes/orgMembersSaveroute.js` ✅
- `routes/contactUploadRoute.js` ⚠️ (deprecated?)

**Field mapping:**
- firstName, lastName, email, phone
- goesBy, street, city, state, zip
- employer, yearsWithOrganization

---

### New Services (EventAttendee Flow)
```
services/
├── generalContactCsvReader.js       # Identical to csvReader.js!
├── generalContactCsvNormalizer.js   # Maps to Contact fields only (simpler)
├── generalContactValidator.js       # Validates Contact fields only
└── generalContactMutation.js        # Bulk upsert Contacts
```

**Used by:**
- `routes/contactEventUploadRoute.js` ✅ (Event CSV upload)
- `routes/generalContactSaverRoute.js` ⚠️
- `routes/generalContactUploadRoute.js` ⚠️

**Field mapping:**
- firstName, lastName, email, phone
- fullName (parsed into firstName/lastName)

---

## 🚨 THE PROBLEMS

### 1. Duplicate CSV Readers
```javascript
// csvReader.js
export function readCSV(csvBuffer) { ... }

// generalContactCsvReader.js  
export function readGeneralContactCSV(csvBuffer) { ... }
```
**Status:** 🔴 **IDENTICAL CODE** - Just different function names!

---

### 2. Duplicate Normalizers (But Actually Different!)
```javascript
// csvNormalizer.js - 12 fields including OrgMember fields
FIELD_MAP = {
  'first name': 'firstName',
  'goes by': 'goesBy',
  'employer': 'employer',
  'years': 'yearsWithOrganization',
  ... 
}

// generalContactCsvNormalizer.js - 4 fields, Contact only
CONTACT_FIELD_MAP = {
  'first name': 'firstName',
  'email': 'email',
  'phone': 'phone',
  'full name': 'fullName'  // Special: parses into firstName/lastName
}
```
**Status:** 🟡 **DIFFERENT BUT RELATED** - generalContact is subset + smart name parsing

---

### 3. Three "General Contact" Routes???
```javascript
routes/
├── contactEventUploadRoute.js     # POST /api/contacts/event/upload
├── generalContactSaverRoute.js    # POST /api/contacts/save
└── generalContactUploadRoute.js   # POST /api/contacts/upload
```
**Status:** 🔴 **ROUTE DUPLICATION** - All do similar things!

---

### 4. Is contactUploadRoute.js Deprecated?
```javascript
// routes/contactUploadRoute.js
// Uses OLD services (csvReader, csvNormalizer)
// But creates Contact + EventAttendee
// Is this even used anymore?
```
**Status:** ❓ **UNCLEAR** - Need to check frontend

---

## ✅ RECOMMENDED CONSOLIDATION

### Option A: Single Universal CSV Service
```
services/csv/
├── reader.js              # Universal CSV reader (one function)
├── normalizer.js          # Field mapping with modes:
│                          # - mode: 'contact' (basic fields)
│                          # - mode: 'orgMember' (extended fields)
└── validator.js           # Validation with modes
```

**Benefits:**
- ✅ Single source of truth
- ✅ No code duplication
- ✅ Mode-based behavior

**Drawbacks:**
- ⚠️ Requires refactoring all routes
- ⚠️ More complex service interface

---

### Option B: Keep Fork, Consolidate Readers
```
services/
├── csvReader.js           # UNIVERSAL - used by both flows
│
├── csvNormalizer.js       # OrgMember normalizer
├── csvValidator.js        # OrgMember validator
│
├── contactNormalizer.js   # Contact normalizer (rename from general*)
├── contactValidator.js    # Contact validator
└── contactMutation.js     # Contact mutation
```

**Benefits:**
- ✅ Keep separation of concerns
- ✅ Minimal refactoring
- ✅ Clear naming

**Drawbacks:**
- ⚠️ Still some duplication (normalizers overlap)

---

### Option C: Keep As-Is, Just Document
```
Keep the fork but:
1. Document WHY they're separate
2. Consolidate duplicate routes
3. Deprecate unused routes
4. Update CONTACTS.md to explain the split
```

**Benefits:**
- ✅ No breaking changes
- ✅ Works today
- ✅ Respects the fork decision

**Drawbacks:**
- ⚠️ CSV reader still duplicated

---

## 🔍 ROUTE AUDIT NEEDED

### Check Frontend Usage:
```bash
# Which routes are actually used?
grep -r "contacts/event/upload" frontend/
grep -r "contacts/save" frontend/
grep -r "contacts/upload" frontend/
grep -r "orgmember/csv" frontend/
```

### Suspected Status:
- ✅ `contactEventUploadRoute.js` - ACTIVE (event CSV upload)
- ❓ `generalContactSaverRoute.js` - Unknown usage
- ❓ `generalContactUploadRoute.js` - Unknown usage
- ❓ `contactUploadRoute.js` - Possibly deprecated
- ✅ `orgMembersSaveroute.js` - ACTIVE (org member upload)

---

## 📋 IMMEDIATE ACTION ITEMS

### 1. Document the Fork (NOW)
```markdown
Update docs/features/CONTACTS.md to explain:
- Contact = universal personhood
- Two ingest flows:
  - OrgMember CSV → Contact + OrgMember
  - EventAttendee CSV → Contact + EventAttendee
- Two service stacks (intentional fork)
```

### 2. Consolidate CSV Readers (EASY WIN)
```javascript
// Delete generalContactCsvReader.js
// Update all routes to use csvReader.js
// Identical functionality, no breaking changes
```

### 3. Clean Up Route Duplication (URGENT)
```javascript
// Figure out which routes are actually used
// Deprecate/delete unused routes
// Document the remaining routes clearly
```

### 4. Rename "General Contact" Services (CLARITY)
```javascript
// Rename for clarity:
generalContactCsvNormalizer.js → contactNormalizer.js
generalContactValidator.js → contactValidator.js  
generalContactMutation.js → contactMutation.js
```

---

## 🎯 RECOMMENDATION

**Go with Option B + Quick Wins:**

1. ✅ **Keep the fork** - It reflects the UX reality (2 ingest types)
2. ✅ **Consolidate CSV readers** - Use single csvReader.js
3. ✅ **Rename generalContact* → contact*** - Better naming
4. ✅ **Audit routes** - Delete unused duplicates
5. ✅ **Document everything** - Update CONTACTS.md

**Why?**
- Respects the architecture (Contact = universal)
- Respects the UX (2 types of ingests)
- Minimal breaking changes
- Clear separation of concerns
- Easy to maintain going forward

---

## 🔑 KEY INSIGHT

**The fork is not a bug - it's a feature!**

We have:
- **Simple ingest** → Contact + EventAttendee (name, email, phone)
- **Deep ingest** → Contact + OrgMember (all CRM fields)

The services reflect this reality. We just need to:
1. Consolidate the truly duplicate parts (CSV reader)
2. Clean up route confusion
3. Document the architecture clearly

---

## 📝 NEXT STEPS

1. ⬜ Check frontend to see which routes are actually used
2. ⬜ Consolidate CSV readers (delete generalContactCsvReader.js)
3. ⬜ Rename generalContact* services to contact*
4. ⬜ Delete unused routes
5. ⬜ Update docs/features/CONTACTS.md with service architecture
6. ⬜ Create SERVICE_MAP.md showing route → service mappings

---

*The CSV nightmare is actually a reasonable fork that just needs documentation and minor cleanup.*

