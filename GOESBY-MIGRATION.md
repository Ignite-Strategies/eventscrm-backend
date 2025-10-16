# 🚨 GOESBY FIELD MIGRATION ISSUE

**Date:** October 16, 2025  
**Status:** 🔥 CRITICAL - Partial migration causing data inconsistency

---

## 📋 The Problem

`goesBy` (nickname/preferred name) was **moved from OrgMember to Contact** as part of "universal personhood" architecture, but **some code still tries to read it from OrgMember**!

### Schema Reality:

```prisma
model Contact {
  id        String @id
  firstName String
  lastName  String
  goesBy    String?  // ✅ LIVES HERE NOW (universal personhood)
  
  orgMemberId String?
  orgMember   OrgMember? @relation(...)
}

model OrgMember {
  id     String @id
  goesBy String?  // ❌ DEPRECATED FIELD - Should NOT be used anymore!
}
```

**The Issue:** Some routes still read `orgMember.goesBy` instead of `contact.goesBy`!

---

## 🔍 Where It's Broken

### ✅ FIXED (October 16, 2025):
1. **`services/contactListService.js`** - Now checks `contact.goesBy` first
2. **`services/campaignContactService.js`** - Now checks `contact.goesBy` first

### ❌ STILL BROKEN:
1. **`routes/orgMembersHydrateRoute.js`** (Line 149)
   ```javascript
   goesBy: orgMember.goesBy,  // ❌ WRONG! Should be contact.goesBy
   ```

2. **`routes/contactHydrateRoute.js`** (Line 45)
   ```javascript
   goesBy: contact.orgMember.goesBy,  // ❌ WRONG! Should be contact.goesBy
   ```

---

## 🎯 The Fix Pattern

**WRONG (old way):**
```javascript
goesBy: orgMember.goesBy  // ❌ Only checks OrgMember
goesBy: contact.orgMember?.goesBy  // ❌ Still only checks OrgMember
```

**RIGHT (new way):**
```javascript
// Priority: Universal field > Org-specific (legacy) > Fallback
goesBy: contact.goesBy || contact.orgMember?.goesBy || contact.firstName
```

This gives us:
1. **First:** Check `contact.goesBy` (the new universal field) ✅
2. **Second:** Check `orgMember.goesBy` (legacy, for migration safety)
3. **Last:** Fall back to `firstName` if nothing is set

---

## 💥 Impact

### What Breaks:
- **OrgMembers hydration route** returns wrong/missing nicknames
- **Contact hydration route** returns wrong/missing nicknames
- **Campaign previews** show "Jack" instead of actual nickname
- **Email personalization** uses wrong names

### What Works:
- ✅ Contact list loading (fixed)
- ✅ Campaign contact loading (fixed)

---

## 🛠️ Files That Need Fixing

### 1. `routes/orgMembersHydrateRoute.js`
**Line 149:**
```javascript
// BEFORE:
goesBy: orgMember.goesBy,

// AFTER:
goesBy: orgMember.contact?.goesBy || orgMember.goesBy || orgMember.contact?.firstName,
```

**Note:** OrgMember has reverse relation to Contact, so we check `orgMember.contact.goesBy`

---

### 2. `routes/contactHydrateRoute.js`
**Line 45:**
```javascript
// BEFORE:
goesBy: contact.orgMember.goesBy,

// AFTER:
goesBy: contact.goesBy || contact.orgMember?.goesBy || contact.firstName,
```

---

## 🔄 Migration Strategy

### Phase 1: Code Migration (NOW)
1. ✅ Update services to check `contact.goesBy` first
2. ⏳ Update routes to check `contact.goesBy` first
3. ⏳ Update any frontend code reading from wrong place

### Phase 2: Data Migration (FUTURE)
```sql
-- Copy any existing orgMember.goesBy to contact.goesBy
UPDATE "Contact" c
SET "goesBy" = om."goesBy"
FROM "OrgMember" om
WHERE c."orgMemberId" = om.id
  AND c."goesBy" IS NULL
  AND om."goesBy" IS NOT NULL;
```

### Phase 3: Cleanup (LATER)
- Remove `goesBy` field from OrgMember schema
- Remove all `orgMember.goesBy` references
- Deploy new schema

---

## 🎨 Why Universal Personhood?

**Old Design (Broken):**
- `goesBy` stored on OrgMember
- If contact isn't an org member → no nickname
- Each org could have different nickname for same person

**New Design (Better):**
- `goesBy` stored on Contact (universal)
- Works for ALL contacts (org members, event attendees, etc.)
- One nickname across all contexts
- OrgMember can still override if needed (with fallback logic)

---

## 📚 Related Architecture

- **Contact** = Universal person record (across all orgs)
- **OrgMember** = Org-specific relationship (memberType, memberSince, etc.)
- **EventAttendee** = Event-specific relationship (stage, audienceType, etc.)

**Universal fields belong on Contact!**
- ✅ goesBy (nickname)
- ✅ employer
- ✅ birthday
- ✅ married
- ✅ spouseName

**Org-specific fields belong on OrgMember!**
- ✅ memberType (donor, volunteer, etc.)
- ✅ memberSince
- ✅ engagementValue

---

## 🚨 Immediate Action Items

1. ⏳ Fix `routes/orgMembersHydrateRoute.js` line 149
2. ⏳ Fix `routes/contactHydrateRoute.js` line 45
3. ⏳ Search for any other `orgMember.goesBy` references
4. ⏳ Test campaign preview shows correct nickname
5. ⏳ Test org members page shows correct nicknames
6. ⏳ Run data migration script to copy existing data

---

## 🔍 How to Find Other Issues

```bash
# Backend search:
grep -r "orgMember\.goesBy" .

# Frontend search (if any):
grep -r "orgMember.goesBy" src/

# Look for camelCase too:
grep -ri "orgmember.*goesby" .
```

---

## 📝 Commit Messages

```
fix: Use contact.goesBy instead of orgMember.goesBy in hydration routes

- goesBy moved to Contact (universal personhood) but routes still checked OrgMember
- Updated orgMembersHydrateRoute to check contact.goesBy first
- Updated contactHydrateRoute to check contact.goesBy first
- Keeps orgMember.goesBy as fallback for migration safety
```

---

**Last Updated:** October 16, 2025  
**Author:** Human + AI pair programming  
**Lesson:** When migrating fields, grep EVERYTHING! 🔥

