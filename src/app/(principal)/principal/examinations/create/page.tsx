import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import ExamBuilder from "../ExamBuilder";
export const dynamic = "force-dynamic";

export const metadata = { title: "Create Exam - Principal" };

export default async function CreateExamPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "exams.mark")) redirect("/403");

  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      courseCode: true,
      blocks: {
        select: {
          id: true,
          title: true,
          order: true,
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { title: "asc" },
  });

  return (
    <ExamBuilder
      mode="create"
      courses={courses}
      exam={null}
      userId={session.user.id}
    />
  );
}
