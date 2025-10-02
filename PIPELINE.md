# Pipeline Hydration & Management

## Architecture

### Sacred Separation

**Supporter.js** - Master CRM (NEVER TOUCH)
- Single source of truth for all people in org
- Enduring record across all events forever
- Name, email, phone, donation history, tags
- Org needs this data permanently

**EventAttendee.js** - Event Pipeline (WORKING FUNNEL)
- Copied FROM supporters via service
- Working record for THIS event only
- Tracks stage progression (member → soft commit → paid)
- Audience type (org member, friend, partner, sponsor)
- Single source of truth for event participation

**eventPipelineService.js** - The Bridge
- Pushes supporters INTO event pipeline
- Creates EventAttendee records from Supporters
- Handles deduplication and errors

---

## Overview

The pipeline tracks a supporter's journey from awareness to attendance. We use a **HubSpot Deals-style view** with:
- **Multiple Pipelines** (one per audience type)
- **Horizontal Stages** (member → soft commit → paid)
- **Vertical Names** (attendees listed vertically in each stage)

---

## Pipeline Stages (Simplified)

```
Member → Soft Commit → Paid/Sign Up
```

### 1. Member
**Definition:** Supporter exists in org database, aware of event

**How they enter:**
- Already in org's Supporters table
- CSV import of org members
- Landing page form submission
- QR code scan at previous event
- Manual admin add

**Characteristics:**
- `stage: "member"`
- They know the event exists
- No commitment yet
- May or may not open emails

---

