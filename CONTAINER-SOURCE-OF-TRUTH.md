# 🔥 CONTAINER IS SOURCE OF TRUTH 🔥

## The One Universal Law

**EVERY CONTACT MUST HAVE:**
- **`containerId`** - The source of truth! Where they live!
- **`orgId`** - Optional context (are they an org member?)
- **`eventId`** - Optional context (are they attending an event?)

## The Architecture

```
Container (F3 CRM)
  ├── containerId: 'cmgu7w02h0000ceaqt7iz6bf9'
  │
  └── Contacts (Everyone lives here!)
       ├── Contact 1: { containerId, orgId, eventId }
       ├── Contact 2: { containerId, orgId, null }
       ├── Contact 3: { containerId, null, eventId }
       └── Contact 4: { containerId, null, null }
```

## Why containerId is Source of Truth

1. **Universal Grouping** - All contacts belong to a container
2. **Flexible Context** - Can have org, event, both, or neither
3. **No Orphans** - Every contact has a home (container)
4. **Scalable** - Future: Multiple containers, different orgs

## The Golden Rules

### ✅ ALWAYS Set containerId
```javascript
// GOOD - Every contact has a home
{
  email: 'john@example.com',
  containerId: 'cmgu7w02h0000ceaqt7iz6bf9', // ✅ Source of truth!
  orgId: 'cmgfvz9v10000nt284k875eoc'       // ✅ Context
}
```

### ❌ NEVER Create Contact Without containerId
```javascript
// BAD - Orphaned contact with no container!
{
  email: 'john@example.com',
  orgId: 'cmgfvz9v10000nt284k875eoc' // ❌ Where do they live?
}
```

## API Endpoints

### Create/Update Contact
```javascript
POST /api/contacts
{
  email: 'john@example.com',
  containerId: 'cmgu7w02h0000ceaqt7iz6bf9', // REQUIRED!
  orgId: 'cmgfvz9v10000nt284k875eoc',      // Optional
  eventId: 'cmggljv7z0002nt28gckp1jpe',    // Optional
  firstName: 'John',
  lastName: 'Doe'
}
```

### Query Contacts
```javascript
// Get ALL contacts in container
GET /api/contacts?containerId=cmgu7w02h0000ceaqt7iz6bf9

// Get org members in container
GET /api/contacts?containerId=cmgu7w02h0000ceaqt7iz6bf9&orgId=xxx

// Get event attendees in container
GET /api/contacts?containerId=cmgu7w02h0000ceaqt7iz6bf9&eventId=xxx
```

## Current Container Setup (HARDCODED FOR NOW)

**Container ID**: `cmgu7w02h0000ceaqt7iz6bf9`
**Container Name**: `F3 CRM`
**Organization ID**: `cmgfvz9v10000nt284k875eoc`
**Organization Name**: `F3`
**Event ID**: `cmggljv7z0002nt28gckp1jpe`
**Event Name**: `Bros & Brews`

### Why Hardcoded?

**For now**, we hardcode these values in the backend routes because:
- 🎯 **Single tenant** - Only F3 CRM using the system
- ⚡ **Fast to implement** - No config complexity
- 🔧 **Easy to maintain** - All in one place

**When white labeling**, we'll make it dynamic with:
- 📦 **Config files** - Container/org settings per deployment
- 🌍 **Environment variables** - Different values per environment
- 💾 **Local storage** - Frontend caching
- 🔑 **CUIDs saved** - Pushed to config for always-on usage

**But for MVP: HARDCODE IT ALL!** 🔥

## Migration Checklist

When creating/updating contacts, ALWAYS ensure:
- ✅ `containerId` is set (default: `cmgu7w02h0000ceaqt7iz6bf9`)
- ✅ `orgId` is set if they're an org member
- ✅ `eventId` is set if they're attending an event
- ✅ Contact model has ALL fields (no separate OrgMember/EventAttendee)

## Database Verification

```sql
-- Check if all contacts have containerId
SELECT 
  COUNT(*) as total_contacts,
  COUNT("containerId") as with_container,
  COUNT("orgId") as with_org
FROM "Contact";

-- Should return: total = with_container (100% coverage!)
```

## Why This Matters

**Without containerId:** Contacts are orphans, can't be grouped, hydration fails
**With containerId:** Everything works, scalable, future-proof

## Remember

**CONTAINER IS SOURCE OF TRUTH!**
**EVERYONE LIVES IN A CONTAINER!**
**NO ORPHANS ALLOWED!**

🔥🔥🔥
