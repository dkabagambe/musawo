import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import ResultsView from "./ResultsView";
export const dynamic = "force-dynamic";

export const metadata = { title: "Results & Grading - Principal" };

interface Props {
  searchParams: { tab?: string; courseId?: string; status?: string };
}

export default async function PrincipalResultsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "grades.view")) redirect("/403");

  const tab = searchParams.tab || "submitted";
  const courseId = searchParams.courseId;
  const status = searchParams.status;

  // Fetch grading system settings
  const gradingSettings = await db.gradingSystemSetting.findMany({
    include: {
      course: {
        select: { id: true, title: true, courseCode: true },
      },
    },
    orderBy: { course: { title: "asc" } },
  });

  // Fetch all courses for dropdown
  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true, courseCode: true },
    orderBy: { title: "asc" },
  });

  // Fetch submitted results (pending review)
  const submittedResults = await db.examAttempt.findMany({
    where: {
      status: "SUBMITTED",
      ...(courseId ? { exam: { courseId } } : {}),
    },
    include: {
      user: {
        select: { id: true, name: true, studentNumber: true, email: true },
      },
      exam: {
        select: {
          id: true,
          title: true,
          passPercent: true,
          course: { select: { id: true, title: true, courseCode: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 50,
  });

  // Fetch scored results (ready for publication)
  const scoredResults = await db.examAttempt.findMany({
    where: {
      status: "SCORED",
      ...(courseId ? { exam: { courseId } } : {}),
    },
    include: {
      user: {
        select: { id: true, name: true, studentNumber: true },
      },
      exam: {
        select: {
          id: true,
          title: true,
          passPercent: true,
          course: { select: { id: true, title: true, courseCode: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 50,
  });

  // Fetch approval requests for result publications
  const publicationApprovals = await db.approvalRequest.findMany({
    where: {
      type: "RESULTS_PUBLICATION",
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
    },
    include: {
      requestedBy: { select: { name: true } },
      exam: {
        select: {
          id: true,
          title: true,
          course: { select: { title: true, courseCode: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch recently published results
  const publishedResults = await db.examAttempt.findMany({
    where: {
      passed: { not: null },
      ...(courseId ? { exam: { courseId } } : {}),
    },
    include: {
      user: {
        select: { id: true, name: true, studentNumber: true },
      },
      exam: {
        select: {
          id: true,
          title: true,
          passPercent: true,
          course: { select: { id: true, title: true, courseCode: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <ResultsView
      tab={tab}
      gradingSettings={gradingSettings}
      courses={courses}
      submittedResults={submittedResults}
      scoredResults={scoredResults}
      publicationApprovals={publicationApprovals}
      publishedResults={publishedResults}
      selectedCourseId={courseId || null}
      canEdit={can(session.user.role, "grades.edit")}
      canPublish={can(session.user.role, "grades.publish")}
      userId={session.user.id}
    />
  );
}
