# 📧 GMAIL OAUTH SETUP - PERSISTENT EMAIL ACCESS

## The Problem We Solved

**Before:** Gmail access token expired every hour → Had to re-authenticate constantly  
**After:** Persistent refresh token stored in database → Auto-refreshes access token → Never expires!

---

## How It Works

### The OAuth Flow

```
1. User clicks "Connect Gmail" in frontend
   ↓
2. Frontend calls: POST /api/gmail/oauth/connect
   ↓
3. Backend generates OAuth URL with `access_type: "offline"`
   ↓
4. User authorizes Gmail access on Google's page
   ↓
5. Google redirects to: GET /api/gmail/oauth/callback
   ↓
6. Backend receives:
   - access_token (expires in 1 hour)
   - refresh_token (NEVER EXPIRES! 🎉)
   ↓
7. Backend stores both tokens in GmailConnection table
   ↓
8. User redirected back to frontend with success
```

### Auto-Refresh Magic

```javascript
// When sending email:
1. Check if access_token is expired (or expires in < 5 min)
2. If expired → Use refresh_token to get new access_token
3. Update database with new access_token
4. Send email with fresh token
5. SUCCESS! 🎉
```

**Key Point:** The `refresh_token` NEVER expires unless user revokes access!

---

## Database Schema

```prisma
model GmailConnection {
  id           String    @id @default(cuid())
  
  // Links
  orgId        String
  org          Organization @relation(fields: [orgId], references: [id])
  adminId      String
  admin        Admin @relation(fields: [adminId], references: [id])
  
  // Gmail account
  email        String
  
  // OAuth tokens
  refreshToken String    // ← PERSISTENT! Never expires!
  accessToken  String    // ← Expires every hour
  tokenExpiry  DateTime?
  
  // Status
  status       String @default("active") // active, disconnected, revoked
  
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

---

## API Endpoints

### 1. POST /api/gmail/oauth/connect
**Start OAuth flow**

Request:
```json
{
  "orgId": "cmgfvz9v10000nt284k875eoc",
  "adminId": "user123"
}
```

Response:
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

**Frontend:** Redirect user to `authUrl`

---

### 2. GET /api/gmail/oauth/callback
**Handle OAuth callback** (Google redirects here)

Query params:
- `code` - Authorization code from Google
- `state` - JSON with `{ orgId, adminId }`

**Backend:** 
1. Exchanges code for tokens
2. Stores in database
3. Redirects to frontend success page

---

### 3. GET /api/gmail/oauth/status
**Check if Gmail is connected**

Query params:
- `orgId` - Organization ID

Response:
```json
{
  "connected": true,
  "connection": {
    "id": "conn123",
    "email": "adam.cole.novadude@gmail.com",
    "tokenExpiry": "2025-10-21T12:00:00Z",
    "createdAt": "2025-10-20T10:00:00Z"
  }
}
```

---

### 4. POST /api/gmail/oauth/refresh-token
**Manually refresh access token** (usually auto-refreshed)

Request:
```json
{
  "orgId": "cmgfvz9v10000nt284k875eoc"
}
```

Response:
```json
{
  "success": true,
  "accessToken": "ya29.a0AfH6...",
  "expiresAt": 1697896800000
}
```

---

### 5. DELETE /api/gmail/oauth/disconnect
**Disconnect Gmail**

Query params:
- `orgId` - Organization ID

Response:
```json
{
  "message": "Gmail disconnected successfully"
}
```

---

## Helper Function: getValidGmailToken()

**Use this in any route that needs to send emails!**

```javascript
import { getValidGmailToken } from './routes/gmailOAuthRoute.js';

