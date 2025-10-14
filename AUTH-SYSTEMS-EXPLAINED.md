# 🔐 Authentication Systems - DEFINITIVE GUIDE

**Stop getting confused! Here's what we have and what each does.**

---

## ⚠️ **THE CONFUSION**

We have **TWO COMPLETELY SEPARATE** authentication systems that got mixed up:

1. **Firebase Auth** - For CRM admin login
2. **Google OAuth** - For Gmail API sending

**The problem:** Both use Google accounts, both use Firebase, both have "Bearer" tokens... but they're COMPLETELY DIFFERENT!

---

## 🎯 **System 1: Firebase Auth (CRM Admin Login)**

### **Purpose**
- Login to the CRM dashboard as a super admin
- Access protected admin routes
- NOT used for sending emails

### **How it works**
1. Admin logs in with Google (via Firebase)
2. Firebase generates an **ID token**
3. Token is used to verify admin identity on backend

### **Backend Files**
- **Middleware:** `middleware/authMiddleware.js`
- **Function:** `verifyFirebaseToken()` (exported from authMiddleware)
- **Config:** `config/firebaseAdmin.js`

### **What it does**
```javascript
// Verifies Firebase ID token via Firebase Admin SDK
const decodedToken = await admin.auth().verifyIdToken(token);

// Attaches to request
req.user = {
  firebaseId: decodedToken.uid,
  email: decodedToken.email
};
```

### **Used on routes like**
- Dashboard hydration
- Admin user management
- Protected CRM routes

### **Frontend**
- `src/lib/auth.js` (if it exists)
- Firebase Auth SDK
- Stores Firebase ID token (auto-managed by Firebase)

---

## 📧 **System 2: Google OAuth (Gmail API Sending)**

### **Purpose**
- Send emails from user's Gmail account
- Access Gmail API with `gmail.send` scope
- NOT used for CRM login

### **How it works**
1. User clicks "Connect Gmail" on CampaignHome
2. Google OAuth popup (via Firebase popup mechanism)
3. Google returns **OAuth access token** with `gmail.send` scope
4. Token stored in **localStorage** (NOT Firebase managed)
5. Token sent to backend for Gmail API calls

### **Backend Files**
- **Middleware:** `middleware/verifyGmailToken.js` ✅ (JUST RENAMED!)
- **Function:** `verifyGmailToken()` (default export from verifyGmailToken)
- **Service:** `services/personalEmailService.js` (GmailService class)

### **What it does**
```javascript
// Extracts Gmail OAuth token from Authorization header
const accessToken = authHeader.split("Bearer ")[1];

// Attaches to request (NOT verified, just passed through)
req.gmailAccessToken = accessToken;
```

### **Used on routes like**
- `POST /api/email/personal/send-bulk`
- `POST /api/enterprise-gmail/send-sequence`
- Any Gmail API email sending

### **Frontend**
- **Auth:** `src/lib/googleAuth.js`
- **Storage:** `localStorage.getItem('gmailAccessToken')`
- **Interceptor:** `src/lib/api.js` (adds token to all requests)

---

## 🔄 **Where They Overlap (and cause confusion!)**

| Aspect | Firebase Auth | Google OAuth |
|--------|--------------|--------------|
| **Login method** | Google sign-in via Firebase | Google sign-in via Firebase |
| **Token type** | Firebase ID token | Google OAuth access token |
| **Token storage** | Firebase manages it | localStorage (manual) |
| **Token lifespan** | 1 hour (auto-refreshed) | 1 hour (NOT refreshed yet) |
| **Middleware file** | `authMiddleware.js` | `verifyGmailToken.js` |
| **Middleware function** | `verifyFirebaseToken()` | `verifyGmailToken()` |
| **Attaches to req** | `req.user` | `req.gmailAccessToken` |
| **Verification** | Via Firebase Admin SDK | NOT verified (trusted) |
| **Purpose** | CRM admin identity | Gmail API access |

---

## 🚨 **THE BIG RENAME (Oct 14, 2025)**

### **Old (CONFUSING!):**
```
middleware/verifyFirebaseToken.js  ❌
  ↳ exports: verifyGmailToken()
  ↳ Used for: Gmail OAuth
  ↳ WTF: File name says Firebase, but it's for Gmail!
```

### **New (CLEAR!):**
```
middleware/verifyGmailToken.js  ✅
  ↳ exports: verifyGmailToken()
  ↳ Used for: Gmail OAuth
  ↳ Makes sense!

middleware/authMiddleware.js  ✅
  ↳ exports: verifyFirebaseToken()
  ↳ Used for: Firebase admin auth
  ↳ Also makes sense!
```

