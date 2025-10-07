# Events - The Lifeblood of the System

## 🎯 Core Philosophy

**Events are the central organizing principle.** Everything flows through events:
- OrgMembers exist permanently in your master contact list
- Events are created to engage those contacts
- EventAttendees track each person's journey through each specific event

---

## 📊 The Three-Model System

### 1. **OrgMember** - Sacred Master Contact List
**What it is:** Permanent record of every person in your universe

**Purpose:**
- Single source of truth for contact information
- Persists across all events forever
- Can have multiple roles: app users, contacts, team members

**Key Concept:** OrgMembers are **organization-scoped**, not event-scoped

**Example:**
```javascript
OrgMember {
  id: "cm123",
  orgId: "cm456",
  firstName: "John",
  lastName: "Smith",
  email: "john@example.com",
  phone: "(555) 555-5555",
  role: null, // Not an app user, just a contact
  tags: ["Board", "VIP"],
  categoryOfEngagement: "high"
}
```

**Relationships:**
- Belongs to ONE Organization
- Can be linked to MANY EventAttendees (one per event)

---

### 2. **Event** - The Container
**What it is:** A specific event/fundraiser/gathering

**Purpose:**
- Event details (name, date, venue, cost)
- Fundraising goals and targets
- Pipeline configuration
- Task management

**Key Fields:**
```javascript
Event {
  id: "evt123",
  orgId: "cm456",
  name: "Bros & Brews 2024",
  slug: "brosandbrews",
  date: "2024-10-23",
  time: "6:00 PM - 9:00 PM",
  
  // Venue (embedded, not relational)
  eventVenueName: "Port City Brewing",
  eventStreet: "123 Brewery Ln",
  eventCity: "Alexandria",
  eventState: "VA",
  eventZip: "22314",
  
  // Ticketing
  hasTickets: true,
  ticketCost: 25.00,
  
  // Goals
  fundraisingGoal: 5000.00,
  ticketTarget: 100,
  
  // Pipeline (inherits from org defaults)
  pipelines: ["in_funnel", "soft_commit", "paid", "attended"]
}
```

**Relationships:**
- Belongs to ONE Organization
- Has MANY EventAttendees (the people invited/attending)
- Has MANY EventTasks (todo list for organizing)

---

### 3. **EventAttendee** - Per-Event Pipeline Tracking
**What it is:** Links an OrgMember to a specific Event with pipeline tracking

**Purpose:**
- Track each person's journey through THIS event's funnel
- Event-specific data (RSVP, payment, attendance)
- Pipeline stage progression

