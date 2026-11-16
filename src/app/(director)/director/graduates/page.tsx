import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Graduates - Director" };

interface Props {
  searchParams: {
    q?: string;
    course?: string;
    year?: string;
    revoked?: string;
    page?: string;
  };
}

export default async function DirectorGraduatesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "graduates.view")) redirect("/login");

  const q       = searchParams.q?.trim() ?? "";
  const course  = searchParams.course ?? "";
  const year    = searchParams.year ?? "";
  const revoked = searchParams.revoked === "1";
  const page    = Math.max(1, Number(searchParams.page ?? 1));
  const take    = 40;
  const skip    = (page - 1) * take;

  const certWhere: Record<string, unknown> = {
    revokedAt: revoked ? { not: null } : null,
  };
  if (course) certWhere.courseId = course;
  if (year)   certWhere.issuedAt = {
    gte: new Date(`${year}-01-01`),
    lt:  new Date(`${Number(year) + 1}-01-01`),
  };
  if (q) certWhere.user = { name: { contains: q, mode: "insensitive" } };

  const [certs, total, allCourses, yearStats] = await Promise.all([
    db.certificate.findMany({
      where:   certWhere,
      orderBy: revoked ? { revokedAt: "desc" } : { issuedAt: "desc" },
      take,
      skip,
      select: {
        id: true, uniqueId: true, issuedAt: true,
        revokedAt: true, revokedReason: true,
        user:   { select: { id: true, name: true, studentNumber: true, email: true, phone: true } },
        course: { select: { id: true, title: true, courseCode: true } },
      },
    }),
    db.certificate.count({ where: certWhere }),
    db.course.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    // Graduation counts by year
    db.$queryRaw<{ yr: number; cnt: bigint }[]>`
      SELECT EXTRACT(YEAR FROM "issuedAt")::int AS yr, COUNT(*)::bigint AS cnt
      FROM certificates
      WHERE "revokedAt" IS NULL
      GROUP BY yr
      ORDER BY yr DESC
      LIMIT 10
    `,
  ]);

  const totalPages = Math.ceil(total / take);

  // Available years from the stats
  const availableYears = yearStats.map((r) => r.yr);

  function qs(overrides: Record<string, string | number>) {
    const params = new URLSearchParams();
    if (q)      params.set("q",      q);
    if (course) params.set("course", course);
    if (year)   params.set("year",   year);
    if (revoked) params.set("revoked", "1");
    for (const [k, v] of Object.entries(overrides)) {
      const sv = String(v);
      if (sv) params.set(k, sv); else params.delete(k);
    }
    return `/director/graduates?${params.toString()}`;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Graduates</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} {revoked ? "revoked" : "issued"} certificate{total !== 1 ? "s" : ""}
          </p>
        </div>
        <a
          href={`/api/director/export/graduates?${new URLSearchParams({ q, course, year, revoked: revoked ? "1" : "" }).toString()}`}
          className="btn-secondary text-xs no-underline"
        >
          Export CSV
        </a>
      </div>

      {/* Year breakdown */}
      {yearStats.length > 0 && !revoked && (
        <div className="flex flex-wrap gap-3">
          {yearStats.map((r) => (
            <Link
              key={r.yr}
              href={qs({ year: r.yr, page: 1 })}
              className={`text-xs px-3 py-1.5 rounded-full no-underline ${
                year === String(r.yr)
                  ? "bg-primary text-white"
                  : "bg-surface text-gray-500 hover:bg-primary/10"
              }`}
            >
              {r.yr}: {Number(r.cnt)} graduate{Number(r.cnt) !== 1 ? "s" : ""}
            </Link>
          ))}
        </div>
      )}

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search graduate name..."
          className="input text-sm max-w-xs"
        />
        <select name="course" defaultValue={course} className="input text-sm max-w-xs">
          <option value="">All programmes</option>
          {allCourses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <select name="year" defaultValue={year} className="input text-sm">
          <option value="">All years</option>
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            name="revoked"
            value="1"
            defaultChecked={revoked}
            className="rounded"
          />
          Show revoked only
        </label>
        <button type="submit" className="btn-secondary text-sm">Filter</button>
        {(q || course || year || revoked) && (
          <Link href="/director/graduates" className="btn-ghost text-sm no-underline">Clear</Link>
        )}
      </form>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-border">
              <th className="pb-2 font-medium pr-4">Graduate</th>
              <th className="pb-2 font-medium pr-4">Student No.</th>
              <th className="pb-2 font-medium pr-4">Programme</th>
              <th className="pb-2 font-medium pr-4">Certificate No.</th>
              <th className="pb-2 font-medium pr-4">{revoked ? "Revoked" : "Issued"}</th>
              {revoked && <th className="pb-2 font-medium">Reason</th>}
              {!revoked && <th className="pb-2 font-medium">Verify</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {certs.map((c) => (
              <tr key={c.id} className="hover:bg-surface/40">
                <td className="py-2.5 pr-4">
                  <Link
                    href={`/director/students/${c.user.id}`}
                    className="font-medium text-primary hover:underline no-underline"
                  >
                    {c.user.name}
                  </Link>
                </td>
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">
                  {c.user.studentNumber ?? "-"}
                </td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">{c.course.title}</td>
                <td className="py-2.5 pr-4 font-mono text-xs">{c.uniqueId}</td>
                <td className="py-2.5 pr-4 text-xs text-gray-400">
                  {revoked && c.revokedAt
                    ? new Date(c.revokedAt).toLocaleDateString("en-UG")
                    : new Date(c.issuedAt).toLocaleDateString("en-UG")}
                </td>
                {revoked && (
                  <td className="py-2.5 text-xs text-danger">{c.revokedReason ?? "-"}</td>
                )}
                {!revoked && (
                  <td className="py-2.5">
                    <Link
                      href={`/verify/${c.uniqueId}`}
                      className="text-xs text-accent hover:underline no-underline"
                      prefetch={false}
                    >
                      Verify
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {certs.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No graduates found.</p>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={qs({ page: page - 1 })} className="btn-outline text-xs px-3 py-1.5 no-underline">Previous</Link>
              )}
              {page < totalPages && (
                <Link href={qs({ page: page + 1 })} className="btn-primary text-xs px-3 py-1.5 no-underline">Next</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
