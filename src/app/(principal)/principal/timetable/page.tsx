import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import TimetableClient from "./TimetableClient";
export const dynamic = "force-dynamic";

export const metadata = { title: "Timetable Management - Principal" };

export default async function PrincipalTimetablePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  const now = new Date();
  const futureLimit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

  // Fetch all upcoming and recent classes
  const classes = await db.liveClass.findMany({
    where: {
      scheduledAt: {
        gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        lte: futureLimit,
      },
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      course: { select: { id: true, title: true } },
      block: { select: { id: true, title: true } },
      tutor: { select: { id: true, name: true } },
      _count: { select: { attendance: true } },
    },
  });

  // Fetch all courses for dropdown
  const courses = await db.course.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { title: "asc" },
    select: { id: true, title: true, courseCode: true },
  });

  // Fetch blocks per course
  const allBlocks = await db.block.findMany({
    where: { course: { status: { not: "ARCHIVED" } } },
    orderBy: [{ courseId: "asc" }, { order: "asc" }],
    select: { id: true, title: true, courseId: true },
  });

  // Group blocks by courseId
  const blocksByCourse: { [key: string]: { id: string; title: string }[] } = {};
  allBlocks.forEach((block) => {
    if (!blocksByCourse[block.courseId]) {
      blocksByCourse[block.courseId] = [];
    }
    blocksByCourse[block.courseId].push({ id: block.id, title: block.title });
  });

  // Fetch all instructors
  const instructors = await db.user.findMany({
    where: { role: "INSTRUCTOR", status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <TimetableClient
      classes={classes}
      courses={courses}
      blocks={blocksByCourse}
      instructors={instructors}
      canEdit={can(session.user.role, "courses.edit")}
    />
  );
}

