import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit Logs - Director" };

interface Props {
  searchParams: {
    action?:    string;
    role?:      string;
    user?:      string;
    entity?:    string;
    from?:      string;
    to?:        string;
    q?:         string;
    page?:      string;
  };
}

// Plain-language descriptions from the audit action + metadata
function describeAction(
  action: string,
  actor: { name: string; role: string } | null,
  entityType: string | null,
  entityId:   string | null,
  metadata:   Record<string, unknown> | null,
): string {
  const who  = actor?.name ?? "System";
  const role = actor?.role?.replace(/_/g, " ").toLowerCase() ?? "";
  const eid  = entityId ? entityId.slice(0, 8) : "";

  switch (action) {
    case "LOGIN":               return `${who} (${role}) signed in`;
    case "LOGOUT":              return `${who} signed out`;
    case "PAYMENT_CONFIRMED":   return `${who} confirmed a payment`;
    case "PAYMENT_REFUNDED":    return `${who} refunded a payment`;
    case "PAYMENT_REVERSED":    return `${who} reversed a payment`;
    case "PAYMENT_CLAIM_SUBMITTED": return `${who} submitted a manual payment claim`;
    case "PAYMENT_CLAIM_VERIFIED":  return `${who} verified a manual payment claim`;
    case "PAYMENT_CLAIM_REJECTED":  return `${who} rejected a manual payment claim`;
    case "ENROLMENT_CREATED":   return `${who} created an enrolment`;
    case "ENROLMENT_SUSPENDED": return `${who} suspended an enrolment`;
    case "CERTIFICATE_ISSUED":  return `${who} issued a certificate`;
    case "CERTIFICATE_REVOKED": return `${who} revoked a certificate`;
    case "EXAM_STARTED":        return `${who} started an exam`;
    case "EXAM_SUBMITTED":      return `${who} submitted an exam`;
    case "GRADE_RELEASED":      return `${who} released exam results`;
    case "GRADE_CHANGE_REQUESTED": return `${who} requested a mark change`;
    case "GRADE_CHANGE_APPROVED":  return `${who} approved a mark change`;
    case "APPROVAL_REQUESTED":  return `${who} submitted an approval request (${(metadata?.type as string ?? "").replace(/_/g, " ")})`;
    case "APPROVAL_FORWARDED":  return `${who} forwarded an approval request to the Director`;
    case "APPROVAL_APPROVED":   return `${who} approved a request (${(metadata?.type as string ?? "").replace(/_/g, " ")})`;
    case "APPROVAL_REJECTED":   return `${who} rejected a request (${(metadata?.type as string ?? "").replace(/_/g, " ")}${metadata?.sentBack ? ", sent back for changes" : ""})`;
    case "APPROVAL_APPLIED":    return `${who} applied approval (${(metadata?.type as string ?? "").replace(/_/g, " ")})`;
    case "ROLE_CHANGED":        return `${who}'s role was changed`;
    case "ACCOUNT_SUSPENDED":   return `${who} suspended an account`;
    case "BULK_EXPORT":         return `${who} exported ${(metadata?.type as string) ?? "data"} (${(metadata?.count as number) ?? "?"} rows)`;
    case "SETTINGS_CHANGED":    return `${who} changed system settings`;
    case "TOTP_ENABLED":        return `${who} enabled two-factor authentication`;
    case "TOTP_DISABLED":       return `${who} disabled two-factor authentication`;
    case "TOTP_RESET":          return `${who} reset two-factor authentication`;
    case "TOTP_BACKUP_USED":    return `${who} used a 2FA backup code`;
    case "ACCESS_REVIEW_COMPLETED": return `${who} completed the access review`;
    case "STUDENT_DOCUMENT_UPLOADED": return `${who} uploaded a student document`;
    case "STUDENT_DOCUMENT_DELETED":  return `${who} deleted a student document`;
    case "BREAK_GLASS_GRANTED": return `${who} was granted break-glass access`;
    case "BREAK_GLASS_EXPIRED": return `${who}'s break-glass access expired`;
    case "STATEMENT_IMPORTED":  return `${who} imported a bank statement`;
    case "RECONCILIATION_ALERT": return `Reconciliation alert triggered`;
    case "MESSAGE_MODERATION_VIEW": return `${who} viewed a conversation (safeguarding)`;
    case "ROLES_PERMISSIONS_VIEWED": return `${who} viewed the roles and permissions matrix`;
    case "CREATE":              return `${who} created a ${entityType ?? "record"} (${eid})`;
    case "UPDATE":              return `${who} updated a ${entityType ?? "record"} (${eid})`;
    case "DELETE":              return `${who} deleted a ${entityType ?? "record"} (${eid})`;
    default:                    return `${who} performed ${action.replace(/_/g, " ").toLowerCase()} on ${entityType ?? "unknown"}`;
  }
}

