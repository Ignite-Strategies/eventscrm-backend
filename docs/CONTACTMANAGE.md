# Contact Management System

## 🎯 The Vision

**Simple Truth:** Contacts power everything - campaigns, events, outreach. This hub connects it all.

---

## 🗺️ The Contact Ecosystem

### Two Types of Contacts

#### 1. **Quick Contacts** (External)
- **Purpose:** Prospects, event attendees, campaign targets
- **Fields:** First Name, Last Name, Email, Phone (that's it!)
- **Upload:** `/contacts/upload` → ContactUpload.jsx
- **Template:** `contacts_simple_template.csv`
- **Magic:** Map to pipeline on ingest

#### 2. **Org Members** (Internal)
- **Purpose:** Core team, staff, board, volunteers
- **Fields:** All the deep dive (employer, years with org, etc.)
- **Upload:** `/org-members/upload` → OrgMembersCSVUpload.jsx
- **Template:** `contacts_template.csv`
- **Reality:** Most data comes from user input, not admin upload

---

## 📄 All Contact-Related Pages

### Upload & Creation

| File | Route | Purpose |
|------|-------|---------|
| `ContactUpload.jsx` | `/contacts/upload` | Quick upload: name, email, phone + choose purpose |
| `OrgMembersCSVUpload.jsx` | `/org-members/upload` | Deep upload for org members with full fields |
| `ContactManual.jsx` | `/org-members/manual` | Add single contact manually |
| `UploadPreview.jsx` | `/org-members/upload/preview` | Review CSV before import |
| `ContactValidation.jsx` | `/org-members/upload/validation` | Post-upload results & fork |
| `ResolveErrors.jsx` | `/org-members/upload/resolve` | Fix validation errors |

### Viewing & Management

| File | Route | Purpose |
|------|-------|---------|
| `ContactManageHome.jsx` | `/contacts` | **HUB** - Contact management dashboard |
| `OrgMembers.jsx` | `/org-members` | View org members (DEPRECATED - uses old MongoDB) |
| `ContactDetail.jsx` | `/contact/:contactId` | Single contact detail view |

### Lists & Segmentation

| File | Route | Purpose |
|------|-------|---------|
| `ContactList.jsx` | `/contact-lists` | Manage contact lists for campaigns |
| `CreateListOptions.jsx` | `/create-list` | Choose list creation method |
| `ContactListSelect.jsx` | (embedded) | Contact list selector component |
| `ListManagement.jsx` | `/lists` | Alternative list management (check if duplicate) |

### Supporting Pages

| File | Route | Purpose |
|------|-------|---------|
| `OrgMemberContactSetup.jsx` | (future) | Wizard for contact type selection |

---

## 🏗️ Contact Management Hub (`ContactManageHome.jsx`)

### Purpose
Central hub for ALL contact-related activities. Replaces scattered contact pages.

### Sections

#### 1. **Stats Overview**
```
┌─────────────────┬──────────────────┬──────────────────┐
│ Total Contacts  │  Org Members     │  Most Active     │
│     1,245       │      42          │  (Coming Soon)   │
└─────────────────┴──────────────────┴──────────────────┘
```

#### 2. **Quick Actions**
- 🎯 Upload Contacts (quick)
- 🏢 Upload Org Members (detailed)
- ➕ Add Manually
- 📋 View All Contacts

#### 3. **Contact Lists**
- Campaign lists
- Event audiences
- Custom segments

---

## 🔄 Contact Flow Architecture

### Upload Flow (Quick)
```
Dashboard/Events/Campaigns
  ↓ Click "Upload Contacts"
ContactUpload.jsx (/contacts/upload)
  ↓ Choose Purpose: Event | Campaign | General
  ↓ Upload CSV (name, email, phone)
UploadPreview.jsx (/org-members/upload/preview)
  ↓ Validate & Map
ContactValidation.jsx (/org-members/upload/validation)
  ↓ Fork: What next?
  ├─ View All Contacts → ContactManageHome
  ├─ Add to Event → Events page
  ├─ Start Campaign → CampaignHome
  └─ Upload More → ContactUpload
```

### Upload Flow (Org Members)
```
Dashboard
  ↓ Click "Org Members"
OrgMembersCSVUpload.jsx (/org-members/upload)
  ↓ Upload CSV (full fields)
UploadPreview.jsx
  ↓ Validate
ContactValidation.jsx
  ↓ View org members
OrgMembers.jsx (/org-members)
```

### Manual Entry Flow
```
Any Upload Page
  ↓ Click "Add Manually"
ContactManual.jsx (/org-members/manual)
  ↓ Fill form
  ↓ Save
ContactManageHome or back to origin
```

---

## 🎨 Navigation Structure

### From Dashboard
```
Dashboard
├── Contact Management Card → ContactManageHome (/contacts)
├── Campaign Dashboard → CampaignHome (/campaignhome)
└── Event Management → Events (/events)
```

### From ContactManageHome
```
ContactManageHome (/contacts)
├── Upload Contacts → ContactUpload (/contacts/upload)
├── Upload Org Members → OrgMembersCSVUpload (/org-members/upload)
├── Add Manually → ContactManual (/org-members/manual)
├── View All Contacts → OrgMembers (/org-members) [needs refactor]
└── Manage Lists → ContactList (/contact-lists)
```

### From Campaign Pages
```
CampaignHome
├── Upload Contacts → ContactUpload
└── Contact Lists → ContactList
```

### From Events
```
Events
└── Add Contacts → ContactUpload
```

---

## 🔧 Key Features

### 1. **Purpose-First Upload**
Choose BEFORE uploading:
- Event attendees
- Email campaign
- General contacts

### 2. **Pipeline Mapping on Ingest**
HubSpot killer: Map contacts to pipeline DURING upload, not after endless form filling.

### 3. **Post-Upload Fork**
After upload, clear next steps:
- View all contacts
- Add to event
- Start campaign
- Upload more

### 4. **Two Templates**
- Simple: Name, Email, Phone (quick)
- Full: All fields (org members)

---

## ⚠️ Current Issues & Refactor Needed

### Deprecated Files
- `OrgMembers.jsx` - Uses old MongoDB Supporter model
- Need new `ContactsView.jsx` using Prisma Contact model

### Duplicate Pages?
- `ContactList.jsx` - Campaign contact lists
- `ListManagement.jsx` - Check if this is a duplicate

### Naming Confusion
- "Org Members" vs "Contacts" vs "Supporters"
- Need consistent language throughout

---

## ✅ The Future State

### Contact Management Hub (`/contacts`)
```
┌────────────────────────────────────────────────┐
│ Contact Management                              │
├────────────────────────────────────────────────┤
│ Stats:                                          │
│  • Total Contacts: 1,245                       │
│  • Org Members: 42                             │
│  • Event Prospects: 1,203                      │
│                                                 │
│ Quick Actions:                                  │
│  [Upload Contacts] [View All] [Create List]    │
│                                                 │
│ Recent Activity:                                │
│  • 50 contacts added to Bros & Brews           │
│  • Email campaign sent to 200 contacts         │
│                                                 │
│ Contact Lists:                                  │
│  • Bros & Brews Invites (342 contacts)         │
│  • Board Members (12 contacts)                 │
│  • Newsletter Subscribers (892 contacts)       │
└────────────────────────────────────────────────┘
```

### Integration Points
- **Events:** Click contact → add to event pipeline
- **Campaigns:** Click contact → add to campaign list
- **Org Members:** Flag as org member → additional fields

---

## 🚀 The Stickiness Strategy

### Phase 1: Admin Upload (Now)
- Admins upload contacts
- Admin guesses data ("Where does Bob work?")
- Not very sticky

### Phase 2: Member Input (Future)
- Members log in themselves
- Members input their own data:
  - Track workouts
  - Log service hours
  - Update their own profile
- **THIS is sticky** ✅

### Phase 3: Auto-Enrichment
- Members update themselves
- System enriches from activity
- True living database

---

## 🎯 Why This Beats HubSpot

| Feature | HubSpot | Us |
|---------|---------|-----|
| **Contact Model** | Deal-first (need deal → assign contact) | Contact-first ✅ |
| **Upload** | Fill ALL fields upfront | Simple upload → organize smart ✅ |
| **Pipeline** | Create deal → move stages | Map on ingest ✅ |
| **Purpose** | Generic for everyone | Purpose-driven flows ✅ |
| **Data Entry** | Admin guesses everything | Future: Members input their own ✅ |

---

## 📋 Quick Reference

### Routes
```javascript
/contacts                    → ContactManageHome (Hub)
/contacts/upload             → ContactUpload (Quick)
/org-members/upload          → OrgMembersCSVUpload (Deep)
/org-members/manual          → ContactManual (Single entry)
/org-members                 → OrgMembers (View - needs refactor)
/contact/:id                 → ContactDetail (Single view)
/contact-lists               → ContactList (Campaign lists)
/create-list                 → CreateListOptions (List creation)
```

### From Dashboard
```
Contact Management Card → /contacts (Hub)
```

### Contact Upload Entry Points
- Dashboard → Upload button
- Events → Add Contacts button
- Campaigns → Upload Contacts button
- ContactManageHome → All upload options

---

## 🔮 Future Enhancements

### Member Portal
- Members log in
- Update their own data
- Track personal metrics
- STICKY! 🔥

### Smart Lists
- Auto-segment based on activity
- "Engaged in last 30 days"
- "Attended 3+ events"
- "Donated $500+"

### Contact Scoring
- Engagement score
- Response rate
- Event attendance rate

### Duplicate Detection
- Smart merge suggestions
- Auto-dedupe on upload

---

*Last Updated: October 10, 2025*
*Status: 🚧 In Progress - Building ContactManageHome hub*




