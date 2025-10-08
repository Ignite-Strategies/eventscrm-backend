# Contact/Admin Architecture - The REAL Relationship

## 🎯 The Three-Model System

### 1. **Contact** - Universal Person Record
```prisma
model Contact {
  id        String @id @default(cuid())
  orgId     String
  firstName String
  lastName  String
  email     String
  phone     String?
  
  // Relations
  eventAttendees EventAttendee[] // Events they're attending
  orgMember      OrgMember?      // If promoted to master list
  admin          Admin?          // If they're an admin
}
```

**Purpose:** EVERYONE starts here. Universal person record.

### 2. **OrgMember** - Master Contact List (CRM)
```prisma
model OrgMember {
  id        String @id @default(cuid())
  contactId String? @unique  // Links to Contact
  contact   Contact? @relation(fields: [contactId], references: [id])
  
  // Organization Context
  orgId     String?
  org       Organization? @relation(fields: [orgId], references: [id])
  
  // Extended Info (beyond basic Contact)
  goesBy    String?
  street    String?
  city      String?
  state     String?
  zip       String?
  
  // Organization Context
  employer              String?
  yearsWithOrganization Int?
  
  // Personal Information
  birthday     String?
  married      Boolean @default(false)
  spouseName   String?
  numberOfKids Int     @default(0)
  
  // Story & Notes
  originStory String?
  notes       String?
  
  // App Access (optional)
  role       String? // "owner", "manager", or null
  firebaseId String? @unique
  photoURL   String?
  
  // Leadership Tags
  tags      String[] @default([])
  
  // Engagement Tracking
  categoryOfEngagement String @default("medium")
}
```

**Purpose:** Master CRM contact list with EXTENDED information. Only people you know well.

### 3. **Admin** - App User Permissions
```prisma
model Admin {
  id        String @id @default(cuid())
  contactId String @unique  // Links to Contact
  contact   Contact @relation(fields: [contactId], references: [id])
  orgId     String
  org       Organization @relation(fields: [orgId], references: [id])
  
  role        String // "super_admin", "admin", "manager"
  permissions Json?
  isActive    Boolean @default(true)
}
```

**Purpose:** App users who can login and manage the system.

---

## 🔄 The Flow

### Everyone → Contact
```
Form Submission → Contact (universal person)
Landing Page → Contact (universal person)
CSV Import → Contact (universal person)
```

### Some Contacts → OrgMember (CRM)
```
Admin promotes Contact → OrgMember (adds extended info)
CSV Import with full details → OrgMember
Manual add with full profile → OrgMember
```

### Some Contacts → Admin (App User)
```
Contact with firebaseId → Admin (can login)
Admin grants permissions → Admin (can manage)
```

### EventAttendee Links to Contact
```
EventAttendee.contactId → Contact.id
NOT EventAttendee.orgMemberId (that field doesn't exist!)
```

---

## 🎯 Navigation Keys

### Frontend Should Check:
1. **`contactId`** - Universal person (always exists if you're in the system)
2. **`adminId`** - App user permissions (only if you can login)
3. **`orgId`** - Which organization (from Contact.orgId)
4. **`phone`** - Profile completion check (from Contact.phone or OrgMember.phone)
5. **`eventId`** - Current event (from Event)

### The Navigation Logic:
```javascript
// Check completion status
const contactId = localStorage.getItem('contactId');
const adminId = localStorage.getItem('adminId');
const orgId = localStorage.getItem('orgId');
const phone = localStorage.getItem('phone'); // From Contact or OrgMember
const eventId = localStorage.getItem('eventId');

// Routing logic:
if (!contactId) → /signup
if (!phone) → /profile-setup
if (!orgId) → /org/choose
if (!eventId) → /event/create
if (all good) → /dashboard
```

---

## 🗄️ Database Relationships

### Contact → OrgMember (Optional)
- `Contact` can exist WITHOUT `OrgMember`
- `OrgMember` MUST have `contactId` (links to Contact)
- One Contact can have AT MOST one OrgMember

### Contact → Admin (Optional)
- `Contact` can exist WITHOUT `Admin`
- `Admin` MUST have `contactId` (links to Contact)
- One Contact can have AT MOST one Admin

### Contact → EventAttendee (Required for events)
- `EventAttendee` MUST have `contactId`
- One Contact can have MANY EventAttendees (different events)

---

## 🔧 Migration Strategy

### Keep OrgMember!
**OrgMember is NOT deprecated** - it's the master CRM contact list with extended information.

### What Changed:
1. **EventAttendee** now uses `contactId` (not `orgMemberId`)
2. **Navigation** should use `contactId` + `adminId` as source of truth
3. **Auth flow** creates Contact → OrgMember → Admin (all linked)

### The Flow:
```
User signs up:
1. Firebase Auth
2. Create Contact (basic info)
3. Create OrgMember (extended info, linked to Contact)
4. Create Admin (permissions, linked to Contact)
5. Frontend saves: contactId, adminId, orgId, etc.
```

---

## 📝 Key Takeaways

1. **Contact = Universal** - Everyone who interacts with your system
2. **OrgMember = CRM** - People you know well (extended info)
3. **Admin = App User** - People who can login and manage
4. **EventAttendee uses contactId** - Links people to events

### The Hierarchy:
```
Contact (everyone)
├── OrgMember (CRM contacts with extended info)
└── Admin (app users with permissions)

EventAttendee → Contact (not OrgMember!)
```

### Navigation Source of Truth:
- ✅ `contactId` (always exists)
- ✅ `adminId` (only app users)
- ✅ `orgId` (from Contact.orgId)
- ✅ `phone` (from Contact or OrgMember)
- ✅ `eventId` (current event)

**OrgMember is still important!** It's your master CRM with all the extended contact information.
