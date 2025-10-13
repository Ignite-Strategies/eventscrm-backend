# 📍 WHERE WE ARE NOW
**Last Updated:** October 13, 2025  
**Status:** Active Development - Contact/OrgMember Architecture Refactored

---

## 🎯 WHAT THIS SYSTEM DOES

The **Ignite Strategies CRM** is an event management and contact relationship platform that:

1. **Manages Events** - Create, track, and manage events with attendees
2. **Tracks Contacts** - Universal contact records that can be linked to multiple orgs/events
3. **Org Member Management** - Elevate contacts to org members with org-specific data
4. **Form Submissions** - Public forms that create contacts and event attendees
5. **Event Pipelines** - Track attendees through stages (aware → rsvped → attended)
6. **Email Campaigns** - Send targeted emails to contact lists

---

## 🏗️ CORE ARCHITECTURE

### **Contact-First Design**
The system follows a **Contact-First** architecture where:

```
Contact (universal personhood)
  ↓
  ├── EventAttendee (event-specific)
  └── OrgMember (org-specific)
```

- **Contact** = Universal personhood data (name, email, phone, address, family info)
- **EventAttendee** = Links Contact to Event (stores stage, audience type, form responses)
- **OrgMember** = Links Contact to Organization (stores org-specific data like role, employer, years with org)

### **Key Principle: No Data Duplication**
- Contact data (firstName, lastName, email, etc.) lives ONLY in `Contact` model
- Relational access via `contactId` foreign keys
- EventAttendee and OrgMember store ONLY relational and context-specific data

---

## 📊 CORE DATA MODELS

