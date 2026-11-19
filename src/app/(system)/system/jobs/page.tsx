import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import JobsDashboard from "./JobsDashboard";

export const metadata = { title: "Scheduled Jobs - IT Admin" };
export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "health.view")) redirect("/login");

  const jobs = await db.jobDefinition.findMany({ orderBy: { label: "asc" } });
  const lastRuns = await Promise.all(
    jobs.map((j) =>
      db.jobRun.findFirst({ where: { jobKey: j.key }, orderBy: { startedAt: "desc" } })
    )
  );
  const recentFailures = await db.jobRun.findMany({
    where: { status: "FAILED", startedAt: { gte: new Date(Date.now() - 48 * 3600000) } },
    orderBy: { startedAt: "desc" },
    take: 10,
  });

  const jobsWithRuns = jobs.map((j, i) => ({
    ...j,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
    lastRun: lastRuns[i]
      ? {
          ...lastRuns[i],
          startedAt: lastRuns[i]!.startedAt.toISOString(),
          finishedAt: lastRuns[i]!.finishedAt?.toISOString() ?? null,
          createdAt: lastRuns[i]!.createdAt.toISOString(),
        }
      : null,
  }));

  const serializedFailures = recentFailures.map((r) => ({
    ...r,
    startedAt: r.startedAt.toISOString(),
    finishedAt: r.finishedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Scheduled Jobs</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          All background jobs with their last run status.
        </p>
      </div>
      <JobsDashboard jobs={jobsWithRuns} recentFailures={serializedFailures} />
    </div>
  );
}
