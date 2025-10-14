# Contact List Management Architecture

## 🎯 **Purpose**
Manage contact lists for campaigns with clear mutation tracking and localStorage-based navigation.

---

## 📦 **Core Components**

### **1. ContactList Model (Database)**
```prisma
model ContactList {
  id            String   @id @default(cuid())
  orgId         String
  name          String
  type          String   // "contact" | "org_member" | "event_attendee"
  
  // Event-specific filters
  eventId       String?
  audienceType  String?
  stages        String[]
  
  // Metadata
  totalContacts Int      @default(0)
  usageCount    Int      @default(0)  // DEPRECATED - use Campaign relation
  lastUsed      DateTime?
  isActive      Boolean  @default(true)
  
  // Relations
  contacts      Contact[]   // Contacts with contactListId = this.id
  campaigns     Campaign[]  // Campaigns using this list
}
```

### **2. Contact Model (The Mutated Record)**
```prisma
model Contact {
  id            String  @id
  orgId         String
  
  contactListId String?  // ← THE MUTATION! Set by populateContactList()
  contactList   ContactList? @relation(fields: [contactListId], references: [id])
  
  // ... other fields
}
```

### **3. Campaign Model (The Consumer)**
```prisma
model Campaign {
  id            String   @id
  orgId         String
  name          String
  status        String   // "draft" | "active" | "sent"
  
  contactListId String?  // ← Can be NULL! Campaign can exist without list
  contactList   ContactList? @relation(fields: [contactListId], references: [id])
}
```

---

## 🔄 **The Flow: Create → Assign → Hydrate**

### **Step 1: CREATE List Metadata**
```javascript
// ContactListService.createContactList()
const contactList = await prisma.contactList.create({
  data: {
    id: "list_abc123",      // Auto-generated
    orgId: "org_xyz",
    name: "Event Attendees",
    type: "event_attendee",
    eventId: "event_456",
    stages: ["rsvped", "paid"],
    totalContacts: 0        // Not populated yet!
  }
});
```

**Result:** ContactList record exists in DB, but NO contacts assigned yet.

---

### **Step 2: ASSIGN/MUTATE Contacts (The Confusion!)**
```javascript
// ContactListService.populateContactList()
// MISLEADING NAME! Should be assignContactsToList()

// 1. Find matching contacts based on list criteria
const matchingContacts = await getEventAttendeeContacts(contactList);
// Returns: [{ id: "contact1" }, { id: "contact2" }, ...]

// 2. MUTATE Contact.contactListId for ALL matching contacts
await prisma.contact.updateMany({
  where: { id: { in: ["contact1", "contact2"] } },
  data: { contactListId: "list_abc123" }  // ← THE MUTATION!
});

// 3. Update list metadata
await prisma.contactList.update({
  where: { id: "list_abc123" },
  data: { 
    totalContacts: 2,
    lastUpdated: new Date()
  }
});
```

**Result:** Contact records now have `contactListId = "list_abc123"` (mutation saved!)

**⚠️ NAMING CONFUSION:**
- "populate" sounds like "fetch/hydrate" 
- But it actually **mutates** `Contact.contactListId`!
- Better name: `assignContactsToList()`

---

### **Step 3: HYDRATE/FETCH Contacts**
```javascript
// ContactListService.getContactsForList()
const contacts = await prisma.contact.findMany({
  where: { contactListId: "list_abc123" },
  include: {
    orgMember: true,
    eventAttendees: true
  }
});
```

**Result:** Returns all contacts WHERE `contactListId = "list_abc123"` (hydration!)

---

## 📱 **Frontend: localStorage-Based Navigation**

### **Why localStorage Instead of URL Params?**

**Old Way (URL params):**
```javascript
navigate(`/contact-list-manager?campaignId=${id}&listId=${listId}`);
// ❌ Long URLs
// ❌ Breaks on refresh if not handled
// ❌ Complex prop drilling
```

