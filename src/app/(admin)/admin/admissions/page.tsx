import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { getSetting } from "@/lib/settings";
import Link from "next/link";
import AdminAdmissionActions from "./AdminAdmissionActions";
export const dynamic = "force-dynamic";


export const metadata = { title: "Admissions - Admin" };

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED:    "badge-warning",
  UNDER_REVIEW: "badge-info",
  ACCEPTED:     "badge-success",
  REJECTED:     "badge-danger",
  WITHDRAWN:    "badge-danger",
};

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED:    "New",
  UNDER_REVIEW: "Under Review",
  ACCEPTED:     "Accepted",
  REJECTED:     "Rejected",
  WITHDRAWN:    "Withdrawn",
};

interface Props {
  searchParams: { status?: string; page?: string };
}

export default async function AdminAdmissionsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "applications.process"))
    redirect("/403");

  const statusFilter = searchParams.status ?? "SUBMITTED";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 30;
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = {};
  if (statusFilter !== "ALL") where.status = statusFilter;

  const [applications, total, counts, requireApprovalSetting] = await Promise.all([
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
    db.application.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    getSetting("policy.requireAdmissionApproval", "true"),
  ]);
  const requireApproval = requireApprovalSetting !== "false";

  const countMap = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all])
  );
  const totalPages = Math.ceil(total / take);

  const TABS = [
    { value: "SUBMITTED",    label: `New (${countMap.SUBMITTED ?? 0})` },
    { value: "UNDER_REVIEW", label: `In Review (${countMap.UNDER_REVIEW ?? 0})` },
    { value: "ACCEPTED",     label: `Accepted (${countMap.ACCEPTED ?? 0})` },
    { value: "REJECTED",     label: `Rejected (${countMap.REJECTED ?? 0})` },
    { value: "ALL",          label: "All" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Admissions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review applications and register admitted students
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/admissions?status=${t.value}`}
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
          <p className="text-gray-500 text-sm">
            No {statusFilter === "ALL" ? "" : statusFilter.toLowerCase()} applications found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="card">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-semibold text-base">{app.fullName}</h2>
                    <span className={`badge text-xs ${STATUS_BADGE[app.status] ?? "badge-info"}`}>
                      {STATUS_LABEL[app.status] ?? app.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{app.email} &middot; {app.phone}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {app.course?.title ?? "No course"}{" "}
                    {app.intake?.label ? `(${app.intake.label})` : ""}
                    {" "}&middot; Applied {new Date(app.createdAt).toLocaleDateString("en-UG")}
                  </p>
                  {app.howHeard && (
                    <p className="text-xs text-gray-400">Heard via: {app.howHeard}</p>
                  )}
                  {app.notes && (
                    <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">{app.notes}</p>
                  )}
                  {app.rejectionReason && (
                    <p className="text-xs text-danger mt-1">Reason: {app.rejectionReason}</p>
                  )}
                </div>
                {/* Action buttons - only for pending/reviewing */}
                {(app.status === "SUBMITTED" || app.status === "UNDER_REVIEW") && (
                  <AdminAdmissionActions
                    applicationId={app.id}
                    applicantName={app.fullName}
                    courseName={app.course?.title}
                    currentStatus={app.status}
                    requireApproval={requireApproval}
                  />
                )}
                {app.status === "ACCEPTED" && (
                  <span className="text-xs text-green-600 font-medium flex-shrink-0">
                    Account created
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <p className="text-xs text-gray-400">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/admissions?status=${statusFilter}&page=${page - 1}`}
                className="btn-outline text-xs px-3 py-1.5 no-underline"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/admissions?status=${statusFilter}&page=${page + 1}`}
                className="btn-primary text-xs px-3 py-1.5 no-underline"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
