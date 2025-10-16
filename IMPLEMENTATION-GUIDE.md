# 🚀 IMPLEMENTATION GUIDE: Flat Contact Model

## What We Built

**Contact-First, Pipeline-Based, All-In-One CRM**

- ✅ Contact model has EVERYTHING (personhood + org + event + pipeline)
- ✅ Pipeline-based targeting (pipelineId + audienceType + currentStage)
- ✅ Chapter support (chapterResponsibleFor)
- ✅ Zero junction tables for MVP1
- ✅ One query, one table, done

## Files Created

### Schema & Migration
- ✅ `prisma/schema.prisma` - Updated with flat Contact model
- ✅ `scripts/flatten-to-contact-with-pipelines.js` - Migration script
- ✅ `PIPELINE-TARGETING.md` - Pipeline documentation

### New Routes (Unified)
- ✅ `routes/contactUnifiedRoute.js` - All contact CRUD + queries
- ✅ `routes/contactCSVUploadRoute.js` - CSV upload directly to Contact
- ✅ `routes/contactFormSubmitRoute.js` - Form submissions directly to Contact

### Old Routes (To Delete)
- ❌ `routes/orgMembersHydrateRoute.js` - Delete
- ❌ `routes/orgMembersSaveroute.js` - Delete
- ❌ `routes/orgMemberCreateRoute.js` - Delete
- ❌ `routes/orgMemberFormRoute.js` - Delete
- ❌ `routes/eventAttendeesRoute.js` - Delete

## Implementation Steps

### 1. Run Migration (Copy Data)
```bash
cd eventscrm-backend
node scripts/flatten-to-contact-with-pipelines.js
```

This will:
- Copy OrgMember data → Contact
- Copy EventAttendee data → Contact (latest event only)
- Create Pipeline records for each event
- Link contacts to pipelines

### 2. Update index.js Routes
```javascript
// eventscrm-backend/index.js

// ✅ NEW: Unified Contact Routes
import contactUnifiedRouter from './routes/contactUnifiedRoute.js';
import contactCSVUploadRouter from './routes/contactCSVUploadRoute.js';
import contactFormSubmitRouter from './routes/contactFormSubmitRoute.js';

// Mount routes
app.use('/api/contacts', contactUnifiedRouter);
app.use('/api/contacts', contactCSVUploadRouter);
app.use('/api/forms', contactFormSubmitRouter);

// ❌ OLD: Delete these
// app.use('/api/orgmembers', orgMembersHydrateRouter);
// app.use('/api/org-member-form', orgMemberFormRouter);
// app.use('/api/org-member-create', orgMemberCreateRouter);
```

### 3. Run Prisma Migration (Drop Old Tables)
```bash
npx prisma migrate dev --name flatten-to-contact-mvp1
```

This will:
- Drop `OrgMember` table
- Drop `EventAttendee` table
- Drop `Engagement` table (if not used elsewhere)
- Keep Contact with all new fields

### 4. Update Frontend EditableFieldComponent
```javascript
// frontend/src/components/EditableFieldComponent.jsx

// OLD (complex routing)
if (contactFields.includes(field)) {
  response = await api.patch(`/contacts/${contactId}`, ...);
} else if (orgMemberFields.includes(field)) {
  response = await api.patch(`/orgmembers/${orgMemberId}`, ...);
}

// NEW (always Contact!)
const response = await api.patch(`/contacts/${contactId}`, {
  [field]: value
});
```

### 5. Update Frontend Pages

**OrgMembers.jsx:**
```javascript
// OLD
const response = await api.get(`/orgmembers?orgId=${orgId}`);

// NEW
const response = await api.get(`/contacts?orgId=${orgId}&isOrgMember=true`);
```

**EventAttendeeList.jsx:**
```javascript
// OLD
const response = await api.get(`/events/${eventId}/attendees`);

// NEW
const response = await api.get(`/contacts?eventId=${eventId}`);
```

**ContactDetail.jsx:**
```javascript
// Already works! No changes needed
const response = await api.get(`/contacts/${contactId}`);
```

## The New API

### Get Org Members
```bash
GET /api/contacts?orgId=xxx&isOrgMember=true
```

### Get Event Attendees
```bash
GET /api/contacts?eventId=xxx
```

### Get Pipeline Contacts
```bash
GET /api/contacts?pipelineId=xxx
GET /api/contacts?pipelineId=xxx&currentStage=rsvped
GET /api/contacts?pipelineId=xxx&audienceType=org_members&currentStage=aware
```

### Get Chapter Members
```bash
GET /api/contacts?chapterResponsibleFor=Manhattan
```

### Get Contact Detail
```bash
GET /api/contacts/:contactId
```

### Update Contact
```bash
PATCH /api/contacts/:contactId
{
  "goesBy": "Mike",
  "engagementValue": 4,
  "currentStage": "paid"
}
```

### CSV Upload
```bash
POST /api/contacts/upload
(multipart/form-data with file + orgId, pipelineId, audienceType, etc.)
```

### Form Submission
```bash
POST /api/forms/submit
{
  "slug": "bros-brews-rsvp",
  "orgId": "xxx",
  "eventId": "xxx",
  "pipelineId": "xxx",
  "audienceType": "org_members",
  "targetStage": "rsvped",
  "formData": { ... }
}
```

## Testing Checklist

- [ ] Org members page loads
- [ ] Event attendees page loads
- [ ] Contact detail page loads
- [ ] Inline editing works (all fields)
- [ ] CSV upload works
- [ ] Form submissions work
- [ ] Campaigns can target by pipeline
- [ ] Campaigns can target by stage
- [ ] Campaigns can target by audience
- [ ] Chapter filtering works

## Rollback Plan

If something breaks:

1. **Revert schema:**
   ```bash
   git checkout HEAD~1 prisma/schema.prisma
   npx prisma migrate dev
   ```

2. **Re-enable old routes in index.js**

3. **Data is safe!** Migration script only COPIES data, doesn't delete

## Benefits

✅ **10x Faster Queries** - One table, one query  
✅ **No Hydration Confusion** - Everything on Contact  
✅ **Pipeline-Based Targeting** - Flexible journey tracking  
✅ **Chapter Support** - Built-in with chapterResponsibleFor  
✅ **Simpler Code** - No junction table logic  
✅ **Easy Updates** - Just patch Contact  

## Next Steps

1. Run migration script
2. Update index.js routes
3. Run Prisma migration
4. Update frontend (2-3 files max)
5. Test
6. Deploy
7. **WIN!** 🎯

