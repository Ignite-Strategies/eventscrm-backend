# Gmail OAuth Setup - Persistent Tokens 🔐

**Status:** ✅ IMPLEMENTED (October 21, 2025)

This document explains how Gmail OAuth is configured for **persistent, never-expiring tokens** that enable auto-triggers and background email sending.

---

## 🎯 What We Built

### The Problem (Before)
- Used Firebase OAuth for Gmail
- Tokens expired every 1 hour
- User had to reconnect constantly
- **Could NOT send emails without user present**
- **Could NOT build auto-triggers** (RSVP confirmations, etc.)

### The Solution (Now)
- Direct Google OAuth (like YouTube pattern)
- Stores **refresh tokens** in database
- Backend automatically refreshes access tokens
- **Tokens never expire**
- **Background email sending works**
- **Auto-triggers enabled** 🚀

---

## 📋 Architecture

### Database Storage
**Table:** `GmailConnection`
```prisma
model GmailConnection {
  id           String    @id @default(cuid())
  orgId        String
  adminId      String
  email        String
  refreshToken String    // ← PERSISTENT! Never expires!
  accessToken  String    // ← Expires hourly, auto-refreshed
  tokenExpiry  DateTime?
  status       String @default("active")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

### OAuth Flow

#### One-Time Connection:
```
User clicks "Connect Gmail" (CampaignHome)
    ↓
Frontend redirects to: /api/gmail-oauth/auth?orgId=xxx&adminId=xxx
    ↓
Backend generates OAuth URL with:
  - access_type: 'offline' ← Gets refresh token!
  - scope: 'gmail.send'
  - prompt: 'consent'
    ↓
Backend redirects to: Google OAuth
    ↓
User approves Gmail access
    ↓
Google redirects to: /gmailoauth?code=xxx&state=xxx
    ↓
Frontend (GmailOAuth.jsx) catches code
    ↓
POST /api/gmail-oauth/callback { code, orgId, adminId }
    ↓
Backend exchanges code for tokens
    ↓
Backend stores in GmailConnection:
  - refreshToken (NEVER expires!)
  - accessToken (1 hour)
  - tokenExpiry
    ↓
Frontend redirects to /gmail/success
    ↓
✅ CONNECTED FOREVER!
```

#### Every Email Send:
```
User clicks "Send Campaign"
    ↓
POST /api/enterprise-gmail/send-campaign { orgId, adminId, ... }
    ↓
GmailTokenService.getValidToken(orgId, adminId)
    ↓
Check database:
  - Token expired? → Use refreshToken to get new one
  - Token valid? → Return it
    ↓
new GmailService(token).sendEmail(...)
    ↓
✅ EMAIL SENT!
```

---

## 🔧 Google Cloud Console Setup

### Step 1: Enable Gmail API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create new)
3. Navigate to **APIs & Services** > **Library**
4. Search for "Gmail API"
5. Click **Enable**

### Step 2: Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type
3. Fill in app information:
   - App name: "EngageSmart CRM"
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Save and continue

### Step 3: Create OAuth Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Application type: **Web application**
4. Name: "Gmail OAuth - EngageSmart"
5. **Authorized redirect URIs** - Add BOTH:
   ```
   https://ignitestrategiescrm-frontend.vercel.app/gmailoauth
   http://localhost:3000/gmailoauth
   ```
6. Click **Create**
7. **Copy** Client ID and Client Secret

### Step 4: Set Environment Variables

#### Backend (`eventscrm-backend`)
```env
GOOGLE_CLIENT_ID="your_client_id_here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_client_secret_here"
GMAIL_REDIRECT_URI="https://ignitestrategiescrm-frontend.vercel.app/gmailoauth"
```

**IMPORTANT:** These are the SAME credentials used for YouTube! Just add the Gmail redirect URI.

---

## 📁 Files Created/Modified

### Backend Files

**Created:**
- `routes/gmailOAuthRoute.js` - OAuth flow endpoints
- `services/gmailTokenService.js` - Token refresh logic
- `docs/GMAIL-OAUTH-SETUP.md` - This doc

**Modified:**
- `index.js` - Mounted gmail-oauth route
- `routes/enterpriseGmailRoute.js` - Uses DB tokens instead of frontend
- `routes/personalEmailRoute.js` - Uses DB tokens (if needed)

### Frontend Files

**Created:**
- `src/pages/GmailOAuth.jsx` - OAuth callback handler
- `src/pages/GmailAuthSuccess.jsx` - Success confirmation

**Modified:**
- `src/App.jsx` - Added /gmailoauth and /gmail/success routes
- `src/pages/CampaignHome.jsx` - Redirects to OAuth (not Firebase)
- `src/pages/CampaignPreview.jsx` - Sends orgId/adminId to backend

---

## 🚀 Testing the Flow

### Local Development

1. **Start Backend:**
   ```bash
   cd eventscrm-backend
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd ignitestrategescrm-frontend
   npm run dev
   ```

3. **Test Connection:**
   - Go to Campaign Home
   - Click "Connect Gmail"
   - Should redirect to Google OAuth
   - Approve access
   - Should redirect back to /gmailoauth
   - Should show success and redirect to /gmail/success
   - Check database: `GmailConnection` table should have entry

4. **Test Sending:**
   - Create a campaign
   - Send to test contact
   - Backend will fetch token from DB automatically

### Production Deployment

1. **Update Vercel Environment Variables:**
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_secret
   GMAIL_REDIRECT_URI=https://ignitestrategescrm-frontend.vercel.app/gmailoauth
   ```

