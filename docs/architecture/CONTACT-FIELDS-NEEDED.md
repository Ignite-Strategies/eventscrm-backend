# 📋 CONTACT FIELDS NEEDED FOR MEMBER JOURNEY

## Current Contact Fields Used:

### For Journey Stage Determination:

```prisma
model Contact {
  // REQUIRED for journey tracking:
  eventId       String?    // ← Links to event (ACTIVATED detection)
  attended      Boolean?   // ← Did they attend? (ACTIVATED)
  currentStage  String?    // ← Event funnel position (ACTIVATED if rsvped)
  amountPaid    Float?     // ← Donation/payment (CHAMPION)
  
  // NICE TO HAVE:
  orgId         String?    // ← Which org they belong to
  containerId   String?    // ← Tenant isolation
}
```

---

## MVP Rules (What We Detect NOW):

### ✅ ACTIVATED
**Checks:**
- `contact.eventId !== null` AND
- (`contact.attended === true` OR `contact.currentStage === 'rsvped'`)

**Example:**
```javascript
{
  email: "john@example.com",
  eventId: "bros-and-brews-id",
  attended: true  // ← Triggers ACTIVATED
}
```

### ✅ CHAMPION
**Checks:**
- `contact.amountPaid > 0`

**Example:**
```javascript
{
  email: "john@example.com",
  amountPaid: 50.00  // ← Triggers CHAMPION
}
```

### ✅ AWARE (Default)
**Checks:**
- None of the above

**Example:**
```javascript
{
  email: "john@example.com",
  orgId: "f3-capital-id"  // ← Just exists, no activity
}
```

---

## Future Fields Needed:

### For CURIOUS Stage:
```prisma
model Contact {
  clickedAdLink   Boolean?   // From UTM tracking
  visitedSite     Boolean?   // From page view tracking
  openedEmail     Boolean?   // Already tracked in EmailEvent!
}
```

### For ENGAGED Stage:
```prisma
model Contact {
  eventAttendanceCount Int @default(0)  // ← Need to track this!
  // OR query MemberJourney updates to count stage changes
}
```

### For ALUMNI Stage:
```prisma
model Contact {
  lastActivityAt DateTime?  // ← Track last interaction
  // Then cron job compares: now - lastActivityAt > 90 days
}
```

---

## Minimal Fields for MVP:

**Must Have:**
- ✅ `eventId` (already exists)
- ✅ `attended` (already exists)
- ✅ `currentStage` (already exists)
- ✅ `amountPaid` (already exists)

**Should Add:**
- `eventAttendanceCount` Int @default(0) - Track multiple events
- `lastActivityAt` DateTime - Track for alumni detection

**Can Add Later:**
- Ad tracking fields
- Site visit tracking
- Email engagement (already have via EmailEvent table)

---

## Recommendation:

### Add These Two Fields to Contact:

```prisma
model Contact {
  // ... existing fields
  
  // For ENGAGED stage detection
  eventAttendanceCount Int       @default(0)
  
  // For ALUMNI stage detection  
  lastActivityAt       DateTime?  @default(now())
  
  // ... rest
}
```

**Then update on:**
- Event attendance → increment `eventAttendanceCount`
- Any activity (form submit, email open, event RSVP) → update `lastActivityAt`

---

**Want me to add these two fields to the schema?** They'll unlock ENGAGED and ALUMNI stages later.

