import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import MaterialsView from "./MaterialsView";
export const dynamic = "force-dynamic";

export const metadata = { title: "Learning Materials - Principal" };

interface Props {
  searchParams: { 
    courseId?: string; 
    search?: string;
    status?: string; // active, archived
    type?: string; // VIDEO, NOTES, QUIZ
  };
}

export default async function PrincipalMaterialsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "materials.view")) 
    redirect("/403");

  const { courseId, search, status, type } = searchParams;

  // Fetch all courses for filter
  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { title: "asc" },
    select: { id: true, title: true, courseCode: true },
  });

  // Build query filters
  const whereClause: any = {};
  
  if (courseId) {
    whereClause.block = { courseId };
  }

  if (status === "archived") {
    whereClause.archivedAt = { not: null };
  } else {
    whereClause.archivedAt = null;
  }

  if (type) {
    whereClause.type = type;
  }

  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { transcript: { contains: search, mode: "insensitive" } },
    ];
  }

  // Fetch materials (lessons)
  const materials = await db.lesson.findMany({
    where: whereClause,
    orderBy: [
      { block: { order: "asc" } },
      { order: "asc" },
    ],
    include: {
      block: {
        select: {
          id: true,
          title: true,
          course: {
            select: {
              id: true,
              title: true,
              courseCode: true,
            },
          },
        },
      },
      _count: {
        select: {
          progress: true,
        },
      },
    },
    take: 200,
  });

  // Count archived materials
  const archivedCount = await db.lesson.count({
    where: {
      archivedAt: { not: null },
      ...(courseId ? { block: { courseId } } : {}),
    },
  });

  return (
    <MaterialsView
      materials={materials}
      courses={courses}
      selectedCourseId={courseId || null}
      searchQuery={search || ""}
      statusFilter={status || "active"}
      typeFilter={type || ""}
      archivedCount={archivedCount}
      canUpload={can(session.user.role, "materials.upload")}
      canArchive={can(session.user.role, "materials.manage")}
      userId={session.user.id}
    />
  );
}
