# 🏗️ Contact Base Architecture - Modular Fork System

**Date:** October 12, 2025

---

## 🎯 THE VISION

**Contact CSV Base Handler** that creates Contact records.
**Forks** add their specific capabilities on top.

```
BASE: Contact Handler
  ├── FORK 1: + OrgMember Creation
  └── FORK 2: + EventAttendee Creation
```

---

## 📊 THE BASE: Contact CSV Service

### services/contactCsvService.js (NEW BASE)

```javascript
import { getPrismaClient } from '../config/database.js';
import { smartNameParse } from '../utils/nameParser.js';

const prisma = getPrismaClient();

/**
 * CONTACT FIELD MAP - The universal identity fields
 */
export const CONTACT_FIELDS = {
  'first name': 'firstName',
  'firstname': 'firstName',
  'fname': 'firstName',
  
  'last name': 'lastName',
  'lastname': 'lastName',
  'lname': 'lastName',
  
  'goes by': 'goesBy',
  'nickname': 'goesBy',
  'preferred name': 'goesBy',
  
  'email': 'email',
  'email address': 'email',
  
  'phone': 'phone',
  'phone number': 'phone',
  'mobile': 'phone',
  
  'full name': 'fullName',
  'name': 'fullName'
};

/**
 * Map Contact fields from CSV record
 */
export function mapContactFields(csvRecord) {
  const contact = {};
  
  Object.keys(csvRecord).forEach(key => {
    const normalizedKey = key.toLowerCase().trim();
    const mappedField = CONTACT_FIELDS[normalizedKey];
    if (mappedField) {
      contact[mappedField] = csvRecord[key];
    }
  });
  
  // Smart name parsing
  if (contact.fullName && (!contact.firstName || !contact.lastName)) {
    const parsed = smartNameParse(contact.fullName);
    contact.firstName = contact.firstName || parsed.firstName;
    contact.lastName = contact.lastName || parsed.lastName;
    delete contact.fullName;
  }
  
  return contact;
}

/**
 * Validate Contact fields
 */
export function validateContactFields(contact) {
  const errors = [];
  
  if (!contact.firstName) errors.push('firstName is required');
  if (!contact.lastName) errors.push('lastName is required');
  if (!contact.email) errors.push('email is required');
  
  // Basic email validation
  if (contact.email && !contact.email.includes('@')) {
    errors.push('Invalid email format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * BASE: Upsert Contact record
 * This is the UNIVERSAL operation - creates or updates Contact
 */
export async function upsertContact(contactData, orgId) {
  const { firstName, lastName, goesBy, email, phone } = contactData;
  
  const contact = await prisma.contact.upsert({
    where: { email },
    update: { 
      firstName, 
      lastName, 
      goesBy, 
      phone 
    },
    create: { 
      firstName, 
      lastName, 
      goesBy, 
      email, 
      phone 
    }
  });
  
  return contact;
}

/**
 * BASE: Bulk upsert Contacts from CSV
 */
export async function bulkUpsertContacts(csvRecords, orgId) {
  const results = {
    created: 0,
    updated: 0,
    errors: []
  };
  
  for (const record of csvRecords) {
    try {
      const contactFields = mapContactFields(record);
      const validation = validateContactFields(contactFields);
      
      if (!validation.isValid) {
        results.errors.push({
          record,
          errors: validation.errors
        });
        continue;
      }
      
      const contact = await upsertContact(contactFields, orgId);
      
      // Track if it was created or updated
      const existing = await prisma.contact.findUnique({
        where: { email: contactFields.email }
      });
      
      if (existing) {
        results.updated++;
      } else {
        results.created++;
      }
      
    } catch (error) {
      results.errors.push({
        record,
        errors: [error.message]
      });
    }
  }
  
  return results;
}
```

---

## 🍴 FORK 1: OrgMember Extension

### services/orgMemberCsvService.js

```javascript
import { mapContactFields, upsertContact } from './contactCsvService.js';
import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

/**
 * ORGMEMBER EXTENDED FIELDS - Delta on top of Contact
 */
const ORG_MEMBER_FIELDS = {
  'street': 'street',
  'city': 'city',
  'state': 'state',
  'zip': 'zip',
  'employer': 'employer',
  'company': 'employer',
  'years': 'yearsWithOrganization',
  'tenure': 'yearsWithOrganization'
};

/**
 * Map OrgMember-specific fields
 */
function mapOrgMemberFields(csvRecord) {
  const orgMemberData = {};
  
  Object.keys(csvRecord).forEach(key => {
    const normalizedKey = key.toLowerCase().trim();
    const mappedField = ORG_MEMBER_FIELDS[normalizedKey];
    if (mappedField) {
      orgMemberData[mappedField] = csvRecord[key];
    }
  });
  
  return orgMemberData;
}

/**
 * FORK 1 CAPABILITY: Create OrgMember with Contact
 */
export async function createOrgMemberFromCsv(csvRecord, orgId) {
  // STEP 1: Create/Update Contact (BASE)
  const contactFields = mapContactFields(csvRecord);
  const contact = await upsertContact(contactFields, orgId);
  
  // STEP 2: Add OrgMember extended data (FORK EXTENSION)
  const orgMemberFields = mapOrgMemberFields(csvRecord);
  
  const orgMember = await prisma.orgMember.upsert({
    where: { contactId: contact.id },
    update: orgMemberFields,
    create: {
      contactId: contact.id,
      orgId,
      ...orgMemberFields
    }
  });
  
  return { contact, orgMember };
}

/**
 * Bulk process OrgMember CSV
 */
export async function bulkCreateOrgMembers(csvRecords, orgId) {
  const results = {
    created: 0,
    updated: 0,
    errors: []
  };
  
  for (const record of csvRecords) {
    try {
      const { contact, orgMember } = await createOrgMemberFromCsv(record, orgId);
      results.created++;
    } catch (error) {
      results.errors.push({
        record,
        error: error.message
      });
    }
  }
  
  return results;
}
```

