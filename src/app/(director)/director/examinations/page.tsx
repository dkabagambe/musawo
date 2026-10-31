import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";

export const metadata = { title: "Examinations & Results - Director" };

export default async function DirectorExaminationsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "grades.view")) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Examinations & Results</h1>
        <p className="text-sm text-gray-500 mt-0.5">Read-only overview of exams and released results</p>
      </div>
      <div className="card py-16 text-center text-gray-400 text-sm">
        Examination overview coming soon.
      </div>
    </div>
  );
}
