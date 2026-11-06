import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const metadata = { title: "Student Documents - Admin" };

export default async function AdminDocumentsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "student.documents.manage"))
    redirect("/403");

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Student Documents</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload and manage student academic and personal documents
        </p>
      </div>

      <div className="card text-center py-16">
        <p className="text-3xl mb-3" aria-hidden="true">📁</p>
        <p className="text-gray-700 font-medium mb-1">
          Student Documents - Coming Soon
        </p>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          This feature is not yet available. Document upload will be added in a
          future update. Student ID scans and supporting files can currently be
          attached via each student&apos;s profile page.
        </p>
      </div>
    </div>
  );
}
