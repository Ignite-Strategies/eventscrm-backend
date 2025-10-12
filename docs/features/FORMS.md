# 📝 Form System

**Last Updated:** December 2024

---

## 🎯 Overview

**Dynamic Form System** with public forms and admin form builder.

### Core Components
- **PublicForm** - Dynamic forms with custom fields stored as JSON
- **FormBuilder** - Admin interface for creating/editing forms
- **PublicFormRenderer** - Dynamic form rendering for public users
- **FormSubmission** - Creates Contact + EventAttendee records

---

## 🏗️ Form Architecture

### PublicForm Model
```prisma
PublicForm {
  id, orgId, eventId, slug, title, description
  collectFirstName, collectLastName, collectEmail, collectPhone  // Standard fields
  fields: Json  // Custom fields as JSON array
  audienceType, targetStage  // Mutation instructions
  isActive, submissionCount
}
```

### Custom Fields JSON Structure
```json
{
  "fields": [
    {
      "id": "f3_name",
      "type": "text", 
      "label": "F3 Name",
      "placeholder": "Enter your F3 name",
      "required": true,
      "order": 1
    },
    {
      "id": "attendance_likelihood",
      "type": "radio",
      "label": "How likely are you to attend?",
      "required": true,
      "options": [
        { "value": "very_likely", "label": "Very Likely" },
        { "value": "likely", "label": "Likely" },
        { "value": "maybe", "label": "Maybe" }
      ],
      "order": 2
    }
  ]
}
```

---

## 🎨 Form Builder (Admin)

### FormBuilder.jsx
**Purpose:** Create and edit forms

**Features:**
- **Standard Fields:** First Name, Last Name, Email, Phone (always present)
- **Custom Fields:** Add text, textarea, select, radio, checkbox, number, date
- **Field Configuration:** Label, placeholder, required, options
- **Form Settings:** Title, description, slug, audience type, target stage
- **Live Preview:** See form as users will see it

**Field Types:**
```javascript
const fieldTypes = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'number', label: 'Number Input' },
  { value: 'date', label: 'Date Picker' }
];
```

**Form Submission:**
```javascript
POST /api/forms
{
  "orgId": "...",
  "eventId": "...",
  "slug": "my-form",
  "title": "My Form",
  "internalPurpose": "Description",
  "audienceType": "org_members",
  "targetStage": "soft_commit",
  "fields": [
    // Custom fields only (standard fields hardcoded)
  ]
}
```

---

## 🌐 Public Form Rendering

### PublicForm.jsx
**Purpose:** Render dynamic forms for public users

**Features:**
- **Dynamic Rendering:** Fields render based on type
- **Standard Fields:** First Name + Last Name on same line
- **Custom Fields:** Render based on JSON configuration
- **Validation:** Required field validation
- **Submission:** POST to `/api/contacts`

**Field Rendering:**
```javascript
// Text Input
<input type="text" placeholder={field.placeholder} required={field.required} />

// Radio Buttons
{field.options.map(option => (
  <label key={option.value}>
    <input type="radio" name={field.id} value={option.value} />
    {option.label}
  </label>
))}

// Checkboxes
{field.options.map(option => (
  <label key={option.value}>
    <input type="checkbox" name={field.id} value={option.value} />
    {option.label}
  </label>
))}
```

**Form Submission:**
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
    "f3_name": "Johnny",
    "attendance_likelihood": "very_likely"
  }
}
```

---

## 🔌 API Endpoints

### Form Management (Admin)
```javascript
GET /api/forms
// List all forms for org
// Query params: orgId, eventId

GET /api/forms/:formId/edit
// Get form for editing

POST /api/forms
// Create new form

PATCH /api/forms/:formId
// Update existing form

DELETE /api/forms/:formId
// Delete form
```

### Public Form Access
```javascript
GET /api/forms/public/:slug
// Hydrate form for public display
// Returns form config + standard fields

