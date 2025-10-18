# 🎯 MVP JOURNEY RULES - What Actually Works Now

## The 6 Stages

### ✅ ACTIVE (Has Rules)
1. **ACTIVATED** - Attending Bros & Brews event
2. **CHAMPION** - Leader or actively championing

### 🚧 FUTURE (Placeholder)
3. **UNAWARE** - (Future: Ad response tracking)
4. **CURIOUS** - (Future: Site visits, link clicks)
5. **ENGAGED** - (Future: Multiple events, 2+ attendance)
6. **ALUMNI** - (Future: 90+ days no activity)

---

## MVP Rules (What We Can Detect NOW)

### ACTIVATED
**Triggers:**
- Contact has `eventId` (linked to Bros & Brews or any event)
- Contact has `attended = true`
- OR Contact has `currentStage = 'rsvped'` (from event pipeline)

**Contact Fields Used:**
```javascript
contact.eventId !== null
contact.attended === true
// OR
contact.currentStage === 'rsvped'
```

**When Created:**
- Form submission for event
- Manual RSVP
- CSV upload with event assignment

---

### CHAMPION
**Triggers:**
- Contact has `amountPaid > 0` (made a donation)
- Contact has tag like "brought_friend" (future)
- Contact is marked as leader (future: leadershipRole field)

**Contact Fields Used:**
```javascript
contact.amountPaid > 0
// OR (future)
contact.tags.includes('brought_friend')
contact.leadershipRole !== null
```

**When Created:**
- Payment webhook from Stripe
- Manual promotion
- Brought friend action (future)

---

### DEFAULT (New Contacts)
**Triggers:**
- Contact created but no event, no payment
- Just exists in database

**Sets to:** `AWARE` by default

---

## The Service (To Be Built)

```javascript
// services/memberJourneyService.js

function determineMemberStage(contact) {
  // CHAMPION (highest priority)
  if (contact.amountPaid > 0) {
    return "CHAMPION";
  }
  
  // ACTIVATED (attended or RSVPed)
  if (contact.eventId && (contact.attended || contact.currentStage === 'rsvped')) {
    return "ACTIVATED";
  }
  
  // FUTURE STAGES (not detecting yet)
  // if (multipleEvents) return "ENGAGED";
  // if (noActivity90Days) return "ALUMNI";
  // if (clickedAd) return "CURIOUS";
  
  // DEFAULT
  return "AWARE";
}

// Auto-create/update journey when contact changes
async function syncMemberJourney(contactId, orgId) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId }
  });
  
  const stage = determineMemberStage(contact);
  
  await prisma.memberJourney.upsert({
    where: { 
      contactId_orgId: { contactId, orgId }
    },
    update: { 
      journeyStage: stage,
      lastActivityAt: new Date()
    },
    create: {
      contactId,
      orgId,
      journeyStage: stage
    }
  });
}
```

---

## When to Trigger Sync

### Automatic Triggers:
1. **Contact created** → Create MemberJourney as AWARE
2. **Contact RSVPs** → Update to ACTIVATED
3. **Contact attends** → Update to ACTIVATED (if not already)
4. **Payment received** → Update to CHAMPION
5. **Contact updated** → Re-evaluate and update stage

### Hook Into Existing Routes:
- `POST /api/forms/submit` → After creating Contact, call syncMemberJourney()
- `POST /api/contacts` → After upsert Contact, call syncMemberJourney()
- Payment webhook → After updating amountPaid, call syncMemberJourney()

---

## Future Rules (When Data Exists)

### CURIOUS (Need to Track)
- Clicked ad link (need UTM tracking)
- Visited landing page (need page view tracking)
- Opened email (already tracked in emailEvents!)

### ENGAGED (Need to Track)
- Attended 2+ events (need event attendance counter)
- Joined Slack/community (need integration)
- Consistent activity (need activity log)

### ALUMNI (Need to Track)
- No activity > 90 days (need lastActivityAt comparison)
- Cron job to auto-mark (need scheduler)

---

## MVP Implementation Plan

### Step 1: Add determineJourneyStage service ✅ Can do now
### Step 2: Hook into form submission ✅ Can do now
### Step 3: Create MemberJourney on Contact create ✅ Can do now
### Step 4: Display in Engage page ✅ Already built (Coming Soon placeholder)
### Step 5: Add manual stage override ✅ Can do later

---

**For NOW:** Simple rules (attended = ACTIVATED, paid = CHAMPION, else = AWARE)

**Want me to build the service and hook it into contact creation?**

