# F3 Capital - Database IDs & Architecture

## Database IDs

### Organization
- **ID**: `cmgfvz9v10000nt284k875eoc`

### OrgMember (Adam Cole - Owner)
- **ID**: `cmgfv1cnq0001s129hxmtn3ed`
- **Org ID**: `cmgfvz9v10000nt284k875eoc`
- **Email**: `adam.cole.novadude@gmail.com`
- **Firebase ID**: `FZPsyFaCR1ar1lvzN34vCmdanns2`
- **Role**: `owner`

### Contact (Adam Cole)
- **ID**: `contact_93046460`
- **Email**: `adam.cole.novadude@gmail.com`

### Admin (Adam Cole)
- **ID**: `admin_bf849502`

### Event
- **ID**: `cmggljv7z0002nt28gckp1jpe`
- **Name**: `Bros & Brews`
- **Slug**: `bros-&-brews`

### EventForm
- **ID**: `cmgi708tv0001qx276efjbixp`
- **Name**: `Brows and Brews`
- **Slug**: `brows-and-brews`

---

## Clean Architecture

### Contact = Universal Person Record
- External facing
- Used by forms, landing pages
- Links to EventAttendee

### OrgMember = Org Ownership
- You have the keys to your org's stuff
- Manages events, CRM operations
- Internal facing

### Admin = Permissions
- Still has contactId for schema consistency
- Not needed for all CRM operations
- Used for permission checks

### Event Management Flow
```
Contact (universal) → OrgMember (org ownership) → Event management
Admin (permissions) → Contact (schema consistency)
Event → orgId (organization relationship)
```

### Navigation Keys
- **contactId**: `contact_93046460` (universal person)
- **adminId**: `admin_bf849502` (permissions)
- **orgId**: `cmgfvz9v10000nt284k875eoc` (organization)
- **orgMemberId**: `cmgfv1cnq0001s129hxmtn3ed` (CRM operations)
- **eventId**: `cmggljv7z0002nt28gckp1jpe` (current event)

---

## ✅ MIGRATION COMPLETE!

### What We Fixed
1. **Backend Routes**: Updated to use Contact/Admin architecture
2. **Database Links**: Connected OrgMember → Contact → Admin
3. **Navigation Keys**: All IDs properly linked

### Final Database State
- ✅ OrgMember `cmgfv1cnq0001s129hxmtn3ed` linked to Contact `contact_93046460`
- ✅ Contact `contact_93046460` linked to Admin `admin_bf849502`
- ✅ Organization `cmgfvz9v10000nt284k875eoc` owns Event `cmggljv7z0002nt28gckp1jpe`
- ✅ All relationships properly established

### Navigation Flow
1. **Splash** → Firebase auth
2. **Signup** → Creates OrgMember with firebaseId
3. **Welcome** → Hydration finds Contact/Admin records
4. **Dashboard** → Full access with all keys

### Usage Patterns
- **External Forms**: Use `contactId` (universal person)
- **Internal CRM**: Use `orgMemberId` (org ownership)
- **Permissions**: Use `adminId` (access control)
- **Organization**: Use `orgId` (org context)
- **Events**: Use `eventId` (current event)

### The Fix That Worked
```sql
UPDATE "OrgMember" SET "contactId" = 'contact_93046460' WHERE id = 'cmgfv1cnq0001s129hxmtn3ed';
```

**Result**: Navigation loop broken, dashboard accessible! 🎉
