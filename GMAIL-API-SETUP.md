# Gmail API Email Sending - Architecture

## 🎯 Overview

This system uses **Gmail API with OAuth 2.0** to send emails directly from the user's Gmail account.

**NOT TO BE CONFUSED WITH:**
- Firebase Auth (`AUTH.md`) - That's for super admin CRM login
- SendGrid - We're using Gmail API instead

---

## 🔐 Two Separate Auth Systems

### 1. Firebase Auth (Super Admin)
- **File:** `AUTH.md`, Firebase config in frontend
- **Purpose:** CRM user logs into the app
- **Scope:** App access control
- **Used by:** All CRM pages

### 2. Gmail OAuth (Email Sending)
- **File:** `googleAuth.js` (frontend), `personalEmailRoute.js` (backend)
- **Purpose:** Connect user's Gmail to send emails
- **Scope:** `https://www.googleapis.com/auth/gmail.send`
- **Used by:** Email campaign pages only

---

## 📧 Gmail API Flow

### Frontend (`googleAuth.js`)
```javascript
1. User clicks "Connect Gmail" on CampaignHome
2. signInWithGoogle() triggers Google OAuth popup
3. User grants gmail.send permission
4. Access token stored in localStorage
5. Token persists across pages
```

### Backend (`personalEmailRoute.js`)
```javascript
1. Frontend sends request with Bearer token
2. verifyGmailToken middleware extracts token
3. GmailService uses token to authenticate
4. Sends email via Gmail API
```

---

## 🔑 Environment Variables

### Frontend
```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Backend
```env
VITE_GOOGLE_CLIENT_ID=same-as-frontend
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173 (or production URL)
```

---

## 🛠️ Key Files

### Frontend
- `src/lib/googleAuth.js` - Gmail OAuth logic
- `src/pages/CampaignHome.jsx` - Gmail auth UI
- `src/pages/SequenceCreator.jsx` - Protected page (requires Gmail auth)
- `src/lib/api.js` - Auto-adds Bearer token to requests

### Backend
- `routes/personalEmailRoute.js` - Gmail email endpoints
- `middleware/verifyFirebaseToken.js` - Validates Gmail token
- `services/personalEmailService.js` - Gmail API integration

---

## 📡 API Endpoints

### POST `/api/email/personal/send`
Send single email via Gmail
```javascript
{
  to: "recipient@example.com",
  subject: "Subject",
  body: "HTML body"
}
```

### POST `/api/email/personal/send-bulk`
Send bulk emails via Gmail (for campaigns)
```javascript
{
  recipients: [
    { email: "...", variables: { firstName: "John" } }
  ],
  subject: "{{firstName}}, check this out",
  body: "Hi {{firstName}}..."
}
```

---

## 🔒 Security

- Access tokens stored in `localStorage.getItem('gmailAccessToken')`
- Tokens sent as `Authorization: Bearer <token>`
- Backend validates token before sending
- Each user uses THEIR OWN Gmail account (not a shared account)

---

## ✅ Current Status

- ✅ Gmail OAuth working
- ✅ Token persistence working
- ✅ Backend routes deployed
- ✅ CampaignHome has auth UI
- ✅ SequenceCreator redirects if not authenticated

---

## 🚨 Common Issues

### "Gmail not connected" error
- User hasn't clicked "Connect Gmail" on CampaignHome
- Token expired (rare, but possible)
- Solution: Go to CampaignHome and reconnect

### "Failed to send email"
- Invalid/expired access token
- Gmail API quota exceeded
- Solution: Check console logs, reconnect Gmail

---

*Last Updated: October 14, 2025*