// Map entityType to a director drill-down link
function entityLink(
  entityType: string | null,
  entityId:   string | null,
  metadata:   Record<string, unknown> | null,
): string | null {
  if (!entityId) return null;
  switch (entityType) {
    case "User":            return `/director/students/${entityId}`;
    case "ApprovalRequest": return `/director/approvals/${entityId}`;
    case "Payment":         return `/director/finance/payments`;
    case "Certificate":     return `/director/certificates?tab=issued`;
    case "GradeEntry":      return `/director/examinations`;
    case "Exam":            return `/director/examinations`;
    case "Course":          return `/director/courses/${entityId}`;
    default:                return null;
  }
}

const SENSITIVE = new Set([
  "PAYMENT_CONFIRMED", "PAYMENT_REFUNDED", "CERTIFICATE_REVOKED",
  "ROLE_CHANGED", "ACCOUNT_SUSPENDED", "BREAK_GLASS_GRANTED",
  "BULK_EXPORT", "APPROVAL_APPROVED", "APPROVAL_REJECTED",
  "APPROVAL_APPLIED", "TOTP_RESET", "SETTINGS_CHANGED",
]);

const SECURITY_ACTIONS = new Set([
  "LOGIN", "LOGOUT", "TOTP_ENABLED", "TOTP_DISABLED", "TOTP_RESET",
  "TOTP_BACKUP_USED", "ROLE_CHANGED", "ACCOUNT_SUSPENDED",
  "BREAK_GLASS_GRANTED", "BREAK_GLASS_EXPIRED",
]);

