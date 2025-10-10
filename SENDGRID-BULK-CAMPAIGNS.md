# 📬 SendGrid Bulk Campaigns Implementation

## Overview
Implement bulk email campaigns using SendGrid Mail API with webhook-based analytics tracking. No SendGrid Marketing UI - pure API approach for Apollo-style email management.

## Architecture

### Flow
```
Send Email → SendGrid Delivers → Webhook Fires → Store in DB → Show Analytics
```

### Components
- **SendGrid Mail API** - Send bulk emails with tracking
- **Event Webhook** - Receive engagement data from SendGrid
- **Database Schema** - Store email events for analytics
- **Campaign Dashboard** - Show engagement stats

## SendGrid Webhook System

### Single Webhook Endpoint
- **URL:** `https://api.f3capitalimpact.org/sendgrid/events`
- **Handles ALL events:** processed, delivered, open, click, bounce, unsubscribe, spam_report
- **Event-driven:** SendGrid pushes to us, no polling needed

### Event Types

| Event | Meaning | Use Case |
|-------|---------|----------|
| `processed` | Accepted for delivery | Basic send confirmation |
| `delivered` | Delivered to recipient's mail server | Success rate tracking |
| `open` | Pixel triggered | Engagement analytics |
| `click` | Wrapped link clicked | Link performance & conversions |
| `bounce` | Couldn't deliver | Email cleanup |
| `dropped` | Blocked / suppressed | Check suppression lists |
| `unsubscribe` | Recipient opted out | Compliance |
| `spam_report` | Marked as spam | Reputation management |

### Webhook Payload Example
```json
[
  {
    "email": "bro@f3nation.com",
    "event": "delivered",
    "timestamp": 1738793221,
    "sg_message_id": "abc123",
    "campaign_id": "campaign_456"
  },
  {
    "email": "bro@f3nation.com", 
    "event": "open",
    "timestamp": 1738793200,
    "sg_message_id": "abc123",
    "campaign_id": "campaign_456"
  },
  {
    "email": "bro@f3nation.com",
    "event": "click", 
    "url": "https://f3capitalimpact.org/brosandbrews",
    "timestamp": 1738793250,
    "sg_message_id": "abc123",
    "campaign_id": "campaign_456"
  }
]
```

## Implementation Plan

### Backend Components

#### 1. SendGrid Service
```javascript
// services/sendGridService.js
import sgMail from '@sendgrid/mail';

class SendGridService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async sendBulkCampaign({ recipients, subject, html, campaignId }) {
    const emails = recipients.map(recipient => ({
      to: recipient.email,
      from: 'adam@f3capitalimpact.org',
      subject: subject,
      html: html,
      tracking_settings: {
        click_tracking: { enable: true, enable_text: true },
        open_tracking: { enable: true },
      },
      custom_args: {
        campaign_id: campaignId,
        recipient_id: recipient.id
      }
    }));

    return await sgMail.send(emails);
  }
}
```

#### 2. Webhook Endpoint
```javascript
// routes/sendgridWebhook.js
app.post('/api/sendgrid/events', (req, res) => {
  req.body.forEach(event => {
    // Store event in database
    await prisma.emailEvent.create({
      data: {
        email: event.email,
        eventType: event.event,
        timestamp: new Date(event.timestamp * 1000),
        url: event.url,
        sgMessageId: event.sg_message_id,
        campaignId: event.campaign_id
      }
    });
  });
  
  res.sendStatus(200);
});
```

#### 3. Database Schema
```prisma
// Add to schema.prisma
model EmailEvent {
  id          String   @id @default(cuid())
  email       String
  eventType   String   // "delivered", "open", "click", "bounce", etc.
  timestamp   DateTime
  url         String?  // For click events
  sgMessageId String?  // SendGrid message ID
  campaignId  String?  // Our campaign ID
  
  createdAt DateTime @default(now())
  
  @@index([email])
  @@index([campaignId])
  @@index([eventType])
}

model Campaign {
  id          String @id @default(cuid())
  orgId       String
  org         Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  name        String
  subject     String
  html        String
  contactListId String?
  contactList   ContactList? @relation(fields: [contactListId], references: [id])
  status      String @default("draft") // "draft", "sending", "sent"
  sentAt      DateTime?
  
  // Relations
  events      EmailEvent[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([orgId])
}
```

### Frontend Components

#### 1. Campaign Composer
- Select contact list from ContactListService
- Choose template or create custom HTML
- Preview and send bulk campaign
- Track sending progress

#### 2. Analytics Dashboard
- **Delivery Rate** - % of emails successfully delivered
- **Open Rate** - % of recipients who opened the email
- **Click Rate** - % of recipients who clicked links
- **Engagement per Contact** - Who's most engaged
- **Link Performance** - Which links get the most clicks

## API Endpoints

### Send Bulk Campaign
```
POST /api/email/send-campaign
{
  "contactListId": "list_123",
  "subject": "Bros & Brews Event Invite",
  "html": "<h1>Join us for Bros & Brews!</h1>...",
  "campaignName": "Bros & Brews 2025"
}
```

### Get Campaign Analytics
```
GET /api/campaigns/:campaignId/analytics
Response: {
  "delivered": 450,
  "opened": 320,
  "clicked": 89,
  "bounced": 5,
  "deliveryRate": 98.9,
  "openRate": 71.1,
  "clickRate": 19.8
}
```

### Get Contact Engagement
```
GET /api/contacts/:contactId/engagement
Response: {
  "totalEmails": 15,
  "totalOpens": 12,
  "totalClicks": 5,
  "engagementScore": 80,
  "lastEngagement": "2025-01-15T10:30:00Z"
}
```

## Environment Variables

### Backend (Render)
```
SENDGRID_API_KEY=your_sendgrid_api_key
```

### Frontend (Vercel)
```
VITE_SENDGRID_API_KEY=your_sendgrid_api_key (if needed for frontend)
```

## SendGrid Configuration

### 1. Enable Event Webhook
- Go to SendGrid Dashboard → Settings → Mail Settings → Event Webhook
- Enable: Processed, Delivered, Open, Click, Bounce, Unsubscribe, Spam Report
- Set webhook URL: `https://api.f3capitalimpact.org/api/sendgrid/events`

### 2. Verify Sender Domain
- Verify `f3capitalimpact.org` in SendGrid
- Set up SPF, DKIM, and DMARC records

## Benefits

### ✅ Pure API Approach
- No dependency on SendGrid's marketing UI
- Full control over user experience
- Consistent with existing CRM interface

### ✅ Apollo-Style Analytics
- Delivery, open, and click tracking
- Contact engagement scoring
- Campaign performance metrics

### ✅ Free Tier Compatible
- Single webhook endpoint (free tier allows 1)
- 3-day data retention (sufficient for real-time analytics)
- 100 emails/day free tier

### ✅ Compliance Ready
- Automatic unsubscribe handling
- Spam report tracking
- Bounce management

## Next Steps

1. **Install SendGrid package** in backend
2. **Create SendGrid service** for bulk sending
3. **Build webhook endpoint** for event tracking
4. **Add database schema** for email events
5. **Create campaign composer** in frontend
6. **Build analytics dashboard** for engagement stats
7. **Test with small campaign** and verify webhook events
8. **Deploy and configure** SendGrid webhook URL

## Success Metrics

- **Delivery Rate** > 95%
- **Open Rate** > 25% (industry average)
- **Click Rate** > 5% (industry average)
- **Bounce Rate** < 5%
- **Spam Rate** < 0.1%
