import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getStorageUsageSummary } from "@/lib/storage/retention";
import StorageDashboard from "@/components/storage/StorageDashboard";
export const dynamic = "force-dynamic";


export const metadata = { title: "Storage - Director" };

export default async function DirectorStoragePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "storage.view")) {
    redirect("/403");
  }

  const [usage, jobs] = await Promise.all([
    getStorageUsageSummary(),
    db.$queryRaw<
      Array<{
        id: string;
        intakeLabel: string;
        status: string;
        totalSizeBytes: bigint;
        itemCount: number;
        confirmedAt: Date | null;
        executeAfter: Date | null;
        executedAt: Date | null;
        createdAt: Date;
        confirmedByName: string | null;
      }>
    >`
      SELECT
        j.id,
        j."intakeLabel",
        j.status,
        j."totalSizeBytes",
        jsonb_array_length(j."itemsJson") AS "itemCount",
        j."confirmedAt",
        j."executeAfter",
        j."executedAt",
        j."createdAt",
        j."confirmedBy" AS "confirmedByName"
      FROM storage_cleanup_jobs j
      ORDER BY j."createdAt" DESC
      LIMIT 50
    `,
  ]);

  const serialisedJobs = jobs.map((j) => ({
    ...j,
    totalSizeBytes: Number(j.totalSizeBytes),
    confirmedAt: j.confirmedAt?.toISOString() ?? null,
    executeAfter: j.executeAfter?.toISOString() ?? null,
    executedAt: j.executedAt?.toISOString() ?? null,
    createdAt: j.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Storage</h1>
        <p className="text-sm text-gray-500 mt-1">
          Read-only view of platform storage and cleanup jobs.
          The Principal confirms cleanup; you are notified when a new job is created.
        </p>
      </div>

      <StorageDashboard
        usage={usage}
        jobs={serialisedJobs}
        canManage={false}
      />
    </div>
  );
}
