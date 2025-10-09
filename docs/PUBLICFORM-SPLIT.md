# PublicForm/EventForm Split Architecture

## The Problem
Previously, `EventForm` had BOTH internal CRM data AND public-facing form data mixed together, making hydration messy and hard to maintain.

## The Solution
Split into two separate models for clean separation of concerns:

### 1. **PublicForm** - External-Facing
**What it is:** The actual form that external users see and submit

**Contains:**
- `slug` - URL identifier ("bros-soft-commit")
- `title` - Public title ("Sign up for Bros & Brews!")
- `description` - Public description
- `collectName`, `collectEmail`, `collectPhone` - Standard field flags
- `audienceType` - Where they go in the pipeline ("org_members", "friends_family", etc.)
- `targetStage` - What stage they start at ("soft_commit", "paid", etc.)
- `isActive` - Is the form live?
- `submissionCount` - How many submissions

**Relations:**
- `customFields` - CustomField records (linked via `publicFormId`)
- `eventForms` - Multiple EventForms can reference the same PublicForm
- `event` - The event this form is for

**Used by:**
- `/api/forms/hydrator/:slug` - External form rendering
- `/api/public` - Form submissions
- Backend knows how to mutate data on submission (audienceType + targetStage)

### 2. **EventForm** - Internal CRM Tracking
**What it is:** Internal tracking and configuration layer

**Contains:**
- `publicFormId` - Links to PublicForm
- `internalName` - Internal CRM name ("Bros & Brews Soft Commit Form")
- `internalPurpose` - Why this form exists (internal notes)
- `styling` - Custom CSS/styling overrides

**Relations:**
- `publicForm` - The PublicForm it references
- `event` - The event (for relational integrity)

**Used by:**
- `/api/forms/hydrator/:formId/edit` - Loading form for admin editing
- Internal CRM reports and tracking

### 3. **CustomField** - Attached to PublicForm
**Links to:** `publicFormId` (NOT `eventFormId`!)

**Why?** So external hydration can fetch `PublicForm` + `CustomFields` in one query without touching `EventForm`.

## API Routes

### Hydrator (formsHydratorRoute.js)
- **`GET /api/forms/hydrator/:slug`** - Load PublicForm for external rendering
- **`GET /api/forms/hydrator/:formId/edit`** - Load PublicForm + EventForm for admin editing

### Saver (formsSaverRoute.js)
- **`POST /api/forms/saver`** - Create PublicForm + EventForm + CustomFields (all in one!)
- **`PATCH /api/forms/saver/:formId`** - Update PublicForm and/or EventForm
- **`DELETE /api/forms/saver/:formId`** - Delete PublicForm (cascades to EventForm + CustomFields)

## Services

### formDataSplitterService.js
Splits incoming form data into PublicForm vs EventForm parts:
- `splitFormData(formData)` - For creation
- `splitFormUpdates(updateData)` - For updates
- `validateFormData(publicFormData, eventFormData)` - Validation

### formFieldParserService.js
Separates standard fields (name/email/phone) from custom fields:
- `parseFormFields(fields)` - Returns `{ standardFields, customFields }`
- `formatCustomFieldsForDB(customFields, publicFormId, eventId, adminId)` - Formats for DB

### publicFormParserService.js
Converts PublicForm + CustomFields into clean JSON for external rendering:
- `parsePublicFormToClean(publicForm)` - Combines standard + custom fields into one clean array

## Flow Examples

### Creating a Form
```javascript
Frontend sends form data
  ↓
formDataSplitter.splitFormData()
  ↓
Create PublicForm (title, slug, audienceType, targetStage, etc.)
  ↓
Create EventForm (internalName, publicFormId) 
  ↓
formFieldParser.parseFormFields()
  ↓
Create CustomFields (linked to PublicForm)
```

### External User Views Form
```javascript
GET /api/forms/hydrator/:slug
  ↓
Query PublicForm with CustomFields
  ↓
publicFormParser.parsePublicFormToClean()
  ↓
Return clean JSON (standard + custom fields combined)
```

### Form Submission
```javascript
User submits form
  ↓
Backend reads PublicForm.audienceType + targetStage
  ↓
Create Contact
  ↓
Create EventAttendee (with audienceType + currentStage from PublicForm)
```

## Benefits

1. **Clean External Hydration** - Just query PublicForm, no CRM crap
2. **Better Caching** - PublicForms can be cached separately from EventForms
3. **Relational Integrity** - Everything properly linked via foreign keys
4. **Single Source of Truth** - PublicForm tells backend how to mutate data on submission
5. **Easier to Test** - Clear separation between public and internal concerns

## Migration Notes

- Old `EventForm` model is gone
- `CustomField.eventFormId` → `CustomField.publicFormId`
- Existing forms need data migration (not automated yet)
- Frontend FormBuilder needs updates to handle new split structure

---
**Date:** 2025-10-08  
**Status:** ✅ Deployed to Render

