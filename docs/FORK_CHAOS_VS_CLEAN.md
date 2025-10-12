# 🔥 Fork Chaos vs. Clean Architecture

**Date:** October 12, 2025

---

## 🚨 THE CURRENT CHAOS

### Problem: Frontend Doesn't Know What It's Showing

```
User views Event Pipeline
  ↓
Frontend fetches EventAttendees
  ↓
Displays them in a list
  ↓
User clicks DELETE
  ↓
Frontend calls: DELETE /contacts/:contactId  ❌ WRONG ENDPOINT!
  ↓
Backend: "contactId is undefined"
  ↓
💥 404 Error
```

**Why?** Frontend is confused about:
- Is this the OrgMembers list?
- Is this the EventAttendees list?
- What should delete do?

---

## 🎯 THE CLEAN FORK ARCHITECTURE

### FORK 1: OrgMember Management

**Page:** `/org-members`

**What it shows:**
```javascript
GET /api/orgmembers?orgId=xxx
Returns: [
  {
    id: "orgMember123",
    contactId: "contact456",
    contact: {
      firstName: "John",
      lastName: "Smith",
      email: "john@..."
    },
    // OrgMember extended fields
    employer: "Tech Corp",
    street: "123 Main St",
    ...
  }
]
```

**Delete action:**
```javascript
DELETE /api/orgmembers/:orgMemberId
// Removes from master CRM list
// Contact stays (they're still a person!)
```

---

### FORK 2: EventAttendee Management

**Page:** `/event/:eventId/pipelines`

**What it shows:**
```javascript
GET /api/events/:eventId/attendees?audienceType=org_members
Returns: [
  {
    id: "attendee789",
    contactId: "contact456",
    eventId: "event123",
    contact: {
      firstName: "John",
      lastName: "Smith",
      email: "john@..."
    },
    // EventAttendee fields
    currentStage: "rsvp",
    audienceType: "org_members",
    attended: false
  }
]
```

**Delete action:**
```javascript
DELETE /api/event-attendees/:attendeeId
// Removes from THIS EVENT only
// Contact stays (might be in other events!)
```

---

### FORK 3: Universal Contact Management (Future)

**Page:** `/contacts`

**What it shows:**
```javascript
GET /api/contacts?orgId=xxx
Returns: [
  {
    id: "contact456",
    firstName: "John",
    lastName: "Smith",
    email: "john@...",
    orgMember: { ... },        // If exists
    eventAttendees: [ ... ]    // All events they're in
  }
]
```

**Delete action:**
```javascript
DELETE /api/contacts/:contactId
// ⚠️ NUCLEAR - Deletes person from EVERYTHING
// Confirm: "Delete John Smith from ALL events and master list?"
```

---

## 🔧 WHAT'S NEEDED TO FIX

### 1. Backend Routes (Some Missing!)

**OrgMember Routes:**
```javascript
✅ GET /api/orgmembers?orgId=xxx        // Exists
❌ DELETE /api/orgmembers/:id           // MISSING!
✅ POST /api/orgmember/csv              // Exists
```

**EventAttendee Routes:**
```javascript
✅ GET /api/events/:eventId/attendees   // Exists
❌ DELETE /api/event-attendees/:id      // MISSING!
✅ POST /api/contacts/event/upload      // Exists
```

**Contact Routes:**
```javascript
✅ GET /api/contacts/:contactId         // Exists
❌ DELETE /api/contacts/:contactId      // Exists but maybe broken?
✅ POST /api/contacts                   // Exists (form submission)
```

---

### 2. Frontend List Components Need Context

**Bad (Current):**
```javascript
// ContactList.jsx - Generic, doesn't know context
<ContactList contacts={data} />
  <button onClick={() => deleteContact(contact.id)}>Delete</button>
  // ❌ Doesn't know if it's OrgMember or EventAttendee!
```

**Good (Fork-Aware):**
```javascript
// OrgMembersList.jsx
<OrgMembersList orgMembers={data} />
  <button onClick={() => deleteOrgMember(orgMember.id)}>
    Remove from Master List
  </button>

// EventAttendeesList.jsx
<EventAttendeesList attendees={data} eventId={eventId} />
  <button onClick={() => deleteEventAttendee(attendee.id)}>
    Remove from Event
  </button>

// UniversalContactsList.jsx
<UniversalContactsList contacts={data} />
  <button onClick={() => deleteContact(contact.id)}>
    Delete Person (EVERYWHERE)
  </button>
```

---

## 📋 IMMEDIATE FIX PLAN

### Step 1: Add Missing Delete Routes

**Create:** `routes/orgMembersDeleteRoute.js`
```javascript
router.delete('/orgmembers/:id', async (req, res) => {
  const { id } = req.params;
  
  // Delete OrgMember record (Contact stays!)
  await prisma.orgMember.delete({ where: { id } });
  
  res.json({ success: true, message: 'Removed from master list' });
});
```

**Create:** `routes/eventAttendeesDeleteRoute.js`
```javascript
router.delete('/event-attendees/:id', async (req, res) => {
  const { id } = req.params;
  
  // Delete EventAttendee record (Contact stays!)
  await prisma.eventAttendee.delete({ where: { id } });
  
  res.json({ success: true, message: 'Removed from event' });
});
```

---

### Step 2: Fix Frontend Components

**Identify which page is which:**
```
/org-members → OrgMembersList → uses orgMember.id
/event/:id/pipelines → EventAttendeesList → uses attendee.id
```

**Update delete buttons:**
```javascript
// In EventAttendeesList.jsx
const handleDelete = async (attendeeId) => {
  await api.delete(`/event-attendees/${attendeeId}`);
  refreshList();
};

// In OrgMembersList.jsx
const handleDelete = async (orgMemberId) => {
  await api.delete(`/orgmembers/${orgMemberId}`);
  refreshList();
};
```

---

### Step 3: Add Context to Lists

**Every list component needs to know:**
```javascript
// Props should tell you the context
<EventAttendeesList 
  attendees={data}
  eventId={eventId}
  onDelete={handleDeleteFromEvent}  // Clear what it does!
/>

<OrgMembersList 
  members={data}
  orgId={orgId}
  onDelete={handleDeleteFromMasterList}  // Clear!
/>
```

---

## 🎯 ROOT CAUSE

**The Contact-First architecture is correct, but:**

1. ❌ Frontend doesn't distinguish between OrgMember list vs. EventAttendee list
2. ❌ Delete routes are missing for the forks
3. ❌ Generic "ContactList" component used everywhere (shouldn't be!)

**Each fork needs:**
- ✅ Its own list component
- ✅ Its own delete route
- ✅ Clear naming (OrgMember vs. EventAttendee)

---

## ✅ AFTER THE FIX

### Viewing OrgMembers:
```
Page: /org-members
Shows: Master CRM list
Delete: Removes from master list (Contact stays)
```

### Viewing Event Pipeline:
```
Page: /event/:id/pipelines
Shows: People in THIS EVENT
Delete: Removes from THIS EVENT (Contact stays, OrgMember stays)
```

### Viewing Universal Contacts:
```
Page: /contacts (future)
Shows: All people in system
Delete: Nuclear option (removes from EVERYTHING)
```

---

## 🔑 KEY PRINCIPLE

**Different views = Different delete behavior**

It's not about the data model (Contact is universal).
It's about the USER'S INTENT:

- Viewing master list? → Delete from master list
- Viewing event? → Delete from event
- Viewing universal? → Delete from everything

**The fork determines the behavior!**

---

*This is why generic "ContactList" components break down. Each fork needs its own UI.*