export default async function DirectorAuditPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "audit.view.full")) redirect("/login");

  const page   = Math.max(1, Number(searchParams.page ?? 1));
  const take   = 50;
  const skip   = (page - 1) * take;

  const actionFilter = searchParams.action?.toUpperCase() ?? "";
  const roleFilter   = searchParams.role   ?? "";
  const userFilter   = searchParams.user?.trim() ?? "";
  const entityFilter = searchParams.entity ?? "";
  const q            = searchParams.q?.trim() ?? "";
  const fromDate     = searchParams.from ?? "";
  const toDate       = searchParams.to   ?? "";

  // Build where clause
  const where: Record<string, unknown> = {};
  if (actionFilter) where.action = actionFilter as never;
  if (entityFilter) where.entityType = entityFilter;
  if (fromDate || toDate) {
    const range: Record<string, Date> = {};
    if (fromDate) range.gte = new Date(fromDate);
    if (toDate)   range.lte = new Date(toDate + "T23:59:59Z");
    where.createdAt = range;
  }
  if (roleFilter || userFilter || q) {
    where.actor = {
      ...(roleFilter ? { role: roleFilter as never } : {}),
      ...(userFilter || q ? { name: { contains: userFilter || q, mode: "insensitive" } } : {}),
    };
  }

  const [logs, total, distinctActions, distinctEntities] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: { actor: { select: { name: true, role: true } } },
    }),
    db.auditLog.count({ where }),
    // For filter dropdowns
    db.auditLog.groupBy({ by: ["action"], _count: { _all: true } }).then(r => r.sort((a, b) => b._count._all - a._count._all)),
    db.auditLog.groupBy({ by: ["entityType"], where: { entityType: { not: null } }, _count: { _all: true } }),
  ]);

  const totalPages = Math.ceil(total / take);

  function qs(overrides: Record<string, string | number>) {
    const params = new URLSearchParams();
    if (actionFilter) params.set("action", actionFilter);
    if (roleFilter)   params.set("role",   roleFilter);
    if (userFilter)   params.set("user",   userFilter);
    if (entityFilter) params.set("entity", entityFilter);
    if (fromDate)     params.set("from",   fromDate);
    if (toDate)       params.set("to",     toDate);
    if (q)            params.set("q",      q);
    for (const [k, v] of Object.entries(overrides)) {
      if (String(v)) params.set(k, String(v));
      else params.delete(k);
    }
    return `/director/audit?${params.toString()}`;
  }

  const hasFilters = actionFilter || roleFilter || userFilter || entityFilter || fromDate || toDate || q;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} entries. Append-only. Director cannot edit or delete rows.
          </p>
        </div>
        <a
          href={`/api/director/export/audit?action=${actionFilter}&role=${roleFilter}&user=${encodeURIComponent(userFilter)}&entity=${entityFilter}&from=${fromDate}&to=${toDate}`}
          className="btn-secondary text-xs no-underline"
        >
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <form method="GET" className="grid sm:grid-cols-3 gap-3">
        <input
          name="q"
          defaultValue={q || userFilter}
          placeholder="Actor name..."
          className="input text-sm"
        />
        <select name="action" defaultValue={actionFilter} className="input text-sm">
          <option value="">All actions</option>
          {distinctActions.map((a) => (
            <option key={a.action} value={a.action}>
              {a.action.replace(/_/g, " ")} ({a._count._all})
            </option>
          ))}
        </select>
        <select name="role" defaultValue={roleFilter} className="input text-sm">
          <option value="">All roles</option>
          {["DIRECTOR","PRINCIPAL","ADMIN","INSTRUCTOR","STUDENT","SYSTEM_IT"].map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select name="entity" defaultValue={entityFilter} className="input text-sm">
          <option value="">All entity types</option>
          {distinctEntities
            .filter((e) => e.entityType)
            .map((e) => (
              <option key={e.entityType!} value={e.entityType!}>
                {e.entityType} ({e._count._all})
              </option>
            ))}
        </select>
        <input
          name="from"
          type="date"
          defaultValue={fromDate}
          className="input text-sm"
          placeholder="From date"
        />
        <input
          name="to"
          type="date"
          defaultValue={toDate}
          className="input text-sm"
          placeholder="To date"
        />
        <div className="flex gap-2">
          <button type="submit" className="btn-secondary text-sm flex-1">Filter</button>
          {hasFilters && (
            <Link href="/director/audit" className="btn-ghost text-sm no-underline px-3">Clear</Link>
          )}
        </div>
      </form>

      {/* Log table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-3 w-6/12">What happened</th>
              <th className="pb-2 font-medium pr-3">Entity</th>
              <th className="pb-2 font-medium pr-3">IP</th>
              <th className="pb-2 font-medium">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => {
              const meta = log.metadata as Record<string, unknown> | null;
              const desc = describeAction(
                log.action,
                log.actor,
                log.entityType,
                log.entityId,
                meta,
              );
              const link = entityLink(log.entityType, log.entityId, meta);
              const isSensitive = SENSITIVE.has(log.action);
              const isSecurity  = SECURITY_ACTIONS.has(log.action);
              return (
                <tr
                  key={log.id}
                  className={
                    isSensitive
                      ? "bg-warning/5 hover:bg-warning/10"
                      : isSecurity
                      ? "bg-blue-50/40 hover:bg-blue-50/60"
                      : "hover:bg-surface/40"
                  }
                >
                  <td className="py-2.5 pr-3">
                    <p className="text-xs text-gray-800">{desc}</p>
                    {isSensitive && (
                      <span className="badge text-xs badge-warning mt-0.5">Sensitive</span>
                    )}
                    {isSecurity && !isSensitive && (
                      <span className="badge text-xs badge-info mt-0.5">Security</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    {log.entityType && log.entityId ? (
                      link ? (
                        <Link
                          href={link}
                          className="text-xs font-mono text-primary hover:underline no-underline"
                        >
                          {log.entityType} {log.entityId.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-xs font-mono text-gray-400">
                          {log.entityType} {log.entityId.slice(0, 8)}
                        </span>
                      )
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-xs font-mono text-gray-400">
                    {log.ip ?? "-"}
                  </td>
                  <td className="py-2.5 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("en-UG", { timeZone: "Africa/Kampala" })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {logs.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No audit log entries match your filters.</p>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">
              Page {page} of {totalPages} ({total.toLocaleString()} entries)
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={qs({ page: page - 1 })} className="btn-outline text-xs px-3 py-1.5 no-underline">
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={qs({ page: page + 1 })} className="btn-primary text-xs px-3 py-1.5 no-underline">
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
