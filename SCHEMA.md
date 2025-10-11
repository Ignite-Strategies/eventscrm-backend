# 📊 Database Schema Reference

**Last Updated:** December 2024

---

## 🎯 Core Models

### Contact (Universal Person Record)
```prisma
model Contact {
  id              String            @id @default(cuid())
  orgId           String
  firstName       String
  lastName        String
  email           String
  phone           String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  org             Organization      @relation(fields: [orgId], references: [id])
  eventAttendees  EventAttendee[]
  orgMember       OrgMember?        // Optional elevation
  admin           Admin?            // Optional elevation
  
  @@unique([orgId, email])  // Unique per org
  @@index([orgId])
  @@index([email])
}
```

**Purpose:** Universal person record. Everyone starts here.

---

### EventAttendee (Event Participation + Pipeline Tracking)
```prisma
model EventAttendee {
  id          String @id @default(cuid())
  orgId       String
  eventId     String
  event       Event @relation(fields: [eventId], references: [id], onDelete: Cascade)

  contactId String
  contact   Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  currentStage String @default("in_funnel")
  audienceType String // "org_members" | "friends_family" | "landing_page_public" | "community_partners" | "cold_outreach"

  submittedFormId String?
  submittedForm   PublicForm? @relation(fields: [submittedFormId], references: [id])

  attended    Boolean @default(false)
  checkedInAt DateTime?
  ticketType  String?
  amountPaid  Float   @default(0)
  notes       String? // JSON with custom form fields

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([eventId, contactId, audienceType])
  @@index([eventId, currentStage])
  @@index([eventId, contactId])
  @@index([eventId, audienceType])
  @@index([orgId])
  @@index([contactId])
}
```

**Purpose:** Links Contact to Event with pipeline tracking.

**Valid Values:**
- `audienceType`: "org_members" | "friends_family" | "landing_page_public" | "community_partners" | "cold_outreach"
- `currentStage`: "in_funnel" | "general_awareness" | "personal_invite" | "expressed_interest" | "soft_commit" | "paid"

---

### OrgMember (Extended CRM Data)
```prisma
model OrgMember {
  id                      String    @id @default(cuid())
  contactId               String    @unique
  orgId                   String
  goesBy                  String?
  street                  String?
  city                    String?
  state                   String?
  zip                     String?
  employer                String?
  yearsWithOrganization   Int?
  birthday                DateTime?
  married                 Boolean   @default(false)
  spouseName              String?
  numberOfKids            Int?
  originStory             String?
  notes                   String?
  categoryOfEngagement    String?
  tags                    String[]
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  contact                 Contact   @relation(fields: [contactId], references: [id])
  org                     Organization @relation(fields: [orgId], references: [id])
  admin                   Admin?
}
```

**Purpose:** Extended CRM data for contacts. Optional elevation from Contact.

---

