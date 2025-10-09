# FORMS ARCHITECTURE - SOURCE OF TRUTH

**Last Updated:** 2025-10-09  
**Status:** ✅ Active & Current

---

## 🎯 THE CORE PROBLEM WE SOLVED

We had **2 COMPLETELY DIFFERENT USE CASES** for forms that were getting tangled:

1. **CRM ADMIN (Dashboard)** - Building and managing forms internally
2. **PUBLIC EXTERNAL** - External users filling out forms

These were sharing routes and getting confused. Now they're completely separated.

---

## 📊 DATABASE ARCHITECTURE

### PublicForm (External-Facing)
**Purpose:** The actual form external users see and submit

**Fields:**
- `slug` - URL identifier (auto-generated from name)
- `title` - Public-facing title
- `description` - Public-facing description
- `fields` - **JSON array** of custom fields (no CustomField table!)
- `audienceType` - Pipeline category ("org_members", "friends_family", etc.)
- `targetStage` - Starting stage ("soft_commit", "paid", etc.)
- `collectPhone` - Boolean flag
- `isActive` - Is form live?
- `submissionCount` - Submission counter
- `orgId`, `eventId` - Foreign keys

**Relations:**
- `event` → Event
- `eventForms` → EventForm[] (one-to-many)

### EventForm (Internal CRM Tracking)
**Purpose:** Internal admin tracking/configuration

**Fields:**
- `publicFormId` - Links to PublicForm (required)
- `internalName` - CRM-only name
- `internalPurpose` - Why this form exists (internal notes)
- `styling` - Custom CSS overrides (optional)

**Relations:**
- `publicForm` → PublicForm (required)

### Custom Fields Storage
**IMPORTANT:** Custom fields are stored as **JSON in PublicForm.fields**, NOT in a separate table!

**Standard fields (hardcoded in backend):**
- firstName, lastName, email, phone

**Custom fields (JSON array):**
```json
[
  {
    "id": "custom_xyz123",
    "type": "radio",
    "label": "How likely are you to attend?",
    "options": [
      { "value": "very_likely", "label": "Very Likely" },
      { "value": "maybe", "label": "Maybe" }
    ],
    "required": true,
    "order": 5
  }
]
```

---

## 🛤️ API ROUTES

### 1. formDashHydratorRoute.js
**Mount:** `/api/forms`  
**Purpose:** CRM admin dashboard hydration (list & edit)

**Endpoints:**
- `GET /api/forms?orgId={orgId}` - List all forms for org
- `GET /api/forms/{slug}` - Get form by slug (DEPRECATED - use public route)
- `GET /api/forms/{formId}/edit` - Load form for editing in FormBuilder

**Used by:** `ignitestrategescrm-frontend`

---

### 2. formsPublicHydrateRoute.js
**Mount:** `/api/forms/public`  
**Purpose:** Public external form hydration (no auth)

**Endpoints:**
- `GET /api/forms/public/{slug}` - Load public form for external display

**Returns:**
```json
{
  "id": "...",
  "slug": "bros-brews",
  "title": "Soft Commit to Bros & Brews",
  "description": "Fill out the form...",
  "fields": [
    { "id": "firstName", "type": "text", "label": "First Name", ... },
    { "id": "lastName", "type": "text", "label": "Last Name", ... },
    { "id": "email", "type": "email", "label": "Email", ... },
    { "id": "phone", "type": "tel", "label": "Phone", ... },
    { "id": "custom_xyz", "type": "radio", "label": "...", ... }
  ],
  "orgId": "...",
  "eventId": "...",
  "audienceType": "org_members",
  "targetStage": "soft_commit"
}
```

**NO SERVICES, NO PARSING - JUST DATABASE → JSON**

