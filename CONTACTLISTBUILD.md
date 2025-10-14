# Contact List Build Architecture

## 🎯 Overview
Contact list creation system using `contactListId` field on Contact model for MVP1.

## 🏗️ Database Schema

### Contact Model
```prisma
model Contact {
  id            String @id @default(cuid())
  firstName     String
  lastName      String
  email         String @unique
  contactListId String?                    // ← MVP1: Single list assignment
  contactList   ContactList? @relation(fields: [contactListId], references: [id])
  
  @@index([contactListId])
}
```

### ContactList Model
```prisma
model ContactList {
  id            String @id @default(cuid())
  orgId         String
  name          String
  description   String?
  type          String                     // "org_member", "event_attendee", "smart"
  totalContacts Int @default(0)
  isActive      Boolean @default(true)
  
  contacts      Contact[]                  // ← One-to-many relationship
}
```

## 🔧 Save Mechanics

### Current Implementation
```javascript
// 1. Find matching contacts based on type
const matchingContacts = await this.getOrgMemberContacts(contactList);

// 2. Extract contact IDs
const contactIds = matchingContacts.map(c => c.id);

// 3. Set contactListId on ALL matching contacts
await prisma.contact.updateMany({
  where: { id: { in: contactIds } },
  data: { contactListId: contactList.id }
});
```

### The Problem: No Deselection Support
**Current saver only SETS contactListId, doesn't handle unchecking!**

```javascript
// If user unchecks John from the list:
// John keeps his old contactListId (not removed)
// Only selected contacts get new contactListId
```

## 🎯 ContactListView Flow

### 1. Preview Mode
```javascript
// Load all org members
const orgMembers = await api.get(`/orgmembers?orgId=${orgId}`);

// Auto-check everyone
const [selectedContacts, setSelectedContacts] = useState(
  new Set(orgMembers.map(m => m.contactId))
);
```

### 2. Deselection
```javascript
// User unchecks John
const handleToggleContact = (contactId) => {
  setSelectedContacts(prev => {
    const newSet = new Set(prev);
    if (newSet.has(contactId)) {
      newSet.delete(contactId);  // ← Remove from selection
    } else {
      newSet.add(contactId);     // ← Add to selection
    }
    return newSet;
  });
};
```

### 3. Save with Deselection
```javascript
// Need NEW saver that handles deselection:
const selectedContactIds = Array.from(selectedContacts);

await api.post("/contact-lists/from-selection", {
  orgId,
  name: "All Org Members",
  description: "Selected org members",
  selectedContactIds  // ← Array of selected IDs only
});
```

## 🚀 New Saver Route

### `POST /contact-lists/from-selection`
```javascript
router.post("/from-selection", async (req, res) => {
  try {
    const { orgId, name, description, selectedContactIds } = req.body;
    
    // 1. Create the contact list
    const contactList = await prisma.contactList.create({
      data: {
        orgId,
        name,
        description,
        type: "selection"
      }
    });
    
    // 2. Clear ALL org members first (handle deselection)
    await prisma.contact.updateMany({
      where: {
        orgMember: { orgId }
      },
      data: { contactListId: null }
    });
    
    // 3. Set contactListId ONLY on selected contacts
    await prisma.contact.updateMany({
      where: { id: { in: selectedContactIds } },
      data: { contactListId: contactList.id }
    });
    
    // 4. Update contact count
    await prisma.contactList.update({
      where: { id: contactList.id },
      data: { totalContacts: selectedContactIds.length }
    });
    
    res.status(201).json(contactList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🎯 ContactListView Component

### State Management
```javascript
const [orgMembers, setOrgMembers] = useState([]);
const [selectedContacts, setSelectedContacts] = useState(new Set());
const [listName, setListName] = useState("");
const [loading, setLoading] = useState(false);
```

### Auto-Check All
```javascript
useEffect(() => {
  // Auto-select all org members on load
  setSelectedContacts(new Set(orgMembers.map(m => m.contactId)));
}, [orgMembers]);
```

### Toggle Selection
```javascript
const handleToggleContact = (contactId) => {
  setSelectedContacts(prev => {
    const newSet = new Set(prev);
    if (newSet.has(contactId)) {
      newSet.delete(contactId);
    } else {
      newSet.add(contactId);
    }
    return newSet;
  });
};
```

### Save List
```javascript
const handleSaveList = async () => {
  const selectedContactIds = Array.from(selectedContacts);
  
  await api.post("/contact-lists/from-selection", {
    orgId,
    name: listName,
    description: "Selected org members",
    selectedContactIds
  });
  
  navigate("/contact-list-manager");
};
```

## 🚨 Limitations (MVP1)

### Single List Per Contact
```javascript
// Contact can only be in ONE list at a time
Contact { id: "john123", contactListId: "list1" }

// If John is in "Event List" and you add him to "Org List":
// His contactListId changes to "list2" (overwrites "list1")
```

### No Overlap Protection
```javascript
// No built-in protection against:
// - Running sequences simultaneously
// - Email overlap
// - Contact list conflicts
```

## 🛡️ Safety Mechanisms

### Wiper Service (Future)
```javascript
// Emergency override to clear all assignments
POST /contact-lists/wipe
{
  "orgId": "org123",
  "confirmWipe": true,
  "reason": "Creating new segmentation"
}
```

### Manual Sequencing
```javascript
// MVP1: Manual control over sequence order
// 1. Create "Event List" → Run sequence
// 2. Create "Org List" → Run sequence
// User controls overlap manually
```

## 🔄 Migration Path

### MVP1 → MVP2
```javascript
// Current: Single contactListId
Contact { contactListId: "list1" }

// Future: Junction table
ContactListContact { 
  contactListId: "list1", 
  contactId: "contact1", 
  isIncluded: true 
}
```

## 📋 Implementation Checklist

- [ ] Create ContactListView component
- [ ] Add from-selection route
- [ ] Implement deselection logic
- [ ] Add auto-check functionality
- [ ] Test save with deselection
- [ ] Add list name input
- [ ] Add contact count display
- [ ] Test navigation flow
