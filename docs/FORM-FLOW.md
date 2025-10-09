# COMPLETE FORM FLOW

## ✅ **5-STEP FLOW**

### **STEP 1: User Creates a Form (CRM Admin)**
- **Frontend**: `ignitestrategescrm-frontend` → `/forms/create` → `FormBuilder.jsx`
- **Route**: `POST /api/forms/saver`
- **What happens**:
  - Frontend sends: `{ orgId, eventId, slug, title, description, internalName, internalPurpose, audienceType, targetStage, fields: [...] }`
  - Backend creates:
    - `PublicForm` record with `fields` JSON array
    - `EventForm` record linked to `PublicForm`
  - Returns: `{ publicFormId, eventFormId }`

**Files involved**:
- `ignitestrategescrm-frontend/src/pages/FormBuilder.jsx`
- `eventscrm-backend/routes/formsSaverRoute.js`
- `eventscrm-backend/services/formDataSplitterService.js`

---

### **STEP 2: Form is Displayed in Forms List (CRM Admin)**
- **Frontend**: `ignitestrategescrm-frontend` → `/forms` → `Forms.jsx`
- **Route**: `GET /api/forms/hydrator?orgId={orgId}`
- **What happens**:
  - Backend fetches all `PublicForm` records with `EventForm` relations
  - Returns array of forms with:
    - `name` (internal name)
    - `description` (internal purpose)
    - `slug` (for public URL)
    - `isActive` status
    - `submissionCount`
    - `customFieldsCount`
  - Frontend displays in table with Edit/Delete buttons

**Files involved**:
- `ignitestrategescrm-frontend/src/pages/Forms.jsx`
- `eventscrm-backend/routes/formsHydratorRoute.js` (line 12-64)

---

### **STEP 3: Form is Pushed to Public Frontend**
- **Frontend**: `ignite-ticketing` → `/forms/:slug` → `PublicForm.jsx`
- **Route**: `GET /api/forms/public/:slug`
- **What happens**:
  - Backend fetches `PublicForm` by slug
  - Returns EXACTLY what's in the database:
    ```json
    {
      "id": "...",
      "slug": "bros-brews",
      "title": "Soft Commit to Bros & Brews",
      "description": "Fill out the form...",
      "fields": [
        { "id": "firstName", "type": "text", "label": "First Name", ... },
        { "id": "lastName", "type": "text", "label": "Last Name", ... },
        { "id": "custom_xyz", "type": "radio", "label": "How likely...", ... }
      ],
      "eventId": "...",
      "audienceType": "org_members",
      "targetStage": "soft_commit"
    }
    ```
  - Frontend renders all fields dynamically

**Files involved**:
- `ignite-ticketing/src/pages/PublicForm.jsx`
- `eventscrm-backend/routes/formsPublicRoute.js`

**NO SERVICES, NO PARSING - JUST DATABASE → FRONTEND**

---

### **STEP 4: User Inputs Data and Submits**
- **Frontend**: `ignite-ticketing` → `PublicForm.jsx` → `handleSubmit()`
- **What happens**:
  - User fills out form fields
  - Frontend validates required fields
  - Frontend sends:
    ```json
    POST /api/contacts
    {
      "slug": "bros-brews",
      "formData": {
        "firstName": "Adam",
        "lastName": "Cole",
        "email": "adam@example.com",
        "phone": "7034880601",
        "custom_xyz": "Very likely"
      }
    }
    ```

**Files involved**:
- `ignite-ticketing/src/pages/PublicForm.jsx` (line 62-94)

---

### **STEP 5: Backend Creates Contact & Attendee**
- **Route**: `POST /api/contacts`
- **What happens**:
  1. Get `PublicForm` by slug to extract metadata
  2. Extract standard fields: `firstName`, `lastName`, `email`, `phone`
  3. Find or create `Contact`:
     - Lookup by email (unique)
     - Create new if not found
     - Update if found and new data provided
  4. Extract custom field responses (everything except standard fields)
  5. Find or create `EventAttendee`:
     - Unique constraint: `eventId + contactId`
     - Set `currentStage` = `PublicForm.targetStage`
     - Set `audienceType` = `PublicForm.audienceType`
     - Store custom responses in `notes` as JSON
  6. Increment `PublicForm.submissionCount`
  7. Return: `{ success: true, contactId, attendeeId }`

**Files involved**:
- `eventscrm-backend/routes/formSubmissionRoute.js`

**KEY INSIGHT: IT'S CONTACT CREATION, NOT FORM SUBMISSION!**

---

## 🎯 **DATABASE TABLES INVOLVED**

| Table | Purpose | Created When | Links To |
|-------|---------|--------------|----------|
| `PublicForm` | Public form config | Step 1 | `Event` |
| `EventForm` | Internal CRM tracking | Step 1 | `PublicForm` |
| `Contact` | Person record | Step 5 | `Organization` |
| `EventAttendee` | Pipeline tracking | Step 5 | `Contact`, `Event` |

---

## 🚀 **CURRENT STATUS**

✅ **Step 1**: Working - FormBuilder creates forms  
✅ **Step 2**: Working - Forms.jsx displays forms list  
✅ **Step 3**: Working - New `/api/forms/public/:slug` route created  
✅ **Step 4**: Working - PublicForm.jsx sends to `/api/contacts`  
⚠️ **Step 5**: Needs testing - Contact creation route exists but needs schema migration

---

## 🚨 **REMAINING ISSUES**

1. **Database Schema Mismatch**:
   - Prisma schema has `collectFirstName` and `collectLastName`
   - Database still has `collectName`
   - Need to run: `npx prisma db push` on Render

2. **Existing Form Data**:
   - Current form in database might have `fields` JSON with wrong field IDs
   - May need to manually update or recreate form after schema migration

---

## 🧪 **TESTING CHECKLIST**

- [ ] Create a new form in CRM (Step 1)
- [ ] Verify form appears in Forms list (Step 2)
- [ ] Load public form at `/forms/{slug}` (Step 3)
- [ ] Fill out and submit form (Step 4)
- [ ] Verify Contact and EventAttendee created (Step 5)
- [ ] Check `submissionCount` incremented
- [ ] Verify custom field responses stored in `EventAttendee.notes`

