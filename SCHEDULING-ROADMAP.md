# Email Scheduling Roadmap 🗓️

## Current State ✅
- Installed: `bull` (job queue) and `node-cron` (scheduler)
- Created: `schedulingService.js` with scaffolding
- Created: `cronService.js` for background tasks

## The Two Features You Want

### 1. Delayed Sends
**Use Case:** "Send this campaign tomorrow at 10am instead of now"

**How it works:**
1. User clicks "Schedule" instead of "Send Now"
2. Picks date/time in UI
3. Backend stores: `{ sequenceId, contacts, sendAt, gmailToken }`
4. Cron job checks every minute: "Is it time yet?"
5. When time comes → sends emails with 4-second delays

### 2. Drip Sequences
**Use Case:** "Email 1 today, Email 2 in 3 days, Email 3 in 7 days"

**How it works:**
1. User creates campaign with multiple sequences
2. Sets delay: "Sequence 1: Day 0, Sequence 2: Day 3, Sequence 3: Day 7"
3. Backend schedules all 3 emails per contact
4. Cron sends them automatically over time

---

## What You Need to Complete This

### Step 1: Add Database Table (Required)

Add to `prisma/schema.prisma`:

```prisma
model SequenceSchedule {
  id         String   @id @default(cuid())
  
  // What to send
  sequenceId String
  sequence   Sequence @relation(fields: [sequenceId], references: [id], onDelete: Cascade)
  
  // Who to send to
  contactId  String
  contact    Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  
  // When to send
  sendAt     DateTime
  
  // Tracking
  status     String   @default("pending") // pending, sent, failed, cancelled
  sentAt     DateTime?
  error      String?
  
  // Security (store encrypted in production!)
  gmailToken String
  
  // Metadata
  campaignId String?  // Optional: link to campaign for drip sequences
  stepNumber Int?     // Optional: which step in drip sequence (1, 2, 3...)
  
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  @@index([status, sendAt])
  @@index([contactId])
  @@index([sequenceId])
}
```

Then run:
```bash
npx prisma migrate dev --name add-sequence-schedule
npx prisma generate
```

### Step 2: Uncomment Code in Services

**In `schedulingService.js`:**
- Uncomment the `sequenceSchedule` database queries
- Test with simple delayed send first

**In `index.js`:**
- Import and start cron:
```javascript
import CronService from './services/cronService.js';

// After all routes...
CronService.start();
```

### Step 3: Install Redis (Optional - for Bull Queue)

**Why Redis?**
- Survives server restarts (doesn't lose scheduled jobs)
- Better for high volume (100s+ scheduled emails)
- Built-in retry logic

**For your scale (15 people), you DON'T need Redis yet!**
Database + cron is fine.

**If you want Redis later:**

**Option A: Local (Development)**
```bash
# Windows (using Chocolatey)
choco install redis-64

# Or use Docker
docker run -d -p 6379:6379 redis
```

**Option B: Cloud (Production)**
- Upstash (free tier): https://upstash.com
- Redis Cloud: https://redis.com/try-free

Then add to `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

And uncomment the Bull queue code in `schedulingService.js`.

---

## Current Mode: Simple Database + Cron ✅

This is what you'll use first:

1. **Store scheduled emails** → SequenceSchedule table
2. **Cron checks every minute** → "Any emails due?"
3. **Sends with 4-second delays** → Gmail friendly
4. **Updates status** → "sent" or "failed"

**Pros:**
- Simple
- No extra infrastructure (no Redis)
- Works great for 15 people at a time

**Cons:**
- If server crashes mid-send, might lose that batch
- Can't easily pause/resume jobs
- Limited retry logic

---

## Future Mode: Bull + Redis 🚀

When you scale up or want more features:

1. **Queue jobs in Redis** → Never lose them
2. **Bull processes automatically** → With retries
3. **Dashboard available** → See all scheduled jobs
4. **Pause/resume campaigns** → Full control

---

## Next Steps (When Ready)

### Phase 1: Delayed Sends (Easier)
1. ✅ Install packages (done!)
2. ⬜ Add SequenceSchedule table to Prisma
3. ⬜ Create `/api/campaigns/schedule` endpoint
4. ⬜ Uncomment cron job starter in `index.js`
5. ⬜ Test: Schedule email for 2 minutes from now
6. ⬜ Watch cron logs: See it send automatically!

### Phase 2: Drip Sequences (Medium)
1. ⬜ Create UI for multi-step campaigns
2. ⬜ Store: "Sequence 1: Day 0, Sequence 2: Day 3, etc."
3. ⬜ When campaign starts, schedule all emails for contact
4. ⬜ Cron sends them over time
5. ⬜ Track progress per contact

### Phase 3: Bull + Redis (Advanced)
1. ⬜ Set up Redis (local or cloud)
2. ⬜ Uncomment Bull queue code
3. ⬜ Migrate from simple scheduling to Bull
4. ⬜ Add retry logic
5. ⬜ Set up Bull dashboard (optional)

---

## Testing Checklist

### Delayed Send Test
```javascript
POST /api/scheduling/schedule
{
  "contactId": "contact_123",
  "sequenceId": "seq_456",
  "sendAt": "2025-10-15T15:30:00Z",
  "gmailToken": "token_xyz"
}

// Wait for scheduled time
// Check cron logs
// Verify email sent
```

### Drip Sequence Test
```javascript
POST /api/scheduling/drip
{
  "contactId": "contact_123",
  "campaignId": "campaign_789",
  "sequences": [
    { "sequenceId": "seq_1", "delayDays": 0 },
    { "sequenceId": "seq_2", "delayDays": 3 },
    { "sequenceId": "seq_3", "delayDays": 7 }
  ],
  "gmailToken": "token_xyz"
}

// Check SequenceSchedule table
// Verify 3 records with correct sendAt times
```

---

## Resources

### Cron Syntax Tool
https://crontab.guru

### Bull Documentation
https://github.com/OptimalBits/bull

### Redis Setup
- Local: https://redis.io/download
- Cloud: https://upstash.com (easiest)

---

## TL;DR - What to Do Next

**For now (breadcrumbs laid):**
✅ Packages installed
✅ Services scaffolded
✅ You understand the plan

**When you're ready to implement:**
1. Add SequenceSchedule table
2. Start cron service
3. Test delayed send
4. Build drip sequences
5. Add Redis if you need it later

**You're set up for success!** 🎯

---

*Status: Breadcrumbs laid, ready for Phase 1 implementation*
*Next: Add SequenceSchedule table when ready*

