# CRM Dev Guide

**Database:** SUPPORTER_DB  
**Production URL:** https://eventscrm-backend.onrender.com  
**Local Port:** 5001  
**Frontend Port:** 5173  
**Pay Backend Port:** 5000

---

## Architecture Overview

### Three Separate Systems

**eventscrm-backend** (This repo)
- Event funnel management
- Pipeline automation
- Contact/Organization CRM
- Rules engine for stage transitions

**ignite-pay-backend**
- Stripe payment processing
- Order/Customer records
- Treasury source of truth
- Sends webhooks to CRM backend

**ignitestrategescrm-frontend**
- React UI
- Kanban board
- Pipeline configuration
- Email campaigns

---

## Data Models (MongoDB)

### Organization
Master CRM container. One org = one master contact database.

```javascript
{
  name: String,              // "F3 Capital"
  mission: String,
  website: String,
  socials: [String],
  address: String,
  pipelineDefaults: [String], // ["sop_entry", "rsvp", "paid", "attended", "champion"]
  audienceDefaults: [String], // ["org_members", "friends_family", ...]
  admins: [ObjectId]
}
```

### Contact
Lives in org master CRM. One contact per email per org. No duplication across events.

```javascript
{
  orgId: ObjectId,           // FK to Organization
  name: String,              // "John Doe"
  email: String,             // Unique per org
  phone: String,
  tags: [String]             // ["f3:ao", "role:sponsor", "persona:vip"]
}
```

**Index:** `{ orgId: 1, email: 1 }` unique

### Event
Overlay on master CRM. Has goals, pipelines, automation rules.

```javascript
{
  orgId: ObjectId,
  name: String,              // "Bros & Brews 2025"
  slug: String,              // "bros-and-brews-2025"
  date: Date,
  location: String,
  pipelines: [String],       // Override org defaults (optional)
  pipelineRules: {
    autoSopOnIntake: Boolean,
    sopTriggers: [String],   // ["landing_form", "csv", "qr", "admin_add"]
    rsvpTriggers: [String],  // ["form_rsvp", "button_click"]
    paidTriggers: [String],  // ["stripe_webhook"]
    championCriteria: {
      minEngagement: Number,  // Default: 3
      tagsAny: [String],      // ["role:ao_q", "role:influencer", "shared_media"]
      manualOverrideAllowed: Boolean
    }
  },
  goals: {
    revenueTarget: Number,   // e.g., 10000
    ticketPrice: Number,     // e.g., 50
    costs: Number            // e.g., 2000
  }
}
```

**Index:** `{ orgId: 1, slug: 1 }` unique

### ContactEventMembership
Many-to-many join table. Tracks contact's journey through event pipeline.

```javascript
{
  orgId: ObjectId,
  eventId: ObjectId,
  contactId: ObjectId,
  stage: String,             // "sop_entry" | "rsvp" | "paid" | "attended" | "champion"
  tags: [String],            // Event-scoped: ["source:landing", "status:comp", "rule:auto_paid@2025-10-02"]
  source: String,            // "landing_form" | "csv" | "qr" | "admin"
  rsvp: Boolean,             // Expressed intent
  paid: Boolean,             // Payment received (synced from pay-backend)
  amount: Number,            // Last payment amount
  champion: Boolean,         // Advocacy flag
  engagementScore: Number    // Auto-calculated: paid +2, attended +1
}
```

**Index:** `{ orgId: 1, eventId: 1, contactId: 1 }` unique

---

## Pipeline Stages (Default)

```
sop_entry → rsvp → paid → attended → champion
```

**sop_entry**: First touch / ingestion success  
**rsvp**: Expressed intent to attend  
**paid**: Payment confirmed (treasury truth from pay-backend)  
**attended**: Post-event reconciliation  
**champion**: High engagement / advocacy lane  

**Champion is BOTH:**
- A stage (optional, can be terminal)
- A flag (recommended - independent of stage)

---

## Rules Engine

### Auto Stage Transitions

