# 📝 FORM SUBMISSION FLOW - What Actually Happens

## The Simple Version:

```
User fills out form → POST /api/forms/submit → Contact created/updated → Done
```

---

## Step by Step:

### 1. User Visits Form
```
https://f3capital.com/forms/bros-and-brews
```

**Frontend loads:** PublicForm (title, fields, etc.)

---

### 2. User Fills Out Form

**What We Collect:**

```javascript
{
  firstName: "John",
  lastName: "Smith",
  email: "john@example.com",
  phone: "555-1234",
  
  // Event-specific
  spouseOrOther: "spouse",  // solo, spouse, other
  howManyInParty: 2
  
  // Custom fields (if form has them)
  shirtSize: "L",
  dietaryRestrictions: "None"
}
```

---

### 3. Frontend Submits to Backend

```javascript
POST /api/forms/submit
{
  slug: "bros-and-brews",  // Which form
  formData: {
    firstName: "John",
    lastName: "Smith",
    email: "john@example.com",
    phone: "555-1234",
    spouseOrOther: "spouse",
    howManyInParty: 2
  }
}
```

---

### 4. Backend Processes (contactFormSubmitRoute.js)

**What Happens:**

```javascript
// A. Look up the form
const form = await prisma.publicForm.findUnique({
  where: { slug: "bros-and-brews" }
});

// B. Extract data from form config
const orgId = form.orgId;           // F3 Capital
const eventId = form.eventId;       // Bros & Brews event
const audienceType = form.audienceType;  // "landing_page_public"
const targetStage = form.targetStage;    // "rsvped"

// C. Upsert Contact
const contact = await prisma.contact.upsert({
  where: { email: "john@example.com" },
  update: {
    firstName: "John",
    lastName: "Smith",
    phone: "555-1234",
    orgId,        // ← CONVERSION! They're now in F3
    eventId,
    currentStage: "rsvped",
    spouseOrOther: "spouse",
    howManyInParty: 2
  },
  create: {
    // Same fields as update
  }
});

// D. Return success
res.json({ success: true, contactId: contact.id });
```

---

## What We're CURRENTLY Collecting:

### Standard Fields (Always):
- ✅ `firstName`
- ✅ `lastName`
- ✅ `email` (required, unique)
- ✅ `phone`

### Event Fields (Form-specific):
- ✅ `spouseOrOther`
- ✅ `howManyInParty`

### Auto-Set (From Form Config):
- ✅ `orgId` (from form.orgId)
- ✅ `eventId` (from form.eventId)
- ✅ `currentStage` (from form.targetStage)
- ✅ `audienceType` (from form.audienceType)

### NOT Collecting (Yet):
- ❌ `prospectId` - Who they were BEFORE conversion
- ❌ `howDidYouHear` - Self-reported source
- ❌ UTM tracking - Which ad/campaign

---

## What We SHOULD Add (Prospect Tracking):

### On Contact Model:
```prisma
model Contact {
  prospectId       String?   @unique  // Generated if no orgId
  howDidYouHear    String?            // Self-reported from form
  becameProspectAt DateTime?          // When prospect record created
  convertedToOrgAt DateTime?          // When orgId assigned
}
```

### On Form (Add Question):
```javascript
{
  type: "select",
  label: "How did you hear about us?",
  options: [
    "Google Search",
    "Facebook/Instagram", 
    "Friend told me",
    "Eventbrite",
    "Other"
  ]
}
```

---

## Updated Flow (With ProspectId):

### First Form Submit (No orgId Yet):

```javascript
// User submits form from ad
POST /api/forms/submit
{
  email: "john@example.com",
  howDidYouHear: "Google Search"  // ← User selected
}

// Backend creates Contact:
{
  email: "john@example.com",
  prospectId: "pct_abc123",  // ← AUTO-GENERATED
  howDidYouHear: "Google Search",
  becameProspectAt: "2025-10-18",
  orgId: null,  // ← NOT A MEMBER YET!
  eventId: null
}

// MemberJourney created: CURIOUS
```

### Later - They Attend Event:

```javascript
// Admin marks attended or they RSVP to event form
PATCH /api/contacts/abc123
{
  orgId: "f3-capital-id",  // ← CONVERSION!
  eventId: "bros-and-brews-id",
  attended: true,
  convertedToOrgAt: "2025-11-15"
}

// MemberJourney updated: CURIOUS → ACTIVATED
```

---

## Conversion Tracking (Simple):

```javascript
// "How many prospects converted this month?"
const prospects = await prisma.contact.count({
  where: { prospectId: { not: null } }
});

const converted = await prisma.contact.count({
  where: { 
    prospectId: { not: null },
    orgId: { not: null }
  }
});

const conversionRate = (converted / prospects) * 100;
// "You converted 23% of prospects!"
```

---

## For UTM (Future - Documented for Later):

Add to Contact:
- `utmSource`, `utmMedium`, `utmCampaign`
- Capture from URL query params
- Link to specific ad campaigns
- Full attribution reporting

**But for NOW:** Just `prospectId` + `howDidYouHear` gets you 80% of the value!

---

**Want me to add prospectId to Contact and update the journey rules?**

