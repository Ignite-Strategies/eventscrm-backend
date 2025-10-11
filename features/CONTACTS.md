# 👥 Contact Management

**Last Updated:** December 2024

---

## 🎯 Overview

**Contact-First Architecture** with optional elevation to OrgMember and Admin.

### Core Flow
```
Basic Contact → OrgMember (extended CRM data) → Admin (system access)
```

---

## 📊 Contact Model Hierarchy

### Contact (Universal Person)
```prisma
Contact {
  id, orgId, firstName, lastName, email, phone
  // Everyone starts here - universal person record
}
```

### OrgMember (Extended CRM Data)
```prisma
OrgMember {
  contactId (unique)
  goesBy, street, city, state, zip
  employer, yearsWithOrganization
  birthday, married, spouseName, numberOfKids
  originStory, notes, categoryOfEngagement
  tags: String[]
}
```

### Admin (System Access)
```prisma
Admin {
  contactId (unique)
  orgId, permissions
  // System access and permissions
}
```

---

## 🔄 Contact Creation Flows

### 1. Public Form Submission
```
User fills form → POST /api/contacts → Contact created/updated → EventAttendee created
```

**API Call:**
```javascript
POST /api/contacts
{
  "slug": "bros-brews",
  "orgId": "...",
  "eventId": "...", 
  "audienceType": "org_members",
  "targetStage": "soft_commit",
  "formData": {
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john@example.com",
    "phone": "7034880601",
    "custom_field_1": "value"
  }
}
```

### 2. CSV Upload
```
Admin uploads CSV → ContactEventUploadPreview → Contacts created → EventAttendees created
```

**Flow:**
1. Admin goes to `/contacts/event/upload`
2. Selects event (from localStorage)
3. Uploads CSV file
4. Maps CSV columns to Contact fields
5. Selects audience type and default stage
6. Preview and confirm
7. Creates Contact + EventAttendee records

**API Call:**
```javascript
POST /api/contacts/event/upload
// FormData with CSV file + assignments JSON
{
  "assignments": {
    "mode": "all_same",
    "defaultStage": "general_awareness", 
    "audienceType": "org_members"
  }
}
```

### 3. Manual Contact Creation
```
Admin → Contact Detail → Create New Contact → Basic info → Optional elevation
```

---

## 🎨 Frontend Components

### ContactEventUpload.jsx
**Purpose:** Initiate CSV upload flow
- Uses event from localStorage
- File selection and validation
- Navigate to preview page

### ContactEventUploadPreview.jsx
**Purpose:** Preview CSV data and configure assignments
- **Schema Config Hydration:** Gets audience types and stages from `/api/schema/event-attendee`
- **Audience-First Flow:** Select audience → hydrate stages → assign
- **Field Mapping:** Map CSV columns to Contact fields
- **Assignment Options:**
  - All same stage
  - Individual assignments

### ContactDetail.jsx
**Purpose:** View and manage individual contacts
- **Conditional UI:**
  - `hasOrgMember = false`: Yellow warning + "Elevate to Org Member" button
  - `hasOrgMember = true`: Full profile tab with extended data
- **Tabs:** Overview, Events, Full Profile (if OrgMember)
- **Actions:** Edit, Add to Event, Delete

---

## 🔌 API Endpoints

### Contact CRUD
```javascript
GET /api/contacts/:contactId
// Returns Contact with hasOrgMember flag

POST /api/contacts
// Public form submission

PATCH /api/contacts/:contactId  
// Update contact info

DELETE /api/contacts/:contactId
// Delete contact (cascade to EventAttendees)
```

### Contact Events
```javascript
GET /api/contacts/:contactId/events
// Returns all EventAttendee records for contact
{
  "events": [
    {
      "id": "attendee_id",
      "eventId": "...",
      "eventTitle": "Bros & Brews", 
      "audienceType": "org_members",
      "currentStage": "soft_commit",
      "createdAt": "2025-10-09T..."
    }
  ]
}
```

### CSV Upload
```javascript
POST /api/contacts/event/upload
// Multipart form with CSV file + assignments JSON

POST /api/contacts/event/preview  
// Preview CSV data without saving

POST /api/contacts/event/save
// Save contacts and event attendees
```

---

## 📋 Contact List Management

### Universal Contacts List (Future)
**Purpose:** Replace `/supporters` with universal contact management
- Show all Contacts with filter for OrgMembers
- Search and filtering
- Bulk actions
- Export functionality

### Current: Supporters Page
**Status:** Deprecated - will be replaced by universal contacts list
- Shows only OrgMembers
- Limited functionality

---

## 🔄 Contact Elevation Flow

### Basic Contact → OrgMember
```
Contact Detail → "Elevate to Org Member" button → Modal → Add extended CRM data → Create OrgMember
```

**Data Added:**
- Personal info: goesBy, birthday, married, spouseName, numberOfKids
- Address: street, city, state, zip  
- Professional: employer, yearsWithOrganization
- Engagement: originStory, notes, categoryOfEngagement, tags

### OrgMember → Admin
```
OrgMember Detail → "Grant Admin Access" → Create Admin record → System permissions
```

---

## 📊 Contact Analytics

### Event History
- All EventAttendee records for contact
- Pipeline progression over time
- Form submission history
- Attendance tracking

### Engagement Tracking
- Category of engagement
- Tags and notes
- Years with organization
- Origin story

---

## 🎯 Key Features

### ✅ Working
- Public form submission creates Contact + EventAttendee
- CSV upload with audience/stage selection
- Contact detail with OrgMember check
- Pipeline management
- Schema config hydration

### 🚧 In Progress
- Contact elevation modal
- Universal contacts list
- Contact edit functionality
- Bulk contact actions

### 📋 Planned
- Contact search and filtering
- Contact export
- Advanced analytics
- Contact merge functionality

---

## 🔑 Key Concepts

1. **Contact-First:** Everyone starts as a Contact
2. **Optional Elevation:** Contact → OrgMember → Admin
3. **Event Participation:** EventAttendee links Contact to Event
4. **Schema Config:** Valid values come from schema, not hardcoded
5. **Multi-Audience:** Same person can be in same event with different audience types
6. **Unique Constraints:** `@@unique([orgId, email])` supports multi-org

---

## 🚀 Next Steps

1. **Build Contact Elevation Modal** - Add extended CRM data
2. **Universal Contacts List** - Replace supporters page
3. **Contact Edit** - Update Contact + OrgMember data
4. **Add Contact to Event** - Manual event assignment
5. **Contact Search** - Find contacts across all data
