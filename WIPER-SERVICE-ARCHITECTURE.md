# Wiper Service Architecture

## 🎯 Purpose
Emergency override service to clear all `contactListId` assignments when user needs to completely reorganize contact lists.

## 🚨 When to Use
- **Segmentation**: "I need to segment ALL attendees by stage"
- **Complete Reorganization**: "I want to create new lists from scratch"
- **Override Mode**: User explicitly takes responsibility for potential email overlap

## 🔧 API Endpoints

### `POST /contact-lists/wipe`
```javascript
// Request
{
  "orgId": "org123",
  "confirmWipe": true,  // User must explicitly confirm
  "reason": "Creating new segmentation lists"
}

// Response
{
  "success": true,
  "message": "Wiped 1,247 contact list assignments",
  "wipedCount": 1247,
  "timestamp": "2025-01-13T22:30:00Z"
}
```

## 🛡️ Safety Mechanisms

### 1. Explicit Confirmation Required
```javascript
// Frontend must show warning:
[ ] I understand this will clear ALL existing contact list assignments
[ ] I understand this may cause email overlap if sequences are running
[ ] I take full responsibility for this action
[Confirm Wipe]
```

### 2. Audit Trail
```javascript
// Log all wipe operations
{
  "action": "wipe_contact_lists",
  "orgId": "org123", 
  "userId": "user456",
  "wipedCount": 1247,
  "timestamp": "2025-01-13T22:30:00Z",
  "reason": "Creating new segmentation lists"
}
```

## 🔄 Implementation Flow

### 1. Wiper Service
```javascript
class WiperService {
  static async wipeAllContactListIds(orgId, userId, reason) {
    // Get count before wipe
    const countBefore = await prisma.contact.count({
      where: { 
        orgId,
        contactListId: { not: null }
      }
    });
    
    // Wipe all contactListId assignments
    await prisma.contact.updateMany({
      where: { 
        orgId,
        contactListId: { not: null }
      },
      data: { contactListId: null }
    });
    
    // Log the operation
    await this.logWipeOperation(orgId, userId, reason, countBefore);
    
    return {
      success: true,
      wipedCount: countBefore
    };
  }
}
```

### 2. Route Handler
```javascript
router.post("/wipe", async (req, res) => {
  try {
    const { orgId, confirmWipe, reason } = req.body;
    
    if (!confirmWipe) {
      return res.status(400).json({ 
        error: "Explicit confirmation required" 
      });
    }
    
    const result = await WiperService.wipeAllContactListIds(
      orgId, 
      req.user.id, 
      reason
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🎯 Usage Scenarios

### Scenario 1: Segmentation
```
User: "I need to segment all attendees by stage"
1. Click "Wipe & Segment" 
2. Confirm wipe
3. Create "All RSVPs" list
4. Create "All Paid" list  
5. Create "All Attended" list
```

### Scenario 2: Complete Reorganization
```
User: "I want to start fresh with my contact lists"
1. Click "Wipe All Lists"
2. Confirm wipe
3. Create new lists from scratch
```

## ⚠️ Warnings & Considerations

### Email Overlap Risk
- **Before wipe**: John in "Event List" → Gets event sequence
- **After wipe**: John in "Org List" → Gets org sequence  
- **Result**: John gets BOTH sequences (potential overlap)

### User Responsibility
- User must understand the implications
- User takes full responsibility for email overlap
- System logs all wipe operations for audit

## 🚀 Future Enhancements

### MVP2: Decouple Campaigns from ContactLists
**Problem:** `Campaign.contactListId` creates 1:1 relationship (1 campaign = 1 list)
**Solution:** Junction table for many-to-many

```prisma
model CampaignContactList {
  id            String      @id @default(cuid())
  campaignId    String
  campaign      Campaign    @relation(fields: [campaignId], references: [id])
  contactListId String
  contactList   ContactList @relation(fields: [contactListId], references: [id])
  
  createdAt DateTime @default(now())
  
  @@unique([campaignId, contactListId])
  @@index([campaignId])
  @@index([contactListId])
}

// Update Campaign model
model Campaign {
  id    String  @id @default(cuid())
  orgId String
  name  String
  
  // OLD: contactListId String?  // REMOVE THIS!
  // NEW: Use junction table
  contactLists CampaignContactList[]
}
```

**Benefits:**
- ✅ Campaign can target multiple lists (e.g., "All Members" + "Event Attendees")
- ✅ Same list can be used by multiple campaigns
- ✅ Easy to add/remove lists from campaigns
- ✅ Better analytics (see which lists performed best per campaign)

**Wiper Service Expansion:**
```javascript
// Wipe campaign-list assignments
await prisma.campaignContactList.deleteMany({
  where: { 
    campaign: { orgId }
  }
});
```

### MVP3: Junction Table for Contacts
```javascript
// With junction table, wipe becomes:
await prisma.contactListContact.deleteMany({
  where: { 
    contactList: { orgId }
  }
});
```

### MVP4: Selective Wipe
```javascript
// Wipe only specific lists
await prisma.contact.updateMany({
  where: { 
    contactListId: { in: ["list1", "list2"] }
  },
  data: { contactListId: null }
});
```

## 📋 Implementation Checklist

- [ ] Create WiperService class
- [ ] Add wipe endpoint to contactListsRoute
- [ ] Add confirmation UI to frontend
- [ ] Add audit logging
- [ ] Add warning messages
- [ ] Test wipe operations
- [ ] Document usage scenarios

