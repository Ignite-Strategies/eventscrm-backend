# Gmail API Authentication & Sending Flow

**Complete documentation of how Gmail OAuth works for sending campaign emails**

---

## 🔐 **Authentication Architecture**

We use **two separate authentication systems**:

### 1. **Firebase Auth** (CRM Login - Super Admin)
- **Purpose:** Login to the CRM dashboard
- **Token:** Firebase ID token
- **Storage:** Firebase manages this automatically
- **Used for:** User identity, CRM access control

### 2. **Google OAuth** (Gmail API - Email Sending)
- **Purpose:** Send emails via user's Gmail account
- **Token:** Google OAuth `accessToken` 
- **Storage:** `localStorage.getItem('gmailAccessToken')`
- **Scope:** `https://www.googleapis.com/auth/gmail.send`
- **Used for:** Gmail API calls to send emails

---

## 📦 **What's Stored in localStorage**

When a user authenticates with Google (via `signInWithGoogle()`):

```javascript
localStorage.setItem('gmailAccessToken', accessToken);  // OAuth token for Gmail API
localStorage.setItem('gmailEmail', user.email);         // User's Gmail address
```

**Example values:**
```javascript
gmailAccessToken: "ya29.a0AQQ_BDQqof75a..." // 254 character OAuth token
gmailEmail: "adam.cole.novadude@gmail.com"
```

---

## 🚀 **Complete Gmail Sending Flow**

### **Step 1: User Authenticates on Frontend**
**File:** `ignitestrategescrm-frontend/src/pages/CampaignHome.jsx`

```javascript
import { signInWithGoogle } from '../lib/googleAuth';

// User clicks "Connect Gmail" button
const handleGmailAuth = async () => {
  const result = await signInWithGoogle();
  // This stores gmailAccessToken + gmailEmail in localStorage
  setGmailAuthenticated(true);
};
```

**What happens:**
1. Opens Google OAuth popup
2. User grants `gmail.send` permission
3. Google returns `accessToken` (via Firebase)
4. Token is stored in `localStorage`

---

### **Step 2: Frontend Sends API Request**
**File:** `ignitestrategescrm-frontend/src/lib/api.js`

The Axios interceptor **automatically** adds the Gmail token to **every** API request:

```javascript
api.interceptors.request.use(request => {
  const gmailAccessToken = localStorage.getItem('gmailAccessToken');
  if (gmailAccessToken) {
    request.headers.Authorization = `Bearer ${gmailAccessToken}`;
  }
  return request;
});
```

**Example request:**
```javascript
POST /api/enterprise-gmail/send-sequence
Headers: {
  Authorization: "Bearer ya29.a0AQQ_BDQqof75a..."
}
Body: {
  sequenceId: "cmgqm662l000dry280payefzr",
  contacts: [
    { email: "adam@example.com", firstName: "Adam" }
  ],
  delaySeconds: 4
}
```

---

### **Step 3: Backend Middleware Extracts Token**
**File:** `eventscrm-backend/middleware/verifyGmailToken.js`

```javascript
async function verifyGmailToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  
  const accessToken = authHeader.split("Bearer ")[1];
  
  // Attach to request for route handlers
  req.gmailAccessToken = accessToken;
  next();
}
```

**What happens:**
1. Extracts `Authorization: Bearer <token>` header
2. Splits off the `Bearer ` prefix
3. Attaches token to `req.gmailAccessToken`
4. Route handlers can now access it

---

### **Step 4: Backend Route Uses Token**
**File:** `eventscrm-backend/routes/enterpriseGmailRoute.js`

```javascript
router.post("/send-sequence", verifyGmailToken, async (req, res) => {
  const gmailAccessToken = req.gmailAccessToken; // From middleware
  
  // Initialize Gmail service with user's token
  const gmailService = new GmailService(gmailAccessToken);
  
  // Send emails
  await gmailService.sendEmail({
    to: contact.email,
    subject: "Hello!",
    body: "This is from Gmail API"
  });
});
```

---

### **Step 5: Gmail Service Sends Email**
**File:** `eventscrm-backend/services/personalEmailService.js`

```javascript
export class GmailService {
  constructor(accessToken) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.VITE_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    // Set the user's access token
    this.oauth2Client.setCredentials({ 
      access_token: accessToken,
      scope: 'https://www.googleapis.com/auth/gmail.send'
    });
    
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async sendEmail({ to, subject, body, fromName = "F3 Events" }) {
    // Create email message
    const message = this.createMessage({ to, subject, body, fromName });
    
    // Send via Gmail API
    const result = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: message }
    });
    
    return { messageId: result.data.id };
  }
}
```

**What happens:**
1. Google's `googleapis` library is initialized with the user's token
2. Email is sent **from the user's Gmail account**
3. Email appears in user's "Sent" folder
4. Returns Gmail message ID

---

