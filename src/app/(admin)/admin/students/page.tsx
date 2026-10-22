import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import PageHeader from "@/components/ui/PageHeader";
import StudentLookup from "./StudentLookup";

export const metadata = { title: "Students - Admin" };

export default async function AdminStudentsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.lookup"))
    redirect("/403");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Lookup"
        subtitle="Front desk records for calls and visits"
      />
      <StudentLookup />
    </div>
  );
}
