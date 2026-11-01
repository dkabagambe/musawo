import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Instructors - Principal" };

interface Props {
  searchParams: { q?: string };
}

export default async function PrincipalInstructorsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "staff.create.approve")) redirect("/403");

  const q = searchParams.q?.trim() ?? "";

  const instructors = await db.user.findMany({
    where: {
      role: "INSTRUCTOR",
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    include: {
      taughtCourses: {
        select: { id: true, title: true, status: true },
        where: { status: "PUBLISHED" },
      },
      liveClasses: {
        select: { id: true, title: true, scheduledAt: true, status: true },
        where: { status: { in: ["SCHEDULED", "LIVE"] } },
        orderBy: { scheduledAt: "asc" },
        take: 3,
      },
    },
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Instructors</h1>
        <p className="text-sm text-gray-500 mt-1">
          {instructors.length} instructor{instructors.length !== 1 ? "s" : ""}
        </p>
      </div>

      <form method="GET" className="flex gap-3 mb-6">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by name..."
          className="input max-w-xs"
        />
        <button type="submit" className="btn-primary text-sm">Search</button>
        {q && <a href="/principal/instructors" className="btn-ghost text-sm no-underline">Clear</a>}
      </form>

      {instructors.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">👩‍🏫</p>
          <p className="text-gray-500 text-sm">No instructors found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {instructors.map((i) => (
            <div key={i.id} className="card">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {i.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-semibold">{i.name}</h2>
                  <p className="text-xs text-gray-400">{i.email ?? "-"}</p>
                </div>
                <span className={`ml-auto badge text-xs flex-shrink-0 ${
                  i.status === "ACTIVE" ? "badge-success" : "badge-warning"
                }`}>
                  {i.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                {i.taughtCourses.length > 0 && (
                  <p>
                    <span className="font-medium">Courses: </span>
                    {i.taughtCourses.map((c) => c.title).join(", ")}
                  </p>
                )}
                {i.liveClasses.length > 0 && (
                  <p>
                    <span className="font-medium">Upcoming classes: </span>
                    {i.liveClasses
                      .map((c) => `${c.title} (${new Date(c.scheduledAt).toLocaleDateString("en-UG")})`)
                      .join(", ")}
                  </p>
                )}
                {i.taughtCourses.length === 0 && i.liveClasses.length === 0 && (
                  <p className="text-gray-400">No active courses or scheduled classes</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