**New Way (localStorage):**
```javascript
localStorage.setItem('campaignId', campaign.id);
localStorage.setItem('currentCampaign', campaign.name);
navigate('/campaign-list-hydrator-home');
// ✅ Clean URLs
// ✅ Survives page refresh
// ✅ Easy to access anywhere
```

---

### **Campaign Creation Flow (localStorage-based)**

```javascript
// Step 1: CampaignCreator.jsx
const campaign = await api.post("/campaigns", {
  orgId,
  name: "Spring Fundraiser",
  status: "draft",
  contactListId: null  // ← No list yet!
});

localStorage.setItem('campaignId', campaign.id);
localStorage.setItem('currentCampaign', campaign.name);

navigate('/campaign-list-hydrator-home');  // No params!
```

```javascript
// Step 2: CampaignListHydratorHome.jsx (THE FORK)
const campaignId = localStorage.getItem('campaignId');
const campaignName = localStorage.getItem('currentCampaign');

// User picks:
// A) Pick Existing List → /contact-list-manager
// B) Create New List → /create-list-options
```

```javascript
// Step 3: ContactListManager.jsx (if picking existing)
const campaignId = localStorage.getItem('campaignId');
const list = await api.get(`/contact-lists/${selectedListId}`);

// Assign list to campaign
await api.patch(`/campaigns/${campaignId}`, {
  contactListId: list.id
});

navigate('/sequence');  // No params needed!
```

```javascript
// Step 4: Sequence.jsx
const campaignId = localStorage.getItem('campaignId');
const campaign = await api.get(`/campaigns/${campaignId}`);

// campaign.contactListId is now set!
// Fetch contacts and send emails
```

---

## 📊 **4-State System (Campaign ↔ List Relationship)**

### **State 1: ASSIGNED (Draft Campaign)**
```sql
-- Campaign has list, but email not sent yet
SELECT * FROM "Campaign" 
WHERE "contactListId" = 'list123' 
AND status = 'draft';
```

**UI:** Show "Assigned to 1 campaign (Draft)" on list card

**Actions:**
- ✅ Use in different campaign → Unassign from current
- ✅ Edit campaign
- ✅ Send campaign

---

### **State 2: USED (Sent Campaign)**
```sql
-- Campaign sent, emails already delivered
SELECT * FROM "Campaign" 
WHERE "contactListId" = 'list123' 
AND status = 'sent';
```

**UI:** Show "⚠️ Used in 1 campaign (Sent)" on list card

**Actions:**
- ⚠️ Reuse → Show Wiper Service warning
- ✅ View campaign results
- ❌ Cannot unassign (email already sent!)

---

### **State 3: UNASSIGN (Remove from Campaign)**
```javascript
// Remove list from campaign, pick a different one
await prisma.campaign.update({
  where: { id: "campaign_xyz" },
  data: { contactListId: null }
});
```

**UI:** Button "Unassign from Campaign"

**Result:** Campaign no longer references this list

---

### **State 4: REUSE (Wiper Service)**
```javascript
// Clear ALL campaigns using this list (calculated risk!)
await prisma.campaign.updateMany({
  where: { contactListId: "list123" },
  data: { contactListId: null }
});
```

**UI:** Button "Reset & Reuse (Wiper Service)" with warnings:
- ⚠️ Email overlap risk
- ⚠️ Contacts may get duplicate emails
- ✅ User confirms they understand

**Use Cases:**
- List was used in old campaign, want to reorganize
- Test campaigns need cleanup
- Org restructure requires fresh start

---

## ❌ **DEPRECATED: trackUsage()**

**Old System:**
```javascript
// Incremented usageCount on EVERY fetch
const contacts = await getContactsForList(listId);
await trackUsage(contactList);  // ❌ DEPRECATED!
```

**Problem:**
- `usageCount` increments on every fetch, not just campaign assignment
- Orphaned counts when campaigns deleted
- No way to know WHICH campaigns used it

**New System:**
```sql
-- Query actual campaign relationships
SELECT COUNT(*) FROM "Campaign" 
WHERE "contactListId" = 'list123' 
AND status IN ('draft', 'active', 'sent');
```

