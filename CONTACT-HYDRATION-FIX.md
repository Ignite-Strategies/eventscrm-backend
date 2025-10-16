# Contact Hydration & 404 Fix

## Problems Fixed

### 1. ❌ "Goes By" Not Showing
**Root Cause:** Backend was only checking `OrgMember.goesBy`, not `Contact.goesBy`

**Fix:** Updated `orgMembersHydrateRoute.js` line 54:
```javascript
// OLD
goesBy: member.goesBy,

// NEW  
goesBy: member.contact?.goesBy || member.goesBy || member.contact?.firstName,
```

### 2. ❌ Contact Detail 404
**Root Cause:** Legacy OrgMember records have `contactId: null`

**The Problem:**
- Old OrgMembers were created BEFORE Contact-First architecture
- They have data on OrgMember directly (firstName, lastName, email)
- But `contactId = null` → no link to Contact table
- Clicking name tries to navigate to `/contact/null` → 404!

**Fixes Applied:**

1. **Frontend Safety** (`OrgMembers.jsx`):
   - Check if `contactId` exists before showing link
   - Show ⚠️ warning icon for legacy records
   
2. **Backend POST Handler** (`orgMembersHydrateRoute.js`):
   - Added POST route to `/api/orgmembers`
   - Allows creating OrgMember from Contact (for manual entry)
   
3. **Contact Creation** (`contactSaveRoute.js`):
   - Updated to accept all Contact fields (goesBy, employer, address, etc.)
   
4. **Migration Script** (`scripts/migrate-orgmembers-to-contacts.js`):
   - Creates Contact records for orphaned OrgMembers
   - Links them together via `contactId`

## API Routing Explained

```
FRONTEND                BACKEND MOUNT              FILE
--------                -------------              ----
/orgmembers      →      /api/orgmembers     →     orgMembersHydrateRoute.js
  GET /                   router.get('/')          Hydrate all org members
  POST /                  router.post('/')         Create org member
  GET /:id                router.get('/:id')       Get single member

/contacts        →      /api/contacts       →     contactHydrateRoute.js
  GET /:id                router.get('/:id')       Get contact details
  POST /           →     contactSaveRoute.js       Create contact
  PATCH /:id              router.patch('/:id')     Update contact
```

**Key Point:** File names are just organization. The REAL routing happens in `index.js` with `app.use('/api/orgmembers', orgMembersHydrateRouter)`

## How to Run Migration

```bash
cd eventscrm-backend
node scripts/migrate-orgmembers-to-contacts.js
```

This will:
1. Find all OrgMembers with `contactId: null`
2. Create Contact records for them
3. Link OrgMember → Contact
4. Fix the 404 issue permanently

## Testing

1. Deploy backend changes
2. Check org-members page - "Goes By" should show
3. Click on contacts - should not get 404
4. Any with ⚠️ icon need migration
5. Run migration script
6. Refresh - all should work!

