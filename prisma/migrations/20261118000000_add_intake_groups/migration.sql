-- CreateTable
CREATE TABLE "intake_groups" (
    "id" TEXT NOT NULL,
    "intakeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake_group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "intake_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "intake_group_members_userId_idx" ON "intake_group_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "intake_group_members_groupId_userId_key" ON "intake_group_members"("groupId", "userId");

-- AddForeignKey
ALTER TABLE "intake_groups" ADD CONSTRAINT "intake_groups_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "intakes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_group_members" ADD CONSTRAINT "intake_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "intake_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
