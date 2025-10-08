-- ============================================
-- MIGRATION: orgMemberId → contactId/adminId
-- Run these in pgAdmin on Render
-- ============================================

-- ============================================
-- STEP 1: INSPECT CURRENT STATE
-- ============================================

-- Check EventAttendee table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'EventAttendee'
ORDER BY ordinal_position;

-- Check if orgMemberId column exists in EventAttendee
SELECT COUNT(*) as has_orgMemberId
FROM information_schema.columns
WHERE table_name = 'EventAttendee' AND column_name = 'orgMemberId';

-- Check existing EventAttendee records
SELECT id, "orgId", "eventId", "contactId", "currentStage", "audienceType", "createdAt"
FROM "EventAttendee"
LIMIT 10;

-- Count total EventAttendees
SELECT COUNT(*) as total_event_attendees FROM "EventAttendee";

-- Check OrgMember records
SELECT id, "contactId", "orgId", "firstName", "lastName", email, role, "firebaseId"
FROM "OrgMember"
LIMIT 10;

-- Count OrgMembers with contactId vs without
SELECT 
  COUNT(*) as total,
  COUNT("contactId") as with_contact,
  COUNT(*) - COUNT("contactId") as without_contact
FROM "OrgMember";

-- Check Contact records
SELECT id, "orgId", "firstName", "lastName", email
FROM "Contact"
LIMIT 10;

-- Check Admin records
SELECT id, "contactId", "orgId", role, "isActive"
FROM "Admin"
LIMIT 10;

-- ============================================
-- STEP 2: CHECK FOR ORPHANED DATA
-- ============================================

-- EventAttendees without valid Contact
SELECT ea.id, ea."eventId", ea."contactId"
FROM "EventAttendee" ea
LEFT JOIN "Contact" c ON ea."contactId" = c.id
WHERE c.id IS NULL;

-- OrgMembers without Contact (these need Contact created)
SELECT om.id, om."firstName", om."lastName", om.email, om."orgId"
FROM "OrgMember" om
WHERE om."contactId" IS NULL
LIMIT 20;

-- ============================================
-- STEP 3: DATA MIGRATION PLAN
-- ============================================

-- If you have OrgMembers without Contacts, we need to create Contacts for them
-- Then update OrgMember.contactId to link them

-- OPTION A: If you need to create Contacts for existing OrgMembers
-- (Run this if you have OrgMembers with contactId = NULL)

-- First, let me see what we're dealing with:
SELECT 
  om.id as orgmember_id,
  om."orgId",
  om."firstName",
  om."lastName", 
  om.email,
  om.phone,
  om."contactId",
  om."firebaseId",
  om.role
FROM "OrgMember" om
WHERE om."contactId" IS NULL
  AND om.email IS NOT NULL
  AND om.email != '';

-- ============================================
-- STEP 4: CREATE CONTACTS FOR ORGMEMBERS (IF NEEDED)
-- ============================================

-- This creates Contact records for any OrgMember that doesn't have one
-- CAREFUL: Only run this if you verified Step 3 shows OrgMembers without Contacts

INSERT INTO "Contact" (id, "orgId", "firstName", "lastName", email, phone, "createdAt", "updatedAt")
SELECT 
  gen_random_uuid() as id,
  om."orgId",
  COALESCE(om."firstName", '') as "firstName",
  COALESCE(om."lastName", '') as "lastName",
  om.email,
  om.phone,
  NOW() as "createdAt",
  NOW() as "updatedAt"
FROM "OrgMember" om
WHERE om."contactId" IS NULL
  AND om.email IS NOT NULL
  AND om.email != ''
  AND om."orgId" IS NOT NULL
  -- Only create if Contact doesn't already exist for this email+org
  AND NOT EXISTS (
    SELECT 1 FROM "Contact" c 
    WHERE c.email = om.email 
    AND c."orgId" = om."orgId"
  );

-- ============================================
-- STEP 5: LINK ORGMEMBERS TO THEIR CONTACTS
-- ============================================

-- Update OrgMembers to link to their Contact records
UPDATE "OrgMember" om
SET "contactId" = c.id,
    "updatedAt" = NOW()