**SOP Entry** (First Touch)
```javascript
// Triggers: landing_form, csv, qr, admin_add
applyIntakeRules({
  membership,
  event,
  intakeSource: "landing_form",
  formPayload: { rsvp: false }
})
// → Sets stage = "sop_entry"
// → Adds tag: "source:landing_form"
// → Adds audit tag: "rule:auto_sop_entry@2025-10-02"
```

**RSVP** (Expressed Intent)
```javascript
// Triggers: form_rsvp checkbox, button_click
// Also auto if formPayload.rsvp === true
// → Sets stage = "rsvp"
// → Sets rsvp = true
```

**Paid** (Payment Confirmed)
```javascript
// Webhook from pay-backend
applyPaid(membership, 50.00)
// → Sets paid = true
// → Sets amount = 50.00
// → Sets stage = "paid"
// → Bumps engagementScore += 2
// → Adds audit tag: "rule:auto_paid@2025-10-02"
```

**Attended** (Post-Event)
```javascript
// Manual or check-in system
applyAttended(membership)
// → Sets stage = "attended"
// → Bumps engagementScore += 1
```

**Champion** (Advocacy)
```javascript
// Auto-flagged when:
shouldMarkChampion(membership, {
  minEngagement: 3,
  tagsAny: ["role:ao_q", "role:influencer", "shared_media"]
})
// → Sets champion = true if:
//    - engagementScore >= 3 OR
//    - Has any qualifying tag

// Manual override:
markAsChampion(membership, "referred 5+ people")
// → Sets champion = true
// → Sets engagementScore = max(current, 5)
// → Adds tag: "champion:manual:referred 5+ people"
```

---

## API Endpoints

### Organizations
```
POST   /api/orgs
GET    /api/orgs/:orgId
PATCH  /api/orgs/:orgId
```

### Contacts (Master CRM)
```
POST   /api/orgs/:orgId/contacts              # Upsert single contact
POST   /api/orgs/:orgId/contacts/csv          # Bulk CSV upload
GET    /api/orgs/:orgId/contacts?search=john&tags=sponsor
```

**CSV Format:**
```csv
name,email,phone,tags
John Doe,john@example.com,555-1234,"f3:ao,role:sponsor"
```

### Events
```
POST   /api/orgs/:orgId/events                # Create event
GET    /api/orgs/:orgId/events                # List org's events
GET    /api/events/:eventId                   # Get event
PATCH  /api/events/:eventId                   # Update event/rules
GET    /api/events/:eventId/pipeline-config   # Get pipeline config
```

### Memberships (Pipeline)
```
POST   /api/events/:eventId/memberships                # Add contacts to event
POST   /api/events/:eventId/memberships/from-form      # Landing form intake (auto-creates contact)
GET    /api/events/:eventId/memberships?stage=rsvp&champion=true
PATCH  /api/memberships/:membershipId                  # Move stage, update tags
POST   /api/memberships/:membershipId/champion         # Manual champion mark
```

### Webhooks
```
POST   /api/webhooks/payment                   # From pay-backend
```

---

## Integration Flows

### Landing Form → SOP Entry
```
1. User fills form on landing page
2. POST /api/events/:eventId/memberships/from-form
   {
     name: "John Doe",
     email: "john@example.com",
     phone: "555-1234",
     rsvp: true,
     source: "landing_form"
   }
3. Backend:
   - Upserts contact in org master CRM (dedup by email)
   - Creates/updates membership
   - Applies intake rules → stage = "rsvp" (because rsvp=true)
   - Adds tags: ["source:landing_form", "rule:auto_rsvp@..."]
4. Returns: { contact, membership, message: "Success" }
```

### CSV Upload → SOP Entry
```
1. Admin uploads CSV in frontend
2. POST /api/orgs/:orgId/contacts/csv
   - Parse CSV
   - Validate (name, email required)
   - Bulk upsert contacts
3. POST /api/events/:eventId/memberships
   {
     contactIds: [array of contact IDs],
     source: "csv",
     stage: "sop_entry"
   }
4. Backend:
   - Creates memberships
   - Applies intake rules
   - Adds tags: ["source:csv", "rule:auto_sop_entry@..."]
```

