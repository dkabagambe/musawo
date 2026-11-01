DO $$
BEGIN
  UPDATE "users" SET "role" = 'SUPER_ADMIN' WHERE "role"::text = 'MANAGING_DIRECTOR';
  UPDATE "users" SET "role" = 'FINANCE_OFFICER' WHERE "role"::text IN ('BURSAR', 'ACCOUNTS');
  UPDATE "users" SET "role" = 'ACADEMIC_REGISTRAR' WHERE "role"::text = 'REGISTRAR';
  UPDATE "users" SET "role" = 'INSTRUCTOR' WHERE "role"::text = 'TUTOR';
  UPDATE "users" SET "role" = 'HR_SYSTEM_ADMIN' WHERE "role"::text IN ('ADMIN', 'ADMINISTRATOR');
  UPDATE "users" SET "role" = 'STUDENT' WHERE "role"::text IN ('BUSINESS_DEV_MANAGER', 'COMMUNICATIONS_OFFICER', 'MARKETING_COMMS');
END $$;
