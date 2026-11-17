import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import CourseDetailClient from "./CourseDetailClient";
export const dynamic = "force-dynamic";

interface Props {
  params: { courseId: string };
}

export default async function CourseDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "content.approve")) redirect("/dashboard");

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    include: {
      tutor: { select: { id: true, name: true } },
      blocks: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, type: true, order: true },
          },
          _count: { select: { lessons: true } },
        },
      },
      _count: { select: { enrolments: true, blocks: true } },
    },
  });

  if (!course) notFound();

  return (
    <CourseDetailClient
      course={course}
      canEdit={can(session.user.role, "courses.edit")}
    />
  );
}
