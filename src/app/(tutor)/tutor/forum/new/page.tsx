import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import NewForumThreadForm from "./NewForumThreadForm";

export const metadata = { title: "New Thread - Forum" };

export default async function TutorForumNewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const courses = await db.course.findMany({
    where: teachingCourseWhere(session.user.id),
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">New Discussion Thread</h1>
        <p className="text-sm text-gray-500 mt-1">Start a discussion for your students</p>
      </div>
      <NewForumThreadForm courses={courses} />
    </div>
  );
}
