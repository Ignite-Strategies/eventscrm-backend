# 🔥 SACRED SQL PATTERNS - NEVER FORGET! 🔥

## ⚠️ CRITICAL DATABASE KNOWLEDGE ⚠️

### 🚨 THE CONTACT TABLE DOES NOT HAVE ORGID! 🚨

**WRONG:**
```sql
SELECT c."orgId" as "contactOrgId"  -- ❌ Contact table has NO orgId field!
```

**CORRECT:**
```sql
SELECT ea."orgId" as "contactOrgId"  -- ✅ EventAttendee table HAS orgId field!
```

### 🎯 WORKING SQL PATTERN FOR EVENT ATTENDEES + CONTACTS

**THIS IS THE SACRED QUERY - COPY THIS EXACTLY:**

```sql
SELECT 
  ea.id as "attendeeId",
  ea."eventId",
  ea."contactId",
  ea."currentStage",
  ea."audienceType", 
  ea."attended",
  ea."createdAt",
  c.id as "contactId",
  c."firstName",
  c."lastName", 
  c.email,
  c.phone,
  ea."orgId" as "contactOrgId",  -- ✅ EventAttendee has orgId, Contact does NOT!
  c."orgMemberId",
  CASE 
    WHEN c."orgMemberId" IS NOT NULL THEN 'org_member'
    ELSE 'external_contact'
  END as "actualType"
FROM "EventAttendee" ea
LEFT JOIN "Contact" c ON ea."contactId" = c.id
WHERE ea."eventId" = ${eventId}
ORDER BY ea."createdAt" DESC
```

### 📋 DATABASE SCHEMA TRUTH

**Contact Table Fields:**
- ✅ `id` (String, Primary Key)
- ✅ `firstName` (String)
- ✅ `lastName` (String) 
- ✅ `email` (String, Unique)
- ✅ `phone` (String?)
- ✅ `orgMemberId` (String?) - Links to OrgMember
- ❌ **NO `orgId` field!**

**EventAttendee Table Fields:**
- ✅ `id` (String, Primary Key)
- ✅ `orgId` (String) - Organization ID
- ✅ `eventId` (String) - Event ID
- ✅ `contactId` (String) - Links to Contact
- ✅ `currentStage` (String)
- ✅ `audienceType` (String)
- ✅ `attended` (Boolean)

### 🎯 WHEN TO USE WHICH TABLE

**For Contact Data:** Use `Contact` table
**For Organization Context:** Use `EventAttendee.orgId` or `OrgMember.orgId`
**For Event Context:** Use `EventAttendee.eventId`

### 🔥 SACRED RULES

1. **NEVER use `c.orgId`** - Contact table doesn't have it!
2. **ALWAYS use `ea.orgId`** - EventAttendee has the org context
3. **Contact is generic** - can be promoted to OrgMember later
4. **EventAttendee is event-specific** - has orgId and eventId
5. **JOIN Contact + EventAttendee** - get both contact details AND event context

### 📍 LOCATIONS OF WORKING CODE

**✅ WORKING EXAMPLE:** `routes/pipelineHydrationRoute.js` (lines 40-58)
**✅ WORKING EXAMPLE:** `routes/eventAttendeesRoute.js` (lines 19-43) - FIXED

### 🚨 NEVER FORGET

- Contact table = generic contact data (no orgId)
- EventAttendee table = event-specific data (has orgId, eventId)
- To get contact + event context = JOIN both tables
- Use `ea.orgId` NOT `c.orgId`

---

**This document is SACRED. Read it before writing ANY SQL queries involving Contact or EventAttendee tables!**
