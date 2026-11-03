import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import CertificateIssueForm from "./CertificateIssueForm";
export const dynamic = "force-dynamic";


export const metadata = { title: "Certificates - Principal" };

interface Props {
  searchParams: { tab?: string; q?: string };
}

export default async function PrincipalCertificatesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "certificates.issue"))
    redirect("/403");

  const tab = searchParams.tab ?? "issued";
  const q = searchParams.q?.trim() ?? "";

  // Issued certificates
  const issued = await db.certificate.findMany({
    where: {
      revokedAt: null,
      ...(q ? { user: { name: { contains: q, mode: "insensitive" } } } : {}),
    },
    orderBy: { issuedAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, studentNumber: true } },
      course: { select: { title: true } },
    },
  });

  // Pending certificate issuance approvals
  const pendingApprovals = await db.approvalRequest.findMany({
    where: {
      type: "CERTIFICATE_ISSUANCE",
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      initiator: { select: { name: true } },
    },
  });

  // Students who have passed all exams but no certificate yet (candidates for issuance)
  const candidates = await db.user.findMany({
    where: {
      role: "STUDENT",
      status: "ACTIVE",
      certificates: { none: {} },
      examAttempts: {
        some: { passed: true },
      },
    },
    take: 30,
    include: {
      certificates: { select: { id: true } },
      enrolments: {
        include: { course: { select: { id: true, title: true, courseCode: true } } },
      },
    },
  });

  const TABS = [
    { value: "issued",    label: `Issued (${issued.length})` },
    { value: "pending",   label: `Pending Approval (${pendingApprovals.length})` },
    { value: "request",   label: "Request Issuance" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Certificates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage certificate issuance. Requests go to the Director for final approval.
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/principal/certificates?tab=${t.value}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium no-underline transition-colors ${
              tab === t.value
                ? "bg-primary text-white"
                : "text-gray-500 hover:bg-surface"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "issued" && (
        <>
          <form method="GET" className="flex gap-3 mb-4">
            <input name="tab" type="hidden" value="issued" />
            <input name="q" type="search" defaultValue={q} placeholder="Search by student name..." className="input max-w-xs" />
            <button type="submit" className="btn-primary text-sm">Search</button>
          </form>
          {issued.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">🎓</p>
              <p className="text-gray-500 text-sm">No certificates issued yet.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-border">
                    <th className="pb-2 font-medium pr-4">Student</th>
                    <th className="pb-2 font-medium pr-4">Course</th>
                    <th className="pb-2 font-medium pr-4">Certificate ID</th>
                    <th className="pb-2 font-medium">Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {issued.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 pr-4">
                        <p className="font-medium">{c.user.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{c.user.studentNumber ?? "-"}</p>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500 text-xs">{c.course.title}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{c.uniqueId}</td>
                      <td className="py-2.5 text-xs text-gray-400">
                        {new Date(c.issuedAt).toLocaleDateString("en-UG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "pending" && (
        <>
          {pendingApprovals.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-gray-500 text-sm">No pending certificate requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((r) => (
                <div key={r.id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="badge badge-warning text-xs">{r.status.replace(/_/g, " ")}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString("en-UG")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">Submitted by {r.initiator.name}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "request" && (
        <CertificateIssueForm
          candidates={candidates.map((c) => ({
            id: c.id,
            name: c.name,
            studentNumber: c.studentNumber,
            courses: c.enrolments.map((e) => ({
              id: e.course.id,
              title: e.course.title,
            })),
          }))}
        />
      )}
    </div>
  );
}
