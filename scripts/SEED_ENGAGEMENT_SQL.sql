-- ⚠️ YOU DON'T NEED TO RUN THIS MANUALLY!
-- This runs automatically on git push via postinstall script

-- But if you need to run it manually in Render web console:

-- Engagement values:
-- 1 = Undetermined (default, not set yet)
-- 2 = Low (minimal engagement)
-- 3 = Medium (regular engagement)
-- 4 = High (highly engaged, core team)

INSERT INTO "Engagement" (id, value, "createdAt") 
VALUES 
  (gen_random_uuid()::text, 1, NOW()),
  (gen_random_uuid()::text, 2, NOW()),
  (gen_random_uuid()::text, 3, NOW()),
  (gen_random_uuid()::text, 4, NOW())
ON CONFLICT (value) DO NOTHING;

-- Verify the insert
SELECT * FROM "Engagement" ORDER BY value;

