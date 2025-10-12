# Contact-First Architecture

**Last Updated:** October 11, 2025

## 🎯 Core Principle

**Contact is UNIVERSAL personhood.** Every person in the system starts as a `Contact`, and organizational relationships are created through `OrgMember` and `EventAttendee`.

---

## 📊 Data Model

### **Contact (Universal Person)**
```javascript
Contact {
  id: String (CUID)           // Universal person ID
  email: String (@unique)     // Globally unique email
  firstName: String
  lastName: String
  phone: String?
  
  // Relations
  orgMember: OrgMember?       // Optional org membership
  eventAttendees: EventAttendee[]
  admin: Admin?
}
```

**Key Points:**
- ✅ NO `orgId` in Contact
- ✅ Email is globally unique (one person, one contact)
- ✅ Contact survives org membership changes
- ✅ Ready for multi-org future

---

### **OrgMember (The Bridge)**
```javascript
OrgMember {
  id: String (CUID)
  contactId: String (@unique)  // 1:1 with Contact
  orgId: String                // Which org
  
  // Extended fields
  goesBy: String?
  employer: String?
  street, city, state, zip
  married, spouseName, numberOfKids
  categoryOfEngagement
  tags: String[]
}
```

**Key Points:**
- ✅ `contactId` is unique (one Contact = one OrgMember for MVP1)
- ✅ `orgId` creates the relationship to Organization
- ✅ Extended fields live here, not in Contact
- ✅ **Super Users**: Admin users have OrgMember records with their `orgId`
- ✅ Future: Can add `@@unique([contactId, orgId])` for multi-org

---

### **EventAttendee (Event Relationship)**
```javascript
EventAttendee {
  id: String (CUID)
  contactId: String            // Links to Contact
  eventId: String
  audienceType: String         // org_members, friends_family, etc.
  currentStage: String         // in_funnel, paid, etc.
  
  @@unique([eventId, contactId, audienceType])
}
```

---

## 🔄 Data Flow: Org Member CSV Upload

### **Endpoint:**
```
POST /api/orgmember/csv
```

**Body (FormData):**
- `file`: CSV file
- `orgId`: Organization ID

**Why no `:orgId` in URL?**
Because Contact is universal and doesn't belong to any org in the URL path.

---

### **Backend Flow:**

**Route:** `routes/orgMembersSaveroute.js`

```javascript
1. Receive CSV + orgId from frontend
2. For each valid record:
   a. UPSERT Contact (by email - universal lookup)
      - If exists: update name/phone
      - If new: create Contact
   
   b. Check if OrgMember exists (by contactId)
      - If exists: verify it's same orgId, then update
      - If new: create OrgMember with contactId + orgId
   
3. Return: { inserted, updated, errors }
```

**Key Code:**
```javascript
// 1. Create Contact (UNIVERSAL)
const contact = await prisma.contact.upsert({
  where: { email: recordData.email },  // Global unique
  update: { firstName, lastName, phone },
  create: { firstName, lastName, email, phone }
});

// 2. Create OrgMember (THE BRIDGE)
const existingOrgMember = await prisma.orgMember.findUnique({
  where: { contactId: contact.id }
});

if (!existingOrgMember) {
  await prisma.orgMember.create({
    data: {
      contactId: contact.id,  // Link to Contact
      orgId: orgId,          // Link to Org
      goesBy, employer, etc.
    }
  });
}
```

---

### **Frontend Flow:**

**Pages:**
1. `OrgMembersCSVUpload.jsx` - Upload CSV, parse headers
2. `OrgMembersUploadPreview.jsx` - Review field mapping, confirm upload
3. `ContactValidation.jsx` - Show results (inserted/updated/errors)
4. `ResolveErrors.jsx` - Fix errors and retry

**API Call:**
```javascript
const formData = new FormData();
formData.append("file", csvFile);
formData.append("orgId", orgId);  // In body, not URL!

await api.post('/orgmember/csv', formData);
```

---

## ✅ Benefits

### **1. Universal Personhood**
- Contact data survives org membership changes
- One email = one person across the entire system
- No duplicate person records

### **2. Clean Separation**
- Contact = minimal person data
- OrgMember = org-specific extended data
- EventAttendee = event-specific tracking

### **3. Relationship Tracking**
- "John was a member 2020-2022, rejoined 2024"
- "This person attended 5 events across 3 orgs"
- Email history preserved forever

### **4. Future-Proof**
- Ready for multi-org (change `@@unique([contactId])` to `@@unique([contactId, orgId])`)
- Ready for inactive/active member status
- Ready for cross-org analytics

---

## 🚫 Deprecated

### **DO NOT USE:**
- ❌ `routes/orgMembersListRoute.js` (DELETED)
- ❌ `services/supporterMutation.js` (DELETED)
- ❌ `POST /orgs/:orgId/supporters/csv` (OLD ENDPOINT)
- ❌ Supporter model (legacy, to be fully removed)

### **USE INSTEAD:**
- ✅ `routes/orgMembersSaveroute.js`
- ✅ `POST /api/orgmember/csv`
- ✅ Contact-First flow (Contact → OrgMember)

---

## 📝 Schema Changes Required

### **On Render (Backend):**
```bash
# In Render shell
npx prisma db push
```

**Changes:**
1. Remove `orgId` from Contact model
2. Remove `@@unique([orgId, email])` from Contact
3. Add `@@unique([email])` to Contact
4. Remove `contacts` relation from Organization

---

## 🛡️ Super User Protection

### **Super User Identity:**
- Super users are regular `Contact` records with `OrgMember` relationships
- Admin operations use `orgId` from the OrgMember record
- No special "admin" table needed - leverage existing Contact-First architecture

### **Backend Protection:**
```javascript
// Example: Prevent deletion of super user
const isSuperUser = await prisma.orgMember.findFirst({
  where: { 
    contactId: contactIdToDelete,
    orgId: SUPER_USER_ORG_ID 
  }
});

if (isSuperUser) {
  throw new Error('Cannot delete super user');
}
```

### **Key Principle:**
- **Super User = Contact + OrgMember with specific `orgId`**
- **Regular User = Contact + OrgMember with regular `orgId`**
- **Universal personhood maintained** - no special admin tables

---

## 🔍 Future Considerations

### **Multi-Org Support:**
Change OrgMember constraint:
```prisma
model OrgMember {
  contactId String
  orgId String
  
  @@unique([contactId, orgId])  // One membership per contact per org
}
```

### **Active/Inactive Status:**
```prisma
model OrgMember {
  isActive Boolean @default(true)
  leftDate DateTime?
  rejoinedDate DateTime?
}
```

---

## 🎉 Summary

**Contact-First Architecture = Universal personhood where organizational relationships are optional extensions, not locks.**

This architecture supports:
- ✅ Data integrity
- ✅ Relationship tracking
- ✅ Multi-org future
- ✅ Clean separation of concerns
- ✅ No duplicate person records


