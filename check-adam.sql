-- Check Adam's OrgMember record
SELECT 
  id,
  "firebaseId",
  email,
  "firstName",
  "lastName",
  "orgId",
  "contactId",
  role,
  phone
FROM "OrgMember"
WHERE "firebaseId" = 'FZPsyFaCR1ar1lvzN34vCmdanns2';

-- Check if Contact exists
SELECT 
  id,
  "orgId",
  "firstName", 
  "lastName",
  email,
  phone
FROM "Contact"
WHERE id = 'contact_93046460';

-- Check Organization
SELECT 
  id,
  name,
  mission
FROM "Organization"
WHERE id = 'cmgfvz9v10000nt284k875eoc';


