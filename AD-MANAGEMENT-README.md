# Ad Management Module

## Overview
The Ad Management module enables organizations to create, manage, and track advertising campaigns directly within the Ignite CRM platform. This module provides a foundation for future Google Ads API integration.

## Features Implemented

### Frontend (`ignitestrategescrm-frontend`)
- ✅ **Ads Dashboard** (`/ads` route)
  - 5 key metric cards: Total Campaigns, Active Spend, CTR, Conversions, Avg CPC
  - Campaign listing table with sortable columns
  - Responsive design using Tailwind CSS
  - Mobile-friendly layout

- ✅ **Create Campaign Modal**
  - Campaign Name input
  - Budget input (numeric)
  - Landing Page URL input
  - Ad Text textarea
  - Form validation
  - Success/error handling

- ✅ **Navigation Integration**
  - Added "Ad Management" card to main Dashboard
  - Pink/rose gradient theme with chart icon
  - Quick access to Campaigns, Analytics, Google Ads

### Backend (`eventscrm-backend`)
- ✅ **Prisma Model** (`AdCampaign`)
  - Linked to Organization
  - Tracks: name, status, budget, landingPage, adText
  - Metrics: impressions, clicks, spend
  - Timestamps: createdAt, updatedAt

- ✅ **API Routes** (`/api/ads`)
  - `POST /api/ads/create` - Create new campaign
  - `GET /api/ads/summary?orgId=xxx` - Get summary metrics
  - `GET /api/ads/list?orgId=xxx` - List all campaigns
  - `GET /api/ads/:campaignId` - Get single campaign
  - `PATCH /api/ads/:campaignId/metrics` - Update metrics
  - `PATCH /api/ads/:campaignId/status` - Update status
  - `DELETE /api/ads/:campaignId` - Delete campaign

- ✅ **Service Layer** (`services/adsService.js`)
  - Business logic separated from routes
  - Metric calculations (CTR, Average CPC)
  - Data aggregation for summary view

## Database Schema

```prisma
model AdCampaign {
  id          String   @id @default(cuid())
  orgId       String
  org         Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  
  name        String
  status      String   @default("Draft")
  budget      Float
  landingPage String
  adText      String
  impressions Int      @default(0)
  clicks      Int      @default(0)
  spend       Float    @default(0)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([orgId])
  @@index([status])
}
```

## Setup Instructions

### 1. Database Migration
```bash
cd eventscrm-backend
npx prisma migrate dev --name add_ad_campaign_model
npx prisma generate
```

### 2. Seed Mock Data (Optional)
```bash
# Replace 'your-org-id' with an actual organization ID from your database
node scripts/seedAdCampaigns.js your-org-id
```

This will create 5 sample campaigns with mock metrics for testing.

### 3. Start Backend Server
```bash
cd eventscrm-backend
npm start
# Server runs on http://localhost:5001
```

### 4. Start Frontend Dev Server
```bash
cd ignitestrategescrm-frontend
npm run dev
# Frontend runs on http://localhost:5173 (or configured port)
```

### 5. Access the Feature
1. Login to your CRM
2. Navigate to Dashboard
3. Click "Ad Management" card
4. Create your first campaign!

## API Usage Examples

### Create Campaign
```javascript
const response = await fetch('http://localhost:5001/api/ads/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orgId: 'cm123xyz',
    name: 'Spring Event 2024',
    budget: 1500,
    landingPage: 'https://example.com/spring-event',
    adText: 'Join us for our annual Spring Fundraiser!'
  })
});

// Response:
// {
//   "success": true,
//   "campaignId": "cm456abc",
//   "campaign": { ... }
// }
```

### Get Summary Metrics
```javascript
const response = await fetch('http://localhost:5001/api/ads/summary?orgId=cm123xyz');

// Response:
// {
//   "totalCampaigns": 5,
//   "activeSpend": "1572.55",
//   "ctr": "2.34%",
//   "conversions": 0,
//   "avgCpc": "$1.38"
// }
```

### List All Campaigns
```javascript
const response = await fetch('http://localhost:5001/api/ads/list?orgId=cm123xyz');

// Response:
// {
//   "campaigns": [ ... ],
//   "total": 5
// }
```

## Current Status Indicators

The system supports the following campaign statuses:
- **Draft** - Campaign created but not yet active (gray badge)
- **Active** - Campaign is currently running (green badge)
- **Paused** - Campaign temporarily stopped (yellow badge)

