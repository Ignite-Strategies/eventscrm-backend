# 🚨 DATABASE CHANGES - DO NOT RUN LOCALLY

## ⚠️ CRITICAL RULE FOR AI ASSISTANTS

**DO NOT** run these commands:
```bash
❌ npx prisma migrate dev
❌ npx prisma migrate deploy
❌ npx prisma db push
❌ npx prisma db pull
```

**DO NOT** create manual SQL files in `/migrations` folder.

---

## Why Not?

### 1. **Local Environment Issues**
- Local `.env` often has invalid/missing DATABASE_URL
- Running migrations locally will fail with "Error validating datasource"
- Wastes time troubleshooting connection issues

### 2. **Production Database is the Source of Truth**
- Database is hosted on Render/Neon (cloud)
- Schema changes must be done directly in production database
- Adam has direct access via pgAdmin

### 3. **Prisma Schema is Documentation**
- `schema.prisma` should reflect production reality
- Changes to schema are for documentation purposes
- The actual database schema is managed manually

---

## The CORRECT Process

### When Schema Changes are Needed:

#### Step 1: Update schema.prisma (Documentation)
```prisma
model PublicForm {
  id          String  @id @default(cuid())
  containerId String? // ✅ Added for tenant isolation
  // ... rest
}
```

**Purpose:** Keep schema file in sync with reality. This is documentation, not the source.

#### Step 2: Adam Updates Database Directly
- Opens pgAdmin web interface
- Connects to production Postgres
- Runs SQL manually:
```sql
ALTER TABLE "PublicForm" 
ADD COLUMN "containerId" TEXT;

UPDATE "PublicForm" pf
SET "containerId" = (
  SELECT o."containerId"
  FROM "Event" e
  JOIN "Organization" o ON e."orgId" = o.id
  WHERE e.id = pf."eventId"
);
```

#### Step 3: Verify in Production
- Check that data is correct
- Test endpoints
- Confirm no errors in Render logs

#### Step 4: Commit schema.prisma Changes
```bash
git add prisma/schema.prisma
git commit -m "docs: Add containerId to PublicForm schema (already applied in production)"
git push
```

---

## What AI Assistants SHOULD Do

### ✅ DO THIS:

1. **Update schema.prisma for documentation**
   ```javascript
   // Edit the file directly
   // Add comments about changes
   // Keep it in sync with production
   ```

2. **Suggest SQL for manual execution**
   ```
   "Here's the SQL Adam should run in pgAdmin:
   ALTER TABLE..."
   ```

3. **Update backend code to use new fields**
   ```javascript
   // Update routes to use containerId
   const publicForm = await prisma.publicForm.findUnique({
     where: { slug },
     include: { event: { include: { org: true } } }
   });
   ```

4. **Test with existing data**
   ```javascript
   // Write code that works with production data
   // Assume schema is already updated
   ```

### ❌ DON'T DO THIS:

1. **Run Prisma CLI commands locally**
   ```bash
   ❌ npx prisma migrate dev
   ❌ npx prisma db push
   ```

2. **Create migration files**
   ```bash
   ❌ Create files in prisma/migrations/
   ```

3. **Try to "fix" DATABASE_URL**
   ```bash
   ❌ "Let me update your .env file..."
   ❌ "Can you provide the DATABASE_URL?"
   ```

4. **Suggest local testing with migrations**
   ```bash
   ❌ "Let's run the migration to test it locally"
   ```

---

## Local Development

### What Works Locally:
- ✅ Reading code
- ✅ Editing routes
- ✅ Updating services
- ✅ Testing logic (without DB)
- ✅ Editing schema.prisma (as documentation)

### What DOESN'T Work Locally:
- ❌ Database connections
- ❌ Running migrations
- ❌ Testing with real data
- ❌ Querying production DB

### Why?
- No local Postgres instance
- `.env` DATABASE_URL is not configured for local
- All testing happens in production (yes, really)
- This is a solo dev project with low traffic

---

## Database Access

**Who Has Access:**
- Adam (via pgAdmin web interface)
- **pgAdmin URL:** https://pgadmin-cjk2.onrender.com/browser/

**Who DOESN'T Have Access:**
- AI assistants
- Local development environment
- CI/CD pipelines

**Why This Works:**
- Fast iteration (no PR reviews for schema changes)
- Direct control (Adam knows the data)
- No accidental production changes (manual = intentional)
- pgAdmin hosted on Render for easy access

---

## Common Scenarios

### Scenario 1: Need to Add a Field

**Wrong Approach:**
```bash
# AI: "Let me create a migration"
❌ npx prisma migrate dev --name add-field
```

**Right Approach:**
```prisma
// 1. Update schema.prisma
model Contact {
  newField String? // Added for X feature
}

// 2. Tell Adam:
// "Schema updated. Run this SQL in pgAdmin:
// ALTER TABLE Contact ADD COLUMN newField TEXT;"
```

### Scenario 2: Need to Change Unique Constraint

**Wrong Approach:**
```bash
# AI: "Let me migrate the unique constraint"
❌ npx prisma migrate dev --name fix-unique
```

**Right Approach:**
```prisma
// 1. Update schema.prisma
model PublicForm {
  slug String
  @@unique([slug, containerId]) // Changed from @unique on slug
}

// 2. Tell Adam:
// "Schema updated. Run this SQL in pgAdmin:
// DROP INDEX IF EXISTS PublicForm_slug_key;
// CREATE UNIQUE INDEX PublicForm_slug_containerId_key 
// ON PublicForm(slug, containerId);"
```

### Scenario 3: Need to Backfill Data

**Wrong Approach:**
```bash
# AI: "Let me write a script to backfill"
❌ node scripts/backfill-data.js
```

**Right Approach:**
```sql
-- Provide SQL for Adam to run in pgAdmin
UPDATE "PublicForm" pf
SET "containerId" = (
  SELECT o."containerId"
  FROM "Event" e
  JOIN "Organization" o ON e."orgId" = o.id
  WHERE e.id = pf."eventId"
)
WHERE "containerId" IS NULL;
```

---

## Emergency: Production is Broken

### If Schema Change Caused Issues:

1. **Check Render logs** (Adam has access)
2. **Rollback in pgAdmin** (Adam does this)
3. **Update code to handle both states** (nullable fields)
4. **Don't panic and try local migrations** (won't help)

### Code Should Be Defensive:

```javascript
// ✅ Good - handles missing field gracefully
const containerId = publicForm.event?.org?.containerId || null;

// ❌ Bad - assumes field always exists
const containerId = publicForm.event.org.containerId;
```

---

## Summary

### The Golden Rules:

1. **Adam owns the database** - Manual changes in pgAdmin
2. **schema.prisma is documentation** - Not the source of truth
3. **No local migrations** - They won't work and waste time
4. **Update code to match reality** - Assume schema is already updated
5. **Suggest SQL for Adam** - Don't try to run it yourself

### The Goal:

- Fast iteration on schema changes
- Direct control by person who knows the data
- No complex migration tooling getting in the way
- Documentation stays in sync via schema.prisma

---

## For New AI Assistants:

If you're reading this because you were about to run `npx prisma migrate dev`:

**STOP.** ✋

You don't have database access. You can't run migrations. That's intentional.

Instead:
1. Update `schema.prisma` (documentation)
2. Suggest SQL for Adam to run
3. Update backend code to use new fields
4. Move on with your life

**Do not try to "fix" this workflow.** It's working as designed.

---

**Last Updated:** October 20, 2025  
**Applies To:** All database schema changes  
**Exceptions:** None. Seriously, none.

