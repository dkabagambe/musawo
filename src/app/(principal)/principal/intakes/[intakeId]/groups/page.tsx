import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import GroupsClient from "./GroupsClient";
export const dynamic = "force-dynamic";

export const metadata = { title: "Breakaway Groups - Principal" };

interface Props {
  params: { intakeId: string };
}

export default async function BreakawayGroupsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.edit")) redirect("/403");

  const intake = await db.intake.findUnique({
    where: { id: params.intakeId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          courseCode: true,
        },
      },
      enrolments: {
        where: { status: { not: "CANCELLED" } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              studentNumber: true,
              avatarUrl: true,
              status: true,
            },
          },
        },
        orderBy: {
          user: { name: "asc" },
        },
      },
    },
  });

  if (!intake) {
    notFound();
  }

  return <GroupsClient intake={intake} />;
}