### 2. Soft Commit
**Definition:** Expressed intent to attend (RSVP'd)

**How they advance:**
- Clicked "I'm interested" on landing page
- Responded "Yes" to email invite
- Filled out RSVP form
- Verbal confirmation to admin

**Characteristics:**
- `stage: "soft_commit"`
- `rsvp: true`
- `rsvpDate: Date`
- Higher engagement score
- More likely to convert

---

### 3. Paid/Sign Up
**Definition:** Completed registration (payment or free signup)

**How they advance:**
- Stripe payment confirmed (for paid events)
- Completed free registration form (for free events)
- Comp ticket assigned by admin
- Sponsor ticket allocated

**Characteristics:**
- `stage: "paid"`
- `paid: true` (if monetary transaction)
- `amount: Number` (ticket price or $0 for free)
- `paymentDate: Date`
- Confirmed attendee

---

## HubSpot-Style Table View

### Table Structure

| Name | Email | Stage | RSVP | Amount | Source | Last Updated | Actions |
|------|-------|-------|------|--------|--------|--------------|---------|
| John Doe | john@example.com | Paid | ✓ | $50 | landing_form | 2 days ago | [View] [Edit] |
| Jane Smith | jane@example.com | Soft Commit | ✓ | - | csv | 5 days ago | [Nudge] [Edit] |
| Bob Wilson | bob@example.com | Member | - | - | admin_add | 1 week ago | [Email] [Edit] |

### Columns Explained

**Name**: Supporter's full name  
**Email**: Primary contact  
**Stage**: Current position in pipeline (Member, Soft Commit, Paid)  
**RSVP**: ✓ if they've expressed interest  
**Amount**: Payment amount (or blank if not paid)  
**Source**: How they entered (landing_form, csv, qr, referral)  
**Last Updated**: Most recent activity timestamp  
**Actions**: Quick action buttons

---

## Five Pipelines (Audience Types)

Each event has **5 separate pipelines** (like HubSpot Deals):

1. **Org Member** - Core supporters, F3 members, donors
2. **Friend/Spouse** - +1s, family members of org members
3. **Community Partner** - Nonprofits, government, community orgs
4. **Business Sponsor** - Corporate sponsors (cash or in-kind)
5. **Champion** - High-engagement advocates, influencers

**Toggle between pipelines** to focus on each audience type separately.

Each pipeline shares the same stages: **Member → Soft Commit → Paid**

---

## Hydrating the Pipeline

### The Push Service

**Flow:**
1. Supporters exist in master CRM (Supporter.js - sacred)
2. Admin selects which supporters to add to event
3. Service **pushes** them → creates EventAttendee records
4. EventAttendee is working funnel record
5. On payment/completion → EventAttendee is single source of truth

**API Endpoints:**
```
POST /api/events/:eventId/pipeline/push              # Push specific supporters
POST /api/events/:eventId/pipeline/push-all          # Push ALL supporters
POST /api/events/:eventId/pipeline/push-by-tag       # Push by tag filter
```

---

### Method 1: Push Specific Supporters

**Use Case:** Admin wants to add specific supporters to event

**Process:**
1. Admin views supporter list
2. Selects supporters to add (checkboxes)
3. Chooses audience type and initial stage
4. Clicks "Push to Event"
5. Service creates EventAttendee records (copies data from Supporters)

**API Call:**
```javascript
POST /api/events/:eventId/pipeline/push
{
  orgId: "abc123",
  supporterIds: ["supporter1", "supporter2", "supporter3"],
  audienceType: "org_member",  // or friend_spouse, community_partner, etc.
  stage: "member",
  source: "admin_add"
}
```

**Response:**
```javascript
{
  success: [
    { supporterId: "supporter1", attendeeId: "att1", email: "john@example.com" },
    { supporterId: "supporter2", attendeeId: "att2", email: "jane@example.com" }
  ],
  errors: [],
  skipped: [
    { supporterId: "supporter3", email: "bob@example.com", reason: "Already in event" }
  ]
}
```

---

### Method 2: Push ALL Supporters (Bulk)

**Use Case:** New event, invite everyone

**Process:**
1. Admin clicks "Import All Supporters"
2. System finds ALL supporters in org
3. Pushes them to event as "org_member" pipeline
4. All start at `stage: "member"`

**API Call:**
```javascript
POST /api/events/:eventId/pipeline/push-all
{
  orgId: "abc123",
  audienceType: "org_member",
  stage: "member"
}
```

---

### Method 3: Push by Tag Filter

**Use Case:** Target specific group (e.g., monthly donors, F3 AOs)

**Process:**
1. Admin filters supporters by tags
2. Selects "Push to Event"
3. Service finds supporters with matching tags
4. Creates EventAttendees

**API Call:**
```javascript
POST /api/events/:eventId/pipeline/push-by-tag
{
  orgId: "abc123",
  tags: ["f3:ao", "monthly_donor"],
  audienceType: "org_member",
  stage: "member"
}
```

---

### Method 4: CSV Upload → Push

**Use Case:** Have existing list to import

**Two-Step Process:**
1. Upload CSV → creates/updates Supporters (master CRM)
2. Push those supporters → creates EventAttendees (event pipeline)

**Step 1: Upload CSV**
```javascript
POST /api/orgs/:orgId/supporters/csv
// File: name,email,phone,tags
// Creates/updates Supporters in master CRM
```

**Step 2: Push to Event**
```javascript
POST /api/events/:eventId/pipeline/push
{
  orgId: "abc123",
  supporterIds: [newly created supporter IDs],
  audienceType: "org_member",
  stage: "member",
  source: "csv"
}
```

---

### Method 5: Landing Form (Public)

**Use Case:** Someone finds your event page and signs up

**Process:**
1. User fills form: name, email, phone, "I'm interested" checkbox
2. System upserts Supporter (dedup by email)
3. System creates EventAttendee record
4. If "I'm interested" checked → `stage: "soft_commit"`, else → `stage: "member"`
5. Source tag: `source:landing_form`

**API Call:**
```javascript
POST /api/events/:eventId/attendees/from-form
{
  name: "John Doe",
  email: "john@example.com",
  phone: "555-1234",
  interested: true  // Checkbox value
}
// Auto-creates supporter + attendee
```

**Response:**
```javascript
{
  supporter: { _id, name, email },
  attendee: { 
    _id, 
    stage: "soft_commit",  // Because interested=true
    rsvp: true,
    tags: ["source:landing_form", "rule:auto_soft_commit@2025-10-02"]
  }
}
```

---

### Method 3: Manual Admin Add

**Use Case:** Admin knows someone should be invited

**Process:**
1. Admin searches existing supporters or enters new contact
2. Selects event and stage
3. System creates EventAttendee record
4. Source tag: `source:admin_add`

**UI Flow:**
```
Dashboard → Event → "Add Attendees" → 
  [Search existing supporters] OR [Create new supporter] →
  Set initial stage (member/soft_commit) →
  Save
```

---

### Method 4: QR Code Scan

**Use Case:** At previous event, scan QR to express interest in next event

**Process:**
1. Attendee scans QR code
2. Redirects to quick form: "Email + I'm interested"
3. System links to next event
4. Starts at `stage: "soft_commit"` (they scanned, so interested!)
5. Source tag: `source:qr`

---

## Stage Transitions (Automation Rules)

### Member → Soft Commit

**Triggers:**
- Landing form with "I'm interested" checked
- Email link clicked ("I'm coming")
- Manual RSVP update by admin

**Code:**
```javascript
// services/pipelineService.js
if (formPayload.interested === true || formPayload.rsvp === true) {
  attendee.stage = "soft_commit";
  attendee.rsvp = true;
  attendee.rsvpDate = new Date();
  attendee.tags.push("rule:auto_soft_commit@" + new Date().toISOString().split('T')[0]);
}
```

---

### Soft Commit → Paid

**Triggers:**
- Stripe payment webhook received
- Admin marks as comp ticket
- Free event registration completed

**Code:**
```javascript
// Webhook from pay-backend
POST /api/webhooks/payment
{
  attendeeId: "abc123",
  amount: 50.00,
  stripeSessionId: "cs_xyz"
}

// services/pipelineService.js
export function applyPaid(attendee, amount) {
  attendee.stage = "paid";
  attendee.paid = true;
  attendee.amount = amount;
  attendee.paymentDate = new Date();
  attendee.engagementScore += 2;
  attendee.tags.push("rule:auto_paid@" + new Date().toISOString().split('T')[0]);
  return attendee;
}
```

---

## Table View Implementation

### Frontend Component Structure

```jsx
// pages/event.table.jsx
export default function EventTable() {
  const [attendees, setAttendees] = useState([]);
  const [filters, setFilters] = useState({
    stage: "all",  // all | member | soft_commit | paid
    search: ""
  });

  return (
    <div className="p-8">
      <h1>Event Pipeline</h1>
      
      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select onChange={(e) => setFilters({...filters, stage: e.target.value})}>
          <option value="all">All Stages</option>
          <option value="member">Member ({memberCount})</option>
          <option value="soft_commit">Soft Commit ({softCommitCount})</option>
          <option value="paid">Paid ({paidCount})</option>
        </select>
        
        <input 
          type="search"
          placeholder="Search name or email..."
          onChange={(e) => setFilters({...filters, search: e.target.value})}
        />
      </div>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Stage</th>
            <th>RSVP</th>
            <th>Amount</th>
            <th>Source</th>
            <th>Last Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredAttendees.map(attendee => (
            <TableRow key={attendee._id} attendee={attendee} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### Stage Badges

```jsx
function StageBadge({ stage }) {
  const styles = {
    member: "bg-gray-100 text-gray-700",
    soft_commit: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800"
  };
  
  const labels = {
    member: "Member",
    soft_commit: "Soft Commit",
    paid: "Paid"
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[stage]}`}>
      {labels[stage]}
    </span>
  );
}
```

---

## Filters & Segments

### Pre-built Filters

**All Attendees** - Everyone in pipeline  
**Members Only** - `stage: "member"`  
**Soft Commits** - `stage: "soft_commit"`  
**Paid** - `stage: "paid"`  
**Not RSVP'd** - `rsvp: false` (to nudge)  
**No Payment Yet** - `stage: "soft_commit" AND paid: false` (to convert)

---

### Custom Segments

```javascript
// By source
GET /api/events/:eventId/attendees?source=landing_form

// By date range
GET /api/events/:eventId/attendees?createdAfter=2025-10-01

// By engagement
GET /api/events/:eventId/attendees?engagementScore>=3

// Combined
GET /api/events/:eventId/attendees?stage=soft_commit&rsvp=true&paid=false
// "People who RSVP'd but haven't paid yet"
```

---

## Bulk Actions

From the table view, select multiple rows and:

### Send Email
```javascript
POST /api/events/:eventId/email/bulk
{
  attendeeIds: [array],
  subject: "Don't forget to register!",
  message: "Hey {name}, secure your spot..."
}
```

### Update Stage
```javascript
PATCH /api/events/:eventId/attendees/bulk
{
  attendeeIds: [array],
  stage: "soft_commit"
}
```

### Add Tags
```javascript
PATCH /api/events/:eventId/attendees/bulk
{
  attendeeIds: [array],
  addTags: ["vip", "early_bird"]
}
```

---

## Metrics Dashboard

Above the table, show key metrics:

```
┌──────────────────────────────────────────────────┐
│  Total: 500    Member: 300    Soft: 150    Paid: 50  │
│  Conversion Rate: 10%    Revenue: $2,500         │
└──────────────────────────────────────────────────┘
```

**Calculations:**
```javascript
const metrics = {
  total: attendees.length,
  member: attendees.filter(a => a.stage === "member").length,
  softCommit: attendees.filter(a => a.stage === "soft_commit").length,
  paid: attendees.filter(a => a.stage === "paid").length,
  conversionRate: (paid / total * 100).toFixed(1) + "%",
  revenue: attendees.reduce((sum, a) => sum + (a.amount || 0), 0)
};
```

---

## Pipeline Velocity

Track how fast people move through stages:

```javascript
// Average days from Member → Soft Commit
const avgMemberToSoft = attendees
  .filter(a => a.rsvpDate)
  .reduce((sum, a) => {
    const days = (a.rsvpDate - a.createdAt) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0) / softCommitCount;

// Average days from Soft Commit → Paid
const avgSoftToPaid = attendees
  .filter(a => a.paymentDate && a.rsvpDate)
  .reduce((sum, a) => {
    const days = (a.paymentDate - a.rsvpDate) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0) / paidCount;
```

---

## Quick Actions

### Row-Level Actions

**View** - Full attendee details  
**Edit** - Update info, stage, tags  
**Email** - Send individual email  
**Nudge** - Quick "Haven't heard from you" email  
**Mark Paid** - Manual payment recording  
**Delete** - Remove from event (not from org supporters)

---

## Export

Download the current view as CSV:

```javascript
GET /api/events/:eventId/attendees/export?format=csv&stage=all
```

**Output:**
```csv
Name,Email,Stage,RSVP,Paid,Amount,Source,Created,Updated
John Doe,john@example.com,paid,true,true,50.00,landing_form,2025-10-01,2025-10-03
Jane Smith,jane@example.com,soft_commit,true,false,0,csv,2025-09-28,2025-10-02
```

---

## Hydration Strategy by Event Type

### Free Community Event
```
1. Import all org supporters → stage: "member"
2. Send email blast with "I'm coming" link
3. Clicks → stage: "soft_commit"
4. Day before: nudge soft commits
5. At event: check-in (stage: "attended")
```

### Paid Ticketed Event
```
1. Landing page → stage: "member"
2. RSVP form → stage: "soft_commit"
3. Payment link → stage: "paid"
4. Email confirmations to paid attendees
5. At event: check-in
```

### Sponsor/VIP Event
```
1. Manual add VIPs → stage: "member"
2. Personal outreach → stage: "soft_commit"
3. Comp tickets assigned → stage: "paid" (amount: 0)
4. Confirmation with special instructions
```

---

## Data Model Alignment

### EventAttendee Schema (aligned with pipeline)

```javascript
{
  supporterId: ObjectId,  // Link to org Supporter
  eventId: ObjectId,
  stage: "member" | "soft_commit" | "paid",
  rsvp: Boolean,
  rsvpDate: Date,
  paid: Boolean,
  paymentDate: Date,
  amount: Number,
  ticketType: "standard" | "vip" | "comp" | "sponsor",
  source: String,
  engagementScore: Number,
  tags: [String]
}
```

---

## API Endpoints Summary

```
POST   /api/events/:eventId/attendees/from-form       # Landing form
POST   /api/events/:eventId/attendees/bulk            # Bulk import
GET    /api/events/:eventId/attendees?stage=member    # Filter
PATCH  /api/attendees/:id                             # Update one
PATCH  /api/events/:eventId/attendees/bulk            # Update many
POST   /api/webhooks/payment                          # Auto advance to paid
GET    /api/events/:eventId/attendees/export          # CSV export
```

---

## Next Steps

1. **Build table view component** (replace kanban)
2. **Implement filters** (stage, source, date range)
3. **Add bulk actions** (email, update stage, tag)
4. **Create metrics dashboard** (above table)
5. **Wire up automation rules** (member → soft → paid)
6. **Test hydration flows** (CSV, landing form, manual add)

---

**Database:** SUPPORTER_DB  
**Collections:** supporters, eventattendees, events, organizations  
**Production URL:** https://eventscrm-backend.onrender.com

