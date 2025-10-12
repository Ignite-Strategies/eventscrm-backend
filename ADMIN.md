# Admin Model - Source of Truth for Authentication & Authorization

## Overview
The `Admin` model is the **single source of truth** for user authentication, authorization, and navigation in the CRM system.

## Schema Definition
```prisma
model Admin {
  id        String        @id @default(cuid())
  orgId     String?
  org       Organization? @relation(fields: [orgId], references: [id], onDelete: Cascade)
  eventId   String?
  event     Event?        @relation(fields: [eventId], references: [id], onDelete: Cascade)

  // Admin Authentication (Firebase)
  firebaseId String? @unique // For Firebase auth lookup

  // Admin Configuration
  role        String // "super_admin", "admin", "manager", etc.
  permissions Json? // What they can do
  isActive    Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([orgId, eventId])
  @@index([orgId])
  @@index([eventId])
  @@index([firebaseId])
  @@index([isActive])
}
```

## Critical Relationships

### Admin → Organization
- **Direct Foreign Key:** `Admin.orgId` → `Organization.id`
- Admin has DIRECT access to their organization
- This is where `orgId` should be sourced for navigation

### Admin → Event
- **Direct Foreign Key:** `Admin.eventId` → `Event.id`
- Admin has DIRECT access to their event context
- This is where `eventId` should be sourced for navigation

### Admin → Firebase
- **Unique Index:** `Admin.firebaseId` (unique)
- Links Firebase authentication to CRM admin record
- Primary lookup key for authentication

## Hydration Flow

### `/api/hydration/:firebaseId`
This endpoint is the **core authentication endpoint** called by the Welcome page.

**Input:** `firebaseId` (from Firebase auth token)

**Output:**
```json
{
  "adminId": "clxxx...",
  "orgId": "clyyyy...",
  "eventId": "clzzzz...",
  "admin": {
    "id": "clxxx...",
    "role": "super_admin",
    "permissions": {...},
    "isActive": true
  }
}
```

**Critical:** ALL three IDs (`adminId`, `orgId`, `eventId`) come FROM the Admin record, not from OrgMember or any other table.

### Why Admin is Source of Truth
1. **Direct Relationships:** Admin has direct foreign keys to Organization and Event
2. **Authentication:** Admin.firebaseId is the link to Firebase auth
3. **Authorization:** Admin.role and Admin.permissions define what user can do
4. **Context:** Admin.orgId and Admin.eventId define WHERE the user operates

## Admin vs OrgMember

### Admin
- **Purpose:** Authentication, authorization, and app access
- **Scope:** Cross-organizational (can be super_admin)
- **Relationships:** Direct to Organization and Event
- **Auth:** Has `firebaseId` for Firebase authentication
- **Permissions:** Has `role` and `permissions` fields

### OrgMember
- **Purpose:** CRM contact management and team roster
- **Scope:** Tied to single organization via `orgId`
- **Relationships:** Links to Contact for CRM data
- **Auth:** Has `firebaseId` but NOT the source of truth for admin auth
- **Permissions:** Has basic `role` (owner/manager) but NOT for app permissions

## Common Pitfalls (FIXED)

### ❌ WRONG: Getting orgId from OrgMember
```javascript
const orgMember = await prisma.orgMember.findUnique({
  where: { firebaseId }
});
const orgId = orgMember.orgId; // WRONG!
```

### ✅ CORRECT: Getting orgId from Admin
```javascript
const admin = await prisma.admin.findFirst({
  where: { firebaseId }
});
const orgId = admin.orgId; // CORRECT!
const eventId = admin.eventId; // CORRECT!
```

## Role Hierarchy
- `super_admin` - Full system access, can manage multiple orgs/events
- `admin` - Full access to assigned org and event
- `manager` - Limited access to assigned org and event
- (More roles can be added as needed)

## Permissions Structure (JSON)
```json
{
  "contacts": {
    "create": true,
    "read": true,
    "update": true,
    "delete": false
  },
  "events": {
    "create": true,
    "read": true,
    "update": true,
    "delete": false
  },
  "campaigns": {
    "create": true,
    "read": true,
    "update": true,
    "delete": false
  }
}
```

## Database Queries

### Find Admin by Firebase ID
```javascript
const admin = await prisma.admin.findFirst({
  where: { 
    firebaseId: firebaseId,
    isActive: true 
  },
  include: {
    org: true,
    event: true
  }
});
```

### Check Admin Permissions
```javascript
if (admin.role === 'super_admin') {
  // Full access
} else if (admin.permissions?.contacts?.delete) {
  // Can delete contacts
}
```

## Important Notes
1. **Admin.firebaseId must be unique** - One Firebase user = One Admin record
2. **Admin.orgId and Admin.eventId are optional** - Super admins may not be tied to specific org/event
3. **Always check Admin.isActive** - Admins can be deactivated without deletion
4. **Admin table is the authentication source** - Don't use OrgMember.firebaseId for admin auth

## Related Files
- `/routes/dashboardHydrationRoute.js` - Hydration endpoint that uses Admin
- `/middleware/authMiddleware.js` - May use Admin for auth checks
- `/prisma/schema.prisma` - Admin model definition

## TODO / Future Enhancements

### Profile Completion Flow
- [ ] Add phone number field to Admin model (currently only in OrgMember)
- [ ] Add firstName/lastName to Admin model for display purposes
- [ ] Implement profile completion check in hydration flow
- [ ] Add `/profile-setup` route that updates Admin profile fields
- [ ] Consider if Admin should have full profile fields (street, city, state, zip) or just link to OrgMember

### Profile Setup Requirements
Currently the phone number check is disabled in Welcome.jsx. Need to decide:
1. Should Admin have its own profile fields (phone, name, etc.)?
2. Or should Admin link to OrgMember/Contact for profile data?
3. When/where should users complete their profile?

### Potential Schema Addition
```prisma
model Admin {
  // ... existing fields
  
  // Profile fields (TO BE ADDED)
  firstName String?
  lastName  String?
  phone     String?
  photoURL  String? // Already exists
  
  // Or link to OrgMember for profile data?
  orgMemberId String? @unique
  orgMember   OrgMember? @relation(fields: [orgMemberId], references: [id])
}
```

## Last Updated
October 12, 2025 - Fixed hydration to use Admin as source of truth for orgId and eventId, removed phone check temporarily

