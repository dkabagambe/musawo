import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";

export const metadata = { title: "Courses - Director" };

export default async function DirectorCoursesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "courses.view")) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Courses</h1>
        <p className="text-sm text-gray-500 mt-0.5">Course units across all academic programmes</p>
      </div>
      <div className="card py-16 text-center text-gray-400 text-sm">
        Course overview coming soon.
      </div>
    </div>
  );
}
