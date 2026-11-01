import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Examinations - Principal" };

interface Props {
  searchParams: { tab?: string };
}

export default async function PrincipalExaminationsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "exams.release")) redirect("/403");

  const tab = searchParams.tab ?? "exams";

  const [exams, pendingResults, pendingPublicationApprovals] = await Promise.all([
    db.exam.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        course: { select: { title: true } },
        _count: { select: { attempts: true } },
      },
    }),
    db.examAttempt.count({ where: { status: "SUBMITTED" } }),
    db.approvalRequest.count({
      where: { type: "RESULTS_PUBLICATION", status: { in: ["SUBMITTED", "IN_REVIEW"] } },
    }),
  ]);

  const STATUS_BADGE: Record<string, string> = {
    DRAFT:     "badge-warning",
    PUBLISHED: "badge-success",
    ARCHIVED:  "badge-danger",
  };

  const TABS = [
    { value: "exams",   label: `All Exams (${exams.length})` },
    { value: "results", label: `Pending Results (${pendingResults})` },
    { value: "approvals", label: `Publication Approvals (${pendingPublicationApprovals})` },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Examinations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage exams and results across all programmes
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/principal/examinations?tab=${t.value}`}
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

      {tab === "exams" && (
        <>
          {exams.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">📝</p>
              <p className="text-gray-500 text-sm">No exams found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map((e) => (
                <div key={e.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-semibold text-sm">{e.title}</h2>
                        <span className={`badge text-xs ${STATUS_BADGE[e.status] ?? "badge-info"}`}>
                          {e.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{e.course.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Pass mark: {e.passPercent}% &middot; {e._count.attempts} attempts
                        {e.timeLimitMin ? ` &middot; ${e.timeLimitMin} min` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "results" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            {pendingResults} result{pendingResults !== 1 ? "s" : ""} submitted and awaiting release.
            Full results management is in{" "}
            <Link href="/principal/results" className="text-accent underline">Results &amp; Grading</Link>.
          </p>
          <Link href="/principal/results" className="btn-primary no-underline inline-block">
            Go to Results
          </Link>
        </div>
      )}

      {tab === "approvals" && (
        <div>
          {pendingPublicationApprovals === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-gray-500 text-sm">No results publication requests pending.</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                {pendingPublicationApprovals} results publication request{pendingPublicationApprovals !== 1 ? "s" : ""} awaiting action.
              </p>
              <Link
                href="/principal/approvals-inbox?status=PENDING"
                className="btn-primary no-underline inline-block"
              >
                Review in Approvals Inbox
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
