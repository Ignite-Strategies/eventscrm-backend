# Enterprise Email Orchestrator - Architecture

## 🎯 The Big Picture

**Enterprise Email = The Container/Orchestrator**

```
┌─────────────────────────────────────────────────────────────┐
│              ENTERPRISE EMAIL ORCHESTRATOR                   │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │   WHO    │    │   WHAT   │    │   WHEN   │             │
│  │          │    │          │    │          │             │
│  │ Contact  │ +  │ Template │ +  │ Schedule │  = 🚀 SEND  │
│  │  List    │    │          │    │          │             │
│  └──────────┘    └──────────┘    └──────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 The Three Components

### 1️⃣ WHO - Contact List
```javascript
{
  contactListId: "list_123",
  // Auto-loads: 
  // - All contacts in list
  // - Filters out bounced emails
  // - Checks opt-outs
}
```

### 2️⃣ WHAT - Template
```javascript
{
  templateId: "tmpl_123",
  // OR
  customContent: {
    subject: "Custom subject",
    html: "<p>Custom HTML</p>"
  },
  // Supports:
  // - Saved templates
  // - One-off custom emails
  // - Variable substitution {{firstName}}
}
```

### 3️⃣ WHEN - Schedule
```javascript
{
  sendType: "immediate" | "scheduled" | "drip",
  
  // For scheduled:
  scheduledFor: "2025-10-20T10:00:00Z",
  timezone: "America/New_York",
  
  // For drip:
  delaySeconds: 2,        // Between emails
  batchSize: 100,         // Per batch
  
  // Rate limiting:
  maxPerHour: 1000
}
```

---

## 🎬 Orchestration Flow

```javascript
POST /api/enterprise-email/orchestrate

{
  // WHO
  contactListId: "list_123",
  
  // WHAT
  templateId: "tmpl_456",
  variables: { eventName: "Bros & Brews 2025" },
  
  // WHEN
  sendType: "scheduled",
  scheduledFor: "2025-10-20T09:00:00Z",
  timezone: "America/Chicago",
  delaySeconds: 2
}

↓

Orchestrator:
1. ✅ Validate contact list exists
2. ✅ Load template content
3. ✅ Get all contacts (with smart refresh)
4. ✅ Filter out opt-outs/bounces
5. ✅ Calculate send window
6. ✅ Create SendJob record
7. ✅ If immediate → Send now
8. ✅ If scheduled → Queue for later
9. ✅ Return job ID for tracking
```

---

## 🔄 Send Types

### Immediate Send
```javascript
{
  sendType: "immediate",
  delaySeconds: 2  // Between emails
}

→ Starts sending right away
→ 2-second delay between each
→ Returns immediately with job ID
```

### Scheduled Send
```javascript
{
  sendType: "scheduled",
  scheduledFor: "2025-10-20T09:00:00Z",
  timezone: "America/Chicago"
}

→ Creates scheduled job
→ Background worker picks it up
→ Sends at exact time
```

### Drip Campaign
```javascript
{
  sendType: "drip",
  startAt: "2025-10-15T09:00:00Z",
  sequences: [
    { delay: 0, templateId: "invite" },
    { delay: 3, templateId: "reminder" },  // 3 days later
    { delay: 7, templateId: "last_call" }  // 7 days after first
  ]
}

