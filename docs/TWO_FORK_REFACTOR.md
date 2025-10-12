# 🍴 TWO FORK REFACTOR - Clean Naming

**Date:** October 12, 2025

---

## 🎯 THE TWO FORKS

```
Contact (Universal Personhood)
  ├── FORK 1: OrgMember (Deep CRM)
  └── FORK 2: EventAttendee (Event Participation)
```

**Services should match the forks!**

---

## 📊 CURRENT MESS vs CLEAN NAMING

### FORK 1: OrgMember CSV Upload Services

**CURRENT (Bad):**
```
services/
├── csvReader.js              # Shared
├── csvNormalizer.js          # OrgMember normalizer
└── csvValidator.js           # OrgMember validator
```

**NEW (Clear):**
```
services/
├── csvReader.js                    # SHARED - Universal CSV reader
├── orgMemberCsvNormalizer.js       # OrgMember normalizer
└── orgMemberCsvValidator.js        # OrgMember validator
```

**Why?** Name tells you it's for OrgMember fork!

---

### FORK 2: EventAttendee CSV Upload Services

**CURRENT (Terrible):**
```
services/
├── generalContactCsvReader.js       # ❌ DUPLICATE!
├── generalContactCsvNormalizer.js   # "general" is meaningless
├── generalContactValidator.js       
└── generalContactMutation.js        
```

**NEW (Clear):**
```
services/
├── csvReader.js                        # SHARED - uses same reader!
├── eventAttendeeCsvNormalizer.js       # EventAttendee normalizer
├── eventAttendeeCsvValidator.js        # EventAttendee validator
└── eventAttendeeCsvMutation.js         # EventAttendee mutation
```

**Why?** Name tells you it's for EventAttendee fork!

---

## 📧 CAMPAIGN CONTACT LIST SERVICES

**CURRENT (Confusing):**
```
services/
├── contactListService.js           # What kind of contact list?
└── contactListFormHydrator.js      # What form?
```

**The "form" is the CREATE CONTACT LIST form in the frontend!**

It hydrates dropdowns with:
- Events (to create event_attendee lists)
- Audience types
- Pipeline stages

**NEW (Clear):**
```
services/
├── campaignListService.js          # Manages campaign contact lists
└── campaignListFormHydrator.js     # Hydrates create list form
```

**OR keep as:**
```
services/
├── contactListService.js           # Fine - it IS about contact lists
└── contactListFormHydrator.js      # Fine - hydrates the form
```

**My vote:** Keep contactList* since "contact list" is the correct term

---

## ✅ FINAL SERVICE STRUCTURE

```
services/
│
├── SHARED
│   └── csvReader.js                    # Universal CSV reader
│
├── FORK 1: OrgMember CSV Upload
│   ├── orgMemberCsvNormalizer.js       # Maps to OrgMember fields
│   └── orgMemberCsvValidator.js        # Validates OrgMember data
│
├── FORK 2: EventAttendee CSV Upload
│   ├── eventAttendeeCsvNormalizer.js   # Maps to Contact fields
│   ├── eventAttendeeCsvValidator.js    # Validates Contact data
│   └── eventAttendeeCsvMutation.js     # Upserts Contacts
│
└── CAMPAIGN LISTS (Email Segmentation)
    ├── contactListService.js           # Manages ContactList records
    └── contactListFormHydrator.js      # Hydrates create form
```

---

## 🔄 RENAME OPERATIONS

### Step 1: Delete Duplicate
```bash
rm services/generalContactCsvReader.js
```

### Step 2: Rename OrgMember Services
```bash
mv services/csvNormalizer.js    services/orgMemberCsvNormalizer.js
mv services/csvValidator.js     services/orgMemberCsvValidator.js
```

### Step 3: Rename EventAttendee Services
```bash
mv services/generalContactCsvNormalizer.js  services/eventAttendeeCsvNormalizer.js
mv services/generalContactValidator.js      services/eventAttendeeCsvValidator.js
mv services/generalContactMutation.js       services/eventAttendeeCsvMutation.js
```

### Step 4: Keep Campaign List Services As-Is
```bash
# NO CHANGE - Already clear
services/contactListService.js
services/contactListFormHydrator.js
```

---

## 📝 ROUTES TO UPDATE

### OrgMember Routes:
```javascript
// routes/orgMembersSaveroute.js
import { readCSV } from '../services/csvReader.js';
import { normalizeOrgMemberRecord } from '../services/orgMemberCsvNormalizer.js';
import { validateOrgMemberBatch } from '../services/orgMemberCsvValidator.js';
```

