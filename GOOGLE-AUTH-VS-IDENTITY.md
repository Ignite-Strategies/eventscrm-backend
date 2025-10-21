# Google Auth vs Identity - The Separation

**Date:** October 21, 2025, 12:12 AM  
**Status:** 🧠 Thinking Document - Breadcrumb for Tomorrow

---

## 🎯 The Core Question

**What's AUTH (universal) vs IDENTITY (service-specific)?**

---

## 📺 YouTube Case Study

### Current Table: `YouTubeChannel`
```prisma
model YouTubeChannel {
  id          String  @id
  
  // 🎬 IDENTITY - YouTube-specific shit
  channelId   String  @unique     // YouTube channel ID
  title       String              // Channel name
  description String?             // Channel description
  thumbnail   String?             // Channel avatar
  subscriberCount Int?            // Stats
  viewCount   BigInt?             // Stats
  videoCount  Int?                // Stats
  
  // 🔐 AUTH - Universal Google OAuth tokens
  accessToken  String             // ← AUTH (universal)
  refreshToken String             // ← AUTH (universal)
  expiresAt    DateTime           // ← AUTH (universal)
  
  // 📦 RELATIONSHIPS - Service-specific
  playlists    YouTubePlaylist[]  // YouTube playlists
  videos       YouTubeVideo[]     // YouTube videos
  
  // Links
  containerId String?
  orgId       String?
}
```

### What Should Split?

**Keep in `YouTubeChannel` (IDENTITY):**
- channelId (YouTube identity)
- title, description, thumbnail (channel info)
- subscriberCount, viewCount, videoCount (stats)
- playlists[] (YouTube-specific relationships)
- videos[] (YouTube-specific relationships)

**Move to `GoogleOAuthConnection` (AUTH):**
- accessToken (universal OAuth)
- refreshToken (universal OAuth)
- expiresAt (universal OAuth)
- orgId, adminId (who authorized it)
- email (Google account email)

---

## 📧 Gmail Case Study

### Current Table: `GmailConnection`
```prisma
model GmailConnection {
  id           String    @id
  
  // 🔐 AUTH - Universal Google OAuth tokens
  orgId        String              // ← AUTH (who authorized)
  adminId      String              // ← AUTH (who authorized)
  email        String              // ← IDENTITY (Gmail address)
  refreshToken String              // ← AUTH (universal)
  accessToken  String              // ← AUTH (universal)
  tokenExpiry  DateTime?           // ← AUTH (universal)
  status       String              // ← AUTH (active/revoked)
}
```

### What's Different from YouTube?

**Gmail has NO service-specific identity data!**
- No "GmailAccount" model needed
- Email IS the identity
- No relationships (no sub-resources)
- Just pure auth tokens

**Insight:** Gmail is simpler - just auth, no extra identity table needed!

---

## 🎯 Google Ads Case Study

### Current: Mixed in `GoogleAdAccount` (probably)
```prisma
model GoogleAdAccount {
  id           String
  
  // 🎯 IDENTITY - Google Ads specific
  customerId   String?    // Ads customer ID
  accountName  String?    // Ads account name
  
  // 🔐 AUTH - Universal tokens
  accessToken  String
  refreshToken String
  tokenExpiry  DateTime?
  
  // Links
  orgId        String
}
```

### What Should Split?

**Keep in `GoogleAdAccount` (IDENTITY):**
- customerId (Ads identity)
- accountName (Ads name)
- campaigns[] (Ads-specific relationships)

**Move to `GoogleOAuthConnection` (AUTH):**
- accessToken
- refreshToken
- tokenExpiry
- orgId, adminId (who authorized)

---

## 🧠 The Pattern Emerges

### Universal Auth Table (NEW)
```prisma
model GoogleOAuthConnection {
  id           String    @id
  
  // 🔐 AUTH ONLY (universal across all Google services)
  orgId        String
  adminId      String
  service      String    // "gmail" | "youtube" | "ads"
  email        String    // Google account email
  accessToken  String
  refreshToken String
  tokenExpiry  DateTime?
  status       String    @default("active")
  
  @@unique([orgId, adminId, service])
}
```

