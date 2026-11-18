import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import RosterClient from "./RosterClient";
export const dynamic = "force-dynamic";

export const metadata = { title: "Class Roster - Principal" };

interface Props {
  params: { intakeId: string };
}

export default async function ClassRosterPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  const intake = await db.intake.findUnique({
    where: { id: params.intakeId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          courseCode: true,
          tutor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          coTutors: {
            include: {
              tutor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
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
              phone: true,
              studentNumber: true,
              avatarUrl: true,
              status: true,
              createdAt: true,
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

  return (
    <RosterClient
      intake={intake}
      canEdit={can(session.user.role, "courses.edit")}
    />
  );
}