### Payment → Paid Stage
```
1. User clicks "Buy Ticket" in CRM frontend
2. CRM backend calls pay-backend:
   POST pay-backend/create-checkout
   {
     membershipId: "abc123",
     eventId: "xyz789",
     amount: 50.00,
     customerEmail: "john@example.com"
   }
3. Pay-backend creates Stripe checkout session
   - metadata: { membershipId: "abc123" }
4. User completes payment on Stripe
5. Stripe webhook → pay-backend
6. Pay-backend webhook → CRM backend:
   POST /api/webhooks/payment
   {
     membershipId: "abc123",
     amount: 50.00,
     stripeSessionId: "cs_..."
   }
7. CRM backend:
   - Finds membership by ID
   - Calls applyPaid(membership, 50.00)
   - Auto-advances to "paid" stage
   - Updates engagement score
   - Saves
8. Frontend Kanban auto-refreshes → contact now in "paid" column
```

### Check-in → Attended
```
1. Event day: Admin uses check-in system (future)
2. POST /api/memberships/:membershipId
   { stage: "attended" }
3. Backend:
   - Updates stage
   - Bumps engagement score
   - Checks champion criteria (auto-flag if score >= threshold)
```

---

## Payment Backend Integration

**eventscrm-backend → pay-backend**
```javascript
// services/paymentService.js
import axios from 'axios';

export async function createCheckout(membership, event, contact) {
  const response = await axios.post(
    `${process.env.PAY_BACKEND_URL}/create-checkout`,
    {
      membershipId: membership._id.toString(),
      eventId: event._id.toString(),
      amount: event.goals.ticketPrice,
      eventName: event.name,
      customerEmail: contact.email,
      customerName: contact.name
    }
  );
  return response.data.url; // Stripe checkout URL
}
```

**pay-backend → eventscrm-backend**
```javascript
// In pay-backend webhook handler (add this)
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  
  // Notify CRM backend
  await axios.post(
    `${process.env.CRM_BACKEND_URL}/api/webhooks/payment`,
    {
      membershipId: session.metadata.membershipId,
      amount: session.amount_total / 100,
      stripeSessionId: session.id
    }
  );
}
```

---

## Tag System

### Global Tags (on Contact)
```
f3:ao                    // F3 member, AO at horsetrack
f3:q                     // F3 member, Q (workout leader)
role:sponsor             // Event sponsor
role:influencer          // Community influencer
persona:vip              // VIP treatment
community:leader         // Community organizer
```

### Event-Scoped Tags (on Membership)
```
source:landing_form      // Where they came from
source:csv
source:qr
source:admin_add
status:comp              // Comp ticket
rule:auto_sop_entry@2025-10-02   // Audit: when rule fired
rule:auto_paid@2025-10-02
champion:manual:referred_5+      // Manual champion reason
```

---

## Frontend Pages

### Org Setup Flow
```
/org/create               → Create organization
/org/success/:orgId       → Confirmation
/org/:orgId/users         → Upload contacts (CSV)
/dashboard/:orgId         → Main hub
```

### Event Flow
```
/event/create/:orgId              → Create event + revenue calculator
/event/success/:eventId           → Confirmation
/event/:eventId/audiences         → Select target audiences
/event/:eventId/pipeline-config   → Configure automation rules
/event/:eventId/pipelines         → Kanban board (drag-drop)
```

### Engagement
```
/engage/email/:orgId              → Email campaigns
/marketing/analytics/:orgId       → Analytics (placeholder)
```

---

## Revenue Calculator

**Formula:**
```javascript
const netTarget = revenueTarget - costs;
const ticketsNeeded = Math.ceil(netTarget / ticketPrice);
```