## Future Enhancements: Google Ads API Integration

### Phase 1: Authentication & Setup
- [ ] Add Google Ads Developer Token to environment variables
- [ ] Implement OAuth 2.0 flow for Google Ads API access
- [ ] Store refresh tokens securely in database
- [ ] Create Google Ads API client wrapper service

### Phase 2: Campaign Synchronization
- [ ] Map AdCampaign model to Google Ads Campaign structure
- [ ] Implement campaign creation via Google Ads API
- [ ] Add budget sync functionality
- [ ] Support ad group and keyword management

### Phase 3: Real-Time Metrics
- [ ] Schedule periodic sync jobs (every 15 minutes)
- [ ] Pull real metrics: impressions, clicks, conversions, cost
- [ ] Update local database with latest data
- [ ] Display sync status and last updated time

### Phase 4: Advanced Features
- [ ] Campaign performance charts (trend lines)
- [ ] A/B testing support
- [ ] Automated bidding strategies
- [ ] Conversion tracking setup
- [ ] Audience targeting management
- [ ] Ad scheduling and dayparting

### Phase 5: Reporting & Analytics
- [ ] Export campaign reports (CSV, PDF)
- [ ] Custom date range filtering
- [ ] ROI calculations
- [ ] Comparison views (campaign vs campaign)
- [ ] Email alerts for budget thresholds

## Environment Variables (for Google Ads)

Add these to your `.env` file when ready for Google Ads integration:

```env
# Google Ads API
GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
GOOGLE_ADS_CLIENT_ID=your-oauth-client-id
GOOGLE_ADS_CLIENT_SECRET=your-oauth-client-secret
GOOGLE_ADS_CUSTOMER_ID=your-customer-id
GOOGLE_ADS_LOGIN_CUSTOMER_ID=your-login-customer-id # if using MCC account
```

## Google Ads API Resources

Official Documentation:
- [Google Ads API Overview](https://developers.google.com/google-ads/api/docs/start)
- [Get Started Guide](https://developers.google.com/google-ads/api/docs/first-call/overview)
- [Node.js Client Library](https://github.com/Opteo/google-ads-api)

Developer Token:
- [Apply for Developer Token](https://developers.google.com/google-ads/api/docs/first-call/dev-token)
- Test account tokens are approved instantly
- Production tokens require Google review

OAuth Setup:
- [OAuth 2.0 Setup](https://developers.google.com/google-ads/api/docs/oauth/overview)
- Need to create OAuth credentials in Google Cloud Console
- Requires consent screen configuration

## Troubleshooting

### Issue: Campaigns not appearing
- Check that `orgId` is correct
- Verify Prisma migrations are up to date
- Check browser console for API errors

### Issue: API returns 500 error
- Ensure Prisma Client is generated: `npx prisma generate`
- Check backend logs for detailed error messages
- Verify database connection string in `.env`

### Issue: Modal doesn't submit
- Check form validation (all fields required)
- Verify API endpoint is accessible
- Check network tab for request/response details

## File Structure

```
eventscrm-backend/
├── prisma/
│   └── schema.prisma           # Added AdCampaign model
├── routes/
│   └── adsRoute.js            # All ad-related endpoints
├── services/
│   └── adsService.js          # Business logic
├── scripts/
│   └── seedAdCampaigns.js     # Mock data seeder
└── index.js                    # Registered /api/ads routes

ignitestrategescrm-frontend/
├── src/
│   ├── pages/
│   │   ├── AdsDashboard.jsx   # Main ads dashboard
│   │   └── Dashboard.jsx      # Added navigation card
│   └── App.jsx                # Added /ads route
```

## Testing Checklist

- [x] Create new campaign via modal
- [x] View campaigns in table
- [x] See metrics update in cards
- [x] Navigate from main dashboard
- [x] Back button returns to dashboard
- [ ] Test with multiple organizations
- [ ] Test campaign status changes
- [ ] Test metric updates
- [ ] Test campaign deletion
- [ ] Mobile responsiveness check

## Support

For questions or issues with the Ad Management module:
1. Check this documentation
2. Review backend logs for errors
3. Verify database migrations are current
4. Test with seed data first

---

**Created:** October 2024
**Last Updated:** October 2024
**Status:** ✅ Scaffolded & Ready for Google Ads Integration


