# Schema Refactoring TODO

## 🚨 CONFUSING FIELD NAMES TO FIX (Future Refactor)

### Event Model - `name` field is confusing

**Problem:**
- `Event.name` is the event's name (e.g., "Bros & Brews 2025")
- This conflicts with person names like `Contact.firstName`, `Contact.lastName`
- When reading code, "name" could mean a person OR an event - super confusing!

**Current Schema (schema.prisma lines 203-258):**
```prisma
model Event {
  id          String       @id @default(cuid())
  orgId       String
  name        String       ⚠️ CONFUSING - rename to eventName
  slug        String
  date        String?      ⚠️ CONFUSING - rename to eventDate
  time        String?      ⚠️ CONFUSING - rename to eventTime
  ...
}
```

**Proposed Fix:**
```prisma
model Event {
  id          String       @id @default(cuid())
  orgId       String
  eventName   String       ✅ CLEAR - it's the event's name
  slug        String
  eventDate   String?      ✅ CLEAR - it's the event's date
  eventTime   String?      ✅ CLEAR - it's the event's time
  ...
}
```

**Impact:**
- Need to update ALL files that use `event.name`, `event.date`, `event.time`
- Frontend pages: EventCreate, EventEdit, EventDashboard, OrgMembersUploadPreview, etc.
- Backend routes: eventsRoute.js, event validation services
- This is a LARGE refactor - don't do it until we have breathing room!

**Workaround for now:**
- Just use `event.name` and know it's the event name
- Add comments in code where it might be confusing
- Document it here so we remember to fix it later

---

## Other Naming Issues to Fix Later

### Contact Model - Missing Fields
- Should we have `Contact.contactName` or just rely on `firstName + lastName`?
- Actually, Contact is fine - it's clear that firstName/lastName are person names

### OrgMember Model - Relationship clarity
- `OrgMember.contactId` is clear
- `OrgMember.orgId` is clear
- No issues here

---

**Date Created:** October 15, 2025
**Status:** DOCUMENTED - Will refactor when we have time
**Priority:** Low (workaround is fine, just document in comments)

