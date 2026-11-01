import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Admissions - Principal" };

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED:    "badge-warning",
  UNDER_REVIEW: "badge-info",
  ACCEPTED:     "badge-success",
  REJECTED:     "badge-danger",
  WITHDRAWN:    "badge-danger",
};

interface Props {
  searchParams: { status?: string; page?: string };
}

export default async function PrincipalAdmissionsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "applications.process"))
    redirect("/403");

  const statusFilter = searchParams.status ?? "ALL";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 30;
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = {};
  if (statusFilter !== "ALL") where.status = statusFilter;

  const [applications, total, approvalsPending] = await Promise.all([
    db.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        course: { select: { id: true, title: true, courseCode: true } },
        intake: { select: { id: true, label: true } },
      },
    }),
    db.application.count({ where }),
    // Admission approval requests awaiting Principal
    db.approvalRequest.count({
      where: { type: "ADMISSION", status: { in: ["SUBMITTED", "IN_REVIEW"] } },
    }),
  ]);

  const totalPages = Math.ceil(total / take);

  const TABS = [
    { value: "SUBMITTED",    label: "New" },
    { value: "UNDER_REVIEW", label: "In Review" },
    { value: "ACCEPTED",     label: "Accepted" },
    { value: "REJECTED",     label: "Rejected" },
    { value: "ALL",          label: "All" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Admissions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Applications received and admission approvals
          </p>
        </div>
        {approvalsPending > 0 && (
          <Link
            href="/principal/approvals-inbox?status=PENDING"
            className="btn-primary text-sm no-underline"
          >
            {approvalsPending} admission{approvalsPending !== 1 ? "s" : ""} awaiting your approval
          </Link>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/principal/admissions?status=${t.value}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium no-underline transition-colors ${
              statusFilter === t.value
                ? "bg-primary text-white"
                : "text-gray-500 hover:bg-surface"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {applications.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3" aria-hidden="true">📭</p>
          <p className="text-gray-500 text-sm">No applications found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="card">
              <div className="flex items-start gap-4 justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-semibold text-base">{app.fullName}</h2>
                    <span className={`badge text-xs ${STATUS_BADGE[app.status] ?? "badge-info"}`}>
                      {app.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{app.email} &middot; {app.phone}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {app.course?.title ?? "No course"}{" "}
                    {app.intake?.label ? `(${app.intake.label})` : ""}
                    {" "}&middot; Applied {new Date(app.createdAt).toLocaleDateString("en-UG")}
                  </p>
                  {app.rejectionReason && (
                    <p className="text-xs text-danger mt-1 italic">Rejected: {app.rejectionReason}</p>
                  )}
                </div>
                {app.status === "ACCEPTED" && (
                  <span className="text-xs text-green-600 font-medium">Account created</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/principal/admissions?status=${statusFilter}&page=${page - 1}`}
                className="btn-outline text-xs px-3 py-1.5 no-underline"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/principal/admissions?status=${statusFilter}&page=${page + 1}`}
                className="btn-primary text-xs px-3 py-1.5 no-underline"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6">
        Admission approvals are actioned in{" "}
        <Link href="/principal/approvals-inbox" className="underline">
          Approvals Inbox
        </Link>
        . The Admin registers students from the Admissions tab in their dashboard.
      </p>
    </div>
  );
}
