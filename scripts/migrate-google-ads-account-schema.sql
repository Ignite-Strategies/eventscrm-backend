-- Migration: Refactor GoogleAdAccount to separate auth from identity
-- This migration updates the GoogleAdAccount table to link to GoogleOAuthConnection
-- and removes auth-related fields (tokens, expiry, connectedEmail)

-- Step 1: Add new columns to GoogleAdAccount (making them nullable for migration)
ALTER TABLE "GoogleAdAccount" 
ADD COLUMN IF NOT EXISTS "googleOAuthConnectionId" TEXT,
ADD COLUMN IF NOT EXISTS "customerId" TEXT,
ADD COLUMN IF NOT EXISTS "accountName" TEXT,
ADD COLUMN IF NOT EXISTS "currency" TEXT,
ADD COLUMN IF NOT EXISTS "timezone" TEXT;

-- Step 2: Add scopes column to GoogleOAuthConnection
ALTER TABLE "GoogleOAuthConnection"
ADD COLUMN IF NOT EXISTS "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Step 3: Remove old columns from GoogleOAuthConnection (service-specific data)
-- NOTE: Run this AFTER migrating data!
-- ALTER TABLE "GoogleOAuthConnection" 
-- DROP COLUMN IF EXISTS "channelId",
-- DROP COLUMN IF EXISTS "channelName",
-- DROP COLUMN IF EXISTS "customerId",
-- DROP COLUMN IF EXISTS "accountName",
-- DROP COLUMN IF EXISTS "developerToken";

-- Step 4: For existing GoogleAdAccount records, you'll need to:
-- 1. Create a GoogleOAuthConnection record with service='ads'
-- 2. Link the GoogleAdAccount to that GoogleOAuthConnection
-- 3. Move customerId from old structure to new structure

-- Example migration (you'll need to adapt based on your data):
/*
-- For each existing GoogleAdAccount:
UPDATE "GoogleAdAccount" 
SET "customerId" = "googleCustomerId",
    "accountName" = "displayName"
WHERE "googleCustomerId" IS NOT NULL;
*/

-- Step 5: Add constraints after data migration
-- ALTER TABLE "GoogleAdAccount" 
-- ALTER COLUMN "googleOAuthConnectionId" SET NOT NULL,
-- ALTER COLUMN "customerId" SET NOT NULL,
-- ADD CONSTRAINT "GoogleAdAccount_customerId_key" UNIQUE ("customerId"),
-- ADD CONSTRAINT "GoogleAdAccount_googleOAuthConnectionId_fkey" 
--   FOREIGN KEY ("googleOAuthConnectionId") REFERENCES "GoogleOAuthConnection"("id") ON DELETE CASCADE;

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS "GoogleAdAccount_googleOAuthConnectionId_idx" ON "GoogleAdAccount"("googleOAuthConnectionId");
CREATE INDEX IF NOT EXISTS "GoogleAdAccount_customerId_idx" ON "GoogleAdAccount"("customerId");

-- Step 7: Drop old columns after migration
-- ALTER TABLE "GoogleAdAccount" 
-- DROP COLUMN IF EXISTS "refreshToken",
-- DROP COLUMN IF EXISTS "accessToken",
-- DROP COLUMN IF EXISTS "tokenExpiry",
-- DROP COLUMN IF EXISTS "connectedEmail",
-- DROP COLUMN IF EXISTS "googleCustomerId",
-- DROP COLUMN IF EXISTS "displayName";

-- IMPORTANT: Run `npx prisma db push` after this migration to sync the Prisma schema

