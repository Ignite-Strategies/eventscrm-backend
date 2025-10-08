# Forms Architecture - HubSpot-Style Form System

## 🎯 The Vision

**Forms are the primary intake mechanism for events.** Like HubSpot, forms drive people into pipelines where we track their journey.

---

## 🏗️ Architecture Overview

```
CRM Dashboard (Create Form)
  ↓ (saves config)
eventscrm-backend (Form Config Storage)
  ↓ (provides config)
ignite-ticketing (Dynamic Form Renderer)
  ↓ (submits data)
eventscrm-backend (Process Submission)
  ↓ (creates records)
OrgMember + EventAttendee (in database)
```

---

## 📊 Database Models

### EventPipeline - The Container
```prisma
model EventPipeline {
  id           String @id @default(cuid())
  eventId      String
  event        Event @relation(...)
  
  audienceType String // "org_members", "landing_page_public", "friends_family"
  stages       String[] // ["in_funnel", "soft_commit", "paid", ...]
  isActive     Boolean @default(true)
  
  // Relations
  attendees    EventAttendee[]
  forms        EventForm[] // ← Forms belong to pipelines
  
  createdAt DateTime @default(now())
  
  @@unique([eventId, audienceType])
}
```

### EventForm - The Configuration
```prisma
model EventForm {
  id           String @id @default(cuid())
  eventId      String
  event        Event @relation(...)
  
  pipelineId   String // ← Which pipeline does this form feed?
  pipeline     EventPipeline @relation(...)
  
  // Form Identity
  name         String // "Bros & Brews Slack Soft Commit"
  slug         String @unique // "bros-soft-commit-slack"
  description  String? // Internal note
  
  // Pipeline Integration
  targetStage  String // Where they land: "soft_commit"
  
  // Form Configuration
  fields       Json // Field definitions (see below)
  styling      Json? // Custom colors, fonts, etc.
  
  // Status
  isActive     Boolean @default(true)
  
  // Analytics
  submissionCount Int @default(0)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([pipelineId])
  @@index([slug])
}
```

### EventAttendee - The Result
```prisma
model EventAttendee {
  id           String @id @default(cuid())
  orgId        String
  eventId      String
  event        Event @relation(...)
  
  pipelineId   String // ← Linked to specific pipeline
  pipeline     EventPipeline @relation(...)
  
  orgMemberId  String
  orgMember    OrgMember @relation(...)
  
  // Current position
  currentStage String // "soft_commit" (from targetStage)
  
  // Submission metadata
  submittedFormId String? // Which form created this?
  notes        String? // JSON with form submission data
  
  attended     Boolean @default(false)
  amountPaid   Float @default(0)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([pipelineId, orgMemberId])
}
```

---

## 🎨 Form Configuration (JSON)

### Example: Soft Commit Form
```json
{
  "fields": [
    {
      "id": "name",
      "type": "text",
      "label": "Full Name",
      "placeholder": "John Smith",
      "required": true,
      "order": 1
    },
    {
      "id": "email",
      "type": "email",
      "label": "Email Address",
      "placeholder": "john@example.com",
      "required": true,
      "order": 2
    },
    {
      "id": "phone",
      "type": "tel",
      "label": "Phone Number",
      "placeholder": "(555) 555-5555",
      "required": true,
      "order": 3
    },
    {
      "id": "likelihood",
      "type": "select",
      "label": "How likely to attend?",
      "required": true,
      "options": [
        { "value": "definitely", "label": "Definitely" },
        { "value": "tentative", "label": "Tentative" },
        { "value": "checking", "label": "Checking with the M" }
      ],
      "order": 4
    },
    {
      "id": "bringing_others",
      "type": "select",
      "label": "Will you bring your M or others?",
      "required": true,
      "options": [
        { "value": "yes", "label": "Yes" },
        { "value": "no", "label": "No" }
      ],
      "order": 5
    },
    {
      "id": "party_size",
      "type": "number",
      "label": "Total in your party",
      "placeholder": "e.g. 2",
      "required": true,
      "min": 1,
      "max": 20,
      "order": 6
    }
  ],
  "submitButtonText": "Submit Soft Commit",
  "successMessage": "Thank you! We've received your soft commit."
}
```

