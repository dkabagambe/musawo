UPDATE "users"
SET "role" = 'HR_MANAGER'
WHERE "role"::text IN ('HR_SYSTEM_ADMIN', 'ADMINISTRATOR', 'ADMIN');

UPDATE "staff_invites"
SET "role" = 'HR_MANAGER'
WHERE "role"::text IN ('HR_SYSTEM_ADMIN', 'ADMINISTRATOR', 'ADMIN');

UPDATE "site_settings"
SET "key" = 'role.label.HR_MANAGER'
WHERE "key" = 'role.label.HR_SYSTEM_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM "site_settings" existing
    WHERE existing."key" = 'role.label.HR_MANAGER'
  );

DELETE FROM "site_settings"
WHERE "key" = 'role.label.HR_SYSTEM_ADMIN';
