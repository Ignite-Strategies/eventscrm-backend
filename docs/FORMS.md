# FORMS ARCHITECTURE

## 🎯 **THE PROBLEM WE KEPT CONFUSING**

We have **2 COMPLETELY DIFFERENT USE CASES** for forms:

### 1. **CRM ADMIN FORM BUILDER** (Internal)
- **Who**: CRM admins creating/editing forms
- **Route**: `GET /api/forms/hydrator/:formId/edit`
- **What it needs**: 
  - Full `EventForm` data (internal name, purpose, styling)
  - Full `PublicForm` data (slug, title, description, fields)
  - Standard fields + custom fields combined for editing
- **Frontend**: `/forms/:formId` in `ignitestrategescrm-frontend`

### 2. **PUBLIC FORM DISPLAY** (External)
- **Who**: External users filling out forms
- **Route**: `GET /api/forms/public/:slug` (NEW - NEEDS TO BE CREATED)
- **What it needs**: 
  - JUST the `PublicForm.fields` JSON array
  - EXACTLY what's in the database, nothing more
  - No parsing, no services, no hardcoding
- **Frontend**: `/forms/:slug` in `ignite-ticketing`

---

## 🚨 **THE MISTAKE WE KEPT MAKING**

We kept trying to use the same route (`/api/forms/hydrator/:slug`) for BOTH use cases!

**The admin route has:**
- Complex logic for edit mode
- Hardcoded standard fields for FormBuilder
- Combined EventForm + PublicForm data

**The public route needs:**
- Just return `publicForm.fields` as-is from database
- No services, no parsing, no logic
- Simple `res.json(publicForm)`

---

## ✅ **THE FIX**

Create a NEW route: `/api/forms/public/:slug`

```javascript
// routes/formsPublicRoute.js
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  
  const publicForm = await prisma.publicForm.findUnique({
    where: { slug }
  });
  
  if (!publicForm || !publicForm.isActive) {
    return res.status(404).json({ error: 'Form not found' });
  }
  
  // JUST RETURN WHAT'S IN THE DATABASE
  res.json({
    id: publicForm.id,
    slug: publicForm.slug,
    title: publicForm.title,
    description: publicForm.description,
    fields: publicForm.fields, // THAT'S IT!
    eventId: publicForm.eventId,
    audienceType: publicForm.audienceType,
    targetStage: publicForm.targetStage
  });
});
```

---

## 📋 **ROUTES SUMMARY**

| Route | Purpose | Frontend | Returns |
|-------|---------|----------|---------|
| `GET /api/forms/hydrator?orgId=X` | List forms for CRM admin | `ignitestrategescrm-frontend` | Array of form summaries |
| `GET /api/forms/hydrator/:formId/edit` | Edit form in CRM FormBuilder | `ignitestrategescrm-frontend` | EventForm + PublicForm with all fields |
| `GET /api/forms/public/:slug` | Display public form | `ignite-ticketing` | PublicForm.fields JSON only |
| `POST /api/forms/saver` | Create new form | `ignitestrategescrm-frontend` | Created form IDs |
| `PATCH /api/forms/saver/:formId` | Update form | `ignitestrategescrm-frontend` | Updated form |
| `DELETE /api/forms/saver/:formId` | Delete form | `ignitestrategescrm-frontend` | Success message |
| `POST /api/contacts` | Submit form (create contact) | `ignite-ticketing` | Contact + Attendee IDs |

---

## 🎯 **CONTACT CREATION FLOW**

When a user submits a public form:

1. Frontend sends: `POST /api/contacts` with `{ slug, formData }`
2. Backend:
   - Gets `PublicForm` by slug
   - Extracts `firstName`, `lastName`, `email`, `phone` from `formData`
   - Creates/updates `Contact`
   - Creates/updates `EventAttendee` using:
     - `eventId` from PublicForm
     - `audienceType` from PublicForm
     - `targetStage` from PublicForm (sets `currentStage`)
   - Stores custom field responses in `EventAttendee.notes` as JSON

**IT'S ABOUT CONTACT CREATION, NOT FORM SUBMISSION!**

---

## 🚀 **TODO**

- [x] Create `routes/formsPublicRoute.js`
- [x] Register route in `index.js` as `app.use('/api/forms/public', formsPublicRoute)`
- [x] Update frontend `ignite-ticketing` to call `/api/forms/public/:slug`
- [x] Test that it returns EXACTLY what's in `PublicForm.fields`
- [x] Run Prisma migration to add `collectFirstName`/`collectLastName` columns
- [x] Delete old `collectName` column from database
- [x] Create fresh form with correct schema

## ✅ **COMPLETED**

### **Database Schema Fixed**
- ✅ Added `collectFirstName` and `collectLastName` columns to `PublicForm`
- ✅ Removed deprecated `collectName` column
- ✅ Standard fields now properly supported in schema

### **Routes Working**
- ✅ `/api/forms/public/:slug` - Returns raw database fields (no parsing)
- ✅ `/api/forms/hydrator` - CRM admin form list and edit
- ✅ `/api/contacts` - Contact creation from form submissions

### **Form Creation Flow**
- ✅ FormBuilder creates forms with standard + custom fields
- ✅ Standard fields (firstName, lastName, email, phone) are hardcoded in backend
- ✅ Custom fields are stored in `PublicForm.fields` JSON array
- ✅ Database schema matches Prisma schema

### **Test Results**
- ✅ Form created successfully with slug: `test`
- ✅ Database contains custom field: `{"id": "test_short_answer", "type": "text", "label": "Test Short Answer", ...}`
- ✅ Public form URL: `https://ignite-ticketing.vercel.app/forms/test`
- ✅ Standard fields added by backend during hydration
