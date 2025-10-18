# 📝 FORMS & CONTAINER ARCHITECTURE - SOURCE OF TRUTH

## The Problem We Just Found

**Forms are creating Contacts WITHOUT Container references** - this breaks hydration!

---

## What is Container?

**Container = Tenant/Namespace** for multi-org deployment

```
Container
  ├── Organization (F3 Capital)
  │     ├── Event (Bros & Brews)
  │     │     ├── Contact 1
  │     │     ├── Contact 2
  │     │     └── Contact 3
  │     └── Event (Leadership Summit)
  │           └── Contact 4
  └── Organization (Another Org)
        └── Event (Their Event)
              └── Contact 5
```

### Why Container Matters

1. **Data Isolation**: Contacts in one container can't see contacts in another
2. **Hydration**: All queries MUST filter by `containerId` to ensure data security
3. **Multi-Tenancy**: One database serves multiple independent organizations

---

## Current Forms Flow (BROKEN)

### Form Creation (Admin) ✅ Works

**Route:** `POST /api/forms/saver`

```javascript
// Admin creates form template
{
  orgId: "f3-capital-id",
  eventId: "bros-and-brews-id",
  slug: "bros-and-brews-rsvp",
  title: "RSVP for Bros & Brews",
  audienceType: "landing_page_public",
  targetStage: "rsvped"
}
```

**Creates:**
- ✅ `PublicForm` (the template)
- ✅ `EventForm` (internal tracking)

**Missing:** ❌ NO `containerId` stored anywhere!

### Form Submission (Public User) ❌ BROKEN

**Route:** `POST /api/forms/submit`

```javascript
// Public user fills out form
{
  slug: "bros-and-brews-rsvp",
  formData: {
    firstName: "John",
    lastName: "Smith",
    email: "john@example.com",
    phone: "555-1234"
  }
}
```

**Currently Creates:**
```javascript
Contact {
  firstName: "John",
  lastName: "Smith",
  email: "john@example.com",
  phone: "555-1234",
  orgId: "f3-capital-id",       // ✅ Has this
  eventId: "bros-and-brews-id",  // ✅ Has this
  containerId: null              // ❌ MISSING!
}
```

**The Problem:**
- Contact has no `containerId`
- Welcome page hydration queries by `containerId`
- This contact won't show up in org member lists!
- Data isolation is broken!

---

## The Fix: Container-First Forms

### What We Need to Add

#### 1. PublicForm Schema Update

```prisma
model PublicForm {
  id           String @id @default(cuid())
  containerId  String  // ✅ ADD THIS
  orgId        String
  eventId      String
  // ... rest of fields
}
```

#### 2. EventForm Schema Update

```prisma
model EventForm {
  id           String @id @default(cuid())
  containerId  String  // ✅ ADD THIS
  orgId        String
  eventId      String
  publicFormId String
  // ... rest of fields
}
```

#### 3. Form Creation Flow Update

**Admin creates form:**
```javascript
// Frontend sends:
{
  containerId: "cmgu7w02h0000ceaqt7iz6bf9",  // ✅ From localStorage
  orgId: "f3-capital-id",
  eventId: "bros-and-brews-id",
  // ... rest
}

// Backend saves:
PublicForm {
  containerId: "cmgu7w02h0000ceaqt7iz6bf9",  // ✅ Saved
  orgId: "f3-capital-id",
  eventId: "bros-and-brews-id",
  // ...
}
```

#### 4. Form Submission Flow Update

**Public user submits form:**
```javascript
// 1. Backend looks up form
const publicForm = await prisma.publicForm.findUnique({
  where: { slug: "bros-and-brews-rsvp" },
  include: { event: true }
});

// 2. Extract containerId from form
const containerId = publicForm.containerId;  // ✅ Got it from form!

// 3. Create Contact WITH containerId
const contact = await prisma.contact.upsert({
  where: { email },
  create: {
    containerId,  // ✅ NOW INCLUDED
    orgId: publicForm.orgId,
    eventId: publicForm.eventId,
    firstName,
    lastName,
    email,
    phone,
    // ...
  },
  update: {
    // Same pattern
  }
});
```

---

## Implementation Steps

### Step 1: Update Prisma Schema

```prisma
model PublicForm {
  id           String @id @default(cuid())
  containerId  String     // ADD
  orgId        String
  eventId      String
  event        Event @relation(fields: [eventId], references: [id])
  // ... rest unchanged
  
  @@index([containerId])  // ADD
}

model EventForm {
  id           String @id @default(cuid())
  containerId  String     // ADD
  publicFormId String
  orgId        String
  eventId      String
  // ... rest unchanged
  
  @@index([containerId])  // ADD
}
```

### Step 2: Update formDataSplitterService.js

```javascript
export function splitFormData(formData) {
  const publicFormData = {
    containerId: formData.containerId,  // ✅ ADD
    orgId: formData.orgId,
    eventId: formData.eventId,
    slug: formData.slug,
    // ... rest
  };

  const eventFormData = {
    containerId: formData.containerId,  // ✅ ADD
    orgId: formData.orgId,
    eventId: formData.eventId,
    // ... rest
  };

  return { publicFormData, eventFormData };
}
```

### Step 3: Update Frontend FormBuilder

```javascript
// src/pages/FormBuilder.jsx

const handleSubmit = async () => {
  const containerId = localStorage.getItem('containerId');  // ✅ Get from storage
  
  const payload = {
    containerId,  // ✅ Include in payload
    orgId,
    eventId,
    name: formData.name,
    // ... rest
  };
  
  await api.post('/forms/saver', payload);
};
```

