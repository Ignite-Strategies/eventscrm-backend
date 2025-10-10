# EventAttendee Schema - SINGLE SOURCE OF TRUTH

## 📊 Complete Field Definitions

### Core Identity Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | Yes | Unique record ID (cuid) |
| `orgId` | String | Yes | Organization context |
| `eventId` | String | Yes | Which event this is for |
| `contactId` | String | Yes | Links to Contact (universal person) |

### Pipeline Tracking Fields
| Field | Type | Required | Default | Valid Values | Description |
|-------|------|----------|---------|--------------|-------------|
| `currentStage` | String | Yes | `"in_funnel"` | See below ⬇️ | Current position in funnel |
| `audienceType` | String | Yes | - | See below ⬇️ | How they were added |

### Form Tracking
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `submittedFormId` | String | No | Which PublicForm created this attendee |

### Attendance Data
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `attended` | Boolean | Yes | `false` | Did they show up? |
| `checkedInAt` | DateTime | No | - | When they checked in |
| `ticketType` | String | No | - | VIP, General, etc. |
| `amountPaid` | Float | Yes | `0` | Ticket cost paid |
| `notes` | String | No | - | JSON with custom form field responses |

### Timestamps
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `createdAt` | DateTime | Yes | When record was created |
| `updatedAt` | DateTime | Yes | Last update timestamp |

---

## 🎯 Valid Values (FROM SCHEMA COMMENTS)

### `currentStage` - Current position in funnel
**Valid Values:**
1. `in_funnel` - Initial entry, in the funnel
2. `general_awareness` - Aware of the event
3. `personal_invite` - Personally invited
4. `expressed_interest` - Showed interest
5. `soft_commit` - Soft commitment made
6. `paid` - Paid for ticket

**Source:** `prisma/schema.prisma` line 680

---

### `audienceType` - How they were added
**Valid Values:**
1. `org_members` - Internal team members
2. `friends_family` - Personal network (friends/family)
3. `landing_page_public` - Public signups from landing page
4. `community_partners` - Partner organizations
5. `cold_outreach` - Cold prospects/outreach

**Source:** `prisma/schema.prisma` line 392

---

## 🔒 Unique Constraints

**One contact per event + audience type combo:**
```prisma
@@unique([eventId, contactId, audienceType])
```

**Meaning:** The same person can be in the SAME event multiple times, but only if they're in DIFFERENT audience types.

**Example:**
```javascript
// ✅ VALID - Same person, same event, different audiences
EventAttendee { eventId: "bros-brews", contactId: "john-123", audienceType: "org_members" }
EventAttendee { eventId: "bros-brews", contactId: "john-123", audienceType: "friends_family" }

// ❌ INVALID - Duplicate
EventAttendee { eventId: "bros-brews", contactId: "john-123", audienceType: "org_members" }
EventAttendee { eventId: "bros-brews", contactId: "john-123", audienceType: "org_members" }
```

---

## 📋 Database Indexes

For query performance:
- `@@index([eventId, currentStage])` - Get all attendees at a specific stage
- `@@index([eventId, contactId])` - Check if contact is in event
- `@@index([eventId, audienceType])` - Get all attendees by audience
- `@@index([orgId])` - Get all attendees for org
- `@@index([contactId])` - Get all events for a contact

---

## 🚫 WHAT NOT TO DO

### ❌ DO NOT hardcode stages or audiences in frontend
```javascript
// BAD - Hardcoding
const stages = ['aware', 'prospect', 'registered'];
```

### ✅ DO fetch from schema config or existing records
```javascript
// GOOD - Hydrate from schema
const response = await api.get('/api/schema/event-attendee');
const { stages, audienceTypes } = response.data;
```

### ❌ DO NOT use old pipeline config routes
```javascript
// BAD - Deprecated route
await api.get(`/events/${eventId}/pipeline-config`); // DELETED!
```

### ✅ DO use EventAttendee data directly
```javascript
// GOOD - Get stages from existing attendees
const attendees = await api.get(`/events/${eventId}/attendees`);
const stages = [...new Set(attendees.map(a => a.currentStage))];
```

---

## 🔄 Typical Flow

### 1. Public Form Submission
```
User fills out form → 
Contact created/updated → 
EventAttendee created with:
  - currentStage = form.targetStage (e.g., "soft_commit")
  - audienceType = form.audienceType (e.g., "landing_page_public")
  - submittedFormId = form.id
  - notes = JSON of custom field responses
```

### 2. CSV Upload
```
Admin uploads CSV → 
Contacts created/updated →
EventAttendees created with:
  - currentStage = admin selection (e.g., "general_awareness")
  - audienceType = admin selection (e.g., "org_members")
  - submittedFormId = null
  - notes = null
```

### 3. Stage Movement
```
Admin moves contact in pipeline →
PATCH /api/events/:eventId/attendees/:attendeeId
  - Update currentStage field
  - updatedAt auto-updates
```

---

## 🎓 Summary

**EventAttendee is the SINGLE SOURCE OF TRUTH for:**
- ✅ Who is invited/attending each event
- ✅ What stage they're in
- ✅ Which audience they belong to
- ✅ What form they filled out (if any)
- ✅ Custom data they submitted

**It is NOT:**
- ❌ Defined by Event.pipelines array (deprecated)
- ❌ Defined by Organization.pipelineDefaults (legacy)
- ❌ Configured through separate pipeline config routes (deleted)

**Simple rule:**
> If you need stages or audiences → Look at EventAttendee schema or existing records. NEVER hardcode.