**Key Concept:** Same OrgMember can have MULTIPLE EventAttendee records (one per event they're invited to)

**Example:**
```javascript
// John Smith is invited to 3 events

EventAttendee {
  id: "ea1",
  orgMemberId: "cm123", // John Smith
  eventId: "evt_brosbrews",
  stage: "paid",
  audienceType: "org_members",
  attended: true,
  amountPaid: 25.00,
  notes: "Brought spouse"
}

EventAttendee {
  id: "ea2",
  orgMemberId: "cm123", // Same John Smith
  eventId: "evt_golf",
  stage: "soft_commit",
  audienceType: "friends_family",
  attended: false,
  amountPaid: 0
}

EventAttendee {
  id: "ea3",
  orgMemberId: "cm123", // Same John Smith
  eventId: "evt_gala",
  stage: "in_funnel",
  audienceType: "org_members",
  attended: false,
  amountPaid: 0
}
```

**Relationships:**
- Links ONE OrgMember to ONE Event
- Unique constraint: `(eventId, orgMemberId)` - can't add same person twice to same event

---

## 🔄 Complete Event Lifecycle

### Phase 1: Event Creation
```
User → Dashboard → "Create Event"
  ↓
EventCreate.jsx → Form (name, date, venue, tickets)
  ↓
POST /api/orgs/:orgId/events
  ↓
Event created in database
```

**Result:** Empty event shell exists, no attendees yet

---

### Phase 2: Inviting People to Event

There are **multiple ways** to add people to an event:

#### Option A: Select from Existing OrgMembers
```
User → EventPipelines page → "Add People"
  ↓
Select existing OrgMembers from list
  ↓
POST /api/events/:eventId/attendees/bulk
  ↓
Creates EventAttendee records:
  - eventId = current event
  - orgMemberId = selected person
  - stage = "in_funnel"
  - audienceType = "org_members"
```

#### Option B: CSV Import (Creates OrgMembers + EventAttendees)
```
User → Upload CSV file
  ↓
POST /api/orgs/:orgId/org-members/csv
  ↓
1. Parse CSV
2. Create new OrgMembers (or update existing)
3. Optionally: Link to event by creating EventAttendees
```

#### Option C: Landing Page Self-Add (Soft Commit Form)
```
Public user → Fills out soft commit form on landing page
  ↓
POST /api/public/events/:eventSlug/soft-commit
  ↓
1. Find or create OrgMember
2. Find or create EventAttendee
3. Set stage = "soft_commit" (if not already further along)
```

#### Option D: Manual Individual Add
```
User → Event detail page → "Add Person"
  ↓
Create or select OrgMember
  ↓
Create EventAttendee linking them to this event
```

---

### Phase 3: Pipeline Management

**Pipeline Stages (7-Stage Funnel - Current System):**
```
1. in_funnel            ← Auto-populated when event created
   ↓
2. general_awareness    ← Opened email, viewed landing page
   ↓
3. personal_invite      ← Received personal outreach
   ↓
4. expressed_interest   ← Clicked interested, engaged with content
   ↓
5. soft_commit          ← Landing page form brings people here
   ↓
6. paid                 ← Payment webhook advances to here
   ↓
7. cant_attend          ← Special stage, can re-engage back to funnel
```

**Note:** "Champion" is NOT a stage - it's tracked via tags/engagement scoring separately.

**MVP1 Focus:** `org_members` audience type only. Future pipelines (friends_family, community_partners, etc.) not implemented yet.

**Moving People Through Stages:**
- Manual drag & drop (planned UI)
- Automated triggers:
  - Payment webhook → `paid`
  - Form submission → `soft_commit`
  - Email open → `general_awareness`
- Bulk operations (select multiple, move stage)

**Stage Rules:**
- ✅ Can move forward at any time
- ⚠️ Should NOT move backward (don't downgrade paid → soft_commit)
- ✅ Can re-engage from `cant_attend` back to any earlier stage

**⚠️ DEPRECATION WARNING:**
Old 5-stage system: `["sop_entry", "rsvp", "paid", "attended", "champion"]`  
**REPLACED BY** 7-stage system above. If you see old stages in code, they need updating.

---

## 🎨 Frontend Pages

### Events.jsx
- List all events for this org
- Quick stats (attendees, revenue)
- Create new event button

### EventCreate.jsx
- Form: name, date, venue, tickets, goals
- Creates Event record

### EventDetail.jsx (Planned)
- Event overview
- Quick actions (add people, send email)
- Navigate to sub-pages

### EventPipelines.jsx
- Kanban board view (stages as columns)
- Drag & drop to move stages
- Filter by audience type
- Add people to event
- Bulk operations

### EventTasks.jsx
- Asana-style task list
- Categorized (design, marketing, logistics, etc.)
- Assign to team members

---

## 🔑 Key Concepts

### OrgMember vs EventAttendee
**OrgMember = WHO they are (permanent)**
- Name, email, phone, address
- Role in organization
- Engagement history across ALL events

**EventAttendee = Their relationship to THIS EVENT (temporary)**
- Pipeline stage for this specific event
- RSVP status, payment, attendance
- Event-specific notes

### Why This Separation?
```
John Smith (OrgMember):
- VIP donor
- High engagement
- Board member

John's Event History (EventAttendee records):
- Golf 2023: Paid $100, attended, brought 2 guests → "champion"
- Gala 2024: Paid $200, attended → "paid"
- Bros & Brews 2024: Soft commit → "soft_commit"
```

**Without this separation:**
- You'd lose historical event data
- Can't track per-event engagement
- Can't have different pipeline stages per event

---

## 🚀 API Routes

### Event CRUD
- `POST /api/orgs/:orgId/events` - Create event
- `GET /api/orgs/:orgId/events` - List events for org
- `GET /api/events/:eventId` - Get single event
- `PATCH /api/events/:eventId` - Update event
- `DELETE /api/events/:eventId` - Delete event

### Event Attendees
- `GET /api/events/:eventId/attendees` - List attendees for event
- `POST /api/events/:eventId/attendees` - Add person to event
- `POST /api/events/:eventId/attendees/bulk` - Add multiple people
- `PATCH /api/events/attendees/:attendeeId` - Update attendee (move stage)
- `DELETE /api/events/attendees/:attendeeId` - Remove from event

### Public Forms (No Auth)
- `POST /api/public/events/:eventSlug/soft-commit` - Landing page soft commit

### Event Tasks
- `GET /api/events/:eventId/tasks` - List tasks
- `POST /api/events/:eventId/tasks` - Create task
- `PATCH /api/events/tasks/:taskId` - Update task (mark complete)
- `DELETE /api/events/tasks/:taskId` - Delete task

---

## 💡 Common Scenarios

### Scenario 1: First Event for New Org
```
1. Import contacts via CSV
   → Creates OrgMembers
   
2. Create event "Golf Tournament"
   → Creates Event record
   
3. Add all OrgMembers to event
   → Creates EventAttendee records (stage: "in_funnel")
   
4. Send email campaign
   → Some click "Interested" → stage: "soft_commit"
   
5. Payment link sent
   → Some pay → stage: "paid"
   
6. Event day check-in
   → Mark as attended → stage: "attended"
```

### Scenario 2: Landing Page Self-Add
```
1. Event exists: "Bros & Brews"
2. Landing page has soft commit form
3. Stranger fills out form
   → Creates OrgMember (new contact!)
   → Creates EventAttendee (stage: "soft_commit")
4. Now they're in your CRM and event pipeline
```

### Scenario 3: Repeat Attendee
```
1. John Smith attended Golf 2023 (already in OrgMembers)
2. Create new event: "Gala 2024"
3. Add John to Gala
   → Creates NEW EventAttendee record
   → John now has 2 EventAttendee records (Golf + Gala)
4. Track his journey through Gala pipeline independently
```

---

## 🎯 MVP1 Status

**✅ Complete:**
- Event creation (basic details)
- OrgMember management
- EventAttendee model in Prisma
- Basic event listing

**🚧 In Progress:**
- CSV upload for OrgMembers
- Landing page soft commit integration
- EventPipelines UI (Kanban board)

**📋 Planned:**
- Bulk add OrgMembers to event
- Drag & drop pipeline management
- Email campaign integration
- Payment webhooks
- Analytics dashboard

---

## 🧠 Mental Model

Think of it like **event management software** + **CRM**:

**Your Organization:**
- Has a master contact list (OrgMembers)
- Runs multiple events per year

**Each Event:**
- Pulls people from master contact list
- Tracks their journey through THIS event's funnel
- Doesn't touch the master contact data

**After the Event:**
- EventAttendee records remain as historical data
- OrgMember records updated with engagement insights
- Create next event, repeat process

---

## 🔮 Future Enhancements

### Multi-Audience Pipelines
Different funnels for different audience types:
- Org Members (high conversion)
- Friends & Family (medium conversion)
- Cold outreach (low conversion)

### Pipeline Automation
- Auto-advance based on email opens
- Predictive scoring (who's likely to attend?)
- Automated follow-ups

### Event Templates
- Save successful event configs
- Clone events from previous years
- Reuse venues, tasks, email templates

### Cross-Event Analytics
- Track repeat attendance rates
- Lifetime value per OrgMember
- Best recruiting sources

---

## 📝 Summary

**Events are containers** that pull from your OrgMember master list and track engagement through EventAttendee records.

**Flow:**
1. Build OrgMember list (CSV import, forms, manual add)
2. Create Event
3. Link OrgMembers to Event via EventAttendees
4. Track pipeline progression
5. Event happens
6. Record final attendance
7. Repeat for next event

**Remember:** OrgMembers are sacred and permanent. EventAttendees are event-specific and track the journey.

---

## ⚠️ MVP1 Constraint: Single Active Event

**For MVP1, organizations can only have ONE active event at a time.**

**Event Status Field:**
- `draft` - Being planned, not live yet
- `upcoming` - Next event, main focus (ONLY ONE allowed)
- `active` - Happening now (event day)  
- `past` - Archived, historical only

**Business Rules:**
- Can only create new event if no `upcoming` or `active` events exist
- Creating new event auto-archives current event to `past`
- Can have unlimited `past` events (historical tracking)
- Can have multiple `draft` events (planning)

**UI Simplifications:**
- Dashboard shows THE event (no list/selection)
- Forms always for THE current event
- Pipeline management always for THE current event
- No "which event?" dropdowns needed

**Future Expansion:**
- Remove constraint when demand exists
- Multi-event dashboard view
- Event templates/cloning
- Team-based event separation

**See MVP1-CONSTRAINTS.md for full details and expansion plan.**

---

## 🚨 CRITICAL: Service Architecture Issues

**We have MULTIPLE services using DIFFERENT models causing pipeline failures!**

### The Problem
- **Event creation** calls `populateEventPipeline()` from `eventAttendeeService.js`
- **Service uses NEW models:** `OrgMember` + `EventAttendee` 
- **Service uses NEW fields:** `currentStage` (not `stage`)
- **Database might have OLD models:** `Supporter` + `EventPipelineEntry`

### Service Conflicts
1. **`eventAttendeeService.js`** - NEW system (✅ CURRENT)
2. **`eventPipelineService.js`** - OLD system (❌ DEPRECATED)
3. **`pipelineService.js`** - OLD 5-stage system (❌ DEPRECATED)

### Immediate Actions Required
1. **Check database reality** - What tables actually exist?
2. **Fix field names** - Use `currentStage` not `stage`
3. **Delete old services** - Remove deprecated code
4. **Test pipeline population** - Make sure it works

**See `SERVICES.md` for complete service documentation and cleanup guide.**