POST /api/contacts
// Submit form data
// Creates Contact + EventAttendee records
```

---

## 🔄 Complete Form Flow

### 1. Admin Creates Form
```
Admin → Form Builder → Configure fields → Save → Form created in database
```

### 2. Public User Visits Form
```
https://ignite-ticketing.vercel.app/forms/bros-brews
→ GET /api/forms/public/bros-brews
→ Dynamic form rendering
→ User fills out form
```

### 3. Form Submission
```
User submits → POST /api/contacts
→ Contact created/updated (using orgId_email unique constraint)
→ EventAttendee created (using eventId_contactId_audienceType unique constraint)
→ Redirect to success page
```

### 4. Admin Views Results
```
Admin → Pipeline Management → See contact in selected stage
Admin → Contact Detail → View submitted form data
```

---

## 📊 Form Analytics

### Submission Tracking
- **submissionCount** - Total submissions
- **EventAttendee.notes** - Stores custom field responses as JSON
- **submittedFormId** - Links EventAttendee to PublicForm

### Form Performance
- Form views (future)
- Conversion rates (future)
- Drop-off analysis (future)

---

## 🎯 Form Types

### Soft Commit Forms
**Purpose:** Collect RSVPs and interest
- **Audience:** org_members, friends_family
- **Target Stage:** soft_commit
- **Fields:** F3 name, attendance likelihood, party size

### Registration Forms
**Purpose:** Full event registration
- **Audience:** landing_page_public
- **Target Stage:** registered
- **Fields:** Payment info, dietary restrictions, emergency contact

### Volunteer Forms
**Purpose:** Collect volunteer information
- **Audience:** community_partners
- **Target Stage:** volunteer
- **Fields:** Skills, availability, interests

---

## 🔧 Form Configuration

### Audience Types
```javascript
// From schema config
const audienceTypes = [
  'org_members',           // Internal team
  'friends_family',        // Personal network
  'landing_page_public',   // Public signups
  'community_partners',    // Partner orgs
  'cold_outreach'          // Cold prospects
];
```

### Target Stages
```javascript
// From schema config  
const stages = [
  'in_funnel',           // Initial entry
  'general_awareness',   // Aware of event
  'personal_invite',     // Personally invited
  'expressed_interest',  // Showed interest
  'soft_commit',         // Soft commitment
  'paid'                 // Paid registration
];
```

---

## 🎨 Form Styling

### F3 Capital Branding
- **Hero Banner:** Muscle icon + F3 Capital branding
- **Colors:** F3 brand colors
- **Typography:** Clean, professional fonts
- **Layout:** Responsive grid system

### Field Layout
```javascript
// First Name + Last Name on same line
<div className="grid grid-cols-2 gap-4">
  <input name="firstName" />
  <input name="lastName" />
</div>

// Other fields full width
<div>
  <input name="email" />
</div>
```

---

## ✅ Working Features

- **Form Builder** - Create/edit forms with custom fields
- **Public Form Rendering** - Dynamic form display
- **Form Submission** - Creates Contact + EventAttendee
- **Schema Config Hydration** - Valid values from schema
- **Form List** - Admin dashboard with all forms
- **Form Analytics** - Submission count tracking

---

## 🚧 In Progress

- **Form Preview** - Better preview in FormBuilder
- **Form Templates** - Pre-built form templates
- **Advanced Validation** - Custom validation rules
- **Form Duplication** - Copy existing forms

---

## 📋 Planned Features

- **Form Analytics Dashboard** - Views, conversions, drop-offs
- **A/B Testing** - Test different form versions
- **Conditional Logic** - Show/hide fields based on responses
- **File Uploads** - Support for file attachments
- **Payment Integration** - Stripe integration for paid events

---

## 🔑 Key Concepts

1. **Dynamic Forms** - Custom fields stored as JSON
2. **Standard Fields** - First Name, Last Name, Email, Phone always present
3. **Schema Config** - Valid audience types and stages from schema
4. **Form Mutation** - audienceType and targetStage control EventAttendee creation
5. **Unique Constraints** - Prevent duplicate submissions
6. **Public vs Admin** - Clear separation of concerns

---

## 🚀 Next Steps

1. **Form Templates** - Pre-built form configurations
2. **Advanced Validation** - Custom field validation rules
3. **Form Analytics** - Track form performance
4. **Conditional Logic** - Dynamic field visibility
5. **Payment Integration** - Stripe for paid events

