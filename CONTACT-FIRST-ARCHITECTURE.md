# 🔥 CONTACT-FIRST ARCHITECTURE

## ⚠️ CRITICAL: Container is the TOP-LEVEL boundary!

```
┌───────────────────────────────────────────────────────────┐
│                      CONTAINER                            │
│            (Tenant/Namespace Isolation)                   │
│          cmgu7w02h0000ceaqt7iz6bf9                        │
│                                                           │
│  ⚠️ ALL QUERIES MUST FILTER BY containerId!              │
│  ⚠️ Without this = DATA LEAKAGE between orgs!            │
└───────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌──────────┐              ┌──────────┐
       │   Org    │              │  Event   │
       └──────────┘              └──────────┘
              │                         │
              └────────────┬────────────┘
                           ▼
           ┌─────────────────────────────────────┐
           │          CONTACT                    │
           │ (Universal Personhood - ONE Record) │
           │                                     │
           │ • containerId (REQUIRED!)           │
           │ • orgId, eventId                    │
           │ • firstName, lastName, email        │
           │ • phone, goesBy, address            │
           │                                     │
           │ ✅ ONE person = ONE Contact         │
           └─────────────────────────────────────┘
```

## What Changed

### ❌ OLD (Broken):
```prisma
model OrgMember {
  contactId String? @unique  // ❌ One Contact = One Org ONLY
  contact   Contact? @relation(...)
}

model Contact {
  orgMember OrgMember?  // ❌ Optional, one-to-one
}
```

**Problems:**
- Contact can only belong to ONE org
- Can't handle consultants, volunteers, donors across multiple orgs
- Breaks when trying to add same person to another org

### ✅ NEW (Fixed):
```prisma
model Contact {
  id String @id @default(cuid())
  
  // PERSONHOOD (universal)
  firstName String
  lastName  String
  email     String @unique
  // ... all personal details
  
  // RELATIONSHIPS
  orgMembers       OrgMember[]      // 🔥 ONE → MANY
  eventAttendees   EventAttendee[]  // 🔥 ONE → MANY
}

model OrgMember {
  id        String @id @default(cuid())
  contactId String  // 🔥 NO @unique!
  contact   Contact @relation(...)
  
  orgId String
  org   Organization @relation(...)
  
  // Org-specific ONLY
  yearsWithOrganization Int?
  leadershipRole String?
  notes String?
  
  @@unique([contactId, orgId])  // 🔥 Prevents duplicates
}
```

## The Three Models

### 1. 👤 Contact (Universal Personhood)
**Fields:**
- Identity: firstName, lastName, email, phone
- Personal: goesBy, birthday, married, spouseName, numberOfKids
- Location: street, city, state, zip
- Work: employer

**Rules:**
- ✅ ONE Contact per person (globally unique email)
- ✅ Never org-specific or event-specific
- ✅ The source of truth for WHO someone is

### 2. 🏢 OrgMember (Org Relationship)
**Fields:**
- Relationship: contactId, orgId
- Org-specific: yearsWithOrganization, leadershipRole, notes
- Engagement: engagementId (how engaged with THIS org)

**Rules:**
- ✅ One Contact can have MANY OrgMembers (multiple orgs)
- ✅ Composite unique: `[contactId, orgId]` prevents duplicates
- ✅ Only stores relationship to THIS org

### 3. 🎉 EventAttendee (Event Relationship)
**Fields:**
- Relationship: contactId, eventId, audienceType
- Event-specific: currentStage, attended, amountPaid
- Party details: spouseOrOther, howManyInParty

**Rules:**
- ✅ One Contact can have MANY EventAttendees (multiple events)
- ✅ Composite unique: `[contactId, eventId, audienceType]`
- ✅ Only stores relationship to THIS event

## Migration Required

### Breaking Changes:
1. `OrgMember.contactId` no longer `@unique`
2. `Contact.orgMember` changed to `Contact.orgMembers[]`

### Migration Steps:
```bash
# 1. Generate migration
npx prisma migrate dev --name contact-first-multi-org

# 2. This will:
#    - Drop unique constraint on OrgMember.contactId
#    - Update relation from one-to-one to one-to-many
#    - Add composite unique constraint on [contactId, orgId]
```

### Data Impact:
- ✅ Existing OrgMembers will work fine
- ✅ EventAttendees already use this pattern (no change needed)
- ✅ Can now add same Contact to multiple Orgs!

## Use Cases Now Possible

### Scenario 1: Multi-Org Consultant
```javascript
// Same person works with 3 organizations
Contact: { email: "john@example.com" }
  → OrgMember { contactId: "abc", orgId: "org1", role: "Consultant" }
  → OrgMember { contactId: "abc", orgId: "org2", role: "Advisor" }
  → OrgMember { contactId: "abc", orgId: "org3", role: "Board Member" }
```

### Scenario 2: Multi-Event Attendee
```javascript
// Same person attends 5 events
Contact: { email: "sarah@example.com" }
  → EventAttendee { contactId: "def", eventId: "event1", currentStage: "paid" }
  → EventAttendee { contactId: "def", eventId: "event2", currentStage: "rsvped" }
  → EventAttendee { contactId: "def", eventId: "event3", currentStage: "aware" }
  // ... etc
```

### Scenario 3: Cross-Org Volunteer
```javascript
// Volunteer at multiple chapters
Contact: { email: "mike@example.com", firstName: "Mike" }
  → OrgMember { contactId: "ghi", orgId: "f3-manhattan", yearsWithOrg: 3 }
  → OrgMember { contactId: "ghi", orgId: "f3-brooklyn", yearsWithOrg: 1 }
```

## API Updates Needed

### Backend Routes:
- ✅ `GET /api/orgmembers?orgId=xxx` - Already returns array
- ✅ `POST /api/orgmembers` - Creates OrgMember for Contact
- ⚠️ Need to update CSV upload to handle existing contacts

### Frontend Updates:
- ⚠️ Update any code expecting single `orgMember` to handle array
- ⚠️ Update CSV upload to check for existing Contact first

## Summary

**The Rule:**
```
CONTACT     = WHO they are (personhood, universal)
OrgMember   = Their relationship to AN org (many allowed)
EventAttendee = Their relationship to AN event (many allowed)
```

**No More:**
- ❌ "contactId must be unique"
- ❌ "One contact per org"
- ❌ "Can't add same person to multiple orgs"

**Now Possible:**
- ✅ Same person in multiple orgs
- ✅ Same person in multiple events
- ✅ Contact is the SINGLE source of truth
- ✅ Everything else is just relational metadata