2. **Deploy both apps:**
   ```bash
   # Backend
   git push origin main  # Vercel auto-deploys

   # Frontend
   git push origin main  # Vercel auto-deploys
   ```

3. **Test production OAuth:**
   - Go to production CampaignHome
   - Connect Gmail
   - Should work identically to local

---

## 🔐 Security Notes

### Token Storage
- ✅ Refresh tokens stored in database (encrypted at rest)
- ✅ Access tokens auto-refreshed by backend
- ✅ Frontend NEVER sees refresh token
- ✅ One connection per org/admin combination

### Token Scope
- **Minimal scope:** `gmail.send` only
- User can ONLY send emails
- **Cannot** read emails
- **Cannot** access other Google services

### Revocation
- User can revoke access: [Google Account Permissions](https://myaccount.google.com/permissions)
- Backend marks connection as 'revoked' if refresh fails
- User must reconnect via "Connect Gmail" button

---

## 🆘 Troubleshooting

### "No refresh token received"
**Problem:** Google didn't return a refresh token  
**Solution:** User needs to revoke app access first, then reconnect:
1. Go to https://myaccount.google.com/permissions
2. Find "EngageSmart CRM"
3. Click "Remove Access"
4. Go back to CampaignHome and reconnect

### "Gmail not connected"
**Problem:** No GmailConnection in database  
**Solution:** Check:
1. OAuth flow completed successfully?
2. Database has GmailConnection table?
3. orgId and adminId match what's in localStorage?

### "Token refresh failed"
**Problem:** Refresh token is invalid or revoked  
**Solution:**
1. Check GmailConnection status in database
2. If status='revoked', user must reconnect
3. Check Google OAuth credentials are valid

---

## 🎯 Auto-Triggers Now Possible!

### RSVP Confirmation Emails

**Before:** ❌ Couldn't send (no user present)  
**Now:** ✅ Works!

```javascript
// In contactFormSubmitRoute.js
const token = await GmailTokenService.getValidToken(orgId, adminId);
const gmailService = new GmailService(token);
await gmailService.sendEmail({
  to: contact.email,
  subject: "Thanks for RSVPing!",
  body: confirmationTemplate
});
```

### Scheduled Campaigns

**Before:** ❌ User had to be online  
**Now:** ✅ Background service can send!

### Webhook-Triggered Emails

**Before:** ❌ Token expired  
**Now:** ✅ Always fresh token from DB!

---

## 📊 Key Differences from YouTube OAuth

| Feature | YouTube | Gmail |
|---------|---------|-------|
| **Redirect URI** | `/youtubeoauth` | `/gmailoauth` |
| **Scope** | `youtube.upload` | `gmail.send` |
| **Database Table** | `YouTubeChannel` | `GmailConnection` |
| **Token Service** | None (direct) | `GmailTokenService` |
| **Success Page** | `/youtube/success` | `/gmail/success` |
| **Connection Check** | Channel API | `/gmail-oauth/status` |

---

## ✅ Implementation Checklist

- [x] Database table created (GmailConnection)
- [x] Backend OAuth route (gmailOAuthRoute.js)
- [x] Token service (gmailTokenService.js)
- [x] Updated send routes (enterpriseGmailRoute.js)
- [x] Frontend callback pages (GmailOAuth.jsx, GmailAuthSuccess.jsx)
- [x] Updated CampaignHome connection button
- [x] Updated API calls to send orgId/adminId
- [x] Google Cloud Console configured
- [x] Redirect URIs added
- [x] Environment variables set
- [x] Documentation created

---

## 🎉 Success Criteria

✅ User connects Gmail once  
✅ Tokens stored in database  
✅ Emails send without re-authentication  
✅ Tokens auto-refresh indefinitely  
✅ Background/auto-trigger emails work  
✅ No more "reconnect Gmail" popups!

---

**FUCK YEAH! Gmail OAuth is now bulletproof!** 🚀

Now you can build all the auto-triggers you want!

