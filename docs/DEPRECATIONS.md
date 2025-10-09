# DEPRECATIONS - What's Dead, What's Alive

## 🚫 DEPRECATED (Do Not Use)

### Models
- ❌ `Supporter` - Old external donor model (use `Contact` instead)
- ❌ `EventPipelineEntry` - Old pipeline tracking (use `EventAttendee.currentStage` instead)

### Routes
- ❌ `/orgs/${orgId}/supporters` - Should be `/orgs/${orgId}/contacts`
- ❌ Any route using "supporters" terminology

### Frontend Pages
- ❌ `Supporters.jsx` - Rename to `Contacts.jsx`
- ❌ Any UI using "Supporters" terminology

### Fields
- ❌ `EventAttendee.orgMemberId` - Use `contactId` instead
- ❌ Any reference to "supporterId" - Use `contactId` instead

---

## ✅ CURRENT ARCHITECTURE (Day 200)

### The Three-Model System

**1. Contact (Universal Person)**
- Everyone starts here
- Minimal: firstName, lastName, email, phone
- Links to: EventAttendee, OrgMember, Admin

**2. OrgMember (Optional - CRM Master List)**
- Extended CRM data (address, tags, engagement, etc.)
- Links to Contact via `contactId`
- NOT deprecated! Still the master CRM list

**3. Admin (Optional - App User)**
- Login permissions
- Links to Contact via `contactId`

### EventAttendee
- Uses `contactId` (NOT `orgMemberId` or `supporterId`)
- Tracks `currentStage` directly (no EventPipeline model)
- Tracks `audienceType` directly

---

## 🔄 MIGRATION NEEDED

### Backend Routes
1. **Create:** `GET /orgs/${orgId}/contacts`
   - Returns all Contacts for org
   - Includes OrgMember data if exists
   - Includes EventAttendee data if exists

2. **Create:** `GET /contacts/:contactId/profile`
   - Returns Contact + OrgMember + EventAttendees + Admin
   - Single endpoint for contact detail page

3. **Deprecate:** `/orgs/${orgId}/supporters`
   - Keep for backward compat temporarily
   - Log deprecation warning

### Frontend Pages
1. **Rename:** `Supporters.jsx` → `Contacts.jsx`
2. **Update:** `ContactDetail.jsx` to show card-based layout:
   - Contact Card (always)
   - Events Card (EventAttendees)
   - OrgMember Card (if exists)
   - Elevate Button (if no OrgMember)

### Database Cleanup
1. **Keep:** `OrgMember` model (it's the CRM master list!)
2. **Remove:** `Supporter` model (truly deprecated)
3. **Remove:** `EventPipelineEntry` model (use EventAttendee.currentStage)

---

## 📝 Source of Truth

**READ THIS:** `docs/CONTACT-ADMIN-ARCHITECTURE.md`

This is the CURRENT, CORRECT architecture as of Day 200.

**IGNORE:** `docs/SCHEMA.md` (outdated, references old Supporter model)

---

## 🎯 What to Build Next

1. **Backend:** Create `contactsRoute.js` 
   - `GET /orgs/${orgId}/contacts` - List all contacts
   - `GET /contacts/:contactId/profile` - Contact detail with all relations

2. **Frontend:** Update `Contacts.jsx` (renamed from Supporters)
   - Call new `/contacts` endpoint
   - Display Contact data with OrgMember enrichment

3. **Frontend:** Rebuild `ContactDetail.jsx`
   - Card-based layout
   - Show Contact + Events + OrgMember
   - "Elevate to Org Member" button

4. **Deprecation:** Add warnings to old routes
   - Log when `/supporters` is called
   - Return deprecation notice in response

