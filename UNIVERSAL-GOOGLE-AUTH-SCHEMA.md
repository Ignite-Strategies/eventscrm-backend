# Universal Google Auth Schema

**Created:** October 21, 2025, 12:08 AM  
**Status:** 🎯 TODO - Implement Tomorrow

---

## 🔥 The Problem

Right now we have fragmented Google auth:
```
GmailConnection (orgId, adminId, email, tokens)
YouTubeChannel (channelId, orgId, tokens)
GoogleAdsConnection (orgId, adminId, tokens)
```

This is like having separate tables for each person type instead of universal personhood!

---

## 🎯 The Solution: Universal Google OAuth

### Single Table: `GoogleOAuthConnection`

```prisma
model GoogleOAuthConnection {
  id           String    @id @default(cuid())
  
  // Links (Universal Personhood!)
  orgId        String
  org          Organization @relation(...)
  adminId      String
  admin        Admin @relation(...)
  
  // Service Type (for UI/UX - "Is Gmail connected?")
  service      String    // "gmail" | "youtube" | "ads" | "drive"
  
  // 🔥 THE KEY INSIGHT: TOKENS ARE UNIVERSAL!
  // The ONLY difference is the SCOPES requested during OAuth!
  email        String
  accessToken  String     // ← Works with ANY Google API you have scopes for!
  refreshToken String     // ← Same token, any service!
  tokenExpiry  DateTime?
  scopes       Json       // ← ["gmail.send", "youtube.upload"] - What this token can do
  status       String @default("active") // "active" | "revoked"
  
  // Service-specific metadata (JSON)
  metadata     Json?     // { channelId, channelName, etc }
  
  // Timestamps
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // Unique constraint: One service per org/admin
  @@unique([orgId, adminId, service])
  @@index([orgId])
  @@index([adminId])
  @@index([service])
}
```

### 💡 THE BREAKTHROUGH INSIGHT (12:15 AM)

**Tokens are universal! Scopes are the differentiator!**

```javascript
// Gmail OAuth
const scopes = ['https://www.googleapis.com/auth/gmail.send'];
// Returns: { access_token, refresh_token }

// YouTube OAuth  
const scopes = ['https://www.googleapis.com/auth/youtube.upload'];
// Returns: { access_token, refresh_token } ← SAME FORMAT!

// The token doesn't care about "service" - it just has permissions!
```

**This means:**
- One Google account can have ONE set of tokens
- With multiple scopes: `["gmail.send", "youtube.upload", "adwords"]`
- Works with ALL services simultaneously!

**We separate by "service" only for:**
1. **UX** - "Is Gmail connected?" vs "Is YouTube connected?"
2. **Revocation** - Disconnect one service without affecting others
3. **Multiple Accounts** - Different Google emails per service

---

## 🔄 Migration Path

### Phase 1: Create Universal Table
```sql
-- Create new table
CREATE TABLE "GoogleOAuthConnection" (...);

-- Migrate Gmail
INSERT INTO "GoogleOAuthConnection" (orgId, adminId, service, email, accessToken, refreshToken, tokenExpiry, status)
SELECT orgId, adminId, 'gmail', email, accessToken, refreshToken, tokenExpiry, status
FROM "GmailConnection";

-- Migrate YouTube
INSERT INTO "GoogleOAuthConnection" (orgId, adminId, service, email, accessToken, refreshToken, tokenExpiry, metadata, status)
SELECT orgId, adminId, 'youtube', 
  CONCAT(title, '@youtube.com'), -- Generate email
  accessToken, refreshToken, expiresAt,
  jsonb_build_object('channelId', channelId, 'channelName', title, 'subscriberCount', subscriberCount),
  'active'
FROM "YouTubeChannel";
```

### Phase 2: Update Services
- `gmailTokenService.js` → `googleOAuthService.js`
- Add `getValidToken(orgId, adminId, service)`
- Handles all Google services universally

### Phase 3: Update Routes
- All routes use universal service
- Example: `await GoogleOAuthService.getValidToken(orgId, adminId, 'gmail')`

### Phase 4: Delete Old Tables
- Drop `GmailConnection`
- Drop `GoogleAdsConnection`
- Keep `YouTubeChannel` for channel-specific data (playlists, videos)
- BUT tokens live in universal table!

---

## 📦 Universal Service Pattern

```javascript
class GoogleOAuthService {
  
  // Universal token getter
  static async getValidToken(orgId, adminId, service) {
    const connection = await prisma.googleOAuthConnection.findUnique({
      where: {
        orgId_adminId_service: { orgId, adminId, service }
      }
    });
    
    if (!connection) {
      throw new Error(`${service.toUpperCase()} not connected`);
    }
    
    // Auto-refresh if expired (universal pattern!)
    if (isExpired(connection.tokenExpiry)) {
      return await this.refreshToken(connection.id, connection.refreshToken);
    }
    
    return connection.accessToken;
  }
  
  // Universal refresh
  static async refreshToken(connectionId, refreshToken) {
    // Same OAuth2Client pattern for ALL services
    const oauth2Client = new google.auth.OAuth2(...);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    await prisma.googleOAuthConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: credentials.access_token,
        tokenExpiry: new Date(credentials.expiry_date)
      }
    });
    
    return credentials.access_token;
  }
  
  // Universal connection check
  static async isConnected(orgId, adminId, service) {
    const connection = await prisma.googleOAuthConnection.findUnique({
      where: { orgId_adminId_service: { orgId, adminId, service } }
    });
    return !!connection && connection.status === 'active';
  }
}
```

---

## 🎯 Benefits

1. **Single Source of Truth** - All Google auth in one place
2. **Universal Pattern** - Same flow for all Google services
3. **Easy to Add Services** - Just add "drive", "calendar", etc
4. **Consistent Token Management** - One refresh pattern
5. **Better Queries** - See all Google connections per org
6. **Like Universal Personhood!** - One Admin, many services

---

## 🚀 Usage After Migration

```javascript
// Get Gmail token
const gmailToken = await GoogleOAuthService.getValidToken(orgId, adminId, 'gmail');
const gmailService = new GmailService(gmailToken);
await gmailService.sendEmail(...);

// Get YouTube token
const youtubeToken = await GoogleOAuthService.getValidToken(orgId, adminId, 'youtube');
const youtube = google.youtube({ version: 'v3', auth: youtubeToken });
await youtube.videos.insert(...);

// Get Ads token
const adsToken = await GoogleOAuthService.getValidToken(orgId, adminId, 'ads');
const adsService = new GoogleAdsService(adsToken);
await adsService.createCampaign(...);
```

---

## 📋 Implementation Checklist

- [ ] Create `GoogleOAuthConnection` Prisma model
- [ ] Run migration to create table
- [ ] Create `googleOAuthService.js` (universal)
- [ ] Update `unifiedGoogleOAuthRoute.js` to store in universal table
- [ ] Migrate existing Gmail connections
- [ ] Migrate existing YouTube connections
- [ ] Update all routes to use universal service
- [ ] Test all Google services
- [ ] Delete old `GmailConnection` table
- [ ] Delete old service-specific code
- [ ] Update documentation

---

## 🌙 Tomorrow's Work

1. Create Prisma schema
2. Write migration script
3. Create universal service
4. Update unified OAuth route
5. Test with one service (Gmail)
6. Migrate all services
7. Delete old tables

**Estimated Time:** 2-3 hours

---

**UNIVERSAL GOOGLE AUTH = UNIVERSAL PERSONHOOD FOR OAUTH** 🔥

No more fragmented tables. One source of truth. Clean AF.

Sleep on it. Ship it tomorrow. 🚀

