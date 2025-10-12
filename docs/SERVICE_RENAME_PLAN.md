# 🏷️ Service Naming Fix - Kill "generalContact"

**Date:** October 12, 2025

---

## 🤦 THE NAMING MISTAKE

We called them **"generalContact"** services which makes NO SENSE because:
- ❌ Contact is already the universal/general model
- ❌ "General" doesn't tell you what it does
- ❌ Implies there's a "specific" contact service (there isn't)
- ❌ Created massive confusion

---

## 🎯 WHAT WE ACTUALLY HAVE

### Two CSV Upload Flows:

**Flow 1: OrgMember Upload**
```
CSV with deep fields → Contact + OrgMember
(name, email, phone, address, employer, years, etc.)

Services:
├── csvReader.js          # Reads CSV
├── csvNormalizer.js      # Maps to OrgMember fields
└── csvValidator.js       # Validates OrgMember fields

Route:
└── orgMembersSaveroute.js  # POST /api/orgmember/csv
```

**Flow 2: EventAttendee Upload**
```
CSV with basic fields → Contact + EventAttendee
(name, email, phone only)

Services:
├── generalContactCsvReader.js      # Reads CSV (DUPLICATE!)
├── generalContactCsvNormalizer.js  # Maps to Contact fields only
├── generalContactValidator.js      # Validates Contact fields
└── generalContactMutation.js       # Upserts Contacts

Route:
└── contactEventUploadRoute.js  # POST /api/contacts/event/upload
```

---

## ✅ CORRECT NAMING

### What They Should Be Called:

```
services/
├── csvReader.js              # SHARED - Universal CSV reader
│
├── orgMemberNormalizer.js    # OrgMember-specific field mapping
├── orgMemberValidator.js     # OrgMember-specific validation
│
├── contactNormalizer.js      # Contact-only field mapping (RENAME from generalContact*)
├── contactValidator.js       # Contact-only validation (RENAME)
└── contactMutation.js        # Contact bulk operations (RENAME)
```

---

## 🔄 RENAME OPERATIONS

### Files to Rename:

```bash
# Delete duplicate reader
rm services/generalContactCsvReader.js

# Rename generalContact* → contact*
mv services/generalContactCsvNormalizer.js  services/contactNormalizer.js
mv services/generalContactValidator.js      services/contactValidator.js
mv services/generalContactMutation.js       services/contactMutation.js
```

### Files to Update (Import Statements):

**Routes that need updates:**
1. `routes/contactEventUploadRoute.js`
2. `routes/generalContactSaverRoute.js`
3. `routes/generalContactUploadRoute.js`

**Changes:**
```javascript
// OLD (BAD)
import { readGeneralContactCSV } from '../services/generalContactCsvReader.js';
import { normalizeContactRecord } from '../services/generalContactCsvNormalizer.js';
import { validateContactBatch } from '../services/generalContactValidator.js';
import { bulkUpsertGeneralContacts } from '../services/generalContactMutation.js';

// NEW (GOOD)
import { readCSV } from '../services/csvReader.js';  // Use shared reader
import { normalizeContactRecord } from '../services/contactNormalizer.js';
import { validateContactBatch } from '../services/contactValidator.js';
import { bulkUpsertContacts } from '../services/contactMutation.js';  // Rename function too
```

---

## 📝 FUNCTION RENAMES

### Inside contactMutation.js:
```javascript
// OLD
export async function bulkUpsertGeneralContacts(records, orgId) { ... }

// NEW
export async function bulkUpsertContacts(records, orgId) { ... }
```

---

## 🗺️ FINAL SERVICE MAP

### Shared Services:
```javascript
services/csvReader.js
  └── readCSV(buffer)                    // Used by BOTH flows
```

### OrgMember Flow Services:
```javascript
services/orgMemberNormalizer.js  (RENAME from csvNormalizer.js)
  ├── normalizeOrgMemberFieldName(field)
  ├── normalizeOrgMemberRecord(record)
  └── getAvailableOrgMemberFields()

services/orgMemberValidator.js  (RENAME from csvValidator.js)
  └── validateOrgMemberBatch(records)
```