---

## 🍴 FORK 2: EventAttendee Extension

### services/eventAttendeeCsvService.js

```javascript
import { mapContactFields, upsertContact } from './contactCsvService.js';
import { getPrismaClient } from '../config/database.js';

const prisma = getPrismaClient();

/**
 * FORK 2 CAPABILITY: Create EventAttendee with Contact
 */
export async function createEventAttendeeFromCsv(csvRecord, orgId, eventId, audienceType, currentStage) {
  // STEP 1: Create/Update Contact (BASE)
  const contactFields = mapContactFields(csvRecord);
  const contact = await upsertContact(contactFields, orgId);
  
  // STEP 2: Create EventAttendee relationship (FORK EXTENSION)
  const eventAttendee = await prisma.eventAttendee.upsert({
    where: {
      eventId_contactId_audienceType: {
        eventId,
        contactId: contact.id,
        audienceType
      }
    },
    update: {
      currentStage
    },
    create: {
      orgId,
      eventId,
      contactId: contact.id,
      audienceType,
      currentStage
    }
  });
  
  return { contact, eventAttendee };
}

/**
 * Bulk process EventAttendee CSV
 */
export async function bulkCreateEventAttendees(csvRecords, orgId, eventId, audienceType, currentStage) {
  const results = {
    created: 0,
    updated: 0,
    errors: []
  };
  
  for (const record of csvRecords) {
    try {
      const { contact, eventAttendee } = await createEventAttendeeFromCsv(
        record, 
        orgId, 
        eventId, 
        audienceType, 
        currentStage
      );
      results.created++;
    } catch (error) {
      results.errors.push({
        record,
        error: error.message
      });
    }
  }
  
  return results;
}
```

---

## 🎯 ROUTES BECOME SUPER CLEAN

### routes/orgMembersCsvRoute.js

```javascript
import express from 'express';
import multer from 'multer';
import { readCSV } from '../services/csvReader.js';
import { bulkCreateOrgMembers } from '../services/orgMemberCsvService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/orgmember/csv', upload.single('file'), async (req, res) => {
  const { orgId } = req.body;
  
  // Read CSV
  const { records } = readCSV(req.file.buffer);
  
  // Process with OrgMember fork
  const results = await bulkCreateOrgMembers(records, orgId);
  
  res.json(results);
});

export default router;
```

### routes/eventAttendeeCsvRoute.js

```javascript
import express from 'express';
import multer from 'multer';
import { readCSV } from '../services/csvReader.js';
import { bulkCreateEventAttendees } from '../services/eventAttendeeCsvService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/contacts/event/upload', upload.single('file'), async (req, res) => {
  const { orgId, eventId, audienceType, currentStage } = req.body;
  
  // Read CSV
  const { records } = readCSV(req.file.buffer);
  
  // Process with EventAttendee fork
  const results = await bulkCreateEventAttendees(
    records, 
    orgId, 
    eventId, 
    audienceType, 
    currentStage
  );
  
  res.json(results);
});

export default router;
```

---

## 📊 FINAL SERVICE STRUCTURE

```
services/
│
├── BASE (Universal Contact)
│   ├── contactCsvService.js          # Core Contact operations
│   │   ├── CONTACT_FIELDS           # Field mapping
│   │   ├── mapContactFields()       # Maps CSV to Contact
│   │   ├── validateContactFields()  # Validates Contact
│   │   └── upsertContact()          # Creates/updates Contact
│   │
│   └── csvReader.js                  # Reads any CSV
│
├── FORK 1 (OrgMember Extension)
│   └── orgMemberCsvService.js
│       ├── Uses BASE contactCsvService
│       ├── Adds ORG_MEMBER_FIELDS
│       └── createOrgMemberFromCsv()  # Contact + OrgMember
│
└── FORK 2 (EventAttendee Extension)
    └── eventAttendeeCsvService.js
        ├── Uses BASE contactCsvService
        └── createEventAttendeeFromCsv()  # Contact + EventAttendee
```

---

## 🎯 BENEFITS

### 1. DRY (Don't Repeat Yourself)
- Contact logic in ONE place
- Both forks use the SAME Contact creation

### 2. Consistency
- firstName, lastName, goesBy, email, phone handled identically
- No drift between forks

### 3. Easy to Extend
- Want to add "middle name" to Contact? Change BASE
- Both forks automatically get it

### 4. Clear Capabilities
```javascript
// BASE capability
upsertContact(contactData, orgId);

// Fork 1 capability  
createOrgMemberFromCsv(csvRecord, orgId);
// → Creates Contact + OrgMember

// Fork 2 capability
createEventAttendeeFromCsv(csvRecord, orgId, eventId, audience, stage);
// → Creates Contact + EventAttendee
```

### 5. Future Forks Easy
Want to add Volunteer fork?
```javascript
// services/volunteerCsvService.js
import { upsertContact } from './contactCsvService.js';

export async function createVolunteerFromCsv(csvRecord, orgId) {
  // STEP 1: Contact (BASE)
  const contact = await upsertContact(...);
  
  // STEP 2: Volunteer data (FORK)
  const volunteer = await prisma.volunteer.create({
    contactId: contact.id,
    skills, availability, ...
  });
  
  return { contact, volunteer };
}
```

---

## ✅ THIS IS IT!

**Base + Forks = Clean Modular Architecture**

Each fork:
1. Uses BASE to create Contact
2. Adds its own extended capabilities
3. Routes stay simple

**Want me to implement this?**

---

*This is the architecture Contact-first was meant to be.*