**Example:**
```
Revenue Target: $10,000
Ticket Price: $50
Costs: $2,000

Net Target: $10,000 - $2,000 = $8,000
Tickets Needed: $8,000 / $50 = 160 tickets
```

Frontend shows this live as user types.

---

## Champion Logic

### Engagement Score Calculation
```javascript
// Starting score: 0

// Actions that bump score:
+ Landing form signup: 0 (baseline)
+ RSVP: 0 (intent only)
+ Payment: +2
+ Attended event: +1
+ Manual champion mark: set to min 5

// Example journey:
1. Landing form → score = 0
2. RSVP → score = 0
3. Paid $50 → score = 2
4. Attended event → score = 3 → AUTO-FLAGGED as champion!
```

### Champion Criteria (Configurable per Event)
```javascript
{
  minEngagement: 3,        // Score threshold
  tagsAny: [               // OR any of these tags
    "role:ao_q",
    "role:influencer",
    "shared_media",
    "referred:5+"
  ],
  manualOverrideAllowed: true
}
```

### Auto-Flag Logic
```javascript
function shouldMarkChampion(membership, criteria) {
  const scoreOK = membership.engagementScore >= criteria.minEngagement;
  const tagHit = criteria.tagsAny.some(t => membership.tags.includes(t));
  return scoreOK || tagHit;
}
```

---

## Kanban Implementation

### Frontend Drag-Drop
```javascript
// event.pipelines.jsx
const handleDragStart = (e, membershipId) => {
  e.dataTransfer.setData("membershipId", membershipId);
};

const handleDrop = async (e, newStage) => {
  e.preventDefault();
  const membershipId = e.dataTransfer.getData("membershipId");
  
  await api.patch(`/memberships/${membershipId}`, { stage: newStage });
  loadData(); // Refresh
};
```

### Card Display
```
┌─────────────────────────┐
│ John Doe            ⭐  │ ← Champion badge
│ john@example.com        │
│ [RSVP] [$50]           │ ← Status badges
│ [Mark Champion]         │ ← Action button
└─────────────────────────┘
```

---

## CSV Upload Validation

```javascript
// services/csvService.js
export function parseContactsCSV(csvBuffer) {
  const records = parse(csvBuffer, { columns: true, trim: true });
  const contacts = [];
  const errors = [];
  
  records.forEach((record, index) => {
    // Required: name, email
    if (!record.email) {
      errors.push({ line: index + 2, error: "Missing email" });
      return;
    }
    
    // Parse tags (comma-separated in one cell)
    const tags = record.tags 
      ? record.tags.split(',').map(t => t.trim())
      : [];
    
    contacts.push({
      name: record.name,
      email: record.email.toLowerCase().trim(),
      phone: record.phone || "",
      tags
    });
  });
  
  return { contacts, errors };
}
```

---

## Error Handling Patterns

### Idempotent Upserts
```javascript
// Contact upsert (safe to call multiple times)
const contact = await Contact.findOneAndUpdate(
  { orgId, email },
  { orgId, email, name, phone, tags },
  { upsert: true, new: true }
);

// Membership upsert
const membership = await ContactEventMembership.findOneAndUpdate(
  { orgId, eventId, contactId },
  membershipData,
  { upsert: true, new: true }
);
```

### Webhook Idempotency
```javascript
// In pay-backend, use Stripe idempotency key
// Don't double-process same webhook
const processedWebhooks = new Set();

if (processedWebhooks.has(session.id)) {
  return res.json({ received: true, note: "Already processed" });
}

processedWebhooks.add(session.id);
// ... process ...
```

---

## Audit Trail

Every automation action adds timestamped tag:
```
rule:auto_sop_entry@2025-10-02
rule:auto_rsvp@2025-10-02
rule:auto_paid@2025-10-02
champion:manual:referred_5+
```

Query to see automation history:
```javascript
const autoTags = membership.tags.filter(t => t.startsWith('rule:'));
// ["rule:auto_sop_entry@2025-10-02", "rule:auto_paid@2025-10-02"]
```

---

## Testing Scenarios

