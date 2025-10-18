# 🗺️ ORG MEMBER JOURNEY PIPELINE - COMPLETE DOCUMENTATION

## Table of Contents
1. [Overview](#overview)
2. [The 6 Journey Stages](#the-6-journey-stages)
3. [The Human Stack - Personas](#the-human-stack---personas)
4. [Engagement Hub Architecture](#engagement-hub-architecture)
5. [Google Ads Integration](#google-ads-integration)
6. [AI Campaign Generation](#ai-campaign-generation)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Frontend Components](#frontend-components)
10. [Implementation Guide](#implementation-guide)

---

## Overview

The Org Member Journey Pipeline is a comprehensive framework for understanding and engaging with people at every stage of their relationship with your organization. Instead of treating everyone the same, this system recognizes that people enter at different stages and need different types of engagement.

### Core Philosophy

**Events are Recruitment Tools, Not Fundraising Tools**

- You won't get tons of donors at events
- You WILL get activation and engagement
- The goal is to move people through stages deliberately
- Each stage requires different messaging and tactics

---

## The 6 Journey Stages

### 1️⃣ Unaware 👀
**Definition:** Has never heard of you or your mission  
**Focus:** Discovery  
**Action:** Sees ad, post, or hears mention  
**Tools:** Google Ads, Facebook Ads, Referrals  
**Messaging:** Problem-aware, attention-grabbing

### 2️⃣ Curious / Prospect 🤔
**Definition:** Aware of you, considering participation  
**Focus:** Interest  
**Action:** Clicks link, visits site, watches video  
**Tools:** Landing pages, email capture, social proof  
**Messaging:** Value proposition, what's in it for them

### 3️⃣ Activated / Attendee ⚡
**Definition:** Takes a first action — shows up or signs up  
**Focus:** Action  
**Action:** RSVPs, attends an event, subscribes  
**Tools:** Event forms, confirmation emails, welcome sequences  
**Messaging:** Reinforce decision, set expectations

### 4️⃣ Engaged Member 🔥
**Definition:** Participates repeatedly or interacts meaningfully  
**Focus:** Connection  
**Action:** Attends 2+ events, joins Slack or mailing list  
**Tools:** Email campaigns, challenges, community engagement  
**Messaging:** Belonging, community, shared values

### 5️⃣ Champion / Leader 👑
**Definition:** Becomes a multiplier; invites or mentors others  
**Focus:** Ownership  
**Action:** Brings a friend, leads challenge, donates  
**Tools:** Leadership opportunities, recognition, special access  
**Messaging:** Impact, legacy, leadership

### 6️⃣ Alumni / Dormant 💤
**Definition:** Steps back but still connected  
**Focus:** Legacy / Rest  
**Action:** No activity > 90 days; tagged for reactivation  
**Tools:** Re-engagement campaigns, "we miss you" messages  
**Messaging:** No pressure, open door, updates

---

## The Human Stack - Personas

### What Are Personas?

Personas are structured representations of the humans you're trying to reach. They translate gut-level understanding into machine-usable data that powers AI campaigns, targeting, and messaging.

### Core Fields

| Field | Example | Description |
|-------|---------|-------------|
| **Persona Name** | "Disconnected Dad" | Quick label for internal use |
| **Demographics** | Men 30–50, Arlington VA | Context for targeting |
| **Pain Point** | Feels isolated, lacks accountability | Core emotional driver |
| **Desire / Aspiration** | Wants community, purpose, structure | Positive end-state |
| **Motivators** | Challenge, brotherhood, shared purpose | What energizes them |
| **Barriers / Friction** | Time, ego, not knowing where to start | Why they haven't yet moved |
| **Tone / Voice** | Masculine, authentic, no-BS | How to speak to them |
| **Channels** | Google Search, YouTube, Facebook | Where they hang out |
| **Primary Stage** | Curious | Where they typically enter your system |

### How Personas Power the System

1. **AI Campaign Generation:** OpenAI uses persona data to generate targeted ad copy, keywords, and messaging
2. **Multi-Channel Use:** One persona can power Google Ads, Facebook campaigns, and email sequences
3. **Consistent Voice:** Ensures messaging stays true to how you need to speak to each audience
4. **Targeting Optimization:** Demographics and channels inform platform targeting settings

### Database Model

```prisma
model Persona {
  id             String   @id @default(cuid())
  orgId          String
  org            Organization @relation(fields: [orgId], references: [id])
  
  personaName    String
  demographics   String
  painPoint      String
  desire         String
  motivators     String?
  barriers       String?
  tone           String
  channels       String
  primaryStage   String
  notes          String?
  
  googleAdCampaigns GoogleAdCampaign[]
  engagementActions EngagementAction[]
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

---

## Engagement Hub Architecture

### Overview

The Engagement Hub is the central command center for activating your organization. It's divided into two main sections based on the journey stages:

### 🧠 Engage Core (Stages 3-5)

Tools for nurturing **existing members** who have already activated:

- **Email Your Crew:** Pre-built email templates for weekly check-ins, updates, challenges
- **Challenge of the Week:** Ready-to-use challenge templates to drive action
- **Member Story Video:** Showcase transformation stories that inspire

**Primary Stages Targeted:** Activated, Engaged, Champion

### 🚀 Recruit Public (Stages 1-3)

Tools for **reaching new people** and moving them toward activation:

- **Google Ads:** Generate awareness campaigns for search
- **Facebook / Instagram:** Social media campaigns for discovery
- **Eventbrite:** Sync public events and pull attendees into CRM

**Primary Stages Targeted:** Unaware, Curious, Activated

### Journey-Based Dashboard

The main dashboard is now organized by journey phase:

1. **Setup & Foundation:** Org settings, events, contacts (infrastructure)
2. **Engage & Recruit:** The new Engagement Hub (growth and activation)
3. **Nurture & Convert:** Pipelines, campaigns, forms (conversion)
4. **Analyze & Optimize:** Analytics, ad performance (insights)

---

## Google Ads Integration

### Architecture

The Google Ads system is built on OAuth 2.0 and supports multiple ad accounts per organization.

### Components

#### 1. OAuth Flow

```
User clicks "Connect Google Ads"
  ↓
Backend generates OAuth URL with org ID
  ↓
User authorizes in Google
  ↓
Google redirects to callback with code
  ↓
Backend exchanges code for refresh token
  ↓
Stores GoogleAdAccount with refresh token
```

#### 2. Token Management

- **Refresh Token:** Stored securely, used to generate new access tokens
- **Access Token:** Short-lived, regenerated as needed
- **Token Expiry:** Tracked to know when refresh is needed
- **Sync Logs:** All token refreshes and API calls logged for debugging

#### 3. Campaign Structure

```
GoogleAdAccount (OAuth connection)
  └── GoogleAdCampaign (Campaign settings)
        └── GoogleAdGroup (Keywords + Targeting)
              └── GoogleAdCreative (Ad copy + creative)
```

### Database Models

```prisma
model GoogleAdAccount {
  id                String    @id @default(cuid())
  orgId             String
  displayName       String?
  googleCustomerId  String?
  refreshToken      String?
  accessToken       String?
  tokenExpiry       DateTime?
  connectedEmail    String?
  status            String    @default("active")
  campaigns         GoogleAdCampaign[]
  syncLogs          GoogleAdSyncLog[]
}

model GoogleAdCampaign {
  id                String    @id @default(cuid())
  orgId             String
  googleAdAccountId String?
  personaId         String?
  name              String
  objective         String?
  dailyBudget       Float?
  status            String    @default("draft")
  adGroups          GoogleAdGroup[]
}

model GoogleAdGroup {
  id                 String    @id @default(cuid())
  campaignId         String
  name               String
  keywords           String[]
  negativeKeywords   String[]
  locations          String[]
  ads                GoogleAdCreative[]
}

model GoogleAdCreative {
  id                 String    @id @default(cuid())
  adGroupId          String
  headline1          String?
  headline2          String?
  headline3          String?
  description        String?
  finalUrl           String?
  callToAction       String?
}
```

---

## AI Campaign Generation

### How It Works

1. **User selects a persona** in the Persona Builder
2. **Clicks "Generate Campaign"**
3. **Backend calls OpenAI** with structured prompt containing all persona data
4. **AI generates:**
   - Campaign name
   - Keywords (3-5 high-intent)
   - Negative keywords (2-3)
   - Ad headlines (3, max 30 chars each)
   - Ad descriptions (2, max 90 chars each)
   - Targeting recommendations (locations, age ranges, genders)
   - Strategic reasoning
5. **Response is parsed and returned** as structured JSON
6. **Frontend displays** generated campaign for review/editing
7. **User can save** to database or push to Google Ads API

### OpenAI Prompt Structure

The AI is given:
- Persona name
- Demographics
- Pain point
- Desire/aspiration
- Motivators
- Barriers
- Tone/voice
- Channels
- Journey stage
- Campaign objective
- Daily budget

And asked to generate a complete campaign optimized for that specific persona.

### Service Architecture

```javascript
// services/aiCampaignGenerator.js

async function generateGoogleAdsCampaign(persona, options) {
  // 1. Build structured prompt with persona data
  // 2. Call OpenAI GPT-4 with specific instructions
  // 3. Parse JSON response
  // 4. Return campaign data
}

async function generateChallenge(persona) {
  // Generate engagement challenges based on persona
}

async function generateEmailCampaign(persona, emailType) {
  // Generate email content based on persona
}
```

---

## Database Schema

### Complete Journey Pipeline Schema

```prisma
// Core Models
model Organization { ... }
model Contact { ... }
model Event { ... }

// Journey Models
model Persona {
  // Human Stack - WHO you're reaching
}

model EngagementAction {
  // Track all engagement activities
  id        String   @id
  orgId     String
  type      String   // "email", "challenge", "google_ad", etc.
  personaId String?
  eventId   String?
  status    String
}

// Google Ads Models
model GoogleAdAccount {
  // OAuth connection
}

model GoogleAdCampaign {
  // Campaign settings
}

model GoogleAdGroup {
  // Keywords + targeting
}

model GoogleAdCreative {
  // Ad copy + creative
}

model GoogleAdSyncLog {
  // Debug + audit trail
}
```

---

## API Endpoints

### Personas

```
GET    /api/personas?orgId=xxx           - List all personas
GET    /api/personas/:id?orgId=xxx       - Get single persona
POST   /api/personas                     - Create persona
PATCH  /api/personas/:id                 - Update persona
DELETE /api/personas/:id?orgId=xxx       - Delete persona
```

### Google Ads OAuth

```
POST   /api/googleads/connect            - Start OAuth flow
GET    /api/googleads/callback           - OAuth callback
GET    /api/googleads/accounts?orgId=xxx - List connected accounts
POST   /api/googleads/refresh-token      - Refresh access token
DELETE /api/googleads/accounts/:id       - Disconnect account
```

### Google Ads Campaigns

```
POST   /api/googleads/campaigns/generate - AI-generate campaign from persona
POST   /api/googleads/campaigns          - Create campaign
GET    /api/googleads/campaigns/:orgId   - List all campaigns
GET    /api/googleads/campaign/:id       - Get single campaign
PATCH  /api/googleads/campaigns/:id      - Update campaign
DELETE /api/googleads/campaigns/:id      - Delete campaign
```

---

## Frontend Components

### Key Pages

1. **Dashboard.jsx** - Journey-based navigation
2. **EngageHub.jsx** - Main engagement hub
3. **PersonaBuilder.jsx** - Create/edit personas
4. **EngageEmailCrew.jsx** - Email templates
5. **EngageChallenges.jsx** - Challenge templates
6. **EngageStory.jsx** - Member story videos
7. **RecruitGoogle.jsx** - Google Ads campaigns (with AI generation)
8. **RecruitFacebook.jsx** - Social media campaigns
9. **RecruitEventbrite.jsx** - Event sync

### Routing Structure

```
/dashboard                    - Journey-based dashboard
/engage                       - Engagement Hub
/engage/email                 - Email Your Crew
/engage/challenges            - Challenge of the Week
/engage/story                 - Member Story Video
/recruit/google               - Google Ads
/recruit/facebook             - Facebook/Instagram
/recruit/eventbrite           - Eventbrite Sync
/personas                     - Persona Builder
```

---

## Implementation Guide

### Phase 1: Setup (Complete)

✅ Database schema with all models  
✅ Backend routes for personas, OAuth, campaigns  
✅ AI campaign generation service  
✅ Frontend pages and routing  
✅ Journey-based dashboard

### Phase 2: Google Ads OAuth (MVP)

1. **Set up Google Cloud Project**
   - Enable Google Ads API
   - Create OAuth 2.0 credentials
   - Set authorized redirect URI

2. **Configure Environment Variables**
   ```
   GOOGLE_CLIENT_ID=xxx
   GOOGLE_CLIENT_SECRET=xxx
   GOOGLE_DEVELOPER_TOKEN=xxx
   GOOGLE_REDIRECT_URI=https://yourapp.com/api/googleads/callback
   ```

3. **Test OAuth Flow**
   - User clicks "Connect Google Ads"
   - Authorizes in Google
   - Verify token stored in database

### Phase 3: AI Campaign Generation (MVP)

1. **Configure OpenAI**
   ```
   OPENAI_API_KEY=xxx
   ```

2. **Create First Persona**
   - Navigate to /personas
   - Fill out persona form
   - Save to database

3. **Generate Campaign**
   - Click "Generate Campaign" on persona
   - Review AI-generated content
   - Adjust as needed
   - Save campaign

### Phase 4: Push to Google Ads API (Next)

1. **Implement Google Ads API calls**
   - Create campaign in Google
   - Create ad groups
   - Create ads
   - Store Google IDs

2. **Sync Analytics**
   - Pull impressions, clicks, conversions
   - Display in dashboard

### Phase 5: Full Journey Tracking (Future)

1. **Contact Journey Stage Tracking**
   - Add `journeyStage` field to Contact model
   - Auto-update based on actions
   - Display in contact profiles

2. **Journey Analytics**
   - Stage conversion rates
   - Time in each stage
   - Drop-off analysis

---

## Environment Variables

### Required

```env
# Database
DATABASE_URL=postgresql://...

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_DEVELOPER_TOKEN=xxx
GOOGLE_REDIRECT_URI=https://yourapp.com/api/googleads/callback

# OpenAI
OPENAI_API_KEY=sk-xxx

# Frontend URL
FRONTEND_URL=https://your-frontend.com
```

---

## Best Practices

### Persona Development

1. **Start with real humans** - Base personas on actual people you've worked with
2. **Be specific** - "Men 30-50 in Arlington VA" beats "men"
3. **Capture tone accurately** - This drives all messaging
4. **Update regularly** - Personas evolve as you learn

### Campaign Generation

1. **Review AI output** - Always edit before publishing
2. **Test multiple variations** - Generate 2-3 versions, pick the best
3. **Track performance** - Tag campaigns with persona ID to measure effectiveness

### Journey Stage Management

1. **Don't over-engineer** - Start simple, add complexity as needed
2. **Focus on transitions** - Moving stages is more important than perfect classification
3. **Use events as activation points** - Events are the key transition from Curious → Activated

---

## Troubleshooting

### Google Ads OAuth Issues

**Problem:** OAuth fails or token expires  
**Solution:** Check `GoogleAdSyncLog` table for error messages, refresh token if needed

**Problem:** Can't find Google Customer ID  
**Solution:** Log into Google Ads, check account settings

### AI Generation Issues

**Problem:** AI returns invalid JSON  
**Solution:** Service includes fallback parsing for markdown code blocks

**Problem:** Generated content too generic  
**Solution:** Add more specific details to persona, especially pain point and tone

### Database Issues

**Problem:** Relation errors after schema changes  
**Solution:** Run `prisma migrate dev` to apply schema changes

---

## Conclusion

The Org Member Journey Pipeline is a comprehensive system for:

1. **Understanding** who you're reaching (Personas)
2. **Meeting them** where they are (Journey Stages)
3. **Engaging them** appropriately (Engagement Hub)
4. **Moving them forward** (Stage Transitions)
5. **Scaling** with automation (AI + APIs)

This framework transforms guesswork into strategy, and strategy into systematic growth.

---

**Built by Ignite Strategies**  
**Powered by AI, Driven by Purpose**

