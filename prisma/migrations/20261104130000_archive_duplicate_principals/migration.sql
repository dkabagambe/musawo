-- remarks.md section 3: DEPUTY_PRINCIPAL -> PRINCIPAL (archive duplicates)
--
-- The batch1a migration (20261031100001) promoted ALL DEPUTY_PRINCIPAL users
-- to PRINCIPAL.  Per the spec, if there was already an existing PRINCIPAL
-- the deputy should have been archived, not promoted.  This corrective
-- migration keeps only the oldest PRINCIPAL account and archives the rest
-- so there is never more than one Principal.

UPDATE "users" SET "role" = 'ARCHIVED', "status" = 'SUSPENDED'
  WHERE "role" = 'PRINCIPAL'
    AND "id" NOT IN (
      SELECT "id" FROM "users"
      WHERE "role" = 'PRINCIPAL'
      ORDER BY "createdAt" ASC
      LIMIT 1
    );
