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

  let serialisedJobs: Array<{
    id: string;
    intakeLabel: string;
    status: string;
    totalSizeBytes: number;
    itemCount: number;
    confirmedAt: string | null;
    executeAfter: string | null;
    executedAt: string | null;
    createdAt: string;
    confirmedByName: string | null;
  }> = [];

  try {
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

    const usageData = usage;
    serialisedJobs = jobs.map((j) => ({
      ...j,
      totalSizeBytes: Number(j.totalSizeBytes),
      confirmedAt:    j.confirmedAt?.toISOString() ?? null,
      executeAfter:   j.executeAfter?.toISOString() ?? null,
      executedAt:     j.executedAt?.toISOString() ?? null,
      createdAt:      j.createdAt.toISOString(),
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
          usage={usageData}
          jobs={serialisedJobs}
          canManage={false}
        />
      </div>
    );
  } catch {
    // storage_cleanup_jobs table not yet migrated or DB error
    const usage = await getStorageUsageSummary().catch(() => null);

    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Storage</h1>
          <p className="text-sm text-gray-500 mt-1">
            Read-only view of platform storage and cleanup jobs.
            The Principal confirms cleanup; you are notified when a new job is created.
          </p>
        </div>

        {usage ? (
          <StorageDashboard usage={usage} jobs={[]} canManage={false} />
        ) : (
          <div className="card text-center py-12">
            <p className="text-3xl mb-3" aria-hidden="true">🗄️</p>
            <p className="text-gray-700 font-medium">Storage data unavailable</p>
            <p className="text-sm text-gray-500 mt-1">
              The storage cleanup table has not been migrated yet. Run{" "}
              <code className="font-mono text-xs bg-surface px-1.5 py-0.5 rounded">
                prisma migrate deploy
              </code>{" "}
              to enable this feature.
            </p>
          </div>
        )}
      </div>
    );
  }
}