### **Contact** (Universal Personhood)
```prisma
model Contact {
  id String @id @default(cuid())
  
  // Basic identity
  firstName String
  lastName  String
  email     String  @unique
  phone     String?
  
  // Universal personhood
  goesBy String?
  street String?
  city   String?
  state  String?
  zip    String?
  
  // Universal family
  birthday     String?
  married      Boolean @default(false)
  spouseName   String?
  numberOfKids Int     @default(0)
  
  // Relations
  eventAttendees   EventAttendee[]
  orgMember        OrgMember?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### **EventAttendee** (Event-Specific)
```prisma
model EventAttendee {
  id      String @id @default(cuid())
  orgId   String
  eventId String
  event   Event  @relation(fields: [eventId], references: [id])
  
  contactId String
  contact   Contact @relation(fields: [contactId], references: [id])
  
  currentStage String @default("aware")
  audienceType String
  
  submittedFormId String?        // Links to PublicForm
  submittedForm   PublicForm? @relation(fields: [submittedFormId], references: [id])
  
  attended    Boolean   @default(false)
  checkedInAt DateTime?
  notes       String?   // JSON: Stores custom form field responses
  
  @@unique([eventId, contactId, audienceType])
}
```

### **OrgMember** (Org-Specific)
```prisma
model OrgMember {
  id        String   @id @default(cuid())
  contactId String?  @unique
  contact   Contact? @relation(fields: [contactId], references: [id])
  
  orgId String?
  org   Organization? @relation(fields: [orgId], references: [id])
  
  // Org-specific fields ONLY
  employer              String?
  yearsWithOrganization Int?
  originStory           String?
  notes                 String?
  role                  String?
  tags                  String[] @default([])
  categoryOfEngagement  String @default("medium")
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 🚀 KEY FEATURES IMPLEMENTED

### ✅ 1. Contact Elevation to Org Member
**Flow:** `Contact` → `OrgMember` (via `contactId` link)

**Backend Route:** `POST /api/org-members`
```javascript
// Body: { contactId }
// Headers: { x-org-id: orgId }

// Creates OrgMember record linking Contact to Organization
// No data duplication - only relational link + org-specific fields
```

**Frontend:**
- **EventAttendeeList:** Quick elevate button (⬆️) in attendee row
- **ContactDetail:** Detailed elevate button with full contact view
- Both use SAME backend route

**Confirmation Dialog:**
```
"Add [Name] to [Org Name] as a member?"
```

### ✅ 2. Form Submissions & Responses
**Flow:** Public Form → Contact + EventAttendee (with form responses in `notes`)

**Backend Routes:**
- `POST /api/contacts` - Form submission (creates Contact + EventAttendee)
- `GET /api/events/:eventId/form-submissions` - All form responses for event
- `GET /api/attendees/:attendeeId/form-response` - Single attendee form response

**Frontend:**
- **EventDashboard:** Associate form with event (stores `publicFormId` in localStorage)
- **EventAttendeeList:** "📝 View Form" button per attendee row
- Shows form responses in alert dialog

**Form Response Storage:**
- Custom fields stored as JSON in `EventAttendee.notes`
- Standard fields (firstName, lastName, email, phone) stored in `Contact`

### ✅ 3. localStorage Caching for Performance
**EventDashboard** pre-loads and caches:
- All attendees: `event_${eventId}_attendees`
- Pipeline attendees: `event_${eventId}_pipeline_${audience}`
- Forms: `eventFormAssociation` (with `publicFormId`)
- Pipeline configs: `pipeline_configs`

**EventAttendeeList** reads from cache:
- Instant load (no spinning!)
- Falls back to API if not cached

### ✅ 4. Navigation & Contact Management
**Routes:**
- `/contact/:contactId` - Full contact detail page
- `/event/:eventId/manage-contacts` - Attendee list
- `/event/:eventId/pipelines` - Pipeline view

**Features:**
- Click contact name → Navigate to `ContactDetail`
- View contact across all events
- Edit contact info
- Delete contact (cascades to all events)

---

## 📁 PROJECT STRUCTURE

### Backend (`eventscrm-backend/`)
```
routes/
  ├── contactHydrateRoute.js      # GET /contacts/:contactId
  ├── contactSaveRoute.js         # POST/PATCH /contacts
  ├── contactDeleteRoute.js       # DELETE /contacts/:contactId
  ├── orgMemberCreateRoute.js     # POST /org-members (elevation)
  ├── formResponsesRoute.js       # GET form submissions/responses
  ├── eventAttendeesRoute.js      # GET /events/:eventId/attendees
  ├── publicFormSubmissionRoute.js # POST /contacts (form submission)
  └── ...

services/
  ├── contactService.js           # Contact CRUD operations
  ├── orgMemberService.js         # OrgMember operations
  └── ...

prisma/
  └── schema.prisma               # Database schema
```

### Frontend (`ignitestrategescrm-frontend/`)
```
src/pages/
  ├── EventDashboard.jsx          # Main dashboard, cache manager
  ├── EventAttendeeList.jsx       # Attendee list, reads from cache
  ├── ContactDetail.jsx           # Full contact view + elevation
  ├── EventPipelines.jsx          # Pipeline stage management
  └── ...

src/services/
  └── api.js                      # Axios instance with interceptors
```

---

## 🔧 RECENT REFACTORS

### **October 13, 2025**

1. **Prisma Schema Refactor: Contact-First**
   - Moved universal personhood fields FROM `OrgMember` TO `Contact`
   - `OrgMember` now only stores org-specific data
   - Fixed data duplication issue

2. **OrgMember Elevation Route**
   - `POST /org-members` now properly handles `ContactId => OrgMemberId`
   - `orgId` passed via `x-org-id` header (from localStorage)
   - No duplicate backend routes

3. **Form Hydration Fix**
   - `EventDashboard` now sends `orgId` query param to `/forms`
   - Forms load properly for association

4. **Attendee Caching**
   - `EventDashboard` caches ALL attendees to localStorage
   - `EventAttendeeList` reads from cache (fast!)
   - No more spinning on "Manage Contacts"

5. **Form Response Viewing**
   - Added per-row "View Form" button in `EventAttendeeList`
   - Backend routes for fetching form responses
   - Form responses parsed from `EventAttendee.notes` JSON

---

## 🎯 WHAT'S WORKING

✅ Contact creation from forms  
✅ Event attendee management  
✅ Contact elevation to OrgMember  
✅ Form submissions with custom fields  
✅ Form response viewing per attendee  
✅ localStorage caching for performance  
✅ Contact detail navigation  
✅ Pipeline stage tracking  
✅ Contact deletion (cascades properly)  

---

## 🚧 KNOWN ISSUES / TODO

### **High Priority**
- [ ] Automatic email on form signup (next feature)
- [ ] Test `orgMembersSaveroute.js` for CSV bulk upload

### **Medium Priority**
- [ ] FormSubmissionView.jsx needs implementation (full page view)
- [ ] Contact detail page could show event history
- [ ] Form builder UI improvements

### **Low Priority**
- [ ] Better error handling for failed form submissions
- [ ] Pagination for large attendee lists

---

## 🎓 KEY LEARNINGS / PATTERNS

### **1. Contact-First Architecture**
```
❌ BAD: Duplicate contact data in OrgMember
✅ GOOD: Contact data in Contact, relational link via contactId
```

### **2. localStorage for Performance**
```
EventDashboard (pre-loads) → localStorage → EventAttendeeList (instant read)
```

### **3. orgId Handling**
```
❌ BAD: Send orgId in request body, backend hydration
✅ GOOD: localStorage → x-org-id header → backend uses directly
```

### **4. Form Response Storage**
```
Standard fields → Contact model
Custom fields → EventAttendee.notes (JSON)
```

### **5. Modularity**
```
EventDashboard = Cache Manager (data orchestrator)
EventAttendeeList = Display Component (reads from cache)
ContactDetail = Full Contact Management (single source of truth)
```

---

## 📞 NEED HELP?

### **Quick Reference:**
- **Backend API:** `https://eventscrm-backend.onrender.com/api`
- **Frontend:** `https://ignitestrategescrm-frontend.vercel.app`

### **Common Commands:**
```bash
# Backend
cd eventscrm-backend
npm run dev

# Frontend
cd ignitestrategescrm-frontend
npm run dev

# Database
npx prisma migrate dev
npx prisma studio
```

### **Key Files to Check:**
- `eventscrm-backend/prisma/schema.prisma` - Database schema
- `eventscrm-backend/routes/orgMemberCreateRoute.js` - Elevation logic
- `ignitestrategescrm-frontend/src/pages/EventDashboard.jsx` - Cache manager
- `ignitestrategescrm-frontend/src/pages/EventAttendeeList.jsx` - Attendee list

---

## 🎉 WHAT'S NEXT?

**Tomorrow:** Automatic email on form signup feature!

**Future:**
- Email campaign improvements
- Better form builder
- Advanced contact search/filtering
- Event analytics dashboard

---

**Remember:** This is a Contact-First system. Every feature should respect the principle of no data duplication and relational access via `contactId`.