FROM "Contact" c
WHERE om."contactId" IS NULL
  AND om.email IS NOT NULL
  AND om.email != ''
  AND om."orgId" IS NOT NULL
  AND c.email = om.email
  AND c."orgId" = om."orgId";

-- Verify the linking worked
SELECT 
  COUNT(*) as total,
  COUNT("contactId") as linked,
  COUNT(*) - COUNT("contactId") as unlinked
FROM "OrgMember";

-- ============================================
-- STEP 6: CREATE ADMIN RECORDS FOR APP USERS
-- ============================================

-- Create Admin records for OrgMembers who have firebaseId (they're app users)
INSERT INTO "Admin" (id, "contactId", "orgId", role, permissions, "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid() as id,
  om."contactId",
  om."orgId",
  CASE 
    WHEN om.role = 'owner' THEN 'super_admin'
    WHEN om.role = 'manager' THEN 'admin'
    ELSE 'super_admin'
  END as role,
  jsonb_build_object(
    'canCreateForms', true,
    'canEditForms', true,
    'canDeleteForms', true,
    'canManageUsers', true,
    'canViewAnalytics', true
  ) as permissions,
  true as "isActive",
  NOW() as "createdAt",
  NOW() as "updatedAt"
FROM "OrgMember" om
WHERE om."contactId" IS NOT NULL
  AND om."firebaseId" IS NOT NULL
  AND om."orgId" IS NOT NULL
  -- Only create if Admin doesn't already exist
  AND NOT EXISTS (
    SELECT 1 FROM "Admin" a 
    WHERE a."contactId" = om."contactId"
  );

-- Verify Admin creation
SELECT 
  a.id,
  a."contactId",
  c.email,
  c."firstName",
  c."lastName",
  a.role,
  a."isActive"
FROM "Admin" a
JOIN "Contact" c ON a."contactId" = c.id
LIMIT 10;

-- ============================================
-- STEP 7: VERIFY EVERYTHING
-- ============================================

-- Final verification: All OrgMembers should have Contacts
SELECT 
  'OrgMembers' as table_name,
  COUNT(*) as total,
  COUNT("contactId") as with_contact,
  COUNT(*) - COUNT("contactId") as missing_contact
FROM "OrgMember"
UNION ALL
SELECT 
  'EventAttendees' as table_name,
  COUNT(*) as total,
  COUNT("contactId") as with_contact,
  COUNT(*) - COUNT("contactId") as missing_contact
FROM "EventAttendee";

-- Check that all app users have Admin records
SELECT 
  om.id as orgmember_id,
  om.email,
  om."firebaseId",
  om."contactId",
  a.id as admin_id,
  a.role as admin_role
FROM "OrgMember" om
LEFT JOIN "Admin" a ON om."contactId" = a."contactId"
WHERE om."firebaseId" IS NOT NULL;

-- ============================================
-- STEP 8: CLEANUP (OPTIONAL - AFTER TESTING)
-- ============================================

-- After you verify everything works, you can remove deprecated fields
-- from OrgMember (firstName, lastName, email, phone, etc.)
-- But WAIT until frontend is updated and tested!

-- For now, just verify the migration is complete:
SELECT 
  'Migration Complete!' as status,
  COUNT(*) as total_orgmembers,
  COUNT("contactId") as linked_to_contacts,
  SUM(CASE WHEN "firebaseId" IS NOT NULL THEN 1 ELSE 0 END) as app_users
FROM "OrgMember";

-- ============================================
-- ROLLBACK QUERIES (IF SOMETHING GOES WRONG)
-- ============================================

-- If you need to rollback, delete newly created records:

-- Delete Admin records created during migration (if needed)
-- DELETE FROM "Admin" WHERE "createdAt" > '2025-01-08 00:00:00';

-- Delete Contact records created during migration (if needed)  
-- DELETE FROM "Contact" WHERE "createdAt" > '2025-01-08 00:00:00';

-- Reset OrgMember contactId links (if needed)
-- UPDATE "OrgMember" SET "contactId" = NULL WHERE "updatedAt" > '2025-01-08 00:00:00';

