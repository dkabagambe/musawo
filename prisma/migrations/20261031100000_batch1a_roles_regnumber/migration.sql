-- Batch 1A Part 1: Add new enum values ONLY.
-- PostgreSQL requires ADD VALUE to commit before the new values can be used
-- in the same session. This migration contains ONLY the ADD VALUE statements.
-- The data migration is in 20261031100001_batch1a_data_migration.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DIRECTOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ARCHIVED';