**Benefits:**
- ✅ Accurate count of campaigns using list
- ✅ Can see WHICH campaigns
- ✅ No orphaned data
- ✅ Real-time accurate

---

## 🔧 **Service Methods Reference**

### **ContactListService.js**

| Method | What It Does | Better Name |
|--------|--------------|-------------|
| `createContactList(listData)` | Creates ContactList record + calls populate | `createListRecord()` |
| `populateContactList(contactList)` | **MUTATES** `Contact.contactListId` | `assignContactsToList()` |
| `getContactsForList(listId)` | **HYDRATES** contacts from DB | ✅ (good name!) |
| `getGeneralContacts()` | Find all org contacts | ✅ |
| `getOrgMemberContacts()` | Find org member contacts | ✅ |
| `getEventAttendeeContacts()` | Find event attendees (by stage/type) | ✅ |
| `updateContactCount()` | Update `totalContacts` metadata | ✅ |
| `trackUsage()` | ❌ DEPRECATED | ❌ Don't use! |
| `getListStats()` | Get list statistics | ✅ |
| `refreshDynamicList()` | Re-run filters, update assignments | ✅ |

---

## 📝 **Best Practices**

### **Creating a Contact List**
```javascript
// Good: Let service handle everything
const list = await ContactListService.createContactList({
  orgId: "org_123",
  name: "Event Attendees - RSVP",
  type: "event_attendee",
  eventId: "event_456",
  stages: ["rsvped"]
});
// ✅ List created
// ✅ Contacts automatically assigned (mutated)
// ✅ totalContacts updated
```

### **Assigning List to Campaign (localStorage flow)**
```javascript
// Frontend
localStorage.setItem('campaignId', 'campaign_abc');
localStorage.setItem('currentCampaign', 'Spring Fundraiser');

// Later, when user selects list
const campaignId = localStorage.getItem('campaignId');
await api.patch(`/campaigns/${campaignId}`, {
  contactListId: selectedList.id
});
```

### **Checking List Status**
```javascript
// Query active campaigns using this list
const campaigns = await prisma.campaign.findMany({
  where: { 
    contactListId: listId,
    status: { in: ['draft', 'active', 'sent'] }
  }
});

if (campaigns.length === 0) {
  // ✅ List is free to use
} else if (campaigns.some(c => c.status === 'sent')) {
  // ⚠️ List was used, show warning
} else {
  // 📝 List assigned to draft campaign
}
```

---

## 🚨 **Common Pitfalls**

### **Pitfall 1: Confusing "populate" with "hydrate"**
```javascript
// ❌ WRONG mental model
populateContactList() → "Fetch contacts from DB"

// ✅ CORRECT mental model
populateContactList() → "MUTATE Contact.contactListId to assign contacts to list"
```

### **Pitfall 2: Using URL params instead of localStorage**
```javascript
// ❌ Complex, breaks on refresh
navigate(`/sequence?campaignId=${id}&listId=${listId}`);

// ✅ Simple, survives refresh
localStorage.setItem('campaignId', id);
navigate('/sequence');
```

### **Pitfall 3: Trusting usageCount**
```javascript
// ❌ Can be orphaned/inaccurate
if (list.usageCount > 0) { /* ... */ }

// ✅ Query actual relationships
const campaigns = await prisma.campaign.findMany({
  where: { contactListId: list.id }
});
```

---

## 🎯 **Key Takeaways**

1. **Contact lists MUTATE `Contact.contactListId`** (not just metadata!)
2. **"populate" = "assign/mutate"** (misleading name!)
3. **localStorage > URL params** for campaign flow
4. **Campaign.contactListId can be NULL** (optional relationship)
5. **4-state system:** assigned → used → unassign → reuse (wiper)
6. **trackUsage() is DEPRECATED** (use Campaign relationships)

---

**Last Updated:** October 14, 2025  
**Status:** ✅ Production  
**Next:** Implement 4-state UI on contact list cards


