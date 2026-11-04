import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
export const dynamic = "force-dynamic";

export const metadata = { title: "Certificates - Registrar" };

interface Props {
  searchParams: { q?: string };
}

export default async function RegistrarCertificatesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "certificates.view")) redirect("/registrar");

  const q = searchParams.q?.trim() ?? "";

  const certificates = await db.certificate.findMany({
    where: {
      revokedAt: null,
      ...(q
        ? { user: { name: { contains: q, mode: "insensitive" } } }
        : {}),
    },
    orderBy: { issuedAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, studentNumber: true, email: true } },
      course: { select: { title: true, courseCode: true } },
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Certificate Register</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {certificates.length} active certificate{certificates.length !== 1 ? "s" : ""}
        </p>
      </div>

      <form method="GET" className="flex gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by student name..."
          className="input max-w-xs"
        />
        <button type="submit" className="btn-primary text-sm">Search</button>
        {q && (
          <a href="/registrar/certificates" className="btn-ghost text-sm no-underline">Clear</a>
        )}
      </form>

      <div className="card overflow-x-auto">
        {certificates.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            {q ? "No certificates match your search." : "No certificates issued yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Graduate</th>
                <th className="pb-2 font-medium pr-4">Student No.</th>
                <th className="pb-2 font-medium pr-4">Programme</th>
                <th className="pb-2 font-medium pr-4">Certificate No.</th>
                <th className="pb-2 font-medium">Issued</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {certificates.map((c) => (
                <tr key={c.id} className="hover:bg-surface/50 transition-colors">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-primary">{c.user.name}</p>
                    <p className="text-xs text-gray-400">{c.user.email ?? ""}</p>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">
                    {c.user.studentNumber ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    {c.course.title}
                    {c.course.courseCode && (
                      <span className="ml-1 font-mono text-gray-400">({c.course.courseCode})</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    <Link
                      href={`/verify/${c.uniqueId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-accent hover:underline"
                    >
                      {c.uniqueId}
                    </Link>
                  </td>
                  <td className="py-2.5 text-xs text-gray-400">
                    {new Date(c.issuedAt).toLocaleDateString("en-UG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