## 🛣️ **Available Gmail Routes**

### **Option 1: Personal Email (Bulk)**
**Route:** `POST /api/email/personal/send-bulk`
**Use case:** Simple bulk sending (no delays, no sequence tracking)

```javascript
// Frontend call
await api.post("/email/personal/send-bulk", {
  recipients: [
    { email: "test@example.com", variables: { firstName: "Test" } }
  ],
  subject: "Hello {{firstName}}!",
  body: "Hi {{firstName}}, welcome!"
});
```

**Backend:** `eventscrm-backend/routes/personalEmailRoute.js`

---

### **Option 2: Enterprise Gmail (Campaigns)** ✅ RECOMMENDED
**Route:** `POST /api/enterprise-gmail/send-sequence`
**Use case:** Campaign sequences with delays, tracking, and status updates

```javascript
// Frontend call
await api.post("/enterprise-gmail/send-sequence", {
  sequenceId: "cmgqm662l000dry280payefzr",
  contacts: [
    { id: "123", email: "test@example.com", firstName: "Test" }
  ],
  delaySeconds: 4  // 4 seconds between sends
});
```

**Backend:** `eventscrm-backend/routes/enterpriseGmailRoute.js`

**Features:**
- ✅ 4-second delays between emails (Gmail rate limiting)
- ✅ Updates sequence status to "completed" when done
- ✅ Tracks `sentAt` and `totalSent` in database
- ✅ Personalizes `{{firstName}}` and other variables
- ✅ Returns detailed results for each recipient

---

## 🔧 **Backend Setup**

### **Required Environment Variables**
```bash
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000
```

### **Mount the Route** (in `index.js`)
```javascript
import enterpriseGmailRouter from './routes/enterpriseGmailRoute.js';

app.use('/api/enterprise-gmail', enterpriseGmailRouter);
```

---

## 🐛 **Common Issues & Fixes**

### ❌ **"gmailAccessToken is not defined"**
**Cause:** Route is using `gmailAccessToken` instead of `req.gmailAccessToken`
**Fix:** Always use `req.gmailAccessToken` (from middleware)

```javascript
// ❌ WRONG
const gmailService = new GmailService(gmailAccessToken);

// ✅ CORRECT
const gmailAccessToken = req.gmailAccessToken;
const gmailService = new GmailService(gmailAccessToken);
```

---

### ❌ **"404 Not Found" on Gmail API call**
**Cause:** Frontend calling `/api/email/...` when baseURL already has `/api`
**Fix:** Remove duplicate `/api` prefix

```javascript
// ❌ WRONG (becomes /api/api/email/...)
await api.post("/api/email/personal/send-bulk", {...});

// ✅ CORRECT (becomes /api/email/personal/send-bulk)
await api.post("/email/personal/send-bulk", {...});
```

---

### ❌ **"Missing or invalid Authorization header"**
**Cause:** Gmail token not in localStorage or expired
**Fix:** Re-authenticate with Google

```javascript
// Check if token exists
const token = localStorage.getItem('gmailAccessToken');
if (!token) {
  // Redirect to CampaignHome to authenticate
  navigate('/campaignhome');
}
```

---

## 📊 **Token Persistence**

The Gmail `accessToken` is stored in `localStorage`, which means:

✅ **Persists across:**
- Page reloads
- Browser tabs (same origin)
- Component unmounts/remounts
- Navigation between pages

❌ **Does NOT persist:**
- Browser close (unless "Remember me" is checked)
- Different browsers
- Incognito mode
- Manual `localStorage.clear()`

---

## 🔄 **Token Refresh (TODO)**

Google OAuth tokens **expire after 1 hour**. 

**Current status:** No refresh logic implemented
**Impact:** Users need to re-authenticate after 1 hour

**Future fix:**
1. Store `refreshToken` in addition to `accessToken`
2. Use Google's token refresh endpoint when `accessToken` expires
3. Update `localStorage` with new token

---

## 🎯 **Summary**

**The complete flow in one sentence:**

> User authenticates with Google OAuth → `accessToken` stored in localStorage → Frontend sends API request with `Authorization: Bearer <token>` header → Backend middleware extracts token to `req.gmailAccessToken` → Route handler uses token to send email via Gmail API

**Key files:**
1. `ignitestrategescrm-frontend/src/lib/googleAuth.js` - OAuth flow
2. `ignitestrategescrm-frontend/src/lib/api.js` - Axios interceptor
3. `eventscrm-backend/middleware/verifyGmailToken.js` - Gmail token extraction
4. `eventscrm-backend/middleware/authMiddleware.js` - Firebase admin auth (separate!)
5. `eventscrm-backend/routes/enterpriseGmailRoute.js` - Campaign sending
6. `eventscrm-backend/services/personalEmailService.js` - Gmail API wrapper

---

**Last updated:** October 14, 2025
**By:** AI debugging session with Adam