### 1. Landing Form → RSVP
```bash
# Local
curl -X POST http://localhost:5001/api/events/EVENT_ID/memberships/from-form \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "rsvp": true,
    "source": "landing_form"
  }'

# Production
curl -X POST https://eventscrm-backend.onrender.com/api/events/EVENT_ID/memberships/from-form \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "rsvp": true,
    "source": "landing_form"
  }'
```

Expected:
- Contact created/updated
- Membership created at stage "rsvp"
- Tags: ["source:landing_form", "rule:auto_rsvp@..."]

### 2. Payment Webhook
```bash
curl -X POST http://localhost:5001/api/webhooks/payment \
  -H "Content-Type: application/json" \
  -d '{
    "membershipId": "MEMBERSHIP_ID",
    "amount": 50.00,
    "stripeSessionId": "cs_test_123"
  }'
```

Expected:
- Membership updated: stage = "paid", paid = true, amount = 50
- Engagement score += 2
- Tags: [..., "rule:auto_paid@..."]

### 3. CSV Upload
```bash
curl -X POST http://localhost:5001/api/orgs/ORG_ID/contacts/csv \
  -F "file=@contacts.csv"
```

Expected:
- Contacts upserted
- Response: { success: true, inserted: X, updated: Y, total: Z }

---

## Environment Variables (Render)

**Production URL:** https://eventscrm-backend.onrender.com

```
PORT=5001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/SUPPORTER_DB
PAY_BACKEND_URL=https://ignite-pay-backend.onrender.com
FRONTEND_URL=https://crm.yoursite.com
SENDGRID_API_KEY=SG.xxx (optional)
NODE_ENV=production
```

---

## Common Queries

### Get all paid contacts for event
```javascript
const paidMembers = await ContactEventMembership.find({
  eventId,
  paid: true
}).populate('contactId');
```

### Get champions
```javascript
const champions = await ContactEventMembership.find({
  eventId,
  champion: true
}).populate('contactId');
```

### Revenue report
```javascript
const stats = await ContactEventMembership.aggregate([
  { $match: { eventId, paid: true } },
  { $group: {
    _id: null,
    totalRevenue: { $sum: '$amount' },
    totalPaid: { $sum: 1 }
  }}
]);
```

### Conversion funnel
```javascript
const funnel = await ContactEventMembership.aggregate([
  { $match: { eventId } },
  { $group: {
    _id: '$stage',
    count: { $sum: 1 }
  }}
]);
// Result: { sop_entry: 500, rsvp: 200, paid: 150, attended: 0 }
```

---

## Future Enhancements

- [ ] QR code check-in system
- [ ] SMS campaigns (Twilio)
- [ ] Advanced email templates
- [ ] Multi-event analytics
- [ ] Referral tracking
- [ ] A/B test landing pages
- [ ] Automated follow-ups
- [ ] Google Analytics integration
- [ ] Role-based permissions

---

## Key Principles

1. **Contacts belong to ORG, not events** → No duplication
2. **Memberships are the join table** → Track per-event journey
3. **Pay-backend is treasury truth** → CRM syncs from it
4. **Champion is a flag, not just a stage** → Flexible tracking
5. **Tags enable segmentation** → Powerful filtering
6. **Audit tags track automation** → Transparent history
7. **Rules are configurable per event** → Flexibility

---

## Quick Reference

**Create Org:** `POST /api/orgs`  
**Upload CSV:** `POST /api/orgs/:orgId/contacts/csv`  
**Create Event:** `POST /api/orgs/:orgId/events`  
**Landing Form:** `POST /api/events/:eventId/memberships/from-form`  
**Move Stage:** `PATCH /api/memberships/:membershipId`  
**Payment Hook:** `POST /api/webhooks/payment`  

**Database:** SUPPORTER_DB  
**Collections:** organizations, contacts, events, contacteventmemberships

---

**Last Updated:** 2025-10-02  
**Repo:** https://github.com/Ignite-Strategies/eventscrm-backend

