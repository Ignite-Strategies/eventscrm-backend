# 🚨 DEPRECATION STATUS

**Last Updated**: October 9, 2025

---

## 🎯 Current Architecture: Contact-First

### ✅ ACTIVE (Prisma/Postgres)
**Models:**
- `Contact` - Universal person record (everyone starts here)
- `OrgMember` - Extended CRM data (elevated contacts)
- `EventAttendee` - Links Contact to Event with pipeline tracking
- `Admin` - App access permissions (linked to Contact)

**Routes:**
- `routes/contactsRoute.js` - Contact CRUD (needs splitting into separate routes)
- `routes/formSubmissionRoute.js` - Public form → Contact + EventAttendee
- `routes/pipelineHydrationRoute.js` - EventAttendee-based pipelines

**Frontend:**
- `ContactDetail.jsx` - Individual contact view
- `EventPipelines.jsx` - Pipeline management (uses EventAttendee)

---

## ❌ DEPRECATED (MongoDB/Old System)

### Backend - DO NOT USE
**Models:**
- ❌ `models/Supporter.js` (MongoDB)
- ❌ Prisma: `model Supporter` (lines 134-177 in schema.prisma)
- ❌ Prisma: `model SupporterTag` (lines 180-192 in schema.prisma)

**Routes:**
- ❌ `routes/supportersRoute.js` - Uses deprecated Supporter model
  - Still registered at `/api/supporters/*`
  - CSV upload targets MongoDB Supporter (WRONG!)
  - Needs refactor to create Contact + OrgMember

**Services:**
- ❌ `services/supporterMutation.js` - MongoDB operations

### Frontend - NEEDS REFACTOR
**Pages (Org Upload UX):**
- ❌ `Supporters.jsx` → Should be `OrgMembersDisplay.jsx`
- ❌ `SupporterManual.jsx` → Should be `ContactManual.jsx` 
- ❌ `UploadSupportersCSV.jsx` → Should create Contact + OrgMember
- ❌ `UploadPreview.jsx` → Part of CSV upload flow
- ❌ `ContactValidation.jsx` → CSV validation
- ❌ `ResolveErrors.jsx` → CSV error handling

**What These Pages Do (Important!):**
- These are the **Org Upload UX** - initial org setup
- CSV upload of master contact list
- **Critical functionality** but uses wrong database
- Keep for now, refactor when rebuilding org upload flow

---

## 🔄 THE MIGRATION PATH

### What Needs to Happen:
1. **Supporters page** → Displays OrgMembers (filter Contacts by hasOrgMember)
2. **CSV Upload** → Creates Contact + OrgMember (not Supporter)
3. **Manual Add** → Contact-First flow (create Contact, optionally elevate to OrgMember)

### Naming Convention:
- **Contact** = Universal person (always created first)
- **OrgMember** = Elevated contact with extended CRM data
- **Supporter** = DEPRECATED (MongoDB only)

### Database Strategy:
- **Prisma/Postgres** = Source of truth (Contact, OrgMember, EventAttendee)
- **MongoDB** = Legacy (Supporter model, ignore for new features)

---

## 🚧 CURRENT BLOCKERS

### The Contact Delete Issue (FIXED ✅)
- **Problem**: Frontend was calling `/supporters/:supporterId` with Contact ID
- **Issue**: Looking in wrong database (MongoDB Supporter vs Prisma Contact)
- **Fix**: Now calls `/contacts/:contactId` with proper cascade

### The Soft Commit Form (IN PROGRESS)
- **Problem**: Form calls `/api/public/events/brosandbrews/soft-commit`
- **Issue**: Route doesn't exist yet
- **Need**: Event-driven form submission → Contact + EventAttendee

---

## 📝 ACTION ITEMS

### Immediate (Now)
- [ ] Build event-driven soft commit route
- [ ] Test Contact-First form submission flow
- [ ] Verify pipeline display after form submission

### Future (Org Upload UX Refactor)
- [ ] Rename Supporters.jsx → OrgMembersDisplay.jsx
- [ ] Update CSV upload to create Contact + OrgMember (not Supporter)
- [ ] Build ContactManual.jsx for Contact-First manual add
- [ ] Migrate existing Supporters to Contact + OrgMember
- [ ] Remove Supporter model from Prisma schema
- [ ] Deregister supportersRoute from index.js

---

## 🔑 KEY DECISIONS

1. **Contact = Source of Truth** for all person IDs
2. **OrgMember = Optional Elevation** (not everyone needs it)
3. **EventAttendee always uses contactId** (never orgMemberId)
4. **Supporters pages kept for now** (critical CSV upload, will refactor later)
5. **Delete navigates to /dashboard** (not /supporters)

---

## 🚨 DON'T GO DOWN THESE RABBIT HOLES

1. ❌ Don't try to "fix" supportersRoute - it needs full refactor
2. ❌ Don't mix Supporter (MongoDB) with Contact (Prisma)
3. ❌ Don't rebuild org upload UX until soft commit form is working
4. ❌ Don't delete Supporters pages yet - CSV upload is critical

**Focus**: Get Contact-First architecture working end-to-end, THEN refactor org upload.

