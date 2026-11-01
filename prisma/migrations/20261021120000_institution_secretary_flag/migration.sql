-- AddColumn: institutionSecretary flag on User
-- BOARD_MEMBER accounts with this flag also get policies.manage and board_documents.manage

ALTER TABLE "users" ADD COLUMN "institutionSecretary" BOOLEAN NOT NULL DEFAULT false;
