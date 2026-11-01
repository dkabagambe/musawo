import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Student Documents - Admin" };

interface Props {
  searchParams: { q?: string; page?: string };
}

export default async function AdminDocumentsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "student.documents.manage")) redirect("/403");

  const q = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 25;
  const skip = (page - 1) * take;

  // StudentDocument model if it exists, otherwise show message
  // Check if model exists via try-catch
  let documents: Array<{
    id: string;
    type: string;
    fileUrl: string | null;
    createdAt: Date;
    student: { name: string; studentNumber: string | null };
  }> = [];
  let total = 0;

  try {
    const db2 = db as unknown as {
      studentDocument?: {
        findMany: (args: object) => Promise<typeof documents>;
        count: (args: object) => Promise<number>;
      };
    };
    if (db2.studentDocument) {
      const where: Record<string, unknown> = {};
      if (q) where.student = { name: { contains: q, mode: "insensitive" } };
      [documents, total] = await Promise.all([
        db2.studentDocument!.findMany({
          where,
          orderBy: { createdAt: "desc" } as object,
          take,
          skip,
          include: { student: { select: { name: true, studentNumber: true } } } as object,
        }),
        db2.studentDocument!.count({ where }),
      ]);
    }
  } catch {
    // Model doesn't exist yet
  }

  const totalPages = Math.ceil(total / take);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Student Documents</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload and manage student academic and personal documents
        </p>
      </div>

      <form method="GET" className="flex gap-3 mb-6">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by student name..."
          className="input max-w-xs"
        />
        <button type="submit" className="btn-primary text-sm">Search</button>
        {q && <a href="/admin/documents" className="btn-ghost text-sm no-underline">Clear</a>}
      </form>

      {documents.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📁</p>
          <p className="text-gray-500 text-sm">
            {q ? "No documents found matching your search." : "No student documents uploaded yet."}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Documents are uploaded from each student&apos;s profile in{" "}
            <Link href="/admin/students" className="text-accent underline">Students</Link>.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Student</th>
                <th className="pb-2 font-medium pr-4">Document Type</th>
                <th className="pb-2 font-medium pr-4">File</th>
                <th className="pb-2 font-medium">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documents.map((d) => (
                <tr key={d.id}>
                  <td className="py-2.5 pr-4">
                    <p className="font-medium">{d.student.name}</p>
                    <p className="text-xs font-mono text-gray-400">{d.student.studentNumber ?? "-"}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-sm">{d.type}</td>
                  <td className="py-2.5 pr-4">
                    {d.fileUrl ? (
                      <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent underline">
                        View
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">No file</span>
                    )}
                  </td>
                  <td className="py-2.5 text-xs text-gray-400">
                    {new Date(d.createdAt).toLocaleDateString("en-UG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
              <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`/admin/documents?q=${q}&page=${page - 1}`} className="btn-outline text-xs px-3 py-1.5 no-underline">Previous</Link>
                )}
                {page < totalPages && (
                  <Link href={`/admin/documents?q=${q}&page=${page + 1}`} className="btn-primary text-xs px-3 py-1.5 no-underline">Next</Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
