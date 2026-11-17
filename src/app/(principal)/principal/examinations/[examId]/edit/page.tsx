import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import ExamBuilder from "../../ExamBuilder";
export const dynamic = "force-dynamic";

export const metadata = { title: "Edit Exam - Principal" };

interface Props {
  params: { examId: string };
}

export default async function EditExamPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "exams.mark")) redirect("/403");

  const [exam, courses] = await Promise.all([
    db.exam.findUnique({
      where: { id: params.examId },
      include: {
        questions: {
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    db.course.findMany({
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
    }),
  ]);

  if (!exam) {
    notFound();
  }

  return (
    <ExamBuilder
      mode="edit"
      courses={courses}
      exam={exam}
      userId={session.user.id}
    />
  );
}
