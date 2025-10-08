-- ============================================
-- ADAM'S PERSONAL MIGRATION
-- Since you're the only user, let's fix this quickly
-- ============================================

-- Step 1: Check your current OrgMember data
SELECT 
  id, "orgId", "firstName", "lastName", email, phone, "contactId", "firebaseId", role
FROM "OrgMember" 
WHERE "orgId" = 'cmgfvz9v1';

-- Step 2: Check if you have duplicate OrgMembers (the "two members" issue)
SELECT 
  email, 
  COUNT(*) as count,
  array_agg(id) as orgmember_ids
FROM "OrgMember" 
WHERE "orgId" = 'cmgfvz9v1'
GROUP BY email
HAVING COUNT(*) > 1;

-- Step 3: Check if you have any Contact records yet
SELECT 
  id, "orgId", "firstName", "lastName", email, phone
FROM "Contact" 
WHERE "orgId" = 'cmgfvz9v1';

-- Step 4: Check if you have any Admin records yet
SELECT 
  id, "contactId", "orgId", role, "isActive"
FROM "Admin" 
WHERE "orgId" = 'cmgfvz9v1';

-- ============================================
-- MIGRATION STEPS
-- ============================================

-- Step 5: Create Contact for you (if it doesn't exist)
INSERT INTO "Contact" (id, "orgId", "firstName", "lastName", email, phone, "createdAt", "updatedAt")
SELECT 
  'contact_adam_' || substr(id, 1, 8),  -- Use your orgmember id as base
  "orgId",
  COALESCE("firstName", 'Adam'),
  COALESCE("lastName", 'Cole'),
  COALESCE(email, 'adam.cole@f3capital.com'),  -- Fix your email
  phone,
  NOW(),
  NOW()
FROM "OrgMember" 
WHERE id = 'cmgfv1cnc'  -- Your specific ID
  AND "orgId" = 'cmgfvz9v1'
  AND NOT EXISTS (
    SELECT 1 FROM "Contact" c 
    WHERE c."orgId" = 'cmgfvz9v1' 
    AND c.email = COALESCE("OrgMember".email, 'adam.cole@f3capital.com')
  );

-- Step 6: Link your OrgMember to Contact
UPDATE "OrgMember" 
SET "contactId" = (
  SELECT id FROM "Contact" 
  WHERE "orgId" = 'cmgfvz9v1' 
  AND email = COALESCE("OrgMember".email, 'adam.cole@f3capital.com')
),
"updatedAt" = NOW()
WHERE id = 'cmgfv1cnc'
  AND "orgId" = 'cmgfvz9v1'
  AND "contactId" IS NULL;

-- Step 7: Create Admin record for you (since you have firebaseId)
INSERT INTO "Admin" (id, "contactId", "orgId", role, permissions, "isActive", "createdAt", "updatedAt")
SELECT 
  'admin_adam_' || substr(id, 1, 8),
  "contactId",
  "orgId",
  'super_admin',
  '{"canCreateForms":true,"canEditForms":true,"canDeleteForms":true,"canManageUsers":true,"canViewAnalytics":true}'::jsonb,
  true,
  NOW(),
  NOW()
FROM "OrgMember" 
WHERE id = 'cmgfv1cnc'
  AND "orgId" = 'cmgfvz9v1'
  AND "firebaseId" IS NOT NULL
  AND "contactId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Admin" a 
    WHERE a."contactId" = "OrgMember"."contactId"
  );

-- Step 8: Clean up any duplicate OrgMembers (if they exist)
-- First, let's see what duplicates you have:
SELECT 
  email,
  COUNT(*) as count,
  array_agg(id ORDER BY "createdAt") as ids,
  array_agg("createdAt") as created_dates
FROM "OrgMember" 
WHERE "orgId" = 'cmgfvz9v1'
GROUP BY email
HAVING COUNT(*) > 1;

-- If you have duplicates, keep the oldest one and delete the rest:
-- DELETE FROM "OrgMember" 
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY "createdAt") as rn
--     FROM "OrgMember" 
--     WHERE "orgId" = 'cmgfvz9v1'
--   ) t WHERE rn > 1
-- );

-- ============================================
-- VERIFICATION
-- ============================================

-- Step 9: Verify everything is linked correctly
SELECT 
  'VERIFICATION' as status,
  om.id as orgmember_id,
  om."contactId",
  c.id as contact_id,
  c.email as contact_email,
  a.id as admin_id,
  a.role as admin_role
FROM "OrgMember" om
LEFT JOIN "Contact" c ON om."contactId" = c.id
LEFT JOIN "Admin" a ON om."contactId" = a."contactId"
WHERE om.id = 'cmgfv1cnc';

-- Step 10: Check EventAttendee structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'EventAttendee'
ORDER BY ordinal_position;

-- Step 11: Check if any EventAttendees exist and what they use
SELECT COUNT(*) as total_event_attendees FROM "EventAttendee";

-- If EventAttendees exist, check their structure:
SELECT id, "orgId", "eventId", "contactId", "currentStage", "audienceType"
FROM "EventAttendee"
LIMIT 5;

-- ============================================
-- FINAL STATUS
-- ============================================

-- Summary of your migration:
SELECT 
  'MIGRATION COMPLETE' as status,
  (SELECT COUNT(*) FROM "OrgMember" WHERE "orgId" = 'cmgfvz9v1') as orgmembers,
  (SELECT COUNT(*) FROM "Contact" WHERE "orgId" = 'cmgfvz9v1') as contacts,
  (SELECT COUNT(*) FROM "Admin" WHERE "orgId" = 'cmgfvz9v1') as admins,
  (SELECT COUNT(*) FROM "EventAttendee") as event_attendees;
