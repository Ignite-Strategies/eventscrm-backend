# 🎯 WHERE WE ARE NOW

**Last Updated**: October 9, 2025

---

## 📋 SYSTEM STATUS: OPERATIONAL ✅

The CRM system is now fully operational with the **Contact-First Architecture** implemented. Here's the complete state of the system.

---

## 🏗️ ARCHITECTURE OVERVIEW

### Core Concept: Contact-First Architecture
- **Contact** = Universal person record (firstName, lastName, email, phone)
- **OrgMember** = Extended CRM data (address, employer, tags, notes, etc.) - optional elevation
- **EventAttendee** = Links Contact to Event with pipeline tracking (currentStage, audienceType)
- **Admin** = Elevated OrgMember with system access

### Data Flow
```
Public Form Submission
    ↓
Contact Created/Updated (basic data)
    ↓
EventAttendee Created (links Contact to Event + pipeline stage)
    ↓
Optional: Elevate Contact → OrgMember (add extended CRM data)
    ↓
Optional: Elevate OrgMember → Admin (grant system access)
```

---

## 🗄️ DATABASE SCHEMA (Current State)

### Contact Model
```prisma
model Contact {
  id              String            @id @default(cuid())
  orgId           String
  firstName       String
  lastName        String
  email           String
  phone           String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  org             Organization      @relation(fields: [orgId], references: [id])
  eventAttendees  EventAttendee[]
  orgMember       OrgMember?        // Optional elevation
  admin           Admin?            // Optional elevation
  
  @@unique([orgId, email])  // Unique per org
  @@index([orgId])
  @@index([email])
}
```

### EventAttendee Model
```prisma
model EventAttendee {
  id            String    @id @default(cuid())
  eventId       String
  contactId     String
  orgId         String
  audienceType  String    // 'org_members', 'donors', 'volunteers'
  currentStage  String    // 'soft_commit', 'hard_commit', 'registered', etc.
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  event         Event     @relation(fields: [eventId], references: [id])
  contact       Contact   @relation(fields: [contactId], references: [id])
  org           Organization @relation(fields: [orgId], references: [id])
  
  @@unique([eventId, contactId, audienceType])
  @@index([eventId])
  @@index([contactId])
}
```

### PublicForm Model
```prisma
model PublicForm {
  id                String    @id @default(cuid())
  orgId             String
  eventId           String?
  slug              String    @unique
  title             String
  description       String?
  collectFirstName  Boolean   @default(true)
  collectLastName   Boolean   @default(true)
  collectEmail      Boolean   @default(true)
  collectPhone      Boolean   @default(true)
  fields            Json?     // Custom fields as JSON array
  audienceType      String    // 'org_members', 'donors', 'volunteers'
  targetStage       String    // 'soft_commit', 'hard_commit', etc.
  isActive          Boolean   @default(true)
  submissionCount   Int       @default(0)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  org               Organization @relation(fields: [orgId], references: [id])
  event             Event?       @relation(fields: [eventId], references: [id])
}
```

### OrgMember Model (Extended CRM Data)
```prisma
model OrgMember {
  id                      String    @id @default(cuid())
  contactId               String    @unique
  orgId                   String
  goesBy                  String?
  street                  String?
  city                    String?
  state                   String?
  zip                     String?
  employer                String?
  yearsWithOrganization   Int?
  birthday                DateTime?
  married                 Boolean   @default(false)
  spouseName              String?
  numberOfKids            Int?
  originStory             String?
  notes                   String?
  categoryOfEngagement    String?
  tags                    String[]
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  contact                 Contact   @relation(fields: [contactId], references: [id])
  org                     Organization @relation(fields: [orgId], references: [id])
  admin                   Admin?
}
```

---

## 🔌 API ROUTES (Active)

### PUBLIC ROUTES (No Auth)

#### `POST /api/contacts`
**Purpose**: Submit public form, create/update Contact + EventAttendee

**Request Body**:
```json
{
  "slug": "bros-brews",
  "orgId": "cmgfvz9v10000nt284k875eoc",
  "eventId": "cmggljv7z0002nt28gckp1jpe",
  "audienceType": "org_members",
  "targetStage": "soft_commit",
  "formData": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "7034880601",
    "custom_field_1": "value"
  }
}
```

