# Quick Start Guide: Ad Management Module

## Step 1: Run Database Migration

```bash
cd "c:\Users\adamc\OneDrive\Documents\2-Ignite Stragies\14-Events Tech Stack\eventscrm-backend"
npx prisma migrate dev --name add_ad_campaign_model
npx prisma generate
```

This creates the `AdCampaign` table in your database.

## Step 2: Seed Test Data (Optional)

First, get your organization ID from the database or from localStorage when logged in.

```bash
# Replace cm123xyz with your actual orgId
node scripts/seedAdCampaigns.js cm123xyz
```

This creates 5 sample campaigns with realistic metrics.

## Step 3: Start the Backend

```bash
npm start
```

Backend will run on `http://localhost:5001`

## Step 4: Start the Frontend

```bash
cd "c:\Users\adamc\OneDrive\Documents\2-Ignite Stragies\14-Events Tech Stack\ignitestrategescrm-frontend"
npm run dev
```

## Step 5: Access the Feature

1. Login to your CRM
2. On the main Dashboard, you'll see a new **"Ad Management"** card (pink/rose gradient)
3. Click it to go to `/ads`
4. Click **"Create Campaign"** to add your first campaign

## What You'll See

### Dashboard Card
- Pink/rose gradient card labeled "Ad Management"
- Located in the main navigation grid
- Shows quick access to Campaigns, Analytics, Google Ads

### Ads Dashboard (`/ads`)
- **5 Metric Cards** at the top:
  - Total Campaigns
  - Active Spend
  - Click-Through Rate (CTR)
  - Conversions
  - Average CPC

- **Campaigns Table** showing:
  - Campaign Name & Landing Page
  - Status (Draft/Active/Paused)
  - Budget
  - Impressions
  - Clicks
  - Spend

- **Create Campaign Button** (top-right)
  - Opens modal form
  - Requires: Name, Budget, Landing Page, Ad Text

## Testing the Feature

### Test 1: Create a Campaign
1. Go to `/ads`
2. Click "Create Campaign"
3. Fill in the form:
   - Name: "Test Spring Event"
   - Budget: 1000
   - Landing Page: https://yoursite.com/event
   - Ad Text: "Join our amazing spring event!"
4. Click "Create Campaign"
5. Should see it appear in the table with "Draft" status

### Test 2: View Metrics
1. After creating or seeding campaigns
2. Check the 5 metric cards update
3. Verify calculations are correct

### Test 3: Navigation
1. Click "Back to Dashboard" button
2. Should return to main dashboard
3. Click "Ad Management" card again
4. Should return to ads dashboard

## Troubleshooting

### Can't find orgId?
Open browser console on any CRM page:
```javascript
localStorage.getItem('orgId')
```

### Migration fails?
Make sure you're in the `eventscrm-backend` directory and have a valid `DATABASE_URL` in your `.env` file.

### Campaigns not showing?
Check the browser console for errors and verify the backend API is running.

### API returns errors?
Check backend terminal logs for detailed error messages.

## Next Steps

Once you've verified everything works:

1. **Read the full documentation**: `AD-MANAGEMENT-README.md`
2. **Apply for Google Ads Developer Token**: [Instructions](https://developers.google.com/google-ads/api/docs/first-call/dev-token)
3. **Set up OAuth credentials** in Google Cloud Console
4. **Implement Google Ads API integration** (see Phase 1 in README)

## File Locations

### Backend
- Model: `prisma/schema.prisma`
- Routes: `routes/adsRoute.js`
- Service: `services/adsService.js`
- Seed: `scripts/seedAdCampaigns.js`

### Frontend
- Dashboard: `src/pages/AdsDashboard.jsx`
- Route: Added to `src/App.jsx`
- Navigation: Updated `src/pages/Dashboard.jsx`

---

✅ **You're ready to go!** Create your first campaign and start tracking ad performance.


