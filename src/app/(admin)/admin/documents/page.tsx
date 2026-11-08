import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import PageHeader from "@/components/ui/PageHeader";
import DocumentsClient from "./DocumentsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Student Documents - Admin" };

export default async function AdminDocumentsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "student.documents.manage"))
    redirect("/403");

  // Fetch students for the dropdown
  const students = await db.user.findMany({
    where: { role: "STUDENT", status: { not: "SUSPENDED" } },
    select: { id: true, name: true, studentNumber: true },
    orderBy: { name: "asc" },
  });

  // Fetch existing documents
  const documents = await db.studentDocument.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, studentNumber: true } },
      uploadedBy: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Documents"
        subtitle="Upload and manage student academic and personal documents"
      />
      <DocumentsClient
        students={students.map((s) => ({
          id: s.id,
          name: s.name,
          studentNumber: s.studentNumber,
        }))}
        documents={documents.map((d) => ({
          id: d.id,
          title: d.title,
          type: d.type,
          fileName: d.fileName,
          mimeType: d.mimeType,
          fileSize: d.fileSize,
          createdAt: d.createdAt.toISOString(),
          user: {
            name: d.user.name,
            studentNumber: d.user.studentNumber,
          },
          uploadedBy: { name: d.uploadedBy.name },
        }))}
      />
    </div>
  );
}
