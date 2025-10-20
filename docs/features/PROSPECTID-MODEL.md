# 🎯 PROSPECTID - The Conversion Tracker

## What Is It?

**prospectId** = A unique ID for people who interacted with you but haven't joined your org yet.

```
No prospectId, No orgId = Anonymous (not in system)
Has prospectId, No orgId = PROSPECT (clicked ad, filled form, curious)
Has prospectId, Has orgId = CONVERTED! (became org member)
```

---

## When It's Created:

### Form Submission (First Touch):
```javascript
// User fills out form for Bros & Brews
POST /api/forms/submit
{
  email: "john@example.com",
  // ... form data
}

// Backend checks:
if (!contact.orgId && !contact.prospectId) {
  // First time we're seeing this person
  contact.prospectId = generateProspectId();  // "pct_abc123"
  contact.becameProspectAt = new Date();
}
```

---

## Contact States:

### State 1: Prospect (CURIOUS Stage)
```javascript
{
  email: "john@example.com",
  prospectId: "pct_abc123",  // ✅ Has prospect ID
  becameProspectAt: "2025-10-18",
  orgId: null,                // ❌ NO org membership
  eventId: null
}

// MemberJourney: CURIOUS
```

### State 2: Converted (ACTIVATED Stage)
```javascript
{
  email: "john@example.com",
  prospectId: "pct_abc123",  // ✅ Still has it (for tracking)
  becameProspectAt: "2025-10-18",
  orgId: "f3-capital-id",     // ✅ NOW HAS ORG!
  eventId: "bros-and-brews-id",
  convertedToOrgAt: "2025-11-15"  // When orgId was set
}

// MemberJourney: ACTIVATED
```

---

## The Value:

### Conversion Reporting:
```sql
-- Total prospects
SELECT COUNT(*) FROM Contact WHERE prospectId IS NOT NULL;

-- Total converted
SELECT COUNT(*) FROM Contact 
WHERE prospectId IS NOT NULL AND orgId IS NOT NULL;

-- Conversion rate
SELECT 
  COUNT(*) FILTER (WHERE orgId IS NOT NULL)::float / COUNT(*) * 100 as conversion_rate
FROM Contact
WHERE prospectId IS NOT NULL;
```

### Time to Conversion:
```sql
SELECT 
  AVG(convertedToOrgAt - becameProspectAt) as avg_time_to_convert
FROM Contact
WHERE convertedToOrgAt IS NOT NULL;
```

---

## How It's Used:

### Journey Stage Logic:
```javascript
function determineMemberStage(contact) {
  // CURIOUS: Prospect but not member
  if (contact.prospectId && !contact.orgId) {
    return "CURIOUS";
  }
  
  // ACTIVATED: Has orgId (converted!)
  if (contact.orgId && contact.eventId) {
    return "ACTIVATED";
  }
  
  // CHAMPION: Made donation
  if (contact.amountPaid > 0) {
    return "CHAMPION";
  }
  
  return "AWARE";  // Default
}
```

---

## Future Enhancements (UTM Later):

Once you add UTM tracking, you can link:
```javascript
{
  prospectId: "pct_abc123",
  utmSource: "google",
  utmCampaign: "bros_brews_nov",
  // Shows: This prospect came from Google Ads campaign "bros_brews_nov"
}
```

Then you can answer:
- "Which Google campaign brought the most prospects?"
- "Which prospects from Facebook ads actually converted?"
- "What's our cost per conversion by channel?"

---

## Bottom Line:

**prospectId** = Your ad conversion tracking foundation.

- ✅ Simple (just a unique ID)
- ✅ Automatic (generated on first touch)
- ✅ Persistent (stays even after conversion)
- ✅ Measurable (count prospects vs converted)

**Build this first. UTM comes later when you're ready.** 🎯