**Response**: Success/error message

#### `GET /api/forms/public/:slug`
**Purpose**: Hydrate public form for display

**Response**:
```json
{
  "id": "form_id",
  "slug": "bros-brews",
  "title": "Soft Commit to Bros & Brews",
  "description": "RSVP for the event",
  "fields": [
    {
      "id": "firstName",
      "type": "text",
      "label": "First Name",
      "required": true,
      "order": 1
    },
    // ... standard + custom fields
  ],
  "orgId": "...",
  "eventId": "...",
  "audienceType": "org_members",
  "targetStage": "soft_commit"
}
```

### ADMIN ROUTES (Auth Required)

#### `GET /api/forms`
**Purpose**: List all forms for admin dashboard

**Query Params**: 
- `orgId` (required)
- `eventId` (optional)

**Response**:
```json
{
  "forms": [
    {
      "id": "...",
      "slug": "bros-brews",
      "title": "Soft Commit Form",
      "description": "Internal purpose",
      "eventId": "...",
      "isActive": true,
      "submissionCount": 5
    }
  ]
}
```

#### `GET /api/forms/:formId/edit`
**Purpose**: Hydrate form for editing in FormBuilder

**Response**:
```json
{
  "id": "...",
  "slug": "bros-brews",
  "title": "Soft Commit Form",
  "description": "Internal purpose",
  "fields": [
    // All fields (standard + custom)
  ],
  "audienceType": "org_members",
  "targetStage": "soft_commit"
}
```

#### `POST /api/forms`
**Purpose**: Create new form

**Request Body**:
```json
{
  "orgId": "...",
  "eventId": "...",
  "slug": "my-form",
  "title": "My Form",
  "internalPurpose": "Description",
  "audienceType": "org_members",
  "targetStage": "soft_commit",
  "fields": [
    // Custom fields only
  ]
}
```

#### `PATCH /api/forms/:formId`
**Purpose**: Update existing form

#### `DELETE /api/forms/:formId`
**Purpose**: Delete form

#### `GET /api/contacts/:contactId`
**Purpose**: Get Contact with OrgMember data (if exists)

**Response**:
```json
{
  "id": "contact_id",
  "contactId": "contact_id",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "7034880601",
  "orgId": "...",
  "hasOrgMember": false,
  // If hasOrgMember = true, includes:
  "orgMemberId": "...",
  "goesBy": "Johnny",
  "street": "123 Main St",
  // ... extended fields
}
```

#### `GET /api/contacts/:contactId/events`
**Purpose**: Get all events for a contact

**Response**:
```json
{
  "events": [
    {
      "id": "attendee_id",
      "eventId": "...",
      "eventTitle": "Bros & Brews",
      "audienceType": "org_members",
      "currentStage": "soft_commit",
      "createdAt": "2025-10-09T..."
    }
  ]
}
```

#### `GET /api/events/:eventId/pipeline`
**Purpose**: Get pipeline data for an event (all attendees grouped by stage)

**Query Params**: `audienceType` (required)

**Response**:
```json
{
  "event": {
    "id": "...",
    "title": "Bros & Brews",
    "date": "2025-11-15T..."
  },
  "pipeline": {
    "soft_commit": [
      {
        "id": "attendee_id",
        "contactId": "...",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "currentStage": "soft_commit"
      }
    ],
    "hard_commit": [],
    // ... other stages
  }
}
```

---

## 🎨 FRONTEND PAGES (CRM)

### Dashboard (`/dashboard`)
- Shows event cards with "Manage Pipeline" button
- "Pipeline Management" purple card navigates to `/event/{eventId}/pipelines` for first event

### Forms List (`/forms`)
- Lists all forms for the org
- Shows title, description, slug, isActive status
- Edit/Delete actions

### Form Builder (`/forms/new` and `/forms/:formId/edit`)
- Create/Edit forms
- Standard fields (First Name, Last Name, Email, Phone) are hardcoded and required
- Add custom fields (text, textarea, select, radio, checkbox, number, date)
- Custom fields have ID, label, type, placeholder, required, options (for select/radio/checkbox)
- Saves to backend as JSON array in `PublicForm.fields`

