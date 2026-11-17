import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import ExaminationsView from "./ExaminationsView";
export const dynamic = "force-dynamic";

export const metadata = { title: "Examinations - Principal" };

interface Props {
  searchParams: { tab?: string; courseId?: string };
}

export default async function PrincipalExaminationsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "exams.mark")) redirect("/403");

  const tab = searchParams.tab ?? "all";
  const courseId = searchParams.courseId;

  const [exams, courses, liveAttempts] = await Promise.all([
    db.exam.findMany({
      where: courseId ? { courseId } : {},
      orderBy: { createdAt: "desc" },
      include: {
        course: { select: { id: true, title: true, courseCode: true } },
        _count: { select: { attempts: true, questions: true } },
      },
    }),
    db.course.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, courseCode: true },
      orderBy: { title: "asc" },
    }),
    db.examAttempt.findMany({
      where: { status: "IN_PROGRESS" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            studentNumber: true,
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
            course: { select: { title: true } },
          },
        },
      },
      orderBy: { startedAt: "asc" },
    }),
  ]);

  // Group exams for timetable view
  const upcomingExams = exams.filter(
    (e) => e.status === "PUBLISHED" && e.startWindowAt && new Date(e.startWindowAt) > new Date()
  );

  const activeExams = exams.filter((e) => e.status === "PUBLISHED" && liveAttempts.some((a) => a.exam.id === e.id));

  return (
    <ExaminationsView
      exams={exams}
      courses={courses}
      liveAttempts={liveAttempts}
      upcomingExams={upcomingExams}
      activeExams={activeExams}
      tab={tab}
      selectedCourseId={courseId || null}
      canCreate={can(session.user.role, "exams.mark")}
      canManage={can(session.user.role, "exams.mark")}
    />
  );
}
