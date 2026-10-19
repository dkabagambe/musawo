import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "Applications - Registrar" };

interface Props {
  searchParams: { q?: string; status?: string; page?: string };
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  SUBMITTED:    { label: "Submitted",    cls: "badge-info" },
  UNDER_REVIEW: { label: "Under review", cls: "badge-warning" },
  ACCEPTED:     { label: "Accepted",     cls: "badge-success" },
  REJECTED:     { label: "Rejected",     cls: "badge-danger" },
  WITHDRAWN:    { label: "Withdrawn",    cls: "bg-gray-100 text-gray-500" },
};

export default async function RegistrarApplicationsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "applications.view")) redirect("/dashboard");

  const q = searchParams.q?.trim() ?? "";
  const statusFilter = searchParams.status ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 25;
  const skip = (page - 1) * take;

  const where = {
    ...(statusFilter ? { status: statusFilter as never } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { email:    { contains: q, mode: "insensitive" as const } },
            { phone:    { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [applications, total, pending] = await Promise.all([
    db.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        course:  { select: { title: true, slug: true } },
        intake:  { select: { label: true } },
      },
    }),
    db.application.count({ where }),
    db.application.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
  ]);

  const totalPages = Math.ceil(total / take);
  const buildHref = (overrides: Record<string, string>) => {
    const p = new URLSearchParams({ q, status: statusFilter, page: "1", ...overrides });
    return `/registrar/applications?${p.toString()}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Applications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} total
            {pending > 0 && (
              <span className="ml-2 badge badge-warning text-xs">{pending} pending review</span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search name, email, phone…"
          className="input max-w-xs"
        />
        <select name="status" defaultValue={statusFilter} className="input w-auto text-sm">
          <option value="">All statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
          <option value="WITHDRAWN">Withdrawn</option>
        </select>
        <button type="submit" className="btn-primary text-sm">Search</button>
        {(q || statusFilter) && (
          <Link href="/registrar/applications" className="btn-ghost text-sm no-underline">
            Clear
          </Link>
        )}
      </form>

      {/* Quick filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "All",          value: "" },
          { label: "Pending",      value: "SUBMITTED" },
          { label: "Under review", value: "UNDER_REVIEW" },
          { label: "Accepted",     value: "ACCEPTED" },
          { label: "Rejected",     value: "REJECTED" },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={buildHref({ status: tab.value })}
            className={`text-xs px-3 py-1.5 rounded-full border no-underline transition-colors ${
              statusFilter === tab.value
                ? "bg-primary text-white border-primary"
                : "border-border text-gray-500 hover:border-primary hover:text-primary"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        {applications.length === 0 ? (
          <p className="text-gray-400 text-sm py-10 text-center">No applications found.</p>
        ) : (
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Applicant</th>
                <th className="pb-2 font-medium pr-4">Course</th>
                <th className="pb-2 font-medium pr-4">Intake</th>
                <th className="pb-2 font-medium pr-4">Category</th>
                <th className="pb-2 font-medium pr-4">Status</th>
                <th className="pb-2 font-medium pr-4">Applied</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {applications.map((app) => {
                const st = STATUS_LABELS[app.status] ?? { label: app.status, cls: "badge-info" };
                return (
                  <tr key={app.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-primary">{app.fullName}</p>
                      <p className="text-xs text-gray-400">{app.email}</p>
                      <p className="text-xs text-gray-400">{app.phone}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600 text-xs max-w-[160px]">
                      {app.course?.title ?? "-"}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-400">
                      {app.intake?.label ?? "-"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        app.category === "PROFESSIONAL"
                          ? "bg-accent/10 text-accent"
                          : "bg-surface text-gray-500"
                      }`}>
                        {app.category === "PROFESSIONAL" ? "Professional" : "Open"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`badge text-xs ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-400">
                      {new Date(app.createdAt).toLocaleDateString("en-UG")}
                    </td>
                    <td className="py-2.5">
                      <Link
                        href={`/registrar/applications/${app.id}`}
                        className="text-xs text-accent no-underline hover:underline"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">
              Page {page} of {totalPages} ({total} applications)
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildHref({ page: String(page - 1) })}
                  className="btn-outline text-xs px-3 py-1.5 no-underline"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildHref({ page: String(page + 1) })}
                  className="btn-primary text-xs px-3 py-1.5 no-underline"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
