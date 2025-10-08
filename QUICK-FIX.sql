-- ============================================
-- QUICK FIX FOR ADAM'S NAVIGATION LOOP
-- Run this first to get you unstuck
-- ============================================

-- Step 1: Check your current OrgMember
SELECT 
  id, "orgId", "firstName", "lastName", email, phone, "contactId", "firebaseId", role
FROM "OrgMember" 
WHERE id = 'cmgfv1cnc';

-- Step 2: Create Contact for you (if missing)
INSERT INTO "Contact" (id, "orgId", "firstName", "lastName", email, phone, "createdAt", "updatedAt")
VALUES (
  'contact_adam_fix',
  'cmgfvz9v1',
  'Adam',
  'Cole', 
  'adam.cole@f3capital.com',
  '7030000000',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Link your OrgMember to Contact
UPDATE "OrgMember" 
SET "contactId" = 'contact_adam_fix'
WHERE id = 'cmgfv1cnc' AND "contactId" IS NULL;

-- Step 4: Create Admin record for you
INSERT INTO "Admin" (id, "contactId", "orgId", role, permissions, "isActive", "createdAt", "updatedAt")
VALUES (
  'admin_adam_fix',
  'contact_adam_fix',
  'cmgfvz9v1',
  'super_admin',
  '{"canCreateForms":true,"canEditForms":true,"canDeleteForms":true,"canManageUsers":true,"canViewAnalytics":true}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Step 5: Verify everything is linked
SELECT 
  'FIXED!' as status,
  om.id as orgmember_id,
  om."contactId",
  c.id as contact_id,
  c.email as contact_email,
  a.id as admin_id,
  a.role as admin_role,
  a."isActive"
FROM "OrgMember" om
LEFT JOIN "Contact" c ON om."contactId" = c.id
LEFT JOIN "Admin" a ON om."contactId" = a."contactId"
WHERE om.id = 'cmgfv1cnc';

-- Step 6: Check if you have any events
SELECT COUNT(*) as total_events FROM "Event" WHERE "orgId" = 'cmgfvz9v1';

-- If no events, create a test event
INSERT INTO "Event" (id, "orgId", name, slug, "createdAt", "updatedAt")
VALUES (
  'event_adam_test',
  'cmgfvz9v1',
  'Test Event',
  'test-event',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Final verification
SELECT 
  'READY TO GO!' as status,
  om.id as orgmember_id,
  om."contactId" as contact_id,
  a.id as admin_id,
  (SELECT COUNT(*) FROM "Event" WHERE "orgId" = 'cmgfvz9v1') as total_events;
