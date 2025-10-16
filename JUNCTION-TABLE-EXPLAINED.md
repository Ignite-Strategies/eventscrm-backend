# Junction Tables Explained (For Later)

## MVP1: The Flat Model (Current)

```prisma
model Contact {
  id String @id
  
  // Personhood
  firstName String
  email String
  
  // ONE org (simple foreign key)
  orgId String?
  isOrgMember Boolean?
  yearsWithOrganization Int?
  
  // ONE event (simple foreign key)
  eventId String?
  currentStage String?
  attended Boolean?
}
```

### Queries:
```javascript
// Get org members
Contact.findMany({ where: { orgId: "org1", isOrgMember: true } })

// Get event attendees
Contact.findMany({ where: { eventId: "event1" } })
```

**Works great when:**
- ✅ Each person belongs to ONE org
- ✅ Each person is in ONE event at a time
- ✅ You only care about "current" event

---

## The Problem That Breaks It:

### Scenario: Multi-Event History
```
John attends Event A (paid $100)
John attends Event B (paid $150)
John attends Event C (RSVP'd but hasn't paid)
```

**With flat model:**
```javascript
Contact {
  email: "john@example.com",
  eventId: "event-c",           // ← Only tracks CURRENT event
  currentStage: "rsvped",       // ← Only current stage
  amountPaid: 0                 // ← Lost the $100 and $150!
}
```

**You lost:**
- ❌ Event A and B attendance history
- ❌ Payment amounts for past events
- ❌ Can't query "who attended Event A?"

---

## Solution: Junction Tables

### The Pattern:
```
Contact (personhood) ←→ Junction Table (relationship) ←→ Parent Entity (org/event)
```

```prisma
model Contact {
  id String @id
  firstName String
  email String
  
  // Many-to-many relationships
  eventAttendees EventAttendee[]  // ← Can attend MANY events
}

model EventAttendee {
  id String @id
  
  // Links
  contactId String
  contact   Contact @relation(...)
  
  eventId String
  event   Event @relation(...)
  
  // Relationship-specific data
  currentStage String
  attended     Boolean
  amountPaid   Float
  
  @@unique([contactId, eventId])  // ← Prevents duplicates
}
```

### Now John Can:
```javascript
// John's record
Contact { 
  id: "john123",
  email: "john@example.com" 
}

// His event history
EventAttendee { contactId: "john123", eventId: "event-a", attended: true, amountPaid: 100 }
EventAttendee { contactId: "john123", eventId: "event-b", attended: true, amountPaid: 150 }
EventAttendee { contactId: "john123", eventId: "event-c", attended: false, amountPaid: 0 }
```

---

## When to Migrate:

### Stay Flat When:
- ✅ Only tracking "current" relationships
- ✅ Don't need history
- ✅ Simple use case

### Use Junction Tables When:
- 🔥 Need to track multiple events per person
- 🔥 Need attendance history
- 🔥 Need payment history across events
- 🔥 Person can be in multiple orgs (consultants, volunteers)
- 🔥 Want to query "who attended Event X?" across time

---

## Migration Path (When Ready):

### Step 1: Create Junction Table
```sql
CREATE TABLE "EventAttendee" (
  id TEXT PRIMARY KEY,
  contactId TEXT NOT NULL,
  eventId TEXT NOT NULL,
  currentStage TEXT,
  attended BOOLEAN,
  amountPaid FLOAT,
  
  UNIQUE(contactId, eventId)
);
```

### Step 2: Migrate Existing Data
```javascript
// For each contact with eventId
const contacts = await prisma.contact.findMany({
  where: { eventId: { not: null } }
});

for (const contact of contacts) {
  await prisma.eventAttendee.create({
    data: {
      contactId: contact.id,
      eventId: contact.eventId,
      currentStage: contact.currentStage,
      attended: contact.attended,
      amountPaid: contact.amountPaid
    }
  });
}
```

### Step 3: Remove Flat Fields
```prisma
model Contact {
  // Remove these:
  // eventId String?
  // currentStage String?
  // attended Boolean?
  // amountPaid Float?
  
  // Keep this:
  eventAttendees EventAttendee[]
}
```

### Step 4: Update Queries
```javascript
// OLD (flat)
Contact.findMany({ where: { eventId: "event1" } })

// NEW (junction)
EventAttendee.findMany({ 
  where: { eventId: "event1" },
  include: { contact: true }
})
```

---

## The Rule:

```
ONE-TO-ONE or ONE-TO-MANY (at a time):
  → Use foreign key on Contact (flat)
  
MANY-TO-MANY (with history):
  → Use junction table
```

**Examples:**

| Relationship | Pattern |
|--------------|---------|
| Contact → Current Event | Foreign key (`eventId`) |
| Contact → All Events Ever | Junction (`EventAttendee`) |
| Contact → Home Address | Foreign key (one address) |
| Contact → Multiple Orgs | Junction (`OrgMember`) |
| Contact → Payment History | Junction (`Payment`) |

---

## TL;DR for Later:

**MVP1 = Flat is fine for now**

**When you need to:**
- Track event attendance history
- See who attended Event A, B, C across time
- Handle people in multiple orgs

**Then:**
1. Create junction table (EventAttendee or OrgMember)
2. Migrate flat data into junction records
3. Remove flat fields from Contact
4. Update queries to use junction table

**That's it!** 🚀

