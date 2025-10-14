# 🗂️ Service Categories - What Does What

**Date:** October 12, 2025

---

## 🎯 THE CONFUSION

We have services that SOUND similar but do TOTALLY DIFFERENT things:

- **contactListService.js** → Email campaign lists
- **csvNormalizer.js** → CSV upload processing

**They're not related!** Let's organize by purpose.

---

## 📊 SERVICE CATEGORIES

### 1️⃣ CSV UPLOAD SERVICES (Contact Ingestion)

**Purpose:** Import contacts from CSV files

#### Shared:
```
services/
└── csvReader.js                        # Reads ANY CSV file
    └── readCSV(buffer)
```

#### OrgMember Flow (Deep CRM):
```
services/
├── csvNormalizer.js                    # Maps to OrgMember fields
│   ├── normalizeFieldName()            # firstName, goesBy, employer, etc.
│   └── normalizeRecord()
│
└── csvValidator.js                     # Validates OrgMember fields
    └── validateBatch()
```

**Used by:**
- `routes/orgMembersSaveroute.js` → POST /api/orgmember/csv

**Creates:** Contact + OrgMember records

---

#### Contact Flow (Basic):
```
services/
├── generalContactCsvReader.js          # ❌ DUPLICATE of csvReader.js
│
├── generalContactCsvNormalizer.js      # Maps to Contact fields only
│   ├── normalizeContactFieldName()     # firstName, lastName, email, phone
│   ├── normalizeContactRecord()        # Includes smart name parsing
│   └── getContactFieldMapping()
│
├── generalContactValidator.js          # Validates Contact fields
│   └── validateContactBatch()
│
└── generalContactMutation.js           # Bulk upsert Contacts
    └── bulkUpsertGeneralContacts()
```

**Used by:**
- `routes/contactEventUploadRoute.js` → POST /api/contacts/event/upload
- `routes/generalContactSaverRoute.js` → POST /api/contacts/save
- `routes/generalContactUploadRoute.js` → POST /api/contacts/upload

**Creates:** Contact + EventAttendee records

---

### 2️⃣ EMAIL CAMPAIGN LIST SERVICES (Contact Segmentation)

**Purpose:** Create segmented contact lists for email campaigns

```
services/
├── contactListService.js               # Manages ContactList records
│   ├── createContactList()             # Create new campaign list
│   ├── getContactsForList()            # Get contacts in a list
│   ├── assignContactsToList()          # Assign contacts to list (MUTATE Contact.contactListId)
│   ├── getGeneralContacts()            # All contacts in CRM
│   ├── getEventAttendeeContacts()      # Filter by event/stage/audience
│   └── getOrgMemberContacts()          # Filter org members
│
└── contactListFormHydrator.js          # Hydrates form with schema data
    ├── getFormData()                   # Events, audiences, stages
    └── validateListData()
```

**Used by:**
- `routes/contactListsRoute.js` → POST /api/contact-lists
- `routes/sequenceRoute.js` → Campaign sequence routes

**Creates:** ContactList records (for email campaigns)

**List Types:**
- `contact` - All contacts in CRM
- `org_member` - Promoted contacts with extended data
- `event_attendee` - Filtered by event/stage/audience

---

### 3️⃣ FORM SERVICES (Dynamic Forms)

**Purpose:** Parse and process dynamic public forms

```
services/
├── publicFormParserService.js          # Parses public form submissions
│   └── parsePublicFormToClean()
│
├── formFieldParserService.js           # Parses custom form fields
│
└── formDataSplitterService.js          # Splits form data
    ├── splitFormData()
    ├── splitFormUpdates()
    └── validateFormData()
```

**Used by:**
- `routes/publicFormSubmissionRoute.js` → POST /api/contacts (public form)
- `routes/formCreatorSaverRoute.js` → POST /api/forms
- `routes/formDashHydratorRoute.js` → GET /api/forms/dashboard

---

### 4️⃣ EVENT SERVICES

**Purpose:** Event management and task generation

```
services/
├── eventTaskService.js                 # Event task management
│
├── eventDataCheckerService.js          # Validate event data
│   └── validateAndCleanEventData()
│
└── goalCalculatorService.js            # Calculate fundraising goals
```

