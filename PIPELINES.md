# Pipeline Architecture - Current State

## 🎯 MVP1 Reality Check

**What's Live:** Single pipeline for `org_members` audience type  
**What's Planned:** Multiple audience pipelines (friends_family, community_partners, etc.)  
**Focus Now:** Get org_members pipeline working perfectly before expanding

---

## 📊 The 7-Stage Funnel (Current System)

```
Stage 1: in_funnel
  ↓ (aware of event, haven't engaged yet)
  
Stage 2: general_awareness
  ↓ (opened email, viewed landing page)
  
Stage 3: personal_invite
  ↓ (received personal outreach, text, call)
  
Stage 4: expressed_interest
  ↓ (clicked interested, asked questions)
  
Stage 5: soft_commit
  ↓ (filled RSVP form, said "I'm coming")
  
Stage 6: paid
  ↓ (completed payment/registration)
  
Stage 7: cant_attend
    (opted out, but can re-engage later)
```

---

## 🔄 How People Enter & Move

### Entry Points
**1. Auto-Populate on Event Creation**
- All existing OrgMembers → EventAttendees at `in_funnel`
- Service: `populateEventPipeline()`

**2. Landing Page Soft Commit Form**
- New/existing contact → EventAttendee at `soft_commit`
- Route: `POST /api/public/events/:eventSlug/soft-commit`

**3. CSV Import (Future)**
- Upload contacts → Create OrgMembers → Add to event pipeline
- Route: `POST /api/orgs/:orgId/org-members/csv`

**4. Manual Add (Planned)**
- Admin adds individual → EventAttendee at `in_funnel`
- Route: `POST /api/events/:eventId/attendees`

### Stage Progression Rules

**Forward Movement (Always Allowed):**
```javascript
in_funnel → general_awareness → ... → paid ✅
soft_commit → paid ✅
```

**Backward Movement (BLOCKED):**
```javascript
paid → soft_commit ❌ (Don't downgrade)
soft_commit → in_funnel ❌ (Don't downgrade)
```

**Re-Engagement (Special Case):**
```javascript
cant_attend → soft_commit ✅ (Changed their mind!)
cant_attend → in_funnel ✅ (Re-engaged for different event)
```

---

## 🗂️ Data Models

### EventAttendee - The Pipeline Record
```javascript
{
  id: "ea123",
  orgId: "org456",
  eventId: "evt789",
  orgMemberId: "om111",  // Link to master contact
  
  // PIPELINE DATA:
  stage: "soft_commit",           // Current funnel position
  audienceType: "org_members",    // MVP1: always "org_members"
  
  // EVENT-SPECIFIC DATA:
  attended: false,
  amountPaid: 0,
  ticketType: null,
  notes: '{"likelihood":"definitely","party_size":2}',
  
  createdAt: "2024-10-15T10:00:00Z",
  updatedAt: "2024-10-16T14:30:00Z"
}
```

### OrgMember - Master Contact (Reference Only)
```javascript
{
  id: "om111",
  orgId: "org456",
  
  // PERMANENT CONTACT INFO:
  firstName: "John",
  lastName: "Smith",
  email: "john@example.com",
  phone: "(555) 555-5555",
  
  // Not used in pipeline logic (just for display):
  tags: ["Board", "VIP"],
  categoryOfEngagement: "high"
}
```

**Key Concept:** You work with EventAttendee records in the pipeline. OrgMember is just the permanent contact card.

---

## 🚫 Deprecation Warnings

### Old 5-Stage System (DO NOT USE)
```
❌ sop_entry
❌ rsvp  
❌ attended
❌ champion
```

**Found in:**
- `prisma/schema.prisma` - `pipelineDefaults` field (needs update)
- Some old MongoDB models (ignore these)
- CRMDEVGUIDE.md (old doc)

**If you see these stages in code:** Update them to the 7-stage system!

### Supporter Model (DO NOT USE)
- Old MongoDB model
- **REPLACED BY:** OrgMember (Prisma)
- Some services still reference it (needs cleanup)

### EventPipelineEntry (DO NOT USE)
- Old MongoDB model
- **REPLACED BY:** EventAttendee (Prisma)
- Some services still reference it (needs cleanup)