### Organization
```prisma
model Organization {
  id      String  @id @default(cuid())
  name    String
  slug    String  @unique
  mission String?
  website String?

  // Social media
  x         String?
  instagram String?
  facebook  String?
  linkedin  String?

  // Address
  street String?
  city   String?
  state  String?
  zip    String?

  // Pipeline defaults
  pipelineDefaults String[] @default(["sop_entry", "rsvp", "paid", "attended", "champion"])
  audienceDefaults String[] @default(["org_members", "friends_family", "community_partners", "local_businesses", "general_public"])

  // Relations
  contacts        Contact[] // Universal person records
  members         OrgMember[] // Promoted contacts in master list
  events          Event[]
  templates       Template[]
  contactLists    ContactList[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Purpose:** Master organization account. Contains pipeline defaults.

---

### PublicForm (Dynamic Forms)
```prisma
model PublicForm {
  id                String    @id @default(cuid())
  orgId             String
  eventId           String?
  slug              String    @unique
  title             String
  description       String?
  collectFirstName  Boolean   @default(true) // "First Name" field
  collectLastName   Boolean   @default(true) // "Last Name" field  
  collectEmail      Boolean   @default(true) // "Email Address" field
  collectPhone      Boolean   @default(true) // "Phone Number" field

  // MUTATION INSTRUCTIONS - Backend uses these on submission
  audienceType String // "org_members" | "friends_family" | "landing_page_public" | "community_partners" | "cold_outreach"
  targetStage  String // "soft_commit", "paid", etc. - maps to EventAttendee.currentStage

  // Custom Fields - JAMMED INTO PUBLICFORM for easy hydration!
  fields            Json?     // Custom fields as JSON array

  isActive          Boolean   @default(true)
  submissionCount   Int       @default(0)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  org               Organization @relation(fields: [orgId], references: [id])
  event             Event?       @relation(fields: [eventId], references: [id])
  eventAttendees    EventAttendee[] // Which attendees came from this form

  @@index([orgId])
  @@index([eventId])
  @@index([slug])
}
```

**Purpose:** Dynamic forms with custom fields stored as JSON.

---

### Event
```prisma
model Event {
  id          String       @id @default(cuid())
  orgId       String
  org         Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  name        String
  slug        String
  description String?
  date        String? // FLEXIBLE: "2025-10-23", "10/23/2025", whatever!
  time        String? // FLEXIBLE: "6:00 PM - 9:00 PM", "6 PM", "9:00", whatever!

  // MVP1: Single Active Event
  status String @default("upcoming") // "upcoming", "active", "past", "draft"

  // Event Location (NOT confused with Contact location)
  eventVenueName String?
  eventStreet    String?
  eventCity      String?
  eventState     String?
  eventZip       String?

  hasTickets Boolean @default(false)
  ticketCost Float   @default(0)

  // Fundraising Goals
  fundraisingGoal    Float @default(0)
  additionalExpenses Float @default(0)

  // Pipeline overrides
  pipelines String[] // optional override of org defaults

  // Relations
  attendees        EventAttendee[] // Who's invited/attending
  tasks            EventTask[]     // Asana-style task list
  publicForms      PublicForm[]    // Forms for this event

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([orgId])
  @@index([orgId, status])
}
```

**Purpose:** Events with embedded location and pipeline overrides.

---

## 🔗 Key Relationships

### Contact-First Architecture
```
Contact (universal person)
  ├── OrgMember? (optional elevation)
  │   └── Admin? (optional elevation)
  └── EventAttendee[] (event participation)
      └── PublicForm? (which form created this attendee)
```

### Unique Constraints
- `Contact`: `@@unique([orgId, email])` - Same email can exist in different orgs
- `EventAttendee`: `@@unique([eventId, contactId, audienceType])` - Same person can be in same event with different audience types
- `OrgMember`: `@@unique([contactId])` - One OrgMember per Contact
- `Admin`: `@@unique([contactId])` - One Admin per Contact

---

## 📋 Database Indexes

### Performance Indexes
```prisma
// Contact
@@index([orgId])        // Get all contacts for org
@@index([email])        // Email lookups

// EventAttendee  
@@index([eventId, currentStage])  // Pipeline queries
@@index([eventId, contactId])     // Check if contact in event
@@index([eventId, audienceType])  // Audience filtering
@@index([orgId])                  // Org-wide attendee queries
@@index([contactId])              // Contact's event history

// PublicForm
@@index([orgId])        // Org's forms
@@index([eventId])      // Event's forms  
@@index([slug])         // Public form lookups

// Event
@@index([orgId])        // Org's events
@@index([orgId, status]) // Active events
```

---

## 🚫 Deprecated Models

### Supporter (Legacy)
```prisma
// DEPRECATED - Use Contact + OrgMember instead
model Supporter {
  // Old donor/external contact model
  // Will be migrated to Contact + OrgMember
}
```

### EventPipelineEntry (Legacy)
```prisma
// DEPRECATED - Use EventAttendee instead  
model EventPipelineEntry {
  // Old pipeline tracking model
  // EventAttendee handles this now
}
```

### CustomField (Legacy)
```prisma
// DEPRECATED - Use PublicForm.fields JSON instead
model CustomField {
  // Old custom field model
  // Stored as JSON in PublicForm.fields now
}
```

---

## 🔧 Schema Management

### Prisma Commands
```bash
# View database in browser
npx prisma studio

# Push schema changes to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Reset database (DANGER!)
npx prisma db push --force-reset
```

### Schema Config Route
```javascript
// GET /api/schema/event-attendee
{
  "audienceTypes": ["org_members", "friends_family", "landing_page_public", "community_partners", "cold_outreach"],
  "stages": ["in_funnel", "general_awareness", "personal_invite", "expressed_interest", "soft_commit", "paid"]
}
```

---

## 🎯 Schema Principles

1. **Contact-First** - Everyone starts as a Contact
2. **Optional Elevation** - Contact → OrgMember → Admin
3. **Event Participation** - EventAttendee links Contact to Event
4. **JSON Fields** - Custom data stored as JSON, not separate tables
5. **Multi-Org Support** - Unique constraints include orgId
6. **Pipeline Tracking** - Stages and audiences defined in schema comments

**Schema is the single source of truth for valid values!**
