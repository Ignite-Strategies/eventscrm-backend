# 🎟️ EVENTBRITE INTEGRATION PLAN

## Why We're Doing This

**PROBLEM:** Custom form system keeps breaking due to model changes (OrgMember → EventAttendee → Contact, containerId added, etc.)

**SOLUTION:** Let Eventbrite handle registration. We focus on CRM/engagement.

---

## What Eventbrite Handles (Built-in)

✅ Event registration forms
✅ Payment processing  
✅ Ticket types (free, paid, early bird, VIP)
✅ Capacity management
✅ QR code check-ins
✅ Attendee confirmation emails
✅ Form validation
✅ Mobile-friendly checkout

---

## What We Handle (Our CRM)

✅ Pull attendee data into Contact model
✅ Engagement pipelines  
✅ Follow-up campaigns
✅ Member journey tracking
✅ Analytics on conversion
✅ Multi-event history per contact

---

## Implementation Steps

### **Phase 1: OAuth & Event Sync (Week 1)**

**Backend:**
1. Create `routes/eventbriteOAuthRoute.js`
   - OAuth flow (redirect to Eventbrite, handle callback)
   - Store access token in EventbriteAccount model
   - Link to orgId/containerId

2. Create `routes/eventbriteEventsRoute.js`
   - GET /api/eventbrite/events - List user's Eventbrite events
   - GET /api/eventbrite/events/:eventId - Get single event details

3. Prisma Schema:
```prisma
model EventbriteAccount {
  id           String @id @default(cuid())
  orgId        String
  org          Organization @relation(fields: [orgId], references: [id])
  containerId  String?
  
  accessToken  String
  refreshToken String?
  userId       String  // Eventbrite user ID
  email        String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([orgId, userId])
}

model EventbriteSync {
  id                String @id @default(cuid())
  eventId           String  // Our Event ID
  event             Event @relation(fields: [eventId], references: [id])
  eventbriteEventId String  // Eventbrite's event ID
  
  lastSyncAt        DateTime?
  attendeesSynced   Int @default(0)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([eventId, eventbriteEventId])
}
```

**Frontend:**
- Connect button triggers OAuth flow
- Display synced Eventbrite events
- Show sync status for each event

---

### **Phase 2: Attendee Import (Week 1-2)**

**Backend:**
1. Create `routes/eventbriteAttendeesRoute.js`
   - POST /api/eventbrite/events/:eventbriteEventId/import
   - Pulls attendee list from Eventbrite API
   - Creates/updates Contact records

2. Create `services/eventbriteContactService.js`
```javascript
// Maps Eventbrite attendee → Contact
{
  firstName: attendee.profile.first_name,
  lastName: attendee.profile.last_name,
  email: attendee.profile.email,
  phone: attendee.profile.cell_phone,
  
  // Link to your org/event
  orgId: event.orgId,
  containerId: event.org.containerId,
  eventId: event.id,
  
  // Event-specific
  currentStage: 'rsvped',  // or 'paid' if they paid
  audienceType: 'landing_page_public',
  ticketType: attendee.ticket_class_name,
  amountPaid: attendee.costs.gross.value / 100,
  
  // Eventbrite tracking
  eventbriteAttendeeId: attendee.id,
  eventbriteOrderId: attendee.order_id
}
```

**Frontend:**
- "Import Attendees" button on each event
- Shows progress: "Importing 45/120 attendees..."
- Success message: "45 new contacts added!"

---

### **Phase 3: Webhook Support (Week 2)**

**Backend:**
1. Create `routes/eventbriteWebhookRoute.js`
   - POST /api/eventbrite/webhook
   - Listens for: order.placed, attendee.updated, order.refunded
   - Auto-creates Contact when someone registers
   - Updates Contact.amountPaid on refund

2. Security:
   - Verify Eventbrite webhook signature
   - Rate limiting
   - Duplicate prevention (by eventbriteOrderId)

**Eventbrite Setup:**
- Register webhook URL in Eventbrite dashboard
- Subscribe to events: order.placed, attendee.updated

---

## Eventbrite API Endpoints We'll Use

### **OAuth:**
```
GET https://www.eventbrite.com/oauth/authorize
POST https://www.eventbrite.com/oauth/token
```

### **Events:**
```
GET https://www.eventbriteapi.com/v3/users/me/events/
GET https://www.eventbriteapi.com/v3/events/{event_id}/
```

