import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import StorageClearingForm from "./StorageClearingForm";
export const dynamic = "force-dynamic";

export const metadata = { title: "Storage Clearing - Admin" };

export default async function AdminStoragePage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "storage.manage"))
    redirect("/403");

  // Get closed intakes that may have storage to clear
  const closedIntakes = await db.intake.findMany({
    where: { status: "CLOSED" },
    orderBy: { endDate: "desc" },
    take: 10,
    include: {
      course: { select: { title: true, code: true } },
      _count: { select: { enrolments: true } },
    },
  });

  // Get pending clearing requests
  const pendingRequests = await db.approvalRequest.findMany({
    where: {
      type: "STORAGE_CLEARING",
      initiatorId: session.user.id,
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      reviewer: { select: { name: true } },
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Storage Clearing</h1>
        <p className="text-sm text-gray-500 mt-1">
          Prepare previous-semester clearing lists for Principal confirmation
        </p>
      </div>

      {/* Info card */}
      <div className="card bg-info/10 border border-info/30">
        <div className="flex gap-3">
          <span className="text-2xl" aria-hidden="true">
            📦
          </span>
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-2">Storage Clearing Process</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Select a closed intake (semester)</li>
              <li>System calculates storage used (recordings, notes, files)</li>
              <li>Review clearing list with sizes</li>
              <li>Submit to Principal for confirmation</li>
              <li>Once approved, storage is marked for deletion</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Pending clearing requests */}
      {pendingRequests.length > 0 && (
        <div className="card border-l-4 border-l-warning">
          <h2 className="font-semibold text-base mb-3">
            Pending Clearing Requests
          </h2>
          <div className="space-y-2">
            {pendingRequests.map((r) => {
              const lines = r.reason.split("\n");
              const intake = lines.find((l) => l.startsWith("Intake:"))?.replace("Intake: ", "") ?? "";
              const totalSize = lines.find((l) => l.includes("Total size:")) ?? "";
              
              return (
                <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium">{intake}</p>
                    <p className="text-xs text-gray-500">{totalSize}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="badge badge-warning text-xs">
                      {r.status === "IN_REVIEW" ? "With Principal" : "Submitted"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString("en-UG")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit new clearing request */}
      <div className="card">
        <h2 className="font-semibold text-base mb-4">Submit Clearing Request</h2>
        {closedIntakes.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-3xl mb-3" aria-hidden="true">
              ✅
            </p>
            <p className="text-gray-500 text-sm">
              No closed intakes available for clearing.
            </p>
          </div>
        ) : (
          <StorageClearingForm
            intakes={closedIntakes.map((i) => ({
              id: i.id,
              name: `${i.course.code} ${i.course.title} - ${i.name}`,
              endDate: i.endDate.toISOString(),
              studentCount: i._count.enrolments,
            }))}
          />
        )}
      </div>

      {/* Information about what gets cleared */}
      <div className="card">
        <h2 className="font-semibold text-base mb-3">What Gets Cleared</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Included:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Live class recordings</li>
              <li>Session notes and materials</li>
              <li>Temporary upload files</li>
              <li>Cached content</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Preserved:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Student records and grades</li>
              <li>Submitted assignments</li>
              <li>Certificates and credentials</li>
              <li>Audit logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