---

## 🔄 Complete Flow

### Step 1: Admin Creates Form (CRM Dashboard)

**UI: FormBuilder.jsx**
```jsx
<FormBuilder>
  {/* Step 1: Event & Pipeline */}
  <EventSelection>
    <select>Event: Bros & Brews</select>
    <select>Pipeline: landing_page_public</select>
    <p>Audience: landing_page_public</p>
  </EventSelection>
  
  {/* Step 2: Form Details */}
  <FormDetails>
    <input name="Form Name" value="Bros & Brews Slack Soft Commit" />
    <select>Target Stage: soft_commit</select>
  </FormDetails>
  
  {/* Step 3: Field Builder (Drag & Drop) */}
  <FieldBuilder>
    <FieldLibrary>
      [Name] [Email] [Phone] [Text] [Number] [Select] [Checkbox]
    </FieldLibrary>
    <Canvas>
      {/* Drag fields here */}
      [Name Field] ✏️ ❌
      [Email Field] ✏️ ❌
      [Custom: Likelihood] ✏️ ❌
    </Canvas>
  </FieldBuilder>
  
  {/* Step 4: Review & Deploy */}
  <DeployForm>
    <p>Form URL: https://tickets.f3capital.com/forms/bros-soft-commit-slack</p>
    <p>Embed Code:</p>
    <code>
      <iframe src="https://tickets.f3capital.com/forms/bros-soft-commit-slack" />
    </code>
    <button>Save & Activate</button>
  </DeployForm>
</FormBuilder>
```

**API Call:**
```javascript
POST /api/forms
{
  eventId: "evt_brosbrews",
  pipelineId: "pipe_public",
  name: "Bros & Brews Slack Soft Commit",
  slug: "bros-soft-commit-slack",
  targetStage: "soft_commit",
  fields: [ /* field config */ ],
  isActive: true
}

Response:
{
  id: "form123",
  slug: "bros-soft-commit-slack",
  embedUrl: "https://tickets.f3capital.com/forms/bros-soft-commit-slack"
}
```

---

### Step 2: Embed Form (Landing Page)

**f3capital-landing/pages/softcommit.html**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Soft Commit - Bros & Brews</title>
</head>
<body>
  <h1>Soft Commit to Bros & Brews</h1>
  <p>Let us know you're coming!</p>
  
  <!-- Embed form from ignite-ticketing -->
  <iframe 
    src="https://tickets.f3capital.com/forms/bros-soft-commit-slack"
    width="100%"
    height="800"
    frameborder="0"
  ></iframe>
</body>
</html>
```

---

### Step 3: Render Form (ignite-ticketing)

**Route: /forms/:formSlug**

**ignite-ticketing/src/pages/FormPage.jsx**
```jsx
<FormPage>
  useEffect(() => {
    // Fetch form config from backend
    fetch(`${API_URL}/api/public/forms/${formSlug}`)
      .then(r => r.json())
      .then(config => setFormConfig(config));
  }, [formSlug]);
  
  return (
    <DynamicForm config={formConfig}>
      {/* Render fields dynamically based on config */}
      {formConfig.fields.map(field => (
        <FormField key={field.id} {...field} />
      ))}
      <button>{formConfig.submitButtonText}</button>
    </DynamicForm>
  );
</FormPage>
```

**API Call:**
```javascript
GET /api/public/forms/bros-soft-commit-slack

