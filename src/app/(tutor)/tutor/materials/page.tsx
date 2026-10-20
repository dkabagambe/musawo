import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import MaterialsManager from "./MaterialsManager";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { can } from "@/lib/rbac";

export const metadata = { title: "Materials - Tutor" };

export default async function TutorMaterialsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "content.upload")) redirect("/403");

  const courses = await db.course.findMany({
    where: { ...teachingCourseWhere(session.user.id), status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      slug: true,
      blocks: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              type: true,
              notesS3Key: true,
              bunnyVideoId: true,
              isFree: true,
              isFreePreview: true,
              durationSec: true,
            },
          },
        },
      },
    },
    orderBy: { title: "asc" },
  });

  return <MaterialsManager courses={courses} />;
}