### Step 4: Update contactFormSubmitRoute.js

```javascript
router.post('/submit', async (req, res) => {
  // Get form
  const publicForm = await prisma.publicForm.findUnique({
    where: { slug },
    include: { event: true }
  });
  
  // Extract containerId from form (NOT from request body)
  const containerId = publicForm.containerId;  // ✅ Get from form
  
  // Create/update contact with containerId
  const contact = await prisma.contact.upsert({
    where: { email },
    create: {
      containerId,  // ✅ Include
      orgId: publicForm.orgId,
      eventId: publicForm.eventId,
      // ... rest
    },
    update: {
      containerId,  // ✅ Update if exists
      // ... rest
    }
  });
});
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     CONTAINER                           │
│             cmgu7w02h0000ceaqt7iz6bf9                   │
└─────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
     ┌──────────┐   ┌──────────┐   ┌──────────┐
     │   Org    │   │  Event   │   │ Contact  │
     │   F3     │   │  Bros &  │   │  John    │
     │          │   │  Brews   │   │          │
     └──────────┘   └──────────┘   └──────────┘
            │              │              │
            └──────────────┴──────────────┘
                     ALL share same
                     containerId!
```

---

## Hydration Rules (CRITICAL)

### ❌ NEVER do this:
```javascript
// Missing containerId = security hole!
const contacts = await prisma.contact.findMany({
  where: { orgId }  // ❌ Not enough!
});
```

### ✅ ALWAYS do this:
```javascript
// Container-first = data isolation
const contacts = await prisma.contact.findMany({
  where: {
    containerId,  // ✅ Required!
    orgId
  }
});
```

### Why This Matters

Without `containerId` in the query:
- ❌ Contact from Org A could see Contact from Org B
- ❌ Multi-tenancy is broken
- ❌ Data leakage between organizations
- ❌ Security vulnerability

---

## Current Files to Update

### Backend Files

1. **Schema:**
   - `prisma/schema.prisma` - Add `containerId` to PublicForm and EventForm

2. **Services:**
   - `services/formDataSplitterService.js` - Include containerId in split

3. **Routes:**
   - `routes/formCreatorSaverRoute.js` - Validate containerId on create
   - `routes/contactFormSubmitRoute.js` - Extract containerId from form
   - `routes/formDashHydratorRoute.js` - Filter by containerId

### Frontend Files

1. **Form Builder:**
   - `src/pages/FormBuilder.jsx` - Send containerId in create/update
   
2. **Forms List:**
   - `src/pages/Forms.jsx` - Already has containerId context

---

## Migration Path

### For Existing Forms (if any in production)

```sql
-- 1. Add column (nullable first)
ALTER TABLE "PublicForm" ADD COLUMN "containerId" TEXT;
ALTER TABLE "EventForm" ADD COLUMN "containerId" TEXT;

-- 2. Backfill from related event
UPDATE "PublicForm" pf
SET "containerId" = e."containerId"
FROM "Event" e
WHERE pf."eventId" = e.id
AND pf."containerId" IS NULL;

UPDATE "EventForm" ef
SET "containerId" = e."containerId"  
FROM "Event" e
WHERE ef."eventId" = e.id
AND ef."containerId" IS NULL;

-- 3. Make NOT NULL
ALTER TABLE "PublicForm" ALTER COLUMN "containerId" SET NOT NULL;
ALTER TABLE "EventForm" ALTER COLUMN "containerId" SET NOT NULL;

-- 4. Add indexes
CREATE INDEX "PublicForm_containerId_idx" ON "PublicForm"("containerId");
CREATE INDEX "EventForm_containerId_idx" ON "EventForm"("containerId");
```

---

## Testing Checklist

### Form Creation
- [ ] Admin creates form with containerId
- [ ] PublicForm has containerId saved
- [ ] EventForm has containerId saved
- [ ] Form shows up in org's form list

### Form Submission
- [ ] Public user submits form
- [ ] Contact created with containerId from form
- [ ] Contact appears in org member list
- [ ] Contact appears in event attendee list
- [ ] Welcome page hydration finds the contact

### Data Isolation
- [ ] Contacts from Container A don't appear in Container B queries
- [ ] Forms from Container A don't appear in Container B lists
- [ ] No cross-container data leakage

---

## FAQ

### Q: Why not just use orgId?

**A:** Organizations can move between containers, or you might have test vs production containers. Container is the TOP-LEVEL isolation boundary.

### Q: Can a Contact exist in multiple containers?

**A:** No! One Contact = One Container. If someone participates in multiple separate deployments, they get separate Contact records (different email contexts).

### Q: Where does containerId come from?

**A:** 
1. Welcome page hydration sets it: `localStorage.setItem('containerId', xxx)`
2. All subsequent API calls include it
3. Forms inherit it from the event/org they're created for

### Q: What if form submission doesn't send containerId?

**A:** ✅ Good! Form submissions are PUBLIC - we get containerId from the form template itself, not from the submitter.

---

## Related Documentation

- `CONTACT-FIRST-ARCHITECTURE.md` - Contact as universal person record (UPDATE THIS!)
- `CONTAINER-HYDRATION.md` - Container hydration patterns
- `SINGLE-SOURCE-OF-TRUTH.md` - Data consistency principles

---

**Last Updated:** Just now, after we realized forms weren't using Container!

**Status:** 🔴 NEEDS IMMEDIATE FIX - Forms currently broken for hydration

**Priority:** P0 - Blocking multi-org deployment

