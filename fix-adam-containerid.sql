-- Step 1: Find your Admin record
SELECT 
  "id" as admin_id,
  "firebaseId",
  "email",
  "firstName",
  "lastName",
  "orgId",
  "containerId",
  "role",
  "status",
  "createdAt"
FROM "Admin"
WHERE "email" LIKE '%adam%' OR "firebaseId" IS NOT NULL
ORDER BY "createdAt" DESC;

-- Step 2: Find Container (should be F3 or create one)
SELECT * FROM "Container";

-- Step 3A: If no Container exists, create F3 default
-- INSERT INTO "Container" ("id", "name", "slug", "description", "createdAt", "updatedAt")
-- VALUES (
--   'container_f3_default',
--   'F3',
--   'f3-default',
--   'F3 fitness and leadership organization',
--   NOW(),
--   NOW()
-- );

-- Step 3B: Update your Admin with containerId
-- Replace YOUR_ADMIN_ID with the id from Step 1
-- Replace CONTAINER_ID with the id from Step 2
-- 
-- UPDATE "Admin"
-- SET "containerId" = 'CONTAINER_ID_HERE'
-- WHERE "id" = 'YOUR_ADMIN_ID_HERE';

-- Step 4: Verify the update
-- SELECT 
--   "id",
--   "email",
--   "firstName",
--   "containerId",
--   "orgId"
-- FROM "Admin"
-- WHERE "id" = 'YOUR_ADMIN_ID_HERE';

