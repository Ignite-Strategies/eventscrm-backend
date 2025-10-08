# 📊 DATA FLOW - Form Submission Architecture

## 🎯 Two Sources of Truth

### 1. **Contact** - WHO they are (Universal Person Record)
```prisma
Contact {
  id: String
  orgId: String
  firstName: String
  lastName: String
  email: String
  phone: String?
}
```

**Purpose:** Single source of truth for a person's basic info across ALL events.

---

### 2. **EventAttendee** - Their relationship to THIS specific event
```prisma
EventAttendee {
  id: String
  orgId: String
  eventId: String
  contactId: String              // → Links to Contact
  
  // Funnel tracking
  audienceType: String           // WHO: "org_members", "friends_family", "landing_page_public", etc.
  currentStage: String           // WHERE: "in_funnel", "soft_commit", "paid", etc.
  
  // Form tracking
  submittedFormId: String?       // Which form created this attendee
  notes: String?                 // JSON of custom form answers
  
  // Final data
  attended: Boolean
  amountPaid: Float
}
```

**Purpose:** Tracks WHERE they are in the funnel for THIS event + custom form data.

---

## 🔄 Form Submission Flow

### **Step 1: Admin Creates Form (FormBuilder.jsx)**

```javascript
POST /api/forms
{
  orgId: "f3_capital",
  eventId: "bros_event_id",
  audienceType: "landing_page_public",  // WHO they are
  targetStage: "soft_commit",            // WHERE they'll land
  name: "Bros & Brews Soft Commit",
  slug: "bros-soft-commit",
  publicTitle: "Sign Up for Bros & Brews!",
  fields: [
    { id: "name", type: "text", label: "Full Name", required: true },
    { id: "f3_name", type: "text", label: "F3 Name", required: true },
    { id: "how_likely_to_attend", type: "radio", label: "How likely to attend", options: [...] },
    // ... more fields
  ]
}
```

**Backend saves to:** `EventForm` table

---

### **Step 2: User Submits Form (Landing Page)**

```javascript
POST /api/public/events/brosandbrews/soft-commit
{
  name: "Adam Cole",
  email: "adam@example.com",
  phone: "555-1234",
  f3_name: "Tupac",
  how_likely_to_attend: "definitely",
  total_in_your_party_expected: 2
}
```

---

### **Step 3: Backend Processes Submission**

**A. Find or Create Contact:**
```javascript
const contact = await prisma.contact.upsert({
  where: { orgId_email: { orgId, email } },
  create: {
    orgId,
    firstName: "Adam",
    lastName: "Cole",
    email: "adam@example.com",
    phone: "555-1234"
  },
  update: {
    phone: "555-1234" // Update if changed
  }
});
```

**B. Create EventAttendee (links person to event):**
```javascript
const attendee = await prisma.eventAttendee.create({
  data: {
    orgId: form.orgId,
    eventId: form.eventId,
    contactId: contact.id,
    audienceType: form.audienceType,    // FROM EventForm
    currentStage: form.targetStage,     // FROM EventForm.targetStage
    submittedFormId: form.id,
    notes: JSON.stringify({
      f3_name: "Tupac",
      how_likely_to_attend: "definitely",
      total_in_your_party_expected: 2
    })
  }
});
```

---

## 🔑 Key Relationships

```
EventForm.audienceType → EventAttendee.audienceType
EventForm.targetStage → EventAttendee.currentStage
```

**On form submission:**
1. User data → `Contact` (WHO they are)
2. Event relationship → `EventAttendee` (WHERE they are in funnel + custom answers)
3. `EventAttendee.currentStage` is SET from `EventForm.targetStage`

---

## 📋 For MVP1 (Hardcoded Approach)

**Audience Types (hardcoded strings):**
- `org_members`
- `friends_family`
- `landing_page_public`
- `community_partners`
- `cold_outreach`

**Stages (hardcoded strings):**
- `in_funnel`
- `general_awareness`
- `personal_invite`
- `expressed_interest`
- `soft_commit`
- `paid`

---

## 🚀 For MVP2 (Future - Relational Models)

Create `AudienceType` and `Stage` models for customization per org.

---

## ⚠️ Critical Rules

1. **Contact = Universal** - One person, many events
2. **EventAttendee = Event-specific** - Tracks funnel position for ONE event
3. **EventForm.targetStage MUST map to EventAttendee.currentStage** on submission
4. **EventForm.audienceType MUST map to EventAttendee.audienceType** on submission

