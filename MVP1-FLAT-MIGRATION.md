# MVP1: Flatten to Contact-Only Model

## What We're Doing:
Deleting `OrgMember` and `EventAttendee` tables, moving everything to `Contact`.

## New Schema:

```prisma
model Contact {
  id String @id @default(cuid())
  
  // PERSONHOOD
  firstName, lastName, email, phone, goesBy
  street, city, state, zip
  birthday, married, spouseName, numberOfKids
  employer
  
  // ORG (one per person)
  orgId String?
  isOrgMember Boolean?
  yearsWithOrganization Int?
  leadershipRole String?
  orgNotes String?
  engagementValue Int?
  
  // EVENT (one current event)
  eventId String?
  currentStage String?
  audienceType String?
  attended Boolean?
  amountPaid Float?
  spouseOrOther String?
  howManyInParty Int?
}
```

## Migration Steps:

### 1. Backup Current Data
```bash
pg_dump $DATABASE_URL > backup-before-flatten.sql
```

### 2. Copy Schema
```bash
cp prisma/schema-mvp1-flat.prisma prisma/schema.prisma
```

### 3. Migrate Existing Data

**OrgMembers → Contact:**
```javascript
// Get all OrgMembers
const orgMembers = await prisma.orgMember.findMany({
  include: { contact: true }
});

// Update contacts with org data
for (const om of orgMembers) {
  await prisma.contact.update({
    where: { id: om.contactId },
    data: {
      isOrgMember: true,
      yearsWithOrganization: om.yearsWithOrganization,
      leadershipRole: om.leadershipRole,
      orgNotes: om.notes,
      // ... etc
    }
  });
}
```

**EventAttendees → Contact:**
```javascript
// Get latest event per contact (current event only)
const attendees = await prisma.eventAttendee.findMany({
  orderBy: { createdAt: 'desc' }
});

const latestPerContact = {};
for (const ea of attendees) {
  if (!latestPerContact[ea.contactId]) {
    latestPerContact[ea.contactId] = ea;
  }
}

// Update contacts with current event
for (const ea of Object.values(latestPerContact)) {
  await prisma.contact.update({
    where: { id: ea.contactId },
    data: {
      eventId: ea.eventId,
      currentStage: ea.currentStage,
      audienceType: ea.audienceType,
      attended: ea.attended,
      amountPaid: ea.amountPaid
    }
  });
}
```

### 4. Drop Old Tables
```bash
npx prisma migrate dev --name flatten-to-contact-only
```

This will:
- Drop `OrgMember` table
- Drop `EventAttendee` table
- Add new fields to `Contact`

## Updated Queries:

### Get Org Members:
```javascript
// OLD
OrgMember.findMany({ 
  where: { orgId },
  include: { contact: true }
})

// NEW
Contact.findMany({ 
  where: { 
    orgId: orgId,
    isOrgMember: true 
  } 
})
```

### Get Event Attendees:
```javascript
// OLD
EventAttendee.findMany({ 
  where: { eventId },
  include: { contact: true }
})

// NEW
Contact.findMany({ 
  where: { eventId: eventId } 
})
```

### Get Contact Detail:
```javascript
// OLD (complex joins)
Contact.findUnique({
  where: { id },
  include: {
    orgMember: true,
    eventAttendees: true
  }
})

// NEW (already flat!)
Contact.findUnique({
  where: { id }
})
// Everything is right there!
```

## Routes to Update:

1. ✅ `/api/orgmembers` → Just query Contact with orgId filter
2. ✅ `/api/events/:id/attendees` → Just query Contact with eventId filter
3. ✅ `/api/contacts/:id` → Already flat, no joins needed!

## Frontend Impact:

**Minimal!** Data shape stays the same:
```javascript
// Before
{ 
  firstName: member.contact.firstName,
  email: member.contact.email,
  yearsWithOrg: member.yearsWithOrganization
}

// After (even simpler!)
{ 
  firstName: contact.firstName,
  email: contact.email,
  yearsWithOrg: contact.yearsWithOrganization
}
```

## Benefits:

✅ No more confusing joins  
✅ No more "where is this field?" questions  
✅ No more contactId nullable issues  
✅ One table, one query, done  

## Tradeoffs:

⚠️ Only tracks ONE current event per person  
⚠️ Loses event attendance history (for now)  
⚠️ Can't handle multi-org scenarios (fine for MVP1)

**When you need history or multi-relationships → Junction tables (see JUNCTION-TABLE-EXPLAINED.md)**

