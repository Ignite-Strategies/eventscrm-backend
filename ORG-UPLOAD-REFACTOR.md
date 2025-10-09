# Org Upload UX Refactor Plan

**Status**: Future work - compartmentalized for later  
**Priority**: After soft commit form is working

---

## 🎯 Current State (Deprecated)

All these pages use the old **Supporter model (MongoDB)**. They need to be refactored to use **Contact + OrgMember (Prisma)**.

---

## 📋 File-by-File Refactor Plan

### 1. `Supporters.jsx` → `OrgMembersDisplay.jsx`

**Current**: Hydrates all Supporters from MongoDB  
**New Approach**:
- Hydrate everyone with an `orgMemberId` (OrgMembers only)
- Display by `contactId` (Contact-First)
- Should align with `contactHydrateRoute` (see relational key)

**API Changes**:
```javascript
// OLD
GET /orgs/${orgId}/supporters

// NEW
GET /contacts?orgId=${orgId}&hasOrgMember=true
// Returns: Contact[] with orgMember relation included
```

**Display Logic**:
```javascript
// Filter: Contacts where hasOrgMember = true
const orgMembers = contacts.filter(c => c.hasOrgMember);

// Show: Contact info + OrgMember extended data
// Click: Navigate to /contact/${contactId}
```

---

### 2. `SupporterManual.jsx` → `ContactManual.jsx`

**Current**: Creates Supporter directly in MongoDB  
**New Path**:
1. **Contact First** - Create Contact (firstName, lastName, email, phone)
2. **Elevate to OrgMember Second** - Add extended CRM data (address, employer, tags, etc.)
3. *OR* Upload master list to make OrgMember automatically

**API Changes**:
```javascript
// Step 1: Create Contact
POST /contacts
{
  orgId,
  firstName,
  lastName,
  email,
  phone
}
// Returns: { contactId }

// Step 2: Elevate to OrgMember (optional, or in one step)
POST /org-members
{
  contactId,
  orgId,
  goesBy,
  street,
  city,
  state,
  zip,
  employer,
  yearsWithOrganization,
  birthday,
  married,
  spouseName,
  numberOfKids,
  originStory,
  notes,
  categoryOfEngagement,
  tags
}
```

**Form Flow**:
```
Page 1: Basic Contact Info (required)
  - First Name, Last Name, Email, Phone

Page 2: Extended OrgMember Info (optional)
  - Address, Employer, Personal details, Tags
  - Checkbox: "Elevate to Org Member" (adds extended data)

Submit → Creates Contact + optionally OrgMember
```

---

### 3. `UploadSupportersCSV.jsx` → Use New Route

**Current**: Uploads to Supporter (MongoDB)  
**New**: Upload creates Contact + OrgMember

**API Changes**:
```javascript
// NEW CSV Upload Route
POST /contacts/csv
{
  orgId,
  file: csvFile,
  autoElevateToOrgMember: true  // Always true for CSV upload
}

// Logic:
// 1. Parse CSV
// 2. For each row:
//    a. Create Contact (firstName, lastName, email, phone)
//    b. Create OrgMember (contactId, extended fields)
// 3. Return summary: { created: 50, errors: [] }
```

**CSV Format** (same template, different backend):
```csv
First Name,Goes By,Last Name,Email,Phone,Street,City,State,Zip,Employer,Years With Organization
```

---

### 4. `ContactValidation.jsx` → Ensure ContactId

**Current**: Validates Supporter records  
**New**: Make sure it's `contactId` - new route as needed

**Validation Logic**:
```javascript
// Check for duplicates by Contact unique constraint
@@unique([orgId, email])

// Validate:
// - Email is unique within org
// - Required fields present (firstName, lastName, email)
// - Phone format valid (if provided)
```

**API**:
```javascript
POST /contacts/validate-csv
{
  orgId,
  csvData: [...]
}

// Returns:
{
  valid: [...],
  duplicates: [...],  // Existing contacts with same email
  errors: [...]       // Missing required fields, format issues
}
```

---

### 5. `ResolveErrors.jsx` → Upload Stuff

**Current**: Resolves Supporter CSV errors  
**New**: More upload stuff (same concept, different models)

