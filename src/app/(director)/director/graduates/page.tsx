import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";


export const metadata = { title: "Graduates - Director" };

export default async function DirectorGraduatesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "certificates.view")) redirect("/login");

  const certificates = await db.certificate.findMany({
    where: { revokedAt: null },
    orderBy: { issuedAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, studentNumber: true } },
      course: { select: { title: true } },
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Graduates</h1>
        <p className="text-sm text-gray-500 mt-0.5">{certificates.length} certificate{certificates.length !== 1 ? "s" : ""} issued</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Graduate</th>
              <th className="pb-2 font-medium pr-4">Student No.</th>
              <th className="pb-2 font-medium pr-4">Programme</th>
              <th className="pb-2 font-medium pr-4">Cert. No.</th>
              <th className="pb-2 font-medium">Issued</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {certificates.map((c) => (
              <tr key={c.id} className="hover:bg-surface/40">
                <td className="py-2.5 pr-4 font-medium">{c.user.name}</td>
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">{c.user.studentNumber ?? "-"}</td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">{c.course.title}</td>
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-400">{c.uniqueId}</td>
                <td className="py-2.5 text-xs text-gray-400">
                  {new Date(c.issuedAt).toLocaleDateString("en-UG")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {certificates.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No certificates issued yet.</p>
        )}
      </div>
    </div>
  );
}