**Used by:**
- `routes/eventsRoute.js` → Event CRUD
- `routes/eventTasksRoute.js` → Event task management

---

### 5️⃣ EMAIL SERVICES

**Purpose:** Send emails (transactional and campaigns)

```
services/
├── gmailService.js                     # Gmail API integration
│
└── sendGridService.js                  # SendGrid integration
```

**Used by:**
- `routes/emailRoute.js` → Email sending
- `routes/sequenceRoute.js` → Campaign sequences

---

### 6️⃣ PAYMENT SERVICES

**Purpose:** Payment processing (minimal for now)

```
services/
└── paymentService.js                   # Payment handling
```

**Used by:**
- Payment webhooks (if any)

---

### 7️⃣ PIPELINE SERVICES

**Purpose:** Stage transitions and pipeline logic

```
services/
└── stageService.js                     # Stage validation/transitions
```

**Used by:**
- `routes/pipelineHydrationRoute.js` → Pipeline data

---

## 🎨 VISUAL BREAKDOWN

```
CSV UPLOAD FLOW:
CSV File → csvReader → normalizer → validator → mutation → Database
                          ↓
                    orgMember OR contact
                    (deep data) (basic data)

EMAIL CAMPAIGN FLOW:
Campaign Setup → contactListService → Query Contacts → ContactList
                        ↓
                  Filter by type:
                  - contact
                  - org_member  
                  - event_attendee

FORM SUBMISSION FLOW:
Public Form → publicFormParser → Contact + EventAttendee → Database
```

---

## ✅ SO... WHICH SERVICES NEED RENAMING?

### CSV Upload Services ONLY:
```
❌ generalContactCsvReader.js    → DELETE (use csvReader.js)
🔄 generalContactCsvNormalizer.js → contactNormalizer.js
🔄 generalContactValidator.js     → contactValidator.js
🔄 generalContactMutation.js      → contactMutation.js

🔄 csvNormalizer.js               → orgMemberNormalizer.js
🔄 csvValidator.js                → orgMemberValidator.js
```

### Keep As-Is (Good Names):
```
✅ contactListService.js          # Campaign lists (correct!)
✅ contactListFormHydrator.js     # Campaign form hydration (correct!)
✅ publicFormParserService.js     # Public forms (correct!)
✅ formFieldParserService.js      # Form fields (correct!)
✅ formDataSplitterService.js     # Form data (correct!)
✅ eventTaskService.js            # Event tasks (correct!)
✅ gmailService.js                # Gmail (correct!)
✅ sendGridService.js             # SendGrid (correct!)
```

---

## 🔑 KEY TAKEAWAY

**contactListService** has NOTHING to do with CSV uploads!

- **contactListService** = Email campaign segmentation
- **CSV services** = Contact ingestion from files

**Totally different purposes!**

---

## 📋 FINAL SERVICE MAP

```
services/
│
├── CSV UPLOAD (Contact Ingestion)
│   ├── csvReader.js              # Universal reader
│   ├── orgMemberNormalizer.js    # OrgMember field mapping
│   ├── orgMemberValidator.js     # OrgMember validation
│   ├── contactNormalizer.js      # Contact field mapping
│   ├── contactValidator.js       # Contact validation
│   └── contactMutation.js        # Contact bulk operations
│
├── EMAIL CAMPAIGNS (Contact Segmentation)
│   ├── contactListService.js     # Campaign list management
│   └── contactListFormHydrator.js # Form hydration
│
├── FORMS (Dynamic Forms)
│   ├── publicFormParserService.js
│   ├── formFieldParserService.js
│   └── formDataSplitterService.js
│
├── EVENTS
│   ├── eventTaskService.js
│   ├── eventDataCheckerService.js
│   └── goalCalculatorService.js
│
├── EMAIL
│   ├── gmailService.js
│   └── sendGridService.js
│
├── PAYMENTS
│   └── paymentService.js
│
└── PIPELINE
    └── stageService.js
```

---

*contactListService is for campaigns, not CSV uploads. Case closed.*

