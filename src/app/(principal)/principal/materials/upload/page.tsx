import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import UploadMaterialForm from "./UploadMaterialForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Upload Material - Principal" };

export default async function UploadMaterialPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "materials.upload"))
    redirect("/403");

  // Fetch all courses and their blocks
  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      courseCode: true,
      blocks: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
        },
      },
    },
  });

  return <UploadMaterialForm courses={courses} userId={session.user.id} />;
}
