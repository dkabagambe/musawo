import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";

export const metadata = { title: "User Management - Principal" };

interface Props {
  searchParams: { role?: string; q?: string };
}

const ROLE_LABELS: Record<string, string> = {
  DIRECTOR:            "Director",
  PRINCIPAL:           "Principal",
  ADMIN:               "Admin",
  ACADEMIC_REGISTRAR:  "Academic Registrar",
  INSTRUCTOR:          "Instructor",
  STUDENT:             "Student",
  SYSTEM_IT:           "IT Admin",
};

const ROLE_BADGE: Record<string, string> = {
  DIRECTOR:   "bg-purple-100 text-purple-800",
  PRINCIPAL:  "bg-blue-100 text-blue-800",
  ADMIN:      "bg-amber-100 text-amber-800",
  INSTRUCTOR: "bg-green-100 text-green-800",
  STUDENT:    "bg-gray-100 text-gray-600",
  SYSTEM_IT:  "bg-slate-100 text-slate-700",
};

export default async function PrincipalUserManagementPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "staff.create.approve")) redirect("/403");

  const roleFilter = searchParams.role ?? "ALL";
  const q = searchParams.q?.trim() ?? "";

  const where: Record<string, unknown> = {
    ...(roleFilter !== "ALL" ? { role: roleFilter } : {}),
    ...(q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    } : {}),
  };

  const [users, counts] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { name: "asc" }],
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        studentNumber: true,
      },
    }),
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.role, c._count._all]));

  const roles = ["ALL", "DIRECTOR", "PRINCIPAL", "ADMIN", "INSTRUCTOR", "STUDENT", "SYSTEM_IT"];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">All accounts across the platform</p>
        </div>
      </div>

      {/* Role filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {roles.map((r) => (
          <Link
            key={r}
            href={`/principal/user-management?role=${r}${q ? `&q=${q}` : ""}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium no-underline transition-colors ${
              roleFilter === r
                ? "bg-primary text-white"
                : "bg-surface text-gray-500 hover:bg-border"
            }`}
          >
            {r === "ALL" ? "All" : (ROLE_LABELS[r] ?? r)}{" "}
            {r !== "ALL" && countMap[r] ? `(${countMap[r]})` : ""}
          </Link>
        ))}
      </div>

      <form method="GET" className="flex gap-3 mb-6">
        <input type="hidden" name="role" value={roleFilter} />
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search name or email..."
          className="input max-w-xs"
        />
        <button type="submit" className="btn-primary text-sm">Search</button>
        {q && (
          <Link href={`/principal/user-management?role=${roleFilter}`} className="btn-ghost text-sm no-underline">
            Clear
          </Link>
        )}
      </form>

      <div className="card overflow-x-auto">
        {users.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No users found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-border">
                <th className="pb-2 font-medium pr-4">Name</th>
                <th className="pb-2 font-medium pr-4">Email</th>
                <th className="pb-2 font-medium pr-4">Role</th>
                <th className="pb-2 font-medium pr-4">Status</th>
                <th className="pb-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface/50">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium">{u.name}</p>
                    {u.studentNumber && (
                      <p className="text-xs font-mono text-gray-400">{u.studentNumber}</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">{u.email ?? "-"}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`badge text-xs ${ROLE_BADGE[u.role] ?? "badge-info"}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    {u.status === "ACTIVE" ? (
                      <span className="badge badge-success text-xs">Active</span>
                    ) : u.status === "SUSPENDED" ? (
                      <span className="badge badge-danger text-xs">Suspended</span>
                    ) : (
                      <span className="badge badge-warning text-xs">
                        {u.status.replace(/_/g, " ")}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-xs text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString("en-UG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Role assignments for Director and Principal require Director approval.
        Staff accounts are managed from{" "}
        <Link href="/admin/invites" className="underline">Staff Invites</Link>.
      </p>
    </div>
  );
}