**Used by:** `ignite-ticketing` (https://ticketing.f3capitalimpact.org)

---

### 3. formCreatorSaverRoute.js
**Mount:** `/api/forms/saver`  
**Purpose:** CRM admin form creation/updates/deletes

**Endpoints:**
- `POST /api/forms/saver` - Create new form (PublicForm + EventForm)
- `PATCH /api/forms/saver/{formId}` - Update existing form
- `DELETE /api/forms/saver/{formId}` - Delete form (cascades)

**Used by:** `ignitestrategescrm-frontend` (FormBuilder.jsx)

---

### 4. formSubmissionRoute.js
**Mount:** `/api/contacts`  
**Purpose:** Handle public form submissions (creates contacts)

**Endpoints:**
- `POST /api/contacts` - Submit form → create Contact + EventAttendee

**Request:**
```json
{
  "slug": "bros-brews",
  "orgId": "...",
  "eventId": "...",
  "audienceType": "org_members",
  "targetStage": "soft_commit",
  "formData": {
    "firstName": "Adam",
    "lastName": "Cole",
    "email": "adam@example.com",
    "phone": "7034880601",
    "custom_xyz": "Very likely"
  }
}
```

**What happens:**
1. Find/create Contact (firstName, lastName, email, phone)
2. Find/create EventAttendee
   - Set `currentStage` = `targetStage` from form
   - Set `audienceType` from form
   - Store custom responses in `notes` as JSON
3. Increment `PublicForm.submissionCount`

**Used by:** `ignite-ticketing` (PublicForm.jsx)

---

## 🔄 COMPLETE FLOW

### Step 1: Admin Creates Form (CRM Dashboard)
1. Admin opens FormBuilder in `ignitestrategescrm-frontend`
2. Fills in form name, event, audience type, target stage, custom fields
3. `POST /api/forms/saver` → Creates PublicForm + EventForm
4. Slug auto-generated: "Bros & Brews Soft Commit" → `bros-brews-soft-commit`

### Step 2: Form Listed in Dashboard
1. Admin views Forms page in `ignitestrategescrm-frontend`
2. `GET /api/forms?orgId={orgId}` → Lists all forms
3. Shows: internal name, slug, submission count, status

### Step 3: Public Form Displayed
1. External user visits: `https://ticketing.f3capitalimpact.org/forms/bros-brews-soft-commit`
2. `GET /api/forms/public/bros-brews-soft-commit` → Returns form config
3. Frontend renders all fields (standard + custom)

### Step 4: User Submits Form
1. User fills out form and clicks submit
2. Frontend validates required fields
3. `POST /api/contacts` with form data

### Step 5: Contact & Attendee Created
1. Backend creates/updates Contact
2. Backend creates/updates EventAttendee
   - Uses `audienceType` and `targetStage` from PublicForm
   - Stores custom responses in EventAttendee.notes
3. Increments PublicForm.submissionCount
4. Returns success

---

## 📝 SERVICES

### formDataSplitterService.js
Splits form data into PublicForm vs EventForm parts

**Functions:**
- `splitFormData(formData)` - For creation
- `splitFormUpdates(updateData)` - For updates  
- `validateFormData(publicFormData, eventFormData)` - Validation

### publicFormParserService.js
**DEPRECATED** - Only used in formDashHydratorRoute legacy code  
Will be removed once we clean up that route

---

## 🌐 FRONTEND URLS

### CRM Admin (ignitestrategescrm-frontend)
- Forms list: `/forms`
- Create form: `/forms/create`
- Edit form: `/forms/edit?formId={formId}`

### Public Forms (ignite-ticketing)
- Form display: `/forms/{slug}`
- Success page: `/form-success`

**Domain:** https://ticketing.f3capitalimpact.org

---

## 🔍 DEBUGGING SQL QUERIES

### Check PublicForm
```sql
SELECT * FROM "PublicForm" ORDER BY "createdAt" DESC LIMIT 5;
```

### Check EventForm
```sql
SELECT * FROM "EventForm" ORDER BY "createdAt" DESC LIMIT 5;
```

### Check Relationships
```sql
SELECT 
  pf.id as public_form_id,
  pf.slug,
  pf.title,
  pf."audienceType",
  pf."targetStage",
  pf.fields,
  ef.id as event_form_id,
  ef."internalName"
FROM "PublicForm" pf
LEFT JOIN "EventForm" ef ON ef."publicFormId" = pf.id
ORDER BY pf."createdAt" DESC
LIMIT 5;
```

---

## ✅ NAMING CONVENTIONS

**Route files clearly indicate WHERE hydration happens:**

- `formDashHydratorRoute.js` → **Dashboard** admin hydration
- `formsPublicHydrateRoute.js` → **Public** external hydration
- `formCreatorSaverRoute.js` → **Creator/Saver** (admin saves)
- `formSubmissionRoute.js` → **Submission** (public submits)

**This prevents confusion about which route serves which frontend!**

---

## 🚨 CRITICAL NOTES

1. **Standard fields are ALWAYS hardcoded** in backend (firstName, lastName, email, phone)
2. **Custom fields are JSON** in PublicForm.fields (no separate table)
3. **Slug is auto-generated** from form name (lowercase, dashes)
4. **PublicForm drives the submission** - it contains audienceType + targetStage
5. **EventAttendee.notes** stores custom field responses as JSON
6. **Two frontends, two hydration routes** - keep them separate!

---

## 📚 DEPRECATED DOCS

The following docs are **DEPRECATED** and replaced by this file:
- ❌ FORMS.md (outdated architecture)
- ❌ FORM-FLOW.md (flow now documented here)
- ❌ PUBLICFORM-SPLIT.md (old architecture with CustomField table)
- ❌ CHECK-PUBLICFORM-SAVE.md (SQL queries moved here)

**USE THIS FILE AS THE SINGLE SOURCE OF TRUTH**

