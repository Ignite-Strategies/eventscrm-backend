# 🧭 App Navigation & User Flows

**Last Updated:** December 2024

---

## 🎯 Overview

**Multi-App Architecture** with CRM and Ticketing applications.

### Applications
- **CRM App** - Admin interface for managing contacts, events, forms
- **Ticketing App** - Public interface for form submissions

---

## 🏠 CRM App Navigation

### Authentication Flow
```
/ (Splash) → Firebase Auth Check → /welcome (Hydrator) → /dashboard
```

### Main Navigation
```
/dashboard
├── /events                    # Event list
├── /event/:eventId/create     # Create event
├── /event/:eventId/pipelines  # Pipeline management
├── /forms                     # Form list
├── /forms/new                 # Create form
├── /forms/:formId/edit        # Edit form
├── /contacts/event/upload     # CSV upload
├── /contact/:contactId        # Contact detail
└── /supporters               # Legacy contact list (deprecated)
```

---

## 🎨 Page Components

### Splash.jsx
**Purpose:** Initial loading screen with auth check
- 1.2s animation
- Firebase auth state listener
- Routes to `/welcome` or `/signup`

### Welcome.jsx
**Purpose:** Universal hydrator and router
- **Hydrates:** orgId, eventId, currentEvent, EventAttendee schema
- **Caches:** All data in localStorage
- **Routes:** Based on user profile completion
- **New Users:** `/profile-setup` → `/org/choose` → `/org/create` → `/dashboard`
- **Returning Users:** `/dashboard`

### Dashboard.jsx
**Purpose:** Main CRM dashboard
- **Event Cards:** Shows upcoming events
- **Pipeline Management:** Purple card → `/event/:eventId/pipelines`
- **Quick Actions:** Create event, upload contacts, manage forms

### EventPipelines.jsx
**Purpose:** Pipeline management interface
- **Audience Selection:** Dropdown for audience types
- **Stage Columns:** Drag-and-drop contacts between stages
- **Contact Cards:** Show contact info with actions
- **API:** `GET /api/events/:eventId/pipeline?audienceType=org_members`

### ContactEventUpload.jsx
**Purpose:** Initiate CSV upload
- **Event Selection:** Uses currentEvent from localStorage
- **File Upload:** CSV file selection and validation
- **Navigation:** To preview page

### ContactEventUploadPreview.jsx
**Purpose:** Preview CSV and configure assignments
- **Schema Hydration:** Gets audience types and stages from schema config
- **Audience-First Flow:** Select audience → hydrate stages
- **Field Mapping:** Map CSV columns to Contact fields
- **Assignment:** All same stage or individual assignments

### ContactDetail.jsx
**Purpose:** Individual contact management
- **Conditional UI:** Shows elevation button for basic contacts
- **Tabs:** Overview, Events, Full Profile (if OrgMember)
- **Actions:** Edit, Add to Event, Delete

### FormBuilder.jsx
**Purpose:** Create and edit forms
- **Standard Fields:** First Name, Last Name, Email, Phone (hardcoded)
- **Custom Fields:** Add text, textarea, select, radio, checkbox, number, date
- **Form Settings:** Title, description, slug, audience type, target stage
- **Live Preview:** See form as users will see it

---

## 🌐 Ticketing App Navigation

### Public Form Access
```
https://ignite-ticketing.vercel.app/forms/:slug
→ GET /api/forms/public/:slug
→ Dynamic form rendering
→ Form submission
→ /form-success
```

### Form Flow
```
Public User → Form URL → Form Rendering → Form Submission → Success Page
```

---

## 🔄 User Flow Examples

### 1. Admin Creates Event and Form
```
Dashboard → Create Event → Event Created → Create Form → Form Builder → Save Form
```

### 2. Public User Submits Form
```
Public Form URL → Form Display → User Fills Form → Submit → Contact + EventAttendee Created
```

### 3. Admin Manages Pipeline
```
Dashboard → Pipeline Management → Select Audience → Drag Contacts Between Stages
```

### 4. CSV Upload Flow
```
Dashboard → Upload Contacts → Select Event → Upload CSV → Preview Data → Configure Assignments → Save
```

### 5. Contact Management
```
Dashboard → Contact Detail → View Contact Info → Elevate to Org Member → Add Extended Data
```

---

## 📱 Responsive Design

### Mobile Navigation
- **Hamburger Menu:** Collapsible navigation
- **Touch-Friendly:** Large buttons and touch targets
- **Responsive Forms:** Stack fields vertically on mobile