**Error Types**:
- Duplicate email in org → Skip or update existing Contact
- Missing required fields → Show which rows need fixing
- Invalid format → Phone, email validation

**Resolution Options**:
```javascript
// For duplicates:
1. Skip (don't create, leave existing)
2. Update (merge new data into existing Contact)
3. Create anyway (if email changed)

// For errors:
1. Fix in UI and retry
2. Download error report CSV
3. Skip error rows and upload valid ones
```

---

### 6. `UploadPreview.jsx` → Part of Upload Flow

**Current**: Previews Supporter CSV before upload  
**New**: Same concept, shows Contact + OrgMember preview

**Preview Display**:
```javascript
// Show parsed data:
{
  contactData: {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "123-456-7890"
  },
  orgMemberData: {
    goesBy: "Johnny",
    street: "123 Main St",
    // ... extended fields
  },
  willElevateToOrgMember: true  // Always true for CSV
}
```

---

## 🔌 New Backend Routes Needed

### Contact Routes (split from contactsRoute.js)

```javascript
// routes/contactHydrateRoute.js
GET /contacts/:contactId
// Returns: Contact with OrgMember (if exists)

// routes/contactSaveRoute.js  
POST /contacts
PATCH /contacts/:contactId
// Create/update Contact

// routes/contactDeleteRoute.js
DELETE /contacts/:contactId
// Delete with cascade
```

### OrgMember Routes

```javascript
// routes/orgMemberSaveRoute.js
POST /org-members
// Elevate Contact to OrgMember

PATCH /org-members/:orgMemberId
// Update OrgMember extended data

// routes/orgMembersListRoute.js
GET /contacts?hasOrgMember=true
// List all OrgMembers (Contacts with orgMember relation)
```

### CSV Upload Routes

```javascript
// routes/csvUploadRoute.js
POST /contacts/csv
// Upload CSV → Create Contact + OrgMember

POST /contacts/validate-csv
// Validate CSV before upload
```

---

## 🗂️ Relational Keys

**The Source of Truth**:
```
Contact.id (contactId) = PRIMARY KEY
  ├── OrgMember.contactId (FK) - Optional 1:1
  ├── EventAttendee.contactId (FK) - Many
  └── Admin.contactId (FK) - Optional 1:1

OrgMember.id (orgMemberId) = Extended data ID
  └── Links back to Contact via contactId
```

**Navigation Flow**:
```javascript
// OrgMembers Display: Click on row
navigate(`/contact/${contactId}`)  // NOT orgMemberId!

// Contact Detail: Shows
{
  contactId: "abc123",
  hasOrgMember: true,
  orgMemberId: "xyz789",  // If elevated
  // ... contact + orgMember data merged
}
```

---

## ✅ Migration Checklist

When ready to do this refactor:

- [ ] Build `contactHydrateRoute.js` - GET contact with OrgMember
- [ ] Build `contactSaveRoute.js` - POST/PATCH contact
- [ ] Build `contactDeleteRoute.js` - DELETE with cascade (DONE ✅)
- [ ] Build `orgMemberSaveRoute.js` - Elevate contact to OrgMember
- [ ] Build `csvUploadRoute.js` - CSV → Contact + OrgMember
- [ ] Rename `Supporters.jsx` → `OrgMembersDisplay.jsx`
- [ ] Refactor to use `/contacts?hasOrgMember=true`
- [ ] Rename `SupporterManual.jsx` → `ContactManual.jsx`
- [ ] Update to Contact-First flow (create → elevate)
- [ ] Update CSV upload pages to use new routes
- [ ] Update validation to check contactId uniqueness
- [ ] Test full CSV upload flow
- [ ] Migrate existing Supporters to Contact + OrgMember (data migration)
- [ ] Remove Supporter model from schema
- [ ] Deregister supportersRoute

---

## 🚨 Important Notes

1. **Don't do this now** - Soft commit form is priority
2. **CSV upload is critical** - Don't break org setup flow
3. **Contact = Source of Truth** - Always use contactId for navigation
4. **OrgMember = Optional** - Not everyone needs extended data
5. **Keep Supporters pages functional** - Until refactor is complete

**Focus**: Get Contact-First working end-to-end with soft commit form, THEN refactor org upload UX.

