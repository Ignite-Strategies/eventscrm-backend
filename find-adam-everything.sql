-- Find EVERYTHING for adam.cole.novadude@gmail.com

-- 1. ALL OrgMembers with this email
SELECT 
  'OrgMember' as table_name,
  id,
  "firebaseId",
  email,
  "firstName",
  "lastName",
  "orgId",
  "contactId",
  role,
  "createdAt"
FROM "OrgMember"
WHERE email = 'adam.cole.novadude@gmail.com'
ORDER BY "createdAt" DESC;

-- 2. ALL Contacts with this email
SELECT 
  'Contact' as table_name,
  id,
  "orgId",
  "firstName",
  "lastName",
  email,
  phone,
  "createdAt"
FROM "Contact"
WHERE email = 'adam.cole.novadude@gmail.com'
ORDER BY "createdAt" DESC;

-- 3. ALL Admins linked to contacts with this email
SELECT 
  'Admin' as table_name,
  a.id,
  a."contactId",
  a."orgId",
  a.role,
  a."isActive",
  c.email
FROM "Admin" a
JOIN "Contact" c ON a."contactId" = c.id
WHERE c.email = 'adam.cole.novadude@gmail.com';

-- 4. Check the specific IDs from adamcolenumbers.md
SELECT 'OLD OrgMember' as note, * FROM "OrgMember" WHERE id = 'cmgfv1cnq0001s129hxmtn3ed';
SELECT 'OLD Contact' as note, * FROM "Contact" WHERE id = 'contact_93046460';
SELECT 'OLD Admin' as note, * FROM "Admin" WHERE id = 'admin_bf849502';