---

## 📍 Current Implementation Status

### ✅ Implemented
- [x] OrgMember model (Prisma)
- [x] EventAttendee model (Prisma)
- [x] Event creation with auto-populate pipeline
- [x] Public soft commit form endpoint
- [x] Smart stage progression (no downgrades)
- [x] 7-stage hierarchy enforcement

### 🚧 In Progress
- [ ] CSV upload for bulk OrgMember creation
- [ ] Link CSV import to event (auto-create EventAttendees)
- [ ] Frontend EventPipelines UI (Kanban board)
- [ ] Drag & drop stage management

### 📋 Planned (Post-MVP1)
- [ ] Multiple audience pipelines (friends_family, etc.)
- [ ] Email automation triggers
- [ ] Payment webhook integration
- [ ] Check-in system (attended tracking)
- [ ] Champion scoring/tags

---

## 🎯 MVP1 Scope

**What We're Building:**
```
OrgMember (master contacts)
    ↓
Event Creation → Auto-populate pipeline
    ↓
EventAttendee records (all at "in_funnel")
    ↓
Landing page soft commit → Move to "soft_commit"
    ↓
Manual stage progression in UI
    ↓
Payment → Move to "paid"
    ↓
Event happens → Track attendance
```

**What We're NOT Building (Yet):**
- Multiple audience type pipelines
- Complex automation rules
- Email campaign integration
- Advanced analytics
- Mobile check-in app

---

## 🔍 Finding Pipeline Data

### Get All Attendees for an Event
```javascript
const attendees = await prisma.eventAttendee.findMany({
  where: { eventId: "evt123" },
  include: {
    orgMember: {
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true
      }
    }
  },
  orderBy: { createdAt: 'desc' }
});
```

### Get Attendees by Stage
```javascript
const softCommits = await prisma.eventAttendee.findMany({
  where: { 
    eventId: "evt123",
    stage: "soft_commit"
  },
  include: { orgMember: true }
});
```

### Count by Stage (Funnel Stats)
```javascript
const stats = {
  in_funnel: await prisma.eventAttendee.count({ where: { eventId, stage: "in_funnel" }}),
  general_awareness: await prisma.eventAttendee.count({ where: { eventId, stage: "general_awareness" }}),
  personal_invite: await prisma.eventAttendee.count({ where: { eventId, stage: "personal_invite" }}),
  expressed_interest: await prisma.eventAttendee.count({ where: { eventId, stage: "expressed_interest" }}),
  soft_commit: await prisma.eventAttendee.count({ where: { eventId, stage: "soft_commit" }}),
  paid: await prisma.eventAttendee.count({ where: { eventId, stage: "paid" }}),
  cant_attend: await prisma.eventAttendee.count({ where: { eventId, stage: "cant_attend" }})
};
```

---

## 🧹 Cleanup Needed

**Files with Deprecated Code:**
1. `services/eventPipelineService.js` - Uses old Supporter/EventPipelineEntry models
2. `models/Supporter.js` - MongoDB model (should use OrgMember)
3. `models/EventPipelineEntry.js` - MongoDB model (should use EventAttendee)
4. `prisma/schema.prisma` - Line 33: pipelineDefaults has old 5-stage system

**Action Items:**
- [ ] Update pipelineDefaults in Prisma schema to 7-stage system
- [ ] Migrate eventPipelineService to use EventAttendee instead of EventPipelineEntry
- [ ] Mark old models as deprecated with comments
- [ ] Create migration guide for anyone using old system

---

## 📝 Summary

**Current Reality:**
- 7-stage funnel (not 5)
- OrgMember (not Supporter)
- EventAttendee (not EventPipelineEntry)
- Single org_members pipeline (not multiple audience types yet)
- Auto-populate on event creation
- Smart stage progression (no downgrades)

**If you're implementing a feature:**
1. Use EventAttendee as your working model
2. Use the 7 stages listed above
3. Don't reference Supporter or EventPipelineEntry
4. Focus on org_members audience type only
5. Consult EVENTS.md for overall architecture

**If you see deprecated code:**
1. Note it in comments
2. Add to cleanup backlog
3. Don't build new features on top of it
4. Use the current Prisma-based system instead