### Event Pipelines (`/event/:eventId/pipelines`)
- Shows pipeline stages for selected audienceType (org_members, donors, volunteers)
- Drag-and-drop contacts between stages
- Fetches from `GET /api/events/:eventId/pipeline?audienceType=org_members`

### Contact Detail (`/contact/:contactId`)
**NEW - Just Built!**
- Shows Contact basic info (name, email, phone)
- Tabs: Overview, Events, Full Profile (if OrgMember)
- **Conditional Display**:
  - If `hasOrgMember = false`: Shows yellow warning banner + "⬆️ Elevate to Org Member" button
  - If `hasOrgMember = true`: Shows full profile tab with extended CRM data
- Quick actions: Edit, Add to Event, Delete

### Supporters (`/supporters`) - DEPRECATED
- Old list of OrgMembers
- Will be replaced by universal Contacts list

---

## 🎨 FRONTEND PAGES (Public Ticketing)

### Public Form (`/forms/:slug`)
- Dynamic form rendering based on slug
- Fetches from `GET /api/forms/public/:slug`
- Standard fields (First Name, Last Name on same line, Email, Phone)
- Custom fields render based on type (text, select, radio, checkbox, etc.)
- F3 Capital branded hero banner with muscle icon
- Submits to `POST /api/contacts`
- Redirects to `/form-success` on success

