# 🗺️ ORG MEMBER JOURNEY - PROPER ARCHITECTURE

**Status:** 🚧 TO BE BUILT  
**Current:** Pipeline display shows "Coming Soon"

---

## The Problem

We have **TWO different journeys** getting confused:

### 1. Event Journey (EXISTS)
```
Contact.currentStage = 'rsvped' | 'attended' | 'paid'
```
- This is for EVENT funnels
- Tracks: Did they RSVP? Did they attend? Did they pay?
- Short-term (per event)

### 2. Org Member Journey (NEEDS TO BE BUILT)
```
OrgMemberJourney.stage = 'unaware' | 'curious' | 'activated' | 'engaged' | 'champion' | 'alumni'
```
- This is for ORG relationship over TIME
- Tracks: How deep is their connection to the org?
- Long-term (lifetime relationship)

**These are DIFFERENT and shouldn't use the same field!**

---

## Proposed Architecture

### New Junction Table: OrgMemberJourney

```prisma
model OrgMemberJourney {
  id          String   @id @default(cuid())
  contactId   String
  contact     Contact  @relation(fields: [contactId], references: [id])
  orgId       String
  org         Organization @relation(fields: [orgId], references: [id])
  
  // The 6-stage journey
  journeyStage JourneyStage @default(UNAWARE)
  
  // Tracking
  enteredStageAt DateTime @default(now())
  lastActivityAt DateTime @default(now())
  
  // Metadata
  notes       String?
  tags        String[] @default([])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([contactId, orgId])  // One journey per contact per org
  @@index([orgId, journeyStage])
  @@index([contactId])
}

enum JourneyStage {
  UNAWARE      // 👀 Never heard of you
  CURIOUS      // 🤔 Aware, considering
  ACTIVATED    // ⚡ Took first action (attended event, signed up)
  ENGAGED      // 🔥 Participating repeatedly
  CHAMPION     // 👑 Leading, multiplying, donating
  ALUMNI       // 💤 Dormant (90+ days no activity)
}
```

---

## Why This Approach?

### 1. Separation of Concerns
- **Event stages** = short-term funnel (Contact.currentStage)
- **Org journey** = long-term relationship (OrgMemberJourney.journeyStage)

### 2. Type Safety
- Enum prevents typos ("engagd" vs "engaged")
- Database enforces valid values
- Frontend gets autocomplete

### 3. Historical Tracking
- `enteredStageAt` - When they moved to this stage
- `lastActivityAt` - Most recent interaction
- Can track stage transitions over time

### 4. Multi-Org Support
- Junction table supports one person in multiple orgs
- Each org relationship tracked separately
- Person can be "Champion" in Org A, "Curious" in Org B

---

## How It Works

### Creating Journey Record

When someone becomes an org member:

```javascript
// Option 1: First event attendance
POST /api/events/:eventId/attendees
→ Creates Contact with eventId
→ Creates OrgMemberJourney with stage: ACTIVATED

// Option 2: Direct org member add (CSV, manual)
POST /api/org-members/upload
→ Creates Contact with orgId
→ Creates OrgMemberJourney with stage: CURIOUS or ACTIVATED

// Option 3: Form submission
POST /api/forms/submit
→ Creates Contact
→ Creates OrgMemberJourney based on form's targetJourneyStage
```

### Advancing Stages

```javascript
// Manual advancement
PATCH /api/org-member-journey/:id
{ journeyStage: 'ENGAGED' }

// Auto-advancement rules (future)
- Attended 2+ events → ENGAGED
- Brought a friend → CHAMPION
- No activity 90 days → ALUMNI
- Made donation → CHAMPION
```

### Querying Pipeline

```javascript
// Get all members at a stage
GET /api/org-member-journey?orgId=xxx&journeyStage=ENGAGED

// Get pipeline distribution
GET /api/org-member-journey/pipeline?orgId=xxx
{
  "unaware": 12,
  "curious": 34,
  "activated": 89,
  "engaged": 156,
  "champion": 23,
  "alumni": 45
}
```

---

## Migration from Current State

### Current Reality:
- Contact has `currentStage` (event-specific)
- Contact has `orgId` (org relationship exists)
- NO journey tracking table

### Migration Path:

```sql
-- 1. Create OrgMemberJourney for all contacts with orgId
INSERT INTO "OrgMemberJourney" ("contactId", "orgId", "journeyStage")
SELECT 
  id as "contactId",
  "orgId",
  CASE 
    WHEN "currentStage" IN ('attended', 'followed_up') THEN 'ENGAGED'
    WHEN "currentStage" IN ('rsvped', 'soft_commit') THEN 'ACTIVATED'
    WHEN "currentStage" IN ('personal_invite', 'expressed_interest') THEN 'CURIOUS'
    ELSE 'UNAWARE'
  END as "journeyStage"
FROM "Contact"
WHERE "orgId" IS NOT NULL;

-- 2. Set lastActivityAt based on updatedAt
UPDATE "OrgMemberJourney"
SET "lastActivityAt" = c."updatedAt"
FROM "Contact" c
WHERE "OrgMemberJourney"."contactId" = c.id;
```

---

## Frontend UX (Future)

### Engage Dashboard

```
WHERE YOUR MEMBERS ARE RIGHT NOW
Total: 359 members

[Click each stage to see list]

👀 Unaware  🤔 Curious  ⚡ Activated  🔥 Engaged  👑 Champion  💤 Alumni
   12         34         89          156         23           45

TOOLS TO MOVE THEM FORWARD
[✉️ Email] [💪 Challenges] [🎥 Stories]
```

### Contact Detail Page

```
Contact: John Smith
Org Journey: 🔥 ENGAGED (for 45 days)

[Move to Champion →]
```

---

## Rules for Advancement

### Auto-Advancement Logic (Future)

```javascript
// Triggered by actions:
events: {
  'first_event_attended': { from: 'CURIOUS', to: 'ACTIVATED' },
  'second_event_attended': { from: 'ACTIVATED', to: 'ENGAGED' },
  'brought_friend': { from: 'ENGAGED', to: 'CHAMPION' },
  'made_donation': { from: any, to: 'CHAMPION' },
  'no_activity_90_days': { from: any, to: 'ALUMNI' }
}
```

---

## Current Status

**Built:**
- ❌ Nothing (pipeline shows "Coming Soon")

**Needed:**
- OrgMemberJourney model
- JourneyStage enum
- Routes (create, update, query)
- Auto-advancement rules
- Frontend pipeline display
- Contact detail journey widget

**Priority:** Medium (nice to have, not blocking)

---

**For now: Templates work. Pipeline comes later when data model is ready.** 🎯