---

## 📝 **Quick Reference: Which Middleware Do I Use?**

### **Use `verifyGmailToken` when:**
- Sending emails via Gmail API
- Need user's Gmail access token
- Routes: `/email/personal/*`, `/enterprise-gmail/*`

```javascript
import verifyGmailToken from "../middleware/verifyGmailToken.js";

router.post("/send-email", verifyGmailToken, async (req, res) => {
  const token = req.gmailAccessToken;
  const gmailService = new GmailService(token);
  // ... send email
});
```

### **Use `verifyFirebaseToken` when:**
- Protecting admin-only routes
- Need user identity/email
- Routes: `/admin/*`, `/dashboard/*`

```javascript
import { verifyFirebaseToken } from "../middleware/authMiddleware.js";

router.get("/admin/users", verifyFirebaseToken, async (req, res) => {
  const { firebaseId, email } = req.user;
  // ... admin stuff
});
```

---

## 🎯 **The Flow (Gmail Sending)**

### **Frontend:**
1. User clicks "Connect Gmail" → `signInWithGoogle()`
2. Firebase opens Google OAuth popup
3. User grants `gmail.send` permission
4. Google returns OAuth access token
5. `localStorage.setItem('gmailAccessToken', token)`
6. API interceptor adds `Authorization: Bearer <token>` to all requests

### **Backend:**
1. Request hits route with `verifyGmailToken` middleware
2. Middleware extracts token from `Authorization` header
3. Token attached to `req.gmailAccessToken`
4. Route uses token to initialize `GmailService`
5. GmailService sends email via Gmail API

---

## 🐛 **Common Mistakes**

### ❌ **Wrong:** Using Firebase auth middleware for Gmail routes
```javascript
import { verifyFirebaseToken } from "../middleware/authMiddleware.js";
router.post("/send-email", verifyFirebaseToken, ...);  // WRONG!
```

### ✅ **Correct:** Using Gmail middleware for Gmail routes
```javascript
import verifyGmailToken from "../middleware/verifyGmailToken.js";
router.post("/send-email", verifyGmailToken, ...);  // CORRECT!
```

---

### ❌ **Wrong:** Trying to destructure gmailAccessToken
```javascript
const { gmailAccessToken } = req;  // WRONG! This is undefined
```

### ✅ **Correct:** Direct property access
```javascript
const gmailAccessToken = req.gmailAccessToken;  // CORRECT!
```

---

### ❌ **Wrong:** Checking Firebase auth for Gmail sending
```javascript
if (!req.user) {  // WRONG! This is Firebase auth
  return res.status(401).json({ error: "Not authenticated" });
}
```

### ✅ **Correct:** Checking Gmail token
```javascript
if (!req.gmailAccessToken) {  // CORRECT! This is Gmail OAuth
  return res.status(401).json({ error: "Gmail authentication required" });
}
```

---

## 📊 **localStorage Contents**

After user authenticates with Gmail:

```javascript
// Gmail OAuth (for sending emails)
localStorage.getItem('gmailAccessToken')  // "ya29.a0AQQ_BDQqof75a..." (254 chars)
localStorage.getItem('gmailEmail')        // "adam.cole.novadude@gmail.com"

// Firebase Auth (for CRM login) - auto-managed by Firebase
// You don't manually access these, Firebase SDK handles it

// Organization context
localStorage.getItem('orgId')             // "cmgfvz9v10000nt284k875eoc"
localStorage.getItem('adminId')           // Admin user ID
```

---

## 🔜 **TODO: Token Refresh**

**Current status:** Gmail tokens expire after 1 hour, no refresh logic

**What happens:**
1. User authenticates
2. Gets `accessToken` (valid for 1 hour)
3. After 1 hour, Gmail API calls fail with 401
4. User must re-authenticate (annoying!)

**Future fix:**
1. Store `refreshToken` from OAuth response
2. When `accessToken` expires, use `refreshToken` to get new `accessToken`
3. Update localStorage with new token
4. Continue sending emails seamlessly

---

## 🎯 **Summary**

**Two systems, two tokens, two purposes:**

1. **Firebase Auth** = CRM admin login (who you are)
2. **Google OAuth** = Gmail API sending (what you can do)

**Don't mix them up!**

---

**Last updated:** October 14, 2025  
**By:** Adam + AI (after escaping auth hell)