### **Attendees:**
```
GET https://www.eventbriteapi.com/v3/events/{event_id}/attendees/
GET https://www.eventbriteapi.com/v3/events/{event_id}/orders/
```

---

## Contact Model Additions Needed

Add to Prisma Contact:
```prisma
model Contact {
  // ... existing fields ...
  
  // Eventbrite tracking
  eventbriteAttendeeId String? @unique
  eventbriteOrderId    String?
  
  // ... rest of fields ...
}
```

---

## Migration Path (How to Switch)

### **For F3 Capital Bros & Brews:**

1. **Create Eventbrite event** (bros-and-brews-2025)
2. **Add to your website:** Link to Eventbrite registration page
3. **After event is published:** Click "Import Attendees" in CRM
4. **Contacts auto-created** with:
   - orgId = F3 Capital
   - eventId = Bros & Brews event
   - currentStage = 'paid'
   - All their info (name, email, phone)

5. **Run your pipelines:**
   - Send confirmation email
   - Add to "Attended Bros & Brews" list
   - Track in member journey

---

## Benefits vs Custom Forms

| Feature | Custom Forms (Current) | Eventbrite |
|---------|----------------------|------------|
| Payment processing | Need Stripe integration | ✅ Built-in |
| Form breaks on model changes | ❌ Happened 3+ times | ✅ Never breaks |
| Mobile checkout | Need custom CSS | ✅ Perfect mobile UX |
| Ticket types | Need custom logic | ✅ Built-in |
| QR code check-ins | Need separate tool | ✅ Built-in |
| Refund handling | Need custom logic | ✅ Built-in |
| **Developer time** | High maintenance | ⚡ Set once, forget |

---

## Cost Comparison

**Eventbrite:**
- Free events: $0 per ticket
- Paid events: ~2.9% + $0.79 per ticket
- Your F3 events are often free → $0 Eventbrite fees!

**Custom System:**
- Developer time: 10-20 hrs/mo maintaining forms
- Form submission bugs → Lost registrations
- Stripe fees: 2.9% + $0.30 (similar)

**Winner:** Eventbrite (saves dev time, more reliable)

---

## Technical Notes

### **Rate Limits:**
- Eventbrite API: 1000 requests/hour
- Solution: Cache event data, batch attendee imports

### **Data Sync Strategy:**
```javascript
// Option 1: Manual sync
User clicks "Import Attendees" → Pull from API → Create Contacts

// Option 2: Webhook (better)
Someone registers on Eventbrite → Webhook fires → Auto-create Contact

// Option 3: Scheduled sync (backup)
Cron job runs every hour → Check for new attendees → Import
```

### **Duplicate Prevention:**
```javascript
// Upsert by email (primary)
const contact = await prisma.contact.upsert({
  where: { email: attendee.profile.email },
  update: { eventbriteAttendeeId: attendee.id },
  create: { /* full attendee data */ }
});

// Also store eventbriteAttendeeId (unique)
// Prevents double-importing same person
```

---

## MVP Scope (This Week)

**Must Have:**
1. ✅ OAuth connection to Eventbrite
2. ✅ Display Eventbrite events in dashboard
3. ✅ "Import Attendees" button → Creates Contacts
4. ✅ Link EventbriteSync to your Event

**Nice to Have (Later):**
- Webhook support (auto-sync on registration)
- Scheduled sync (every hour check for new)
- Two-way sync (update Eventbrite from CRM)

---

## Files to Create

```
eventscrm-backend/
  routes/
    eventbriteOAuthRoute.js       ← OAuth flow
    eventbriteEventsRoute.js      ← List/get events
    eventbriteAttendeesRoute.js   ← Import attendees
    eventbriteWebhookRoute.js     ← Webhook handler (Phase 3)
  
  services/
    eventbriteApiService.js       ← API wrapper
    eventbriteContactService.js   ← Attendee → Contact mapping
  
  prisma/
    schema.prisma                 ← Add EventbriteAccount, EventbriteSync
```

---

## Next Steps

1. **Get Eventbrite OAuth credentials:**
   - Go to: https://www.eventbrite.com/platform/api-keys
   - Create app
   - Get Client ID + Client Secret
   - Add to .env

2. **Add Prisma models** (EventbriteAccount, EventbriteSync)

3. **Build OAuth route** (connect account)

4. **Build events listing route** (show events)

5. **Build attendee import** (create Contacts)

6. **Test with F3 Capital** real event

---

**Ready to start building?** Let's knock out Phase 1 today! 🚀