→ Creates sequence of jobs
→ Each sends on schedule
```

---

## 📊 Database Schema

### SendJob Table
```prisma
model SendJob {
  id            String   @id @default(cuid())
  orgId         String
  
  // WHO
  contactListId String
  contactList   ContactList @relation(...)
  
  // WHAT
  templateId    String?
  template      Template? @relation(...)
  subject       String   // Resolved subject
  html          String   // Resolved HTML
  
  // WHEN
  sendType      String   // "immediate" | "scheduled" | "drip"
  scheduledFor  DateTime?
  timezone      String?
  delaySeconds  Int      @default(2)
  
  // STATUS
  status        String   // "pending" | "sending" | "sent" | "failed"
  totalContacts Int
  sentCount     Int      @default(0)
  failedCount   Int      @default(0)
  
  // TRACKING
  startedAt     DateTime?
  completedAt   DateTime?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

---

## 🎯 API Endpoints

### Main Orchestrator
```javascript
POST /api/enterprise-email/orchestrate
{
  contactListId: "list_123",
  templateId: "tmpl_456",
  sendType: "scheduled",
  scheduledFor: "2025-10-20T09:00:00Z"
}

Response:
{
  jobId: "job_789",
  status: "scheduled",
  scheduledFor: "2025-10-20T09:00:00Z",
  totalContacts: 150,
  estimatedDuration: "5 minutes"
}
```

### Check Job Status
```javascript
GET /api/enterprise-email/jobs/:jobId

Response:
{
  id: "job_789",
  status: "sending",
  totalContacts: 150,
  sentCount: 75,
  failedCount: 2,
  progress: 50, // percentage
  startedAt: "2025-10-20T09:00:00Z",
  estimatedCompletion: "2025-10-20T09:05:00Z"
}
```

### Cancel Job
```javascript
DELETE /api/enterprise-email/jobs/:jobId

Response:
{
  message: "Job cancelled",
  sentCount: 75,  // Already sent
  cancelledCount: 75  // Not sent
}
```

---

## 🧩 Integration Points

### With Contact Lists
```javascript
// Orchestrator calls:
const contacts = await ContactListService.getContactsForList(listId);

// Gets:
// - Fresh contact data
// - Auto-refreshes if stale
// - Filters opt-outs
// - Returns sendable contacts
```

### With Templates
```javascript
// Orchestrator calls:
const template = await TemplateService.getTemplate(templateId);

// Gets:
// - Subject line
// - HTML content
// - Default variables
// - Tracks usage
```

### With Scheduling
```javascript
// Orchestrator calls:
await SchedulerService.scheduleJob({
  jobId: "job_789",
  executeAt: scheduledFor,
  action: "send-email"
});

// Background worker:
// - Picks up at scheduled time
// - Calls enterprise-email/execute-job
// - Sends emails
```

---

## 🎨 Frontend Flow

```javascript
// Campaign Wizard

Step 1: Select Contact List
  → Shows all lists with contact counts
  → User selects one

Step 2: Choose Template
  → Shows saved templates
  → OR create custom
  → Preview with variables

Step 3: Schedule
  ┌─────────────────────────────┐
  │ When should we send?        │
  │                             │
  │ ○ Send immediately          │
  │ ● Schedule for later        │
  │                             │
  │   Date: [Oct 20, 2025]      │
  │   Time: [9:00 AM]           │
  │   Timezone: [CT]            │
  │                             │
  │ Delay between emails:       │
  │   [2] seconds               │
  └─────────────────────────────┘

Step 4: Review & Launch
  ┌─────────────────────────────┐
  │ Campaign Summary            │
  │                             │
  │ WHO: F3 Members (150)       │
  │ WHAT: Bros & Brews Invite   │
  │ WHEN: Oct 20 at 9:00 AM CT  │
  │                             │
  │ [Schedule Campaign] 🚀      │
  └─────────────────────────────┘
```

---

## 🔮 Future Enhancements

### Smart Scheduling
```javascript
{
  sendType: "optimized",
  optimizeFor: "open_rate",
  
  // AI determines best time based on:
  // - Historical open rates
  // - Contact timezone
  // - Day of week patterns
}
```

### A/B Testing
```javascript
{
  abTest: {
    enabled: true,
    variants: [
      { subject: "Option A", percentage: 50 },
      { subject: "Option B", percentage: 50 }
    ],
    winnerCriteria: "open_rate"
  }
}
```

### Conditional Logic
```javascript
{
  rules: [
    {
      if: "opened_previous_email",
      then: "send_template_A",
      else: "send_template_B"
    }
  ]
}
```

---

## 🎯 The Container Pattern

```
Enterprise Email Orchestrator
│
├─ Grabs Contact List (WHO)
│  └─ ContactListService.getContacts()
│
├─ Grabs Template (WHAT)
│  └─ TemplateService.getTemplate()
│
├─ Handles Schedule (WHEN)
│  ├─ Immediate: Send now
│  ├─ Scheduled: Queue for later
│  └─ Drip: Create sequence
│
└─ Executes Send
   ├─ Personalizes each email
   ├─ Sends via SendGrid
   ├─ Tracks delivery
   └─ Updates status
```

---

**TL;DR:**

Enterprise Email = **Universal Container**
- Takes ANY list
- Takes ANY template  
- Sends at ANY time
- Orchestrates EVERYTHING

🎯 One API to rule them all!


