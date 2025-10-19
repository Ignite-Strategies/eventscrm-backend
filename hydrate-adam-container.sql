-- ========================================
-- HYDRATE ADAM'S FULL CONTAINER SETUP
-- Links Container → Org → Admin all together
-- ========================================

-- Your Admin ID: admin_432599718
-- Your Org ID: cmgfvz9v10000nt284k875eoc
-- Your Firebase ID: FZPsyFaCR1ar1lvzN34vCmdanns2

-- Step 1: See what exists
SELECT * FROM "Container";

-- Step 2: Create F3 Container if doesn't exist
INSERT INTO "Container" ("id", "name", "slug", "description", "createdAt", "updatedAt")
VALUES (
  'cm3f3default000',
  'F3',
  'f3-default',
  'F3 fitness and leadership',
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO NOTHING
RETURNING *;

-- Step 3: Link your ORG to Container
UPDATE "Organization"
SET "containerId" = 'cm3f3default000'
WHERE "id" = 'cmgfvz9v10000nt284k875eoc';

-- Step 4: Link your ADMIN to Container
UPDATE "Admin"
SET "containerId" = 'cm3f3default000'
WHERE "id" = 'admin_432599718';

-- Step 5: Verify everything is linked
SELECT 
  a."id" as admin_id,
  a."email",
  a."firstName",
  a."lastName",
  a."containerId" as admin_container,
  a."orgId",
  o."name" as org_name,
  o."containerId" as org_container,
  c."name" as container_name
FROM "Admin" a
LEFT JOIN "Organization" o ON o."id" = a."orgId"
LEFT JOIN "Container" c ON c."id" = a."containerId"
WHERE a."id" = 'admin_432599718';

-- Expected result:
-- admin_container and org_container should both be 'cm3f3default000'
-- container_name should be 'F3'

