# 🎯 SINGLE SOURCE OF TRUTH

## Official Pipeline Stages

These are the ONLY valid stages. They match `schema.prisma` and `EventAttendee.currentStage` in the database.

```javascript
[
  "in_funnel",
  "general_awareness",
  "personal_invite", 
  "expressed_interest",
  "rsvped",
  "paid",
  "attended"
]
```

## Official Audience Types

These are the ONLY valid audience types. They match `schema.prisma` and `EventAttendee.audienceType` in the database.

```javascript
[
  "org_members",
  "friends_family",
  "landing_page_public",
  "community_partners",
  "cold_outreach"
]
```

---

## Where This Is Defined

1. **Prisma Schema** (`prisma/schema.prisma` line 33-34)
   - `pipelineDefaults` - default stages for new events
   - `audienceDefaults` - default audiences for new events
   - `EventAttendee.currentStage @default("in_funnel")` - default stage for new attendees

2. **Schema Config Route** (`routes/schemaConfigRoute.js` line 9-24)
   - Returns these exact values to frontend
   - NO dynamic querying - these are hardcoded

3. **Contact Event Upload Route** (`routes/contactEventUploadRoute.js` line 25-32)
   - Also returns these exact values for CSV upload flows

---

## ❌ DEPRECATED STAGES (DO NOT USE)

**Note:** `publicFormSubmissionRoute.js` has backward compatibility to auto-convert these.

- ~~`sop_entry`~~ - OLD stage name, replaced by `in_funnel`
- ~~`soft_commit`~~ - OLD stage name, auto-converts to `rsvped`
- ~~`rsvp`~~ - Incorrect grammar (missing 'd'), auto-converts to `rsvped`
- ~~`aware`, `interested`~~ - Even older stage names

## ❌ DEPRECATED AUDIENCES (DO NOT USE)

- ~~`business_sponsor`, `champions`~~ - OLD audience types
- ~~`local_businesses`, `general_public`~~ - Also old

---

## 🔒 Rule

**EventAttendee.currentStage in the database IS the source of truth.**

If code says one thing but database says another, **database wins**.

Never try to "rename" stages in code without a proper database migration!