// In your route:
const accessToken = await getValidGmailToken(orgId);
const gmailService = new GmailService(accessToken);
await gmailService.sendEmail({ to, subject, body });
```

**What it does:**
1. Gets Gmail connection from database
2. Checks if access token is expired
3. If expired → Auto-refreshes using refresh token
4. Returns valid access token
5. You send email → SUCCESS! 🎉

---

## Environment Variables

```bash
GOOGLE_CLIENT_ID="your_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_client_secret"
GOOGLE_REDIRECT_URI_GMAIL="https://eventscrm-backend.onrender.com/api/gmail/oauth/callback"
```

**Get these from:** Google Cloud Console → APIs & Services → Credentials

---

## Google Cloud Console Setup

### 1. Create OAuth 2.0 Client ID

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Events CRM - Gmail Integration"

### 2. Configure Redirect URIs

Add these redirect URIs:
- **Production:** `https://eventscrm-backend.onrender.com/api/gmail/oauth/callback`
- **Local:** `http://localhost:3003/api/gmail/oauth/callback`

### 3. Configure OAuth Consent Screen

1. Go to: OAuth consent screen
2. User type: "External" (for testing) or "Internal" (for G Suite)
3. Scopes: Add these scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`

### 4. Add Test Users (if External)

1. Add your Gmail addresses as test users
2. This allows you to test OAuth without full verification

---

## Usage Example: Send Email on Form Submit

**Option 1: Backend sends email automatically**
```javascript
// In contactFormSubmitRoute.js
import { getValidGmailToken } from './gmailOAuthRoute.js';
import { GmailService } from '../services/personalEmailService.js';

// After contact is created:
const accessToken = await getValidGmailToken(orgId);
const gmailService = new GmailService(accessToken);

await gmailService.sendEmail({
  to: contact.email,
  subject: `Thank you for committing to ${publicForm.title}!`,
  body: `
    <h2>Thank you for committing to coming!</h2>
    <p>Hi ${contact.firstName},</p>
    <p>We look forward to having you at ${publicForm.title}!</p>
    <p>Best regards,<br>F3 Capital Impact Team</p>
  `
});
```

**Option 2: Frontend triggers email on success page**
```javascript
// In form success page:
useEffect(() => {
  const sendConfirmation = async () => {
    await fetch('/api/email/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId: contact.id,
        eventId: eventId,
        orgId: orgId
      })
    });
  };
  
  sendConfirmation();
}, []);
```

---

## Troubleshooting

### "Error: No Gmail connection found"
**Solution:** User needs to connect Gmail first via OAuth flow

### "Token expired" error
**Solution:** Call `getValidGmailToken()` - it auto-refreshes!

### "Invalid grant" error
**Solution:** User revoked access or refresh token is invalid
- User needs to re-connect Gmail via OAuth flow

### "redirect_uri_mismatch" error
**Solution:** Update redirect URI in Google Cloud Console to match your backend URL

---

## Security Notes

1. **Refresh tokens are SENSITIVE** - Never expose them to frontend
2. **Access tokens expire in 1 hour** - Always use `getValidGmailToken()`
3. **Store tokens in database** - Not in localStorage or frontend
4. **Use HTTPS in production** - Required for OAuth security

---

## Personal vs Enterprise Gmail

### Personal Gmail Service (Current)
- **Use for:** Individual email sends, confirmations, notifications
- **Limit:** ~500 emails/day (Gmail free account)
- **Auth:** OAuth with user's personal Gmail
- **Cost:** FREE!

### Enterprise Gmail (Future)
- **Use for:** Mass campaigns, bulk sends, newsletters
- **Limit:** Higher (varies by G Suite plan)
- **Auth:** Service account or domain-wide delegation
- **Cost:** G Suite subscription required

**Current recommendation:** Use Personal Gmail Service for Bros & Brews confirmations!

---

## Next Steps

1. ✅ **Schema updated** - GmailConnection model added
2. ✅ **Routes created** - OAuth flow complete
3. ⏳ **Run migration** - User needs to run in pgAdmin
4. ⏳ **Frontend integration** - Add "Connect Gmail" button
5. ⏳ **Test OAuth flow** - Connect Gmail account
6. ⏳ **Send test email** - Verify it works!

---

**The power of persistent tokens!** 🚀