### Form Success (`/form-success`)
- Generic success page after form submission
- No payment info (that's in different flow)

---

## 🔄 COMPLETE FLOW EXAMPLES

### 1. Public Form Submission → Pipeline Display

**Step 1: User Visits Form**
```
https://ignite-ticketing.vercel.app/forms/bros-brews
```
- Frontend calls: `GET /api/forms/public/bros-brews`
- Stores to localStorage: `orgId`, `eventId`, `audienceType`, `targetStage`
- Renders form with standard + custom fields

**Step 2: User Submits Form**
- Frontend submits: `POST /api/contacts` with:
  ```json
  {
    "slug": "bros-brews",
    "orgId": "...",
    "eventId": "...",
    "audienceType": "org_members",
    "targetStage": "soft_commit",
    "formData": { "firstName": "John", ... }
  }
  ```
- Backend creates/updates `Contact` (using `orgId_email` unique constraint)
- Backend creates/updates `EventAttendee` (using `eventId_contactId_audienceType` unique constraint)

**Step 3: Admin Views Pipeline**
```
https://ignitestrategiescrm-frontend.vercel.app/event/{eventId}/pipelines
```
- Frontend calls: `GET /api/events/{eventId}/pipeline?audienceType=org_members`
- Backend queries `EventAttendee` and groups by `currentStage`
- John Doe appears in "Soft Commit" column

**Step 4: Admin Views Contact Detail**
```
/contact/{contactId}
```
- Frontend calls: `GET /api/contacts/{contactId}`
- Backend returns Contact with `hasOrgMember: false` (basic contact from form)
- Shows "Elevate to Org Member" button
- Shows Overview + Events tabs (no Full Profile)

**Step 5: Admin Elevates Contact**
- Clicks "⬆️ Elevate to Org Member"
- (Future: Modal to add extended CRM data)
- Creates `OrgMember` record linked to `Contact`
- Page refreshes, now shows Full Profile tab

---

## 🚀 DEPLOYMENT STATUS

### Backend (Render)
- URL: `https://eventscrm-backend.onrender.com`
- Latest commit: Added `GET /api/contacts/:contactId` with OrgMember check
- Status: ✅ Deployed and operational

### Frontend - CRM (Vercel)
- URL: `https://ignitestrategiescrm-frontend.vercel.app`
- Latest commit: Added Elevate to Org Member button
- Status: ✅ Deployed and operational

### Frontend - Ticketing (Vercel)
- URL: `https://ignite-ticketing.vercel.app`
- Latest commit: Public form with F3 branding, dynamic routing
- Status: ✅ Deployed and operational

---

## 📝 CURRENT TEST DATA

### Organization
- ID: `cmgfvz9v10000nt284k875eoc`
- Name: F3 Capital

### Event
- ID: `cmggljv7z0002nt28gckp1jpe`
- Title: "Bros & Brews"
- Date: November 15, 2025

### Form
- Slug: `bros-brews`
- Title: "Soft Commit to Bros & Brews"
- Audience: `org_members`
- Target Stage: `soft_commit`
- Custom Fields:
  - F3 Name (text)
  - How likely are you to attend? (radio)
  - Will you bring your M or others? (radio)
  - How many in your party? (number)

### Test Contact
- Name: Adam Cole
- Email: adam.cole.0524@gmail.com
- Has OrgMember: ✅ Yes (Owner role)
- Has Admin: ✅ Yes (Full system access)
- Event: Bros & Brews, Stage: Soft Commit

---

## ⚠️ DEPRECATED / DO NOT USE

### Models
- ❌ `Supporter` - replaced by `Contact` + `OrgMember`
- ❌ `CustomField` - replaced by JSON array in `PublicForm.fields`
- ❌ `EventForm` - merged into `PublicForm`

### Routes
- ❌ `/api/forms/:slug/submit` - replaced by `POST /api/contacts`
- ❌ `/api/supporters` - use `/api/contacts` instead

### Frontend Pages
- ❌ `/supporters` - will be replaced by `/contacts` (universal list)

---

## 🐛 KNOWN ISSUES / LIMITATIONS

### None Currently! 🎉
All major issues have been resolved:
- ✅ Form hydration working
- ✅ Form submission creating Contact + EventAttendee
- ✅ Pipeline display working
- ✅ Contact detail with OrgMember check working
- ✅ Unique constraints properly implemented
- ✅ Navigation from Dashboard to Pipeline working

---

## 🎯 NEXT STEPS / ROADMAP

### Immediate (MVP 1.5)
1. **Elevate Contact Modal**: Build the actual modal to add extended OrgMember data
2. **Universal Contacts List**: Replace `/supporters` with `/contacts` showing all Contacts (with filter for OrgMembers)
3. **Contact Edit**: Build edit functionality for Contact + OrgMember data
4. **Add Contact to Event**: Build flow to add existing Contact to new Event

### Future (MVP 2)
1. **Donations Tracking**: Add `Supporter` model for tracking donations
2. **Email Integration**: Send automated emails on form submission
3. **Pipeline Automation**: Auto-move contacts between stages based on actions
4. **Form Analytics**: Track form views, submissions, conversion rates

### Future (MVP 3)
1. **Multi-Event Forms**: Allow one form to register for multiple events
2. **Payment Integration**: Connect Stripe for event payments
3. **Check-In System**: QR codes for event check-in
4. **Reporting Dashboard**: Analytics and insights

---

## 🔑 KEY LEARNING / DECISIONS

1. **Contact-First Architecture**: Universal person record with optional elevation to OrgMember/Admin
2. **JSON Fields in PublicForm**: Simpler than separate CustomField table, easier hydration
3. **Compound Unique Constraints**: `Contact` uses `@@unique([orgId, email])` for multi-org support
4. **EventAttendee as Bridge**: Links Contact to Event with pipeline tracking
5. **Public vs Admin Routes**: Clear separation with `/api/forms/public/:slug` for public forms
6. **LocalStorage Strategy**: Store `orgId`, `eventId`, `audienceType`, `targetStage` on form load for submission
7. **Standard Fields Hardcoded**: FirstName, LastName, Email, Phone always present, custom fields stored as JSON
8. **hasOrgMember Flag**: Backend returns boolean to frontend for conditional UI rendering

---

## 📚 DOCUMENTATION FILES

- `ARCHITECTURE.md` - System architecture overview
- `DATABASE.md` - Database schema details
- `MODELS.md` - Model relationships
- `SERVICES.md` - Service layer patterns
- `docs/FORMS.md` - Form system architecture
- `docs/SCHEMA.md` - Database schema reference
- `docs/DEPRECATIONS.md` - Deprecated models/routes
- `WHERE_WE_ARE_NOW.md` - **This file - current system state**

---

**Last Major Changes**:
- Contact Detail page rebuilt with modern card-based UI
- Added OrgMember check and "Elevate to Org Member" button
- Dashboard navigation fixed to go directly to event pipeline
- Public form submission flow fully operational end-to-end

**System Health**: 🟢 All Green - Fully Operational

