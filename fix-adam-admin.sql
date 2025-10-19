-- ========================================
-- FIX ADAM'S ADMIN RECORD
-- firebaseId: FZPsyFaCR1ar1lvzN34vCmdanns2
-- ========================================

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
  "status"
FROM "Admin"
WHERE "firebaseId" = 'FZPsyFaCR1ar1lvzN34vCmdanns2';

-- Expected result: You should see your admin record with orgId but NULL containerId


-- Step 2: Check if F3 Container exists
SELECT * FROM "Container" WHERE "slug" = 'f3-default';

-- If no result, run this to create it:
-- INSERT INTO "Container" ("id", "name", "slug", "description", "createdAt", "updatedAt")
-- VALUES (
--   'cm3f3default000000000001',
--   'F3',
--   'f3-default',
--   'F3 fitness and leadership organization',
--   NOW(),
--   NOW()
-- );


-- Step 3: Update your Admin with containerId
-- 🔥 RUN THIS AFTER YOU HAVE THE CONTAINER ID FROM STEP 2
UPDATE "Admin"
SET "containerId" = (SELECT "id" FROM "Container" WHERE "slug" = 'f3-default')
WHERE "firebaseId" = 'FZPsyFaCR1ar1lvzN34vCmdanns2';


-- Step 4: Verify it worked
SELECT 
  "id",
  "firebaseId",
  "email",
  "firstName",
  "lastName",
  "containerId",
  "orgId",
  "role",
  "status"
FROM "Admin"
WHERE "firebaseId" = 'FZPsyFaCR1ar1lvzN34vCmdanns2';

-- Expected: containerId should now be populated!


-- BONUS: Get your full org context
SELECT 
  a."id" as admin_id,
  a."email",
  a."firstName",
  a."lastName",
  a."containerId",
  a."orgId",
  c."name" as container_name,
  o."name" as org_name
FROM "Admin" a
LEFT JOIN "Container" c ON c."id" = a."containerId"
LEFT JOIN "Organization" o ON o."id" = a."orgId"
WHERE a."firebaseId" = 'FZPsyFaCR1ar1lvzN34vCmdanns2';

