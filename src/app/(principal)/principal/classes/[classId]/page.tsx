import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import ClassMonitor from "./ClassMonitor";
export const dynamic = "force-dynamic";

export const metadata = { title: "Class Monitor - Principal" };

interface Props {
  params: { classId: string };
}

export default async function ClassMonitorPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  const liveClass = await db.liveClass.findUnique({
    where: { id: params.classId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          courseCode: true,
        },
      },
      tutor: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      attendance: {
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
      groups: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!liveClass) {
    notFound();
  }

  // Calculate statistics
  const totalStudents = liveClass.attendance.length;
  const admittedCount = liveClass.attendance.filter((a) => a.admittedAt).length;
  const onlineCount = liveClass.attendance.filter(
    (a) => a.joinedAt && !a.leftAt
  ).length;
  const markedPresentCount = liveClass.attendance.filter((a) => a.markedPresent).length;

  const stats = {
    totalStudents,
    admittedCount,
    onlineCount,
    markedPresentCount,
    rollCallProgress: totalStudents > 0 ? (markedPresentCount / totalStudents) * 100 : 0,
  };

  return (
    <ClassMonitor
      liveClass={liveClass}
      stats={stats}
      userId={session.user.id}
      canObserve={can(session.user.role, "students.view")}
    />
  );
}