### Desktop Navigation
- **Sidebar:** Persistent navigation menu
- **Multi-Column:** Efficient use of screen space
- **Hover States:** Interactive elements with hover effects

---

## 🔐 Authentication States

### Authenticated Users
- **Full Access:** All CRM features
- **Persistent Session:** Firebase auth persistence
- **Auto-Hydration:** Data loaded on app start

### Unauthenticated Users
- **Public Forms:** Can submit forms
- **Redirect:** CRM app redirects to signup
- **No Persistence:** Session expires on browser close

---

## 🗂️ LocalStorage Strategy

### Data Caching
```javascript
// Welcome.jsx hydrates and caches:
localStorage.setItem('orgId', org.id);
localStorage.setItem('eventId', currentEvent.id);
localStorage.setItem('currentEvent', JSON.stringify(currentEvent));
localStorage.setItem('eventAttendeeSchema', JSON.stringify(schema));

// Components use cached data:
const orgId = localStorage.getItem('orgId');
const currentEvent = JSON.parse(localStorage.getItem('currentEvent'));
```

### Cache Benefits
- **Instant Loading:** No API calls for basic data
- **Offline Support:** Works with cached data
- **Reduced API Load:** Fewer backend requests

---

## 🎯 Navigation Patterns

### Breadcrumb Navigation
```
Dashboard → Events → Event Detail → Pipeline Management
Dashboard → Forms → Form Builder → Field Configuration
Dashboard → Contacts → Contact Detail → Event History
```

### Modal Navigation
```
Contact Detail → "Elevate to Org Member" → Modal → Add Extended Data
Form Builder → "Preview Form" → Modal → Live Preview
Pipeline → "Contact Details" → Modal → Quick Contact Info
```

### Tab Navigation
```
Contact Detail:
├── Overview Tab
├── Events Tab  
└── Full Profile Tab (if OrgMember)

Form Builder:
├── Fields Tab
├── Settings Tab
└── Preview Tab
```

---

## 🚀 Performance Optimizations

### Lazy Loading
- **Route-Based:** Components loaded on demand
- **Image Optimization:** Lazy load images
- **Bundle Splitting:** Separate bundles for different features

### Caching Strategy
- **API Responses:** Cache in localStorage
- **Form Schemas:** Cache schema configs
- **User Data:** Cache org and event data

### Error Handling
- **Network Errors:** Graceful fallbacks
- **Auth Errors:** Redirect to signup
- **Validation Errors:** Show inline error messages

---

## 📊 Analytics & Tracking

### User Journey Tracking
- **Page Views:** Track navigation patterns
- **Form Submissions:** Track conversion rates
- **Feature Usage:** Track which features are used most

### Performance Metrics
- **Load Times:** Track page load performance
- **API Response Times:** Monitor backend performance
- **Error Rates:** Track and monitor errors

---

## ✅ Working Flows

- **Authentication:** Firebase auth with persistence
- **Dashboard Navigation:** All main features accessible
- **Form Creation:** Complete form builder flow
- **CSV Upload:** Complete upload and assignment flow
- **Pipeline Management:** Drag-and-drop contact management
- **Contact Management:** View and elevate contacts

---

## 🚧 In Progress

- **Contact Elevation Modal:** Add extended CRM data
- **Universal Contacts List:** Replace supporters page
- **Advanced Search:** Find contacts across all data

---

## 📋 Planned Features

- **Bulk Actions:** Select multiple contacts for actions
- **Advanced Filtering:** Filter contacts by multiple criteria
- **Export Functionality:** Export contact lists
- **Mobile App:** Native mobile application
- **Offline Support:** Work offline with cached data

---

## 🔑 Key Concepts

1. **Multi-App Architecture** - Separate CRM and Ticketing apps
2. **Universal Hydration** - Cache all data on app start
3. **Schema Config Pattern** - Valid values from schema, not hardcoded
4. **Contact-First Navigation** - Everything starts with contacts
5. **Responsive Design** - Works on all device sizes
6. **Error Resilience** - Graceful handling of network/auth errors

---

## 🚀 Next Steps

1. **Contact Elevation Modal** - Complete the elevation flow
2. **Universal Contacts List** - Replace deprecated supporters page
3. **Advanced Search** - Find contacts across all data
4. **Bulk Actions** - Select multiple contacts for actions
5. **Mobile Optimization** - Improve mobile experience

