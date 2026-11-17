import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import ForumModerationView from "./ForumModerationView";
export const dynamic = "force-dynamic";

export const metadata = { title: "Discussion Forum - Principal" };

interface Props {
  searchParams: { 
    courseId?: string;
    search?: string;
    filter?: string; // all, pinned, locked
  };
}

export default async function PrincipalForumPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "forum.moderate")) 
    redirect("/403");

  const { courseId, search, filter } = searchParams;

  // Fetch all courses for filter
  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { title: "asc" },
    select: { id: true, title: true, courseCode: true },
  });

  // Build query filters
  const whereClause: any = {};
  
  if (courseId) {
    whereClause.courseId = courseId;
  }

  if (filter === "pinned") {
    whereClause.pinned = true;
  } else if (filter === "locked") {
    whereClause.locked = true;
  }

  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
    ];
  }

  // Fetch threads
  const threads = await db.forumThread.findMany({
    where: whereClause,
    orderBy: [
      { pinned: "desc" },
      { updatedAt: "desc" },
    ],
    take: 50,
    include: {
      author: { 
        select: { 
          id: true,
          name: true, 
          role: true,
        } 
      },
      course: {
        select: {
          id: true,
          title: true,
          courseCode: true,
        },
      },
      _count: { 
        select: { 
          replies: {
            where: {
              deletedAt: null, // Only count non-deleted replies
            },
          },
        } 
      },
    },
  });

  // Count pinned and locked threads
  const pinnedCount = await db.forumThread.count({
    where: {
      pinned: true,
      ...(courseId ? { courseId } : {}),
    },
  });

  const lockedCount = await db.forumThread.count({
    where: {
      locked: true,
      ...(courseId ? { courseId } : {}),
    },
  });

  return (
    <ForumModerationView
      threads={threads}
      courses={courses}
      selectedCourseId={courseId || null}
      searchQuery={search || ""}
      filter={filter || "all"}
      pinnedCount={pinnedCount}
      lockedCount={lockedCount}
      canModerate={can(session.user.role, "forum.moderate")}
      userId={session.user.id}
    />
  );
}
