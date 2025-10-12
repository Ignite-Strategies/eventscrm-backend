# 🏗️ System Architecture

**Last Updated:** December 2024

---

## 🎯 Overview

**Contact-First Architecture** with Schema Config Hydration Pattern

### Core Philosophy
- **Contact** = Universal person record (everyone starts here)
- **OrgMember** = Extended CRM data (optional elevation)
- **Admin** = System access (optional elevation)
- **EventAttendee** = Links Contact to Event with pipeline tracking

---

## 🖥️ Frontend Architecture

### Tech Stack
- **Framework:** React + Vite + Tailwind CSS
- **Routing:** React Router
- **State:** localStorage + API calls
- **Auth:** Firebase Authentication
- **Deployment:** Vercel

### Key Components
```
src/
  pages/
    Welcome.jsx              # Universal hydrator + router
    Dashboard.jsx            # Main CRM dashboard
    ContactEventUpload.jsx   # CSV upload flow
    ContactEventUploadPreview.jsx # Preview + assignment
    ContactDetail.jsx        # Contact management
    FormBuilder.jsx          # Form creation
    EventPipelines.jsx       # Pipeline management
  
  lib/
    api.js                   # Axios instance with interceptors
    googleAuth.js            # Firebase auth helpers
    org.js                   # Organization utilities
  
  firebase.js                # Firebase config with persistence
```

### Hydration Pattern
```javascript
// 1. Welcome.jsx - Cache schema once
const schemaResponse = await api.get('/schema/event-attendee');
localStorage.setItem('eventAttendeeSchema', JSON.stringify(schemaResponse.data));

// 2. Components - Use cache first, API fallback
const cachedSchema = localStorage.getItem('eventAttendeeSchema');
if (cachedSchema) {
  // Use cached data (instant)
} else {
  // Fetch from API and cache
}
```

---

## 🔧 Backend Architecture

### Tech Stack
- **Runtime:** Node.js + Express
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Firebase Admin SDK
- **Deployment:** Render
- **Email:** SendGrid (planned)

### Key Routes
```
routes/
  schemaConfigRoute.js        # Schema definitions
  eventsRoute.js              # Event CRUD
  contactEventUploadRoute.js  # CSV upload processing
  publicFormSubmissionRoute.js # Public form handling
  contactsRoute.js            # Contact management
  pipelineHydrationRoute.js   # Pipeline data
```

### API Structure
```
/api/
  schema/
    event-attendee            # Valid values for EventAttendee
  events/
    /:orgId/events           # Event CRUD
    /:eventId                # Get single event
    /:eventId/attendees      # Event attendees
    /:eventId/pipeline       # Pipeline data
  contacts/
    /                        # Public form submission
    /:contactId              # Get contact with OrgMember
    /upload                  # CSV upload
  forms/
    /                        # Admin form CRUD
    /public/:slug            # Public form hydration
```

---

## 🗄️ Database Architecture

### PostgreSQL on Render
- **Host:** Render PostgreSQL
- **Connection:** Prisma ORM
- **Migrations:** `npx prisma db push`

### Key Models
```prisma
Contact {
  id, orgId, firstName, lastName, email, phone
  // Universal person record
}

OrgMember {
  contactId (unique)
  // Extended CRM data: address, employer, tags, notes
}

EventAttendee {
  contactId, eventId, orgId
  audienceType: "org_members" | "friends_family" | "landing_page_public" | "community_partners" | "cold_outreach"
  currentStage: "in_funnel" | "general_awareness" | "personal_invite" | "expressed_interest" | "soft_commit" | "paid"
}

PublicForm {
  id, orgId, eventId, slug, title, description
  fields: Json  // Custom fields as JSON array
  audienceType, targetStage
}
```

---

## 🚀 Deployment Architecture

### Frontend (Vercel)
- **URL:** `https://ignitestrategescrm-frontend.vercel.app`
- **Build:** `npm run build`
- **Auto-deploy:** Git push to main
- **Environment:** Production Firebase config

### Backend (Render)
- **URL:** `https://eventscrm-backend.onrender.com`
- **Runtime:** Node.js
- **Database:** PostgreSQL (same service)
- **Auto-deploy:** Git push to main
- **Environment Variables:**
  - `DATABASE_URL`
  - `FIREBASE_SERVICE_ACCOUNT_KEY`

### Database (Render PostgreSQL)
- **Connection:** `postgresql://user:pass@host:port/db`
- **Access:** Render dashboard or pgAdmin
- **Schema:** Managed by Prisma

---

## 🔐 Authentication Flow

### Firebase Setup
```javascript
// firebase.js
import { setPersistence, browserLocalPersistence } from "firebase/auth";

setPersistence(auth, browserLocalPersistence);
```

### Auth Flow
```
1. User signs in with Google OAuth
2. Firebase returns user token
3. Backend validates token with Firebase Admin SDK
4. Creates/updates Contact + OrgMember records
5. Frontend stores auth state in localStorage
6. API calls include Firebase token in headers
```

---

## 📊 Schema Config System

### Backend Route
```javascript
GET /api/schema/event-attendee
{
  "audienceTypes": ["org_members", "friends_family", "landing_page_public", "community_partners", "cold_outreach"],
  "stages": ["in_funnel", "general_awareness", "personal_invite", "expressed_interest", "soft_commit", "paid"]
}
```

### Frontend Usage
```javascript
// Cache schema on app startup
const schema = await api.get('/schema/event-attendee');
localStorage.setItem('eventAttendeeSchema', JSON.stringify(schema.data));

// Use in components
const { audienceTypes, stages } = JSON.parse(localStorage.getItem('eventAttendeeSchema'));
```

---

## 🔄 Data Flow Patterns

### Public Form Submission
```
User fills form → Contact created/updated → EventAttendee created
```

### CSV Upload
```
Admin uploads CSV → Contacts created → EventAttendees created with selected audience/stage
```

### Pipeline Management
```
Admin views pipeline → Groups EventAttendees by currentStage → Drag/drop to change stages
```

### Contact Elevation
```
Basic Contact → Add OrgMember data → Optional Admin access
```

---

## 🛠️ Development Workflow

### Local Development
```bash
# Backend
npm run dev          # Start with nodemon
npx prisma studio    # Visual database browser
npx prisma db push   # Push schema changes

# Frontend  
npm run dev          # Start Vite dev server
```

### Deployment
```bash
# Both repos
git push origin main  # Auto-deploys to Render/Vercel
```

### Database Changes
```bash
# Edit prisma/schema.prisma
npx prisma db push    # Push to Render PostgreSQL
```

---

## 🔑 Key Design Decisions

1. **Contact-First Architecture** - Universal person record with optional elevation
2. **Schema Config Pattern** - Hydrate valid values from schema, not hardcode
3. **localStorage Strategy** - Cache schema data for instant access
4. **JSON Fields** - Custom form fields stored as JSON, not separate table
5. **Compound Unique Constraints** - Support multi-org with `@@unique([orgId, email])`
6. **Firebase Auth Persistence** - Explicit persistence setup prevents session loss

---

## 🎯 System Health

**Current Status:** 🟢 All Green - Fully Operational

- ✅ Schema config hydration working
- ✅ Contact-first architecture implemented  
- ✅ Public form submission flow operational
- ✅ CSV upload with audience/stage selection working
- ✅ Pipeline management functional
- ✅ Firebase auth persistence fixed
- ✅ Contact elevation flow ready

**Next Phase:** Apply schema config pattern to Organization model and build org management features.

