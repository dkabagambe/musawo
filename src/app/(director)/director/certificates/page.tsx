import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Certificates - Director" };

export default async function DirectorCertificatesPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "certificates.view")) redirect("/login");

  const [active, revoked] = await Promise.all([
    db.certificate.findMany({
      where: { revokedAt: null },
      orderBy: { issuedAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, studentNumber: true } },
        course: { select: { title: true } },
      },
    }),
    db.certificate.findMany({
      where: { revokedAt: { not: null } },
      orderBy: { revokedAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true, studentNumber: true } },
        course: { select: { title: true } },
      },
    }),
  ]);

  const total = active.length + revoked.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Certificate Register</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {total} certificate{total !== 1 ? "s" : ""} ({active.length} active, {revoked.length} revoked)
        </p>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="text-sm font-semibold text-gray-700 px-4 pt-4 mb-2">Active certificates</h2>
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
            {active.map((c) => (
              <tr key={c.id} className="hover:bg-surface/40">
                <td className="py-2.5 pr-4 font-medium">{c.user.name}</td>
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">{c.user.studentNumber ?? "-"}</td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">{c.course.title}</td>
                <td className="py-2.5 pr-4 font-mono text-xs">
                  <Link href={`/verify/${c.uniqueId}`} className="text-accent hover:underline" prefetch={false}>
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
        {active.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No active certificates.</p>
        )}
      </div>

      {revoked.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="text-sm font-semibold text-red-600 px-4 pt-4 mb-2">Revoked certificates</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Graduate</th>
                <th className="pb-2 font-medium pr-4">Programme</th>
                <th className="pb-2 font-medium pr-4">Cert. No.</th>
                <th className="pb-2 font-medium pr-4">Reason</th>
                <th className="pb-2 font-medium">Revoked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {revoked.map((c) => (
                <tr key={c.id} className="hover:bg-surface/40">
                  <td className="py-2.5 pr-4 font-medium">{c.user.name}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">{c.course.title}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-gray-400">{c.uniqueId}</td>
                  <td className="py-2.5 pr-4 text-xs text-red-500">{c.revokedReason ?? "-"}</td>
                  <td className="py-2.5 text-xs text-gray-400">
                    {c.revokedAt ? new Date(c.revokedAt).toLocaleDateString("en-UG") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
