# Render Environment Variables

**Date:** October 21, 2025  
**Service:** eventscrm-backend on Render

---

## 🔐 Required Environment Variables

### Google OAuth (Gmail, YouTube, Ads)
```bash
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

**Note:** Redirect URI is hardcoded as `https://app.engage-smart.com/oauth/callback` (not secret, no env var needed)

---

### Database
```bash
DATABASE_URL="postgresql://user:password@host:port/database"
```

---

### Firebase (User Authentication)
```bash
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important:** Firebase private key must include `\n` for newlines

---

### SendGrid (Optional - if using email)
```bash
SENDGRID_API_KEY="SG.xxxxxxxxxxxx"
```

---

### Meta/Facebook (Optional - if using Meta integration)
```bash
META_APP_ID="your-meta-app-id"
META_APP_SECRET="your-meta-app-secret"
META_REDIRECT_URI="https://eventscrm-backend.onrender.com/api/meta/oauth/callback"
```

---

### Frontend URL
```bash
FRONTEND_URL="https://app.engage-smart.com"
```

---

### Default Container (Optional)
```bash
DEFAULT_CONTAINER_ID="cmgu7w02h0000ceaqt7iz6bf9"
```

---

## 🎯 What's Hardcoded (Not in Env)

These are **not secrets** so they're hardcoded in the code:

1. **OAuth Redirect URI:** `https://app.engage-smart.com/oauth/callback`
   - Used in: `unifiedGoogleOAuthRoute.js`, `gmailTokenService.js`
   - Why: Not sensitive, easier to maintain in code

2. **Frontend URLs:** Various redirects to `app.engage-smart.com`
   - Used in: Success callbacks, OAuth redirects

3. **API URLs:** Backend is `eventscrm-backend.onrender.com`

---

## ✅ How to Set on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select `eventscrm-backend` service
3. Navigate to **Environment** tab
4. Add/Update variables above
5. Click **Save Changes**
6. Service will auto-redeploy

---

## 🔍 How to Verify

Run this in your backend:
```javascript
console.log({
  hasClientId: !!process.env.GOOGLE_CLIENT_ID,
  hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  hasFirebaseKey: !!process.env.FIREBASE_PRIVATE_KEY
});
```

All should be `true`

---

## ⚠️ DO NOT SET (Already Hardcoded)

- ~~GMAIL_REDIRECT_URI~~ ❌ (hardcoded)
- ~~YOUTUBE_REDIRECT_URI~~ ❌ (hardcoded)
- ~~GOOGLE_REDIRECT_URI~~ ❌ (might be used by old routes, but unified uses hardcoded)

---

## 🎯 Google Cloud Console Setup

**Authorized Redirect URIs** (must be set in Google Cloud Console):
```
https://app.engage-smart.com/oauth/callback
```

**Authorized JavaScript Origins:**
```
https://app.engage-smart.com
```

---

**Last Updated:** After OAuth consolidation cleanup

