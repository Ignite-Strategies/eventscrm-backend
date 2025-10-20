# 🏗️ MODEL ARCHITECTURE - ACTUAL SOURCE OF TRUTH

**Last Updated:** October 18, 2025  
**Status:** ✅ Contact-First Architecture (Active)

---

## CRITICAL UNDERSTANDING

### What is an "Org Member"?

**Org Member** is NOT a separate table (that's legacy/deprecated).  
**Org Member** = A Contact that has an `orgId`.

```javascript
// An org member is just:
const orgMembers = await prisma.contact.findMany({
  where: { 
    containerId,
    orgId  // ← This makes them an "org member"
  }
});

// NOT this (field doesn't exist):
where: { isOrgMember: true }  // ❌ WRONG! No such field!
```

---

## The Data Model (Actual Schema)

### Container (Top-Level Isolation)

```prisma
model Container {
  id          String @id @default(cuid())
  name        String
  slug        String @unique
  description String?
}
```

**Purpose:** Multi-tenant isolation boundary  
**Current:** One container (cmgu7w02h0000ceaqt7iz6bf9)  
**Future:** Can scale to multiple independent deployments

---

### Organization

```prisma
model Organization {
  id      String @id @default(cuid())
  name    String
  slug    String @unique
  mission String?
  
  contacts Contact[]  // ← One org can have many contacts
}
```

**Purpose:** The org (F3 Capital, etc.)  
**Relationship:** One-to-Many with Contact

---

### Contact (THE UNIVERSAL PERSON RECORD)

```prisma
model Contact {
  id    String @id @default(cuid())
  email String @unique  // 🔥 ONLY REQUIRED FIELD
  
  // Personhood
  firstName String?
  lastName  String?
  phone     String?
  // ... all personal details
  
  // Relationships
  containerId String?  // ⚠️ Required for isolation
  orgId       String?  // ← If this exists, they're an "org member"
  eventId     String?  // If they're at a specific event
  
  // Journey tracking
  currentStage String?  // ← Their journey stage (curious, activated, etc.)
  audienceType String?  // How they entered (org_members, landing_page_public, etc.)
}
```

**Key Fields:**
- `email` - The unique identifier
- `containerId` - Tenant isolation (MUST filter by this!)
- `orgId` - If set → they're an org member
- `currentStage` - Where they are in journey (👈 THIS is what pipeline shows!)

**Org Member Logic:**
```javascript
// Query org members:
Contact.findMany({ where: { containerId, orgId } })

// Query event attendees:
Contact.findMany({ where: { containerId, eventId } })

// Query org members at a specific stage:
Contact.findMany({ where: { containerId, orgId, currentStage: 'engaged' } })
```

---

### OrgMember (LEGACY/DEPRECATED)

```prisma
model OrgMember {
  id        String @id
  contactId String?  // LEGACY - not used in new Contact-first model
  orgId     String?
  
  // Extended CRM data (optional)
  yearsWithOrganization Int?
  leadershipRole        String?
  notes                 String?
}
```

**Status:** ⚠️ LEGACY - Being phased out  
**Purpose:** Used to be junction table, now Contact.orgId handles it  
**Current Use:** Some legacy routes might still reference it

---

## Data Flow Patterns

### Pattern 1: Query Org Members

```javascript
// ✅ CORRECT
const orgMembers = await prisma.contact.findMany({
  where: {
    containerId,  // ⚠️ ALWAYS filter by container!
    orgId         // Has orgId = is org member
  }
});

// ❌ WRONG
const orgMembers = await prisma.orgMember.findMany({...});  // Legacy table!
const orgMembers = await prisma.contact.findMany({
  where: { isOrgMember: true }  // Field doesn't exist!
});
```

### Pattern 2: Query by Journey Stage

```javascript
// ✅ CORRECT
const engagedMembers = await prisma.contact.findMany({
  where: {
    containerId,
    orgId,
    currentStage: 'engaged'  // Or 'curious', 'activated', etc.
  }
});
```

### Pattern 3: Count Pipeline Distribution

```javascript
// ✅ CORRECT
const contacts = await prisma.contact.findMany({
  where: { containerId, orgId },
  select: { currentStage: true }
});

// Count by stage
const counts = {
  curious: contacts.filter(c => c.currentStage === 'curious').length,
  activated: contacts.filter(c => c.currentStage === 'activated').length,
  // etc...
};
```

---

## Journey Stages (currentStage Values)

### Actual Values in Database

From event pipelines, these are the stages stored in `Contact.currentStage`:

```
- general_awareness
- personal_invite
- expressed_interest
- rsvped
- soft_commit
- attended
- followed_up
- paid
- thanked_paid
```

### Journey Stage Mapping

To show in the 6-stage member journey, map like this:

```javascript
const stageMapping = {
  unaware: ['general_awareness'],
  curious: ['personal_invite', 'expressed_interest'],
  activated: ['rsvped', 'soft_commit'],
  engaged: ['attended', 'followed_up'],
  champion: ['paid', 'thanked_paid'],
  alumni: [] // TBD - need to add this stage to system
};
```

**Problem:** We don't currently track "alumni" (dormant members)  
**Solution:** Add logic to mark contacts as alumni if no activity > 90 days

---

## Junction Tables (What Exists vs What's Used)

### What EXISTS in Schema:

1. **OrgMember** - LEGACY, not used in Contact-first
2. **EventAttendee** - LEGACY, not used in Contact-first

### What's ACTUALLY USED:

**Contact fields directly:**
- `orgId` → Org relationship
- `eventId` → Event relationship
- `currentStage` → Journey position

**No junction tables needed** because Contact can store the relationship fields directly.

---

## Migration Status

### What We're Transitioning FROM:

```
Contact → OrgMember → Organization
Contact → EventAttendee → Event
```

### What We're Transitioning TO:

```
Contact (with orgId, eventId, currentStage directly)
```

### Current Reality:

**BOTH patterns exist right now!**
- Some contacts have data in Contact.orgId
- Some might still reference OrgMember table
- Need to check which pattern is actually being used in production

---

## Critical Rules

### ✅ DO THIS

```javascript
// 1. ALWAYS filter by container
where: { containerId, ...other }

// 2. Org member = has orgId
where: { orgId }  // Not isOrgMember!

// 3. Check currentStage for journey position
where: { currentStage: 'engaged' }

// 4. Use Contact table, not junction tables
prisma.contact.findMany()  // Not orgMember or eventAttendee
```

### ❌ DON'T DO THIS

```javascript
// 1. Don't invent fields
where: { isOrgMember: true }  // Doesn't exist!

// 2. Don't skip container filter
where: { orgId }  // Missing containerId = data leak!

// 3. Don't use legacy tables
prisma.orgMember.findMany()  // Legacy!

// 4. Don't hardcode values
const pipeline = { unaware: 12, curious: 34 }  // Query the DB!
```

---

## What Needs Clarification

### Questions to Answer:

1. **Is OrgMember table still being used?**  
   - If YES → need migration plan
   - If NO → can delete it from schema

2. **How do we mark alumni/dormant?**  
   - Need a `lastActivityDate` field?
   - Cron job to auto-mark?
   - Manual tagging?

3. **What stages are ACTUALLY in use?**  
   - Run query: `SELECT DISTINCT currentStage FROM Contact`
   - Document actual values, not assumptions

4. **Is containerId actually populated?**  
   - Check: `SELECT COUNT(*) FROM Contact WHERE containerId IS NULL`
   - If many nulls → forms are broken (we knew this!)

---

## Next Steps

1. **Run diagnostic queries** to see actual data
2. **Fix pipeline route** to not use isOrgMember
3. **Test Engage page** with real data
4. **Document findings** here

---

**Stop building, start understanding.** 🎯

