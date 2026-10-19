import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import Link from "next/link";
import { FileSearch, Users, BarChart2, FileText, ChevronRight, Eye } from "lucide-react";

export const metadata = { title: "Auditor Overview" };

export default async function AuditorPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "audit.view")) redirect("/login");

  // Log every page view by the auditor
  await audit({
    actorId:    session.user.id,
    action:     "LOGIN", // closest available — VIEW not in enum; use LOGIN as a proxy for portal access
    entityType: "AuditorDashboard",
    entityId:   "overview",
    metadata:   { event: "auditor_dashboard_view", role: session.user.role },
  });

  const [
    totalStudents,
    activeEnrolments,
    totalPayments,
    recentAuditLogs,
    openTickets,
    totalCertificates,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.enrolment.count({ where: { status: { in: ["ACTIVE", "PARTIALLY_PAID"] } } }),
    db.payment.count({ where: { status: "COMPLETED" } }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { actor: { select: { name: true, role: true } } },
    }),
    db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.certificate.count(),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Auditor / Legal Advisor</h1>
          <p className="text-gray-500 text-sm mt-1">Read-only access — all views are logged</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 text-primary text-xs font-semibold px-3 py-2 rounded-xl">
          <Eye className="w-3.5 h-3.5" />
          View-only
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Total students",   value: totalStudents,     href: "/auditor/students", icon: Users },
          { label: "Active enrolments",value: activeEnrolments,  href: "/auditor/students", icon: FileSearch },
          { label: "Payments verified",value: totalPayments,     href: "/auditor/reports",  icon: BarChart2 },
          { label: "Certificates",     value: totalCertificates, href: "/auditor/reports",  icon: FileText },
          { label: "Open support",     value: openTickets,       href: "/auditor/reports",  icon: FileSearch },
        ].map(({ label, value, href, icon: Icon }) => (
          <Link key={label} href={href} className="card p-5 no-underline group hover:shadow-card-hover transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-primary group-hover:text-accent transition-colors">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent audit log */}
      <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-primary">Recent Audit Events</h2>
          <Link href="/auditor/audit" className="text-xs text-accent font-semibold no-underline hover:underline flex items-center gap-1">
            Full log <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {recentAuditLogs.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No audit events found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-4">Time</th>
                  <th className="pb-2 font-medium pr-4">Actor</th>
                  <th className="pb-2 font-medium pr-4">Action</th>
                  <th className="pb-2 font-medium">Entity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface/50">
                    <td className="py-2 pr-4 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-2 pr-4">
                      <p className="font-medium text-primary">{log.actor?.name ?? "System"}</p>
                      <p className="text-xs text-gray-400">{log.actor?.role?.replace(/_/g, " ") ?? ""}</p>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="text-xs font-mono bg-surface px-2 py-0.5 rounded text-gray-600">{log.action}</span>
                    </td>
                    <td className="py-2 text-xs text-gray-500">{log.entityType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <h2 className="font-bold text-primary mb-4">Quick Access</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/auditor/students"  className="btn-outline text-sm no-underline flex items-center gap-2"><Users className="w-4 h-4" /> Student records</Link>
          <Link href="/auditor/audit"     className="btn-outline text-sm no-underline flex items-center gap-2"><FileSearch className="w-4 h-4" /> Audit log</Link>
          <Link href="/auditor/reports"   className="btn-outline text-sm no-underline flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Reports</Link>
          <Link href="/auditor/policies"  className="btn-outline text-sm no-underline flex items-center gap-2"><FileText className="w-4 h-4" /> Policies</Link>
        </div>
      </section>
    </div>
  );
}