### EventAttendee Routes:
```javascript
// routes/contactEventUploadRoute.js
import { readCSV } from '../services/csvReader.js';
import { normalizeContactRecord } from '../services/eventAttendeeCsvNormalizer.js';
import { validateContactBatch } from '../services/eventAttendeeCsvValidator.js';
import { bulkUpsertContacts } from '../services/eventAttendeeCsvMutation.js';

// routes/generalContactSaverRoute.js (same)
// routes/generalContactUploadRoute.js (same)
```

### Campaign List Routes (No Change):
```javascript
// routes/contactListsRoute.js
import ContactListService from "../services/contactListService.js";
import ContactListFormHydrator from "../services/contactListFormHydrator.js";
```

---

## 🎨 FUNCTION RENAMES

### orgMemberCsvNormalizer.js:
```javascript
// OLD
export function normalizeFieldName(field) { ... }
export function normalizeRecord(record) { ... }

// NEW
export function normalizeOrgMemberFieldName(field) { ... }
export function normalizeOrgMemberRecord(record) { ... }
```

### eventAttendeeCsvNormalizer.js:
```javascript
// OLD
export function normalizeContactFieldName(field) { ... }
export function normalizeContactRecord(record) { ... }

// KEEP - Already correct!
export function normalizeContactFieldName(field) { ... }
export function normalizeContactRecord(record) { ... }
```

### eventAttendeeCsvMutation.js:
```javascript
// OLD
export async function bulkUpsertGeneralContacts(records, orgId) { ... }

// NEW
export async function bulkUpsertContacts(records, orgId) { ... }
// OR
export async function bulkUpsertEventAttendeeContacts(records, orgId) { ... }
```

---

## 🔍 WHAT DOES contactListFormHydrator DO?

**Route:** `GET /api/contact-lists/form-data?orgId=xxx`

**Returns:**
```json
{
  "listTypes": [
    { "value": "contact", "label": "General Contact", "count": 245 },
    { "value": "org_member", "label": "Org Member", "count": 42 },
    { "value": "event_attendee", "label": "Event Attendee", "count": "Select event" }
  ],
  "events": [
    { "id": "evt_123", "name": "Bros & Brews", "date": "2025-10-23" }
  ],
  "audienceTypes": ["org_members", "friends_family", ...],
  "pipelineStages": ["in_funnel", "general_awareness", ...]
}
```

**Used by:** Frontend form when creating a campaign contact list

**It hydrates the CREATE CONTACT LIST form!**

---

## 🎯 CAMPAIGN LIST USE CASES

### Use Case 1: Email Campaign
```
1. Admin clicks "Create Contact List"
2. Form hydrates with contactListFormHydrator
3. Admin selects:
   - Type: event_attendee
   - Event: Bros & Brews
   - Audience: org_members
   - Stages: [soft_commit, paid]
4. contactListService.createContactList()
5. Queries contacts matching criteria
6. Sets contactListId on those contacts
7. Admin uses list for email campaign
```

### Use Case 2: Campaign Sequence
```
1. Admin creates email sequence
2. Selects contact list (created above)
3. contactListService.getContactsForList(listId)
4. Returns all contacts in that list
5. Sequence sends to those contacts
```

---

## 💡 KEY INSIGHTS

1. **"Form" = Frontend Create List Form**
   - Not a public form
   - Not a dynamic form
   - Just the admin form for creating campaign lists

2. **contactList ≠ CSV Upload**
   - contactList = Segmentation for campaigns
   - CSV = Ingestion of new contacts

3. **Two Fork Naming = Clear Purpose**
   - orgMember* = Deep CRM ingest
   - eventAttendee* = Event participation ingest

---

## ✅ EXECUTE ORDER

1. ⬜ Delete generalContactCsvReader.js
2. ⬜ Rename csvNormalizer → orgMemberCsvNormalizer
3. ⬜ Rename csvValidator → orgMemberCsvValidator
4. ⬜ Rename generalContact* → eventAttendee*
5. ⬜ Update all route imports
6. ⬜ Update function names in services
7. ⬜ Test OrgMember upload
8. ⬜ Test EventAttendee upload
9. ⬜ Test campaign list creation
10. ⬜ Update docs/features/CONTACTS.md

---

## 🎯 RECOMMENDATION

**Keep contactList services as-is** - the naming is actually correct:
- contactListService = Service for managing contact lists
- contactListFormHydrator = Hydrates the create form

**Could optionally rename to campaignList*** for clarity, but contactList is technically correct.

---

*Two forks, two naming conventions. Clean and obvious.*