Response:
{
  id: "form123",
  eventId: "evt_brosbrews",
  pipelineId: "pipe_public",
  targetStage: "soft_commit",
  fields: [ /* field config */ ],
  submitButtonText: "Submit Soft Commit"
}
```

---

### Step 4: Submit Form (ignite-ticketing)

**User fills out form and clicks submit**

**API Call:**
```javascript
POST /api/public/forms/bros-soft-commit-slack/submit
{
  name: "John Smith",
  email: "john@example.com",
  phone: "(555) 555-5555",
  likelihood: "definitely",
  bringing_others: "yes",
  party_size: 2
}
```

---

### Step 5: Process Submission (eventscrm-backend)

**Backend Logic:**
```javascript
// routes/publicFormsRoute.js
router.post('/forms/:formSlug/submit', async (req, res) => {
  // 1. Load form config
  const form = await prisma.eventForm.findUnique({
    where: { slug: formSlug },
    include: { pipeline: true, event: true }
  });
  
  // 2. Parse name (assuming "name" field)
  const { name, email, phone, ...customFields } = req.body;
  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ');
  
  // 3. Find or create OrgMember
  let orgMember = await prisma.orgMember.findFirst({
    where: { 
      orgId: form.event.orgId, 
      email: email.toLowerCase() 
    }
  });
  
  if (!orgMember) {
    orgMember = await prisma.orgMember.create({
      data: {
        orgId: form.event.orgId,
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        role: null,
        firebaseId: null
      }
    });
  }
  
  // 4. Find or create EventAttendee
  let attendee = await prisma.eventAttendee.findUnique({
    where: {
      pipelineId_orgMemberId: {
        pipelineId: form.pipelineId,
        orgMemberId: orgMember.id
      }
    }
  });
  
  // 5. Smart stage progression
  if (attendee) {
    // Only move forward, never backward
    const shouldUpdate = shouldMoveForward(
      attendee.currentStage, 
      form.targetStage
    );
    
    if (shouldUpdate) {
      attendee = await prisma.eventAttendee.update({
        where: { id: attendee.id },
        data: {
          currentStage: form.targetStage,
          notes: JSON.stringify(customFields)
        }
      });
    }
  } else {
    // Create new attendee
    attendee = await prisma.eventAttendee.create({
      data: {
        orgId: form.event.orgId,
        eventId: form.eventId,
        pipelineId: form.pipelineId,
        orgMemberId: orgMember.id,
        currentStage: form.targetStage,
        submittedFormId: form.id,
        notes: JSON.stringify(customFields)
      }
    });
  }
  
  // 6. Increment form submission count
  await prisma.eventForm.update({
    where: { id: form.id },
    data: { submissionCount: { increment: 1 } }
  });
  
  res.json({ 
    success: true,
    attendeeId: attendee.id 
  });
});
```

---

## 🎛️ Form Types & Templates

### Soft Commit Form
- **Purpose:** Express interest in attending
- **Target Stage:** soft_commit
- **Common Fields:** Name, email, phone, likelihood, party size
- **Use Case:** Landing pages, QR codes, social media links

### RSVP Form
- **Purpose:** Confirm attendance
- **Target Stage:** expressed_interest
- **Common Fields:** Name, email, dietary restrictions, +1s
- **Use Case:** Follow-up emails, event reminders

### Waitlist Form
- **Purpose:** Join waitlist for sold-out events
- **Target Stage:** in_funnel
- **Common Fields:** Name, email, phone
- **Use Case:** Event capacity management

### Payment Form
- **Purpose:** Collect payment + info
- **Target Stage:** paid
- **Common Fields:** Name, email, payment method
- **Use Case:** Ticketed events (integrates with ignite-pay-backend)

---

## 📈 Analytics & Tracking

### Form-Level Metrics
```javascript
EventForm {
  submissionCount: 47,
  conversionRate: 0.23, // submitted / viewed
  lastSubmission: "2024-10-20T14:30:00Z"
}
```

### Pipeline Tracking
```javascript
// Track which forms feed which stages
EventPipeline {
  stages: {
    in_funnel: { count: 120, sources: ["csv_import", "manual_add"] },
    soft_commit: { count: 47, sources: ["form_bros-soft-commit-slack"] },
    paid: { count: 12, sources: ["stripe_webhook"] }
  }
}
```

---

## 🔒 Security

### Public Endpoints (No Auth)
- `GET /api/public/forms/:formSlug` - Anyone can view form config
- `POST /api/public/forms/:formSlug/submit` - Anyone can submit

**Security Measures:**
- Rate limiting (10 submissions per IP per hour)
- reCAPTCHA on form submission (future)
- Email verification (future)

### Protected Endpoints (Require Auth)
- `POST /api/forms` - Create form
- `PATCH /api/forms/:id` - Update form
- `DELETE /api/forms/:id` - Delete form
- `GET /api/forms/:id/submissions` - View submissions

---

## 🚀 MVP1 Implementation Plan

### Phase 1: Database Models ✅
- [x] Add EventPipeline model to Prisma
- [x] Add EventForm model to Prisma
- [x] Update EventAttendee to link to pipeline
- [x] Run migration

### Phase 2: Backend API
- [ ] `POST /api/forms` - Create form
- [ ] `GET /api/forms` - List forms for event
- [ ] `GET /api/public/forms/:slug` - Get form config
- [ ] `POST /api/public/forms/:slug/submit` - Submit form
- [ ] `PATCH /api/forms/:id` - Update form
- [ ] `DELETE /api/forms/:id` - Delete form

### Phase 3: CRM Dashboard
- [ ] Forms page (list all forms)
- [ ] FormBuilder page (create/edit forms)
- [ ] Field library (drag & drop)
- [ ] Form preview
- [ ] Embed code generator

### Phase 4: Form Renderer (ignite-ticketing)
- [ ] FormPage component
- [ ] DynamicForm component
- [ ] Field renderers (text, email, select, etc.)
- [ ] Form validation
- [ ] Success/error handling

### Phase 5: Integration
- [ ] Update landing pages to embed forms
- [ ] Test submission flow end-to-end
- [ ] Analytics dashboard

---

## 📝 Example: Bros & Brews Soft Commit

### 1. Create Form (CRM Dashboard)
```javascript
POST /api/forms
{
  eventId: "evt_brosbrews",
  pipelineId: "pipe_public",
  name: "Bros & Brews Soft Commit",
  slug: "bros-soft-commit-public",
  targetStage: "soft_commit",
  fields: [ /* see JSON example above */ ]
}
```

### 2. Embed (Landing Page)
```html
<iframe src="https://tickets.f3capital.com/forms/bros-soft-commit-public" />
```

### 3. Submit (User)
```javascript
POST /api/public/forms/bros-soft-commit-public/submit
{
  name: "John Smith",
  email: "john@example.com",
  phone: "(555) 555-5555",
  likelihood: "definitely",
  party_size: 2
}
```

### 4. Result (Database)
```javascript
OrgMember: "John Smith" (john@example.com)
  ↓
EventAttendee:
  - eventId: "evt_brosbrews"
  - pipelineId: "pipe_public"
  - orgMemberId: "om_johnsmith"
  - currentStage: "soft_commit"
  - submittedFormId: "form_bros-soft-commit-public"
```

### 5. View (CRM Dashboard)
```
EventPipelines → Bros & Brews → landing_page_public
  
Soft Commit (47)
├── John Smith (john@example.com)
│   likelihood: definitely, party_size: 2
├── Jane Doe (jane@example.com)
└── ...
```

---

## 🎯 Key Principles

1. **Forms feed pipelines** - Every form belongs to a pipeline
2. **Config-driven** - No hardcoding, everything from database
3. **Reusable** - Same form can be embedded anywhere
4. **Trackable** - Know which forms drive conversions
5. **Flexible** - Custom fields per form
6. **Smart** - Never downgrade stages

**This is HubSpot-level form power for events!**

