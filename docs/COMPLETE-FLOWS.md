# Complete Application Flows

## 🎯 FLOW 1: Dashboard Login (CRM User)

### Step-by-Step:

```
1. User visits app → Splash.jsx
   ✅ Checks Firebase auth state
   ✅ User is authenticated
   → Navigate to /welcome

2. Welcome.jsx loads
   ✅ Gets firebaseId from auth.currentUser.uid
   ✅ Calls GET /api/hydration/:firebaseId
   
3. Backend: hydrationRoute.js
   ✅ Finds OrgMember by firebaseId
   ✅ Includes: contact, org relations
   ✅ Fetches: events, supporters, admin
   ✅ Returns complete hydration data

4. Welcome.jsx receives data
   ✅ Checks phone (profile complete?) → You have: 7034880601 ✅
   ✅ Checks orgId (org linked?) → You have: cmgfvz9v10000nt284k875eoc ✅
   ✅ Saves to localStorage:
      - orgId: cmgfvz9v10000nt284k875eoc
      - orgName: "F3 Capital" (or org name)
      - orgMemberId: cmgfv1cnq0001s129hxmtn3ed
      - phone: 7034880601
      - eventId: cmggljv7z0002nt28gckp1jpe (first event)
      - adminId: admin_bf849502 (optional)
   ✅ Checks events (any events?) → You have: 1 event ✅
   ✅ Shows welcome screen with "Go to Dashboard" button
   
5. User clicks "Go to Dashboard"
   → Navigate to /dashboard
   ✅ Full CRM access with all data!
```

### What Gets Hydrated:

```javascript
{
  // NAVIGATION KEYS
  contactId: 'contact_93046460',
  adminId: 'admin_bf849502',
  orgId: 'cmgfvz9v10000nt284k875eoc',
  phone: '7034880601',
  
  // CRM DATA
  orgMember: {
    id: 'cmgfv1cnq0001s129hxmtn3ed',
    contactId: 'contact_93046460',
    orgId: 'cmgfvz9v10000nt284k875eoc',
    firstName: 'Adam',
    lastName: 'Cole',
    email: 'adam.cole.novadude@gmail.com',
    phone: '7034880601',
    role: 'owner',
    firebaseId: 'FZPsyFaCR1ar1lvzN34vCmdanns2',
    // ... all CRM fields
  },
  
  // ORGANIZATION
  org: {
    id: 'cmgfvz9v10000nt284k875eoc',
    name: 'F3 Capital',
    slug: '...'
  },
  
  // EVENTS
  events: [
    {
      id: 'cmggljv7z0002nt28gckp1jpe',
      name: 'Bros & Brews',
      slug: 'bros-&-brews'
    }
  ],
  
  // SUPPORTERS (all OrgMembers in org)
  supporters: [...],
  
  // ADMIN (if exists)
  admin: {
    id: 'admin_bf849502',
    role: 'super_admin',
    permissions: {...},
    isActive: true
  }
}
```

---

## 📝 FLOW 2: Public Form Submission (External User)

### Step-by-Step:

```
1. User visits public form
   → GET /forms/:formSlug (frontend fetches form config)
   → Renders form fields dynamically

2. User fills out form
   ✅ Standard fields: name, email, phone
   ✅ Custom fields: (defined by admin)
   → Submits form

3. Frontend submits to backend
   → POST /api/public/forms/:formSlug/submit
   → Body: { name, email, phone, ...customFields }

4. Backend: formSubmissionRoute.js
   ✅ Finds EventForm by slug
   ✅ Validates form is active
   ✅ Extracts contact data (name, email, phone)
   ✅ Parses name → firstName, lastName
   
5. Find or Create Contact
   ✅ Searches for existing Contact by orgId + email
   ✅ If exists: Update phone if missing
   ✅ If new: Create Contact record
   
6. Create or Update EventAttendee
   ✅ Links Contact to Event via contactId (NOT orgMemberId!)
   ✅ Sets currentStage from form.targetStage (e.g., "soft_commit")
   ✅ Sets audienceType from form.audienceType (e.g., "landing_page")
   ✅ Stores custom fields in notes as JSON
   ✅ Unique constraint: eventId + contactId + audienceType
   
7. Update Form Stats
   ✅ Increment submissionCount on EventForm
   
8. Return success
   → Frontend shows thank you message
```

### Key Data Flow:

```
External User (no account)
  ↓
Public Form Submission
  ↓
Contact created (universal person record)
  ↓
EventAttendee created (links Contact → Event)
  ↓
Appears in CRM dashboard for event organizer
```

### Database Records Created:

```javascript
// Contact (Universal Person Record)
{
  id: 'contact_12345678',
  orgId: 'cmgfvz9v10000nt284k875eoc',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '5551234567'
}

// EventAttendee (Pipeline Tracking)
{
  id: 'attendee_87654321',
  orgId: 'cmgfvz9v10000nt284k875eoc',
  eventId: 'cmggljv7z0002nt28gckp1jpe',
  contactId: 'contact_12345678', // Links to Contact!
  currentStage: 'soft_commit', // From form.targetStage
  audienceType: 'landing_page', // From form.audienceType
  notes: '{"name":"John Doe","email":"...","customField1":"..."}',
  submittedFormId: 'form_123',
  attended: false,
  amountPaid: 0
}
```

---

## 🔑 Key Architectural Points

### 1. firebaseId IS the Token
- **Old (broken)**: Tried to lookup by orgMemberId (not available yet!)
- **New (fixed)**: Lookup by firebaseId from Firebase auth token
- **Why it works**: firebaseId is ALWAYS available in auth.currentUser.uid

### 2. Contact vs OrgMember
- **Contact**: Universal person record, used for EVERYONE (form submissions, attendees)
- **OrgMember**: Extended CRM record, only for team members with app access
- **Link**: OrgMember.contactId → Contact.id (optional)

### 3. EventAttendee Links
- **Old (deprecated)**: EventAttendee → OrgMember (broke for external users!)
- **New (current)**: EventAttendee → Contact (works for everyone!)
- **Unique constraint**: eventId + contactId + audienceType

### 4. Navigation Keys
- **firebaseId**: For initial hydration lookup (from Firebase token)
- **orgMemberId**: For CRM operations (saved to localStorage after hydration)
- **contactId**: For external forms (universal person)
- **adminId**: For permission checks (optional, advanced)
- **orgId**: For organization context
- **eventId**: For current event context

---

## ✅ Both Flows Working Now!

### Dashboard Login Flow:
1. ✅ Splash checks Firebase auth
2. ✅ Welcome hydrates by firebaseId
3. ✅ Backend finds OrgMember + all data
4. ✅ Frontend saves to localStorage
5. ✅ User goes to dashboard

### Form Submission Flow:
1. ✅ User submits public form
2. ✅ Backend creates/finds Contact
3. ✅ Backend creates EventAttendee (links Contact → Event)
4. ✅ Appears in CRM for organizer to manage

**No more loops! No more broken links! Clean architecture! 🎉**

