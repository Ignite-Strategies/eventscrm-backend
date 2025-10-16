# 🎯 PIPELINE-BASED TARGETING

## The New Contact Model with Pipelines

```prisma
model Contact {
  id String @id  // ← THE contactId - only ID that matters!
  
  // PERSONHOOD
  firstName, lastName, email, phone, goesBy
  street, city, state, zip
  birthday, married, spouseName, numberOfKids
  employer
  
  // ORG RELATIONSHIP
  orgId String?
  isOrgMember Boolean?
  yearsWithOrganization Int?
  leadershipRole String?
  chapterResponsibleFor String?
  orgTags String[]
  engagementValue Int?
  
  // 🔥 PIPELINE TRACKING (The Core!)
  pipelineId   String?
  audienceType String?
  currentStage String?
  
  // EVENT RELATIONSHIP
  eventId String?
  attended Boolean?
  amountPaid Float?
  ticketType String?
  spouseOrOther String?
  howManyInParty Int?
}

model Pipeline {
  id      String @id
  orgId   String
  name    String  // "Bros & Brews 2024", "Donor Nurture Q1"
  type    String  // "event", "nurture", "donor"
  
  audiences String[]  // ["org_members", "prospects", "donors"]
  stages    String[]  // ["aware", "invited", "rsvped", "paid"]
  
  contacts  Contact[]
}
```

## How Targeting Works

### 1. Get All Contacts in a Pipeline
```javascript
GET /contacts?pipelineId=pipeline_bros_brews_2024

→ Contact.findMany({ 
    where: { pipelineId: "pipeline_bros_brews_2024" } 
  })

// Returns everyone in this pipeline
```

### 2. Get Contacts by Stage
```javascript
GET /contacts?pipelineId=xyz&currentStage=rsvped

→ Contact.findMany({ 
    where: { 
      pipelineId: "xyz",
      currentStage: "rsvped" 
    } 
  })

// Everyone who RSVP'd but hasn't paid
```

### 3. Get Contacts by Audience
```javascript
GET /contacts?pipelineId=xyz&audienceType=org_members

→ Contact.findMany({ 
    where: { 
      pipelineId: "xyz",
      audienceType: "org_members" 
    } 
  })

// All org members in this pipeline
```

### 4. Combined Targeting
```javascript
GET /contacts?pipelineId=xyz&audienceType=prospects&currentStage=aware

→ Contact.findMany({ 
    where: { 
      pipelineId: "xyz",
      audienceType: "prospects",
      currentStage: "aware"
    } 
  })

// All prospects who are just aware (need personal invite!)
```

### 5. Org-Wide Targeting
```javascript
GET /contacts?orgId=org123&engagementValue=4

→ Contact.findMany({ 
    where: { 
      orgId: "org123",
      engagementValue: 4
    } 
  })

// All high-engagement contacts in your org (any pipeline)
```

### 6. Event-Specific Targeting
```javascript
GET /contacts?eventId=event456&attended=false

→ Contact.findMany({ 
    where: { 
      eventId: "event456",
      attended: false
    } 
  })

// Everyone registered who didn't show up
```

### 7. Chapter-Based Targeting
```javascript
GET /contacts?orgId=org123&chapterResponsibleFor=Manhattan

→ Contact.findMany({ 
    where: { 
      orgId: "org123",
      chapterResponsibleFor: "Manhattan"
    } 
  })

// All Manhattan chapter members
```

## Pipeline Creation Flow

### Event Pipeline:
```javascript
// 1. Create Event
const event = await prisma.event.create({
  data: {
    name: "Bros & Brews 2024",
    orgId: "org123"
  }
});

// 2. Create Pipeline
const pipeline = await prisma.pipeline.create({
  data: {
    name: "Bros & Brews Event Funnel",
    type: "event",
    orgId: "org123",
    audiences: ["org_members", "prospects", "donors"],
    stages: ["aware", "invited", "rsvped", "paid", "attended"]
  }
});

// 3. Add Contacts to Pipeline
await prisma.contact.updateMany({
  where: { 
    orgId: "org123",
    isOrgMember: true 
  },
  data: {
    pipelineId: pipeline.id,
    audienceType: "org_members",
    currentStage: "aware",
    eventId: event.id
  }
});
```

### Nurture Pipeline:
```javascript
// Create nurture pipeline
const pipeline = await prisma.pipeline.create({
  data: {
    name: "Q1 2024 Nurture",
    type: "nurture",
    orgId: "org123",
    audiences: ["prospects", "inactive"],
    stages: ["identified", "contacted", "engaged", "converted"]
  }
});

// Add prospects
await prisma.contact.updateMany({
  where: { 
    orgId: "org123",
    engagementValue: { lte: 2 }
  },
  data: {
    pipelineId: pipeline.id,
    audienceType: "prospects",
    currentStage: "identified"
  }
});
```

## Campaign Targeting

```javascript
// Campaign: "Invite Org Members to Bros & Brews"
const recipients = await prisma.contact.findMany({
  where: {
    pipelineId: "pipeline_bros_brews",
    audienceType: "org_members",
    currentStage: "aware"
  }
});

await createCampaign({
  name: "Personal Invite - Org Members",
  recipients: recipients.map(c => c.id),
  template: "event_invite_personal"
});

// After sending, move them to "invited"
await prisma.contact.updateMany({
  where: { 
    id: { in: recipients.map(c => c.id) } 
  },
  data: { 
    currentStage: "invited" 
  }
});
```

## The Queries

**Everything is Contact-based:**

```javascript
// Org members
Contact.findMany({ where: { orgId, isOrgMember: true } })

// Event attendees
Contact.findMany({ where: { eventId } })

// Pipeline contacts
Contact.findMany({ where: { pipelineId } })

// Pipeline + Stage
Contact.findMany({ where: { pipelineId, currentStage } })

// Pipeline + Audience
Contact.findMany({ where: { pipelineId, audienceType } })

// Pipeline + Audience + Stage
Contact.findMany({ where: { pipelineId, audienceType, currentStage } })

// Chapter members
Contact.findMany({ where: { chapterResponsibleFor } })
```

**No more OrgMember or EventAttendee joins!**

## Benefits

✅ **One Query, One Table** - Everything on Contact  
✅ **Pipeline-Based Targeting** - Flexible journey tracking  
✅ **Multi-Audience Support** - Same pipeline, different audiences  
✅ **Stage Progression** - Move contacts through funnel  
✅ **Chapter Support** - Built-in with chapterResponsibleFor  
✅ **Fast Queries** - Indexed on [pipelineId, audienceType, currentStage]  

## Migration

See `scripts/flatten-to-contact-with-pipelines.js`

