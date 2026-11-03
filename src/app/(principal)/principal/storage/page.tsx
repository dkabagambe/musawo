import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getStorageUsageSummary } from "@/lib/storage/retention";
import StorageDashboard from "@/components/storage/StorageDashboard";
export const dynamic = "force-dynamic";


export const metadata = { title: "Storage - Principal" };

export default async function PrincipalStoragePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "storage.manage")) {
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
        u.name AS "confirmedByName"
      FROM storage_cleanup_jobs j
      LEFT JOIN users u ON j."confirmedById" = u.id
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
          Monitor platform storage and manage end-of-intake cleanup.
          Notes and class presentations are cleared after confirmation and a {14}-day trash period.
          External recording links are only unlinked; no bytes are deleted from Google Meet or Drive.
        </p>
      </div>

      <StorageDashboard
        usage={usage}
        jobs={serialisedJobs}
        canManage={true}
      />
    </div>
  );
}