### Contact Flow Services:
```javascript
services/contactNormalizer.js  (RENAME from generalContactCsvNormalizer.js)
  ├── normalizeContactFieldName(field)
  ├── normalizeContactRecord(record)
  └── getAvailableContactFields()

services/contactValidator.js  (RENAME from generalContactValidator.js)
  └── validateContactBatch(records)

services/contactMutation.js  (RENAME from generalContactMutation.js)
  └── bulkUpsertContacts(records, orgId)
```

---

## 🎯 WAIT - SHOULD WE RENAME csvNormalizer TOO?

**YES!** For consistency:

```bash
# OrgMember services should have consistent naming
mv services/csvNormalizer.js   services/orgMemberNormalizer.js
mv services/csvValidator.js    services/orgMemberValidator.js
```

**Then update:**
- `routes/orgMembersSaveroute.js`
- `routes/contactUploadRoute.js` (if still used)

---

## ✅ COMPLETE RENAME PLAN

### Step 1: Rename OrgMember Services
```bash
mv services/csvNormalizer.js    services/orgMemberNormalizer.js
mv services/csvValidator.js     services/orgMemberValidator.js
```

### Step 2: Rename Contact Services
```bash
mv services/generalContactCsvNormalizer.js  services/contactNormalizer.js
mv services/generalContactValidator.js      services/contactValidator.js
mv services/generalContactMutation.js       services/contactMutation.js
```

### Step 3: Delete Duplicate Reader
```bash
rm services/generalContactCsvReader.js
```

### Step 4: Update Route Imports

**routes/orgMembersSaveroute.js:**
```javascript
import { readCSV } from '../services/csvReader.js';
import { normalizeOrgMemberRecord } from '../services/orgMemberNormalizer.js';
import { validateOrgMemberBatch } from '../services/orgMemberValidator.js';
```

**routes/contactEventUploadRoute.js:**
```javascript
import { readCSV } from '../services/csvReader.js';
import { normalizeContactRecord } from '../services/contactNormalizer.js';
import { validateContactBatch } from '../services/contactValidator.js';
import { bulkUpsertContacts } from '../services/contactMutation.js';
```

**routes/generalContactSaverRoute.js:** (same as above)

**routes/generalContactUploadRoute.js:** (same as above)

### Step 5: Update Function Names in Services

**contactMutation.js:**
```javascript
// Change function name
export async function bulkUpsertContacts(records, orgId) { ... }
```

**orgMemberNormalizer.js:**
```javascript
// Update function names if needed
export function normalizeOrgMemberRecord(record) { ... }
export function validateOrgMemberBatch(records) { ... }
```

---

## 📊 BEFORE & AFTER

### BEFORE (Confusing):
```
services/
├── csvReader.js                        (OrgMember flow)
├── csvNormalizer.js                    (OrgMember flow)
├── csvValidator.js                     (OrgMember flow)
├── generalContactCsvReader.js          (Contact flow - DUPLICATE!)
├── generalContactCsvNormalizer.js      (Contact flow)
├── generalContactValidator.js          (Contact flow)
└── generalContactMutation.js           (Contact flow)
```

### AFTER (Crystal Clear):
```
services/
├── csvReader.js                        (SHARED)
├── orgMemberNormalizer.js              (OrgMember flow)
├── orgMemberValidator.js               (OrgMember flow)
├── contactNormalizer.js                (Contact flow)
├── contactValidator.js                 (Contact flow)
└── contactMutation.js                  (Contact flow)
```

---

## 🎯 WHY THIS IS BETTER

1. ✅ **Clear naming** - orgMember* vs contact*
2. ✅ **No duplication** - Shared CSV reader
3. ✅ **Consistent** - Same naming pattern for both flows
4. ✅ **Obvious** - Name tells you which flow it's for
5. ✅ **Maintainable** - Easy to find and modify

---

## 🚀 EXECUTION ORDER

1. ⬜ Rename OrgMember services (csvNormalizer → orgMemberNormalizer)
2. ⬜ Rename Contact services (generalContact* → contact*)
3. ⬜ Delete duplicate generalContactCsvReader.js
4. ⬜ Update all route imports
5. ⬜ Update function names in services
6. ⬜ Test OrgMember upload flow
7. ⬜ Test EventAttendee upload flow
8. ⬜ Update docs/features/CONTACTS.md with service architecture

---

*"generalContact" was the mistake. Let's fix it.*