### Service Identity Tables (KEEP IF NEEDED)

**YouTubeChannel** (KEEP - has rich identity)
```prisma
model YouTubeChannel {
  channelId   String @unique  // YouTube identity
  title       String
  subscribers Int
  // ... YouTube-specific stuff
  
  // NO tokens! Just references
  orgId       String
  adminId     String  // Who owns this channel connection
}
```

**GmailConnection** (DELETE - no identity needed)
- Gmail has no identity beyond email
- Email lives in GoogleOAuthConnection
- No Gmail-specific data to store

**GoogleAdAccount** (KEEP - has identity)
```prisma
model GoogleAdAccount {
  customerId  String @unique  // Ads identity
  accountName String
  // ... Ads-specific stuff
  
  // NO tokens!
  orgId       String
  adminId     String
}
```

---

## 🎨 The Refactor Pattern

### Before (Current Mess)
```
YouTubeChannel: identity + auth mixed
GmailConnection: just auth (no identity)
GoogleAdAccount: identity + auth mixed
```

### After (Clean Separation)
```
GoogleOAuthConnection: ALL auth (gmail, youtube, ads)
├─ Links to YouTubeChannel (if has identity)
├─ Links to GoogleAdAccount (if has identity)
└─ No Gmail identity table (email is enough)
```

---

## 🔄 How Services Work After Refactor

### Gmail (Simple - No Identity Table)
```javascript
// Get auth token
const token = await GoogleOAuthService.getValidToken(orgId, adminId, 'gmail');

// Use it directly
const gmailService = new GmailService(token);
await gmailService.sendEmail(...);

// That's it! No identity lookup needed.
```

### YouTube (Complex - Has Identity Table)
```javascript
// Get auth token
const token = await GoogleOAuthService.getValidToken(orgId, adminId, 'youtube');

// OPTIONAL: Get channel identity if you need stats
const channel = await prisma.youTubeChannel.findFirst({
  where: { orgId, adminId }
});

// Use token to call API
const youtube = google.youtube({ version: 'v3', auth: token });
await youtube.videos.insert({
  // Can use channel.channelId if needed
  channelId: channel.channelId
});
```

### Google Ads (Complex - Has Identity Table)
```javascript
// Get auth token
const token = await GoogleOAuthService.getValidToken(orgId, adminId, 'ads');

// Get Ads account identity
const adsAccount = await prisma.googleAdAccount.findFirst({
  where: { orgId, adminId }
});

// Use token + identity
const adsService = new GoogleAdsService(token);
await adsService.createCampaign(adsAccount.customerId, ...);
```

---

## 📋 Tomorrow's Questions to Answer

1. **YouTube:** Keep `YouTubeChannel` but remove auth fields?
2. **Gmail:** Delete `GmailConnection` entirely?
3. **Google Ads:** Keep identity table, remove auth?
4. **Linking:** How do identity tables link to auth table?
   - Option A: Reference `googleOAuthConnectionId`
   - Option B: Match on `orgId + adminId + service`

---

## 🎯 The Big Insight

**Gmail proved it: Not all services need identity tables!**

- Gmail: Just auth, no identity table
- YouTube: Auth + rich identity (channels, videos, playlists)
- Ads: Auth + simple identity (customer ID, account name)

**Universal pattern:**
1. Auth ALWAYS in `GoogleOAuthConnection`
2. Identity ONLY if service has unique data
3. Link by `orgId + adminId + service`

---

## 🌙 Sleep On This

Main question for tomorrow:
**Should YouTubeChannel keep existing, or merge into universal table with metadata JSON?**

Option A (Keep separate):
```
GoogleOAuthConnection (auth)
YouTubeChannel (identity - clean separation)
```

Option B (Merge with metadata):
```
GoogleOAuthConnection {
  service: "youtube"
  metadata: { channelId, title, subscribers }
}
```

**My vote: Option A** - Keep identity tables for services with rich data (YouTube, Ads)

---

**BREADCRUMB COMPLETE** 🍞

Auth = Universal tokens in one table
Identity = Service-specific data in separate tables (if needed)
Gmail = Proof that not all services need identity tables

**Think on it. Decide tomorrow. 🌙**

