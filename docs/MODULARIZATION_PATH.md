# 🔧 Modularization Path - Shared Contact Logic

**Date:** October 12, 2025

---

## 🎯 CURRENT STATE (After Refactor)

### Two Field Mappers:

```javascript
// orgMemberCsvFieldMapper.js
FIELD_MAP = {
  // Contact fields (5 fields)
  firstName, lastName, goesBy, email, phone, fullName,
  
  // OrgMember fields (7+ fields)  
  street, city, state, zip, employer, years...
}
+ fullName parsing ✅

// eventAttendeeCsvFieldMapper.js
CONTACT_FIELD_MAP = {
  // Contact fields ONLY (5 fields)
  firstName, lastName, email, phone, fullName
}
+ fullName parsing ✅
```

---

## 💡 THE INSIGHT

**Both mappers handle Contact fields the SAME WAY!**

The difference is:
- OrgMember adds EXTRA fields (street, employer, etc.)
- EventAttendee is JUST the Contact fields

---

## 🏗️ MODULARIZATION OPTION 1: Extract Shared Contact Mapper

### Create Base Contact Field Mapper:

```javascript
// services/contactCsvFieldMapper.js (NEW - SHARED)

export const CONTACT_FIELD_MAP = {
  'first name': 'firstName',
  'lastname': 'lastName',
  'goes by': 'goesBy',
  'email': 'email',
  'phone': 'phone',
  'full name': 'fullName'
};

export function mapContactFields(record) {
  const normalized = {};
  
  Object.keys(record).forEach(key => {
    const normalizedKey = key.toLowerCase().trim();
    const mappedField = CONTACT_FIELD_MAP[normalizedKey];
    if (mappedField) {
      normalized[mappedField] = record[key];
    }
  });
  
  // Parse fullName if needed
  if (normalized.fullName && (!normalized.firstName || !normalized.lastName)) {
    const { firstName, lastName } = smartNameParse(normalized.fullName);
    normalized.firstName = normalized.firstName || firstName;
    normalized.lastName = normalized.lastName || lastName;
    delete normalized.fullName;
  }
  
  return normalized;
}
```

### OrgMember Uses Base + Adds Extended Fields:

```javascript
// services/orgMemberCsvFieldMapper.js

import { CONTACT_FIELD_MAP, mapContactFields } from './contactCsvFieldMapper.js';

const ORG_MEMBER_FIELDS = {
  'street': 'street',
  'city': 'city',
  'employer': 'employer',
  'years': 'yearsWithOrganization',
  ...
};

export function normalizeRecord(record) {
  // Get Contact fields (with fullName parsing)
  const contactFields = mapContactFields(record);
  
  // Get OrgMember fields
  const orgMemberFields = {};
  Object.keys(record).forEach(key => {
    const normalizedKey = key.toLowerCase().trim();
    const mappedField = ORG_MEMBER_FIELDS[normalizedKey];
    if (mappedField) {
      orgMemberFields[mappedField] = record[key];
    }
  });
  
  // Merge them
  return { ...contactFields, ...orgMemberFields };
}
```

### EventAttendee Just Uses Base:

```javascript
// services/eventAttendeeCsvFieldMapper.js

import { mapContactFields } from './contactCsvFieldMapper.js';

export function normalizeContactRecord(record) {
  // That's it! Just use the shared Contact mapper
  return mapContactFields(record);
}
```

---

## 🔑 BENEFITS OF MODULARIZATION

1. **DRY (Don't Repeat Yourself)**
   - fullName parsing logic in ONE place
   - Contact field mapping in ONE place

2. **Consistency**
   - Both flows handle Contact fields identically
   - No drift between implementations

3. **Easy to Extend**
   - Want to add "middle name" to Contact?
   - Change it in ONE place, both flows get it

4. **Clear Separation**
   - contactCsvFieldMapper = Contact fields
   - orgMemberCsvFieldMapper = Contact + OrgMember
   - eventAttendeeCsvFieldMapper = Just Contact (thin wrapper)

---

## 📊 FILE STRUCTURE AFTER MODULARIZATION

```
services/
├── csvReader.js                          # SHARED - Universal CSV reader
│
├── contactCsvFieldMapper.js              # NEW - Shared Contact field mapping
│   ├── CONTACT_FIELD_MAP
│   └── mapContactFields()                # Includes fullName parsing
│
├── orgMemberCsvFieldMapper.js            # Contact + OrgMember fields
│   └── Uses contactCsvFieldMapper + adds OrgMember fields
│
├── eventAttendeeCsvFieldMapper.js        # Just Contact fields
│   └── Thin wrapper around contactCsvFieldMapper
│
├── orgMemberCsvValidator.js              # Validates Contact + OrgMember
├── eventAttendeeCsvValidator.js          # Validates Contact only
│
└── eventAttendeeCsvMutation.js           # Upserts Contacts + EventAttendees
```

---

## 🎯 DO WE DO THIS NOW?

### PROS:
- ✅ Cleaner code
- ✅ Less duplication
- ✅ Easier to maintain
- ✅ Sets pattern for future forks

### CONS:
- ⚠️ More files
- ⚠️ One more layer of abstraction
- ⚠️ Need to update both mappers

---

## 💡 MY RECOMMENDATION

**YES, but LATER**

Current priority:
1. ✅ Rename services (DONE)
2. ⬜ Fix schema (add goesBy to Contact)
3. ⬜ Update routes
4. ⬜ Test both upload flows

**Then** circle back and extract shared Contact mapper.

**Why?**
- Get the system working first
- Then optimize/modularize
- We now have a clear path forward

---

## 🔮 FUTURE: Even More Modular

Could even have:

```javascript
// services/csvFieldMappers/
├── base/
│   ├── contactFieldMapper.js       # Contact fields
│   └── nameParser.js               # Smart name parsing
│
├── orgMemberFieldMapper.js         # Extends contact
├── eventAttendeeFieldMapper.js     # Extends contact
└── [futureModel]FieldMapper.js     # Extends contact
```

All future models that involve Contact just extend the base!

---

*Modularization: Not now, but we have the path.*

