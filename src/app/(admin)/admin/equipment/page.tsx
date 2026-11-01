import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import PageHeader from "@/components/ui/PageHeader";
import EquipmentRequestForm from "./EquipmentRequestForm";

export const metadata = { title: "Equipment - Admin" };

export default async function AdminEquipmentPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "equipment.manage"))
    redirect("/403");

  // Load practical sessions with equipment, ordered by upcoming first
  const practicals = await db.practicalSession.findMany({
    orderBy: { startsAt: "asc" },
    take: 50,
    include: {
      venue: { select: { name: true } },
      equipment: {
        orderBy: { name: "asc" },
      },
    },
  });

  // Pending equipment approval requests submitted by Admin
  const pendingRequests = await db.approvalRequest.findMany({
    where: {
      type: "EQUIPMENT_REQUEST",
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
    <div className="max-w-5xl mx-auto space-y-8">
      <PageHeader
        title="Skills Lab Equipment"
        subtitle="Preparation checklist for practical sessions. Submit requests for Principal approval."
      />

      {/* Pending approval requests */}
      {pendingRequests.length > 0 && (
        <div className="card border-l-4 border-l-warning">
          <h2 className="font-semibold text-sm mb-3">Pending Equipment Requests</h2>
          <div className="space-y-2">
            {pendingRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <p className="text-gray-700 line-clamp-1">{r.reason}</p>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span className="badge badge-warning text-xs">
                    {r.status === "IN_REVIEW" ? "With Principal" : "Submitted"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString("en-UG")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit new request */}
      <div className="card">
        <h2 className="font-semibold text-base mb-4">Submit Equipment Request</h2>
        <p className="text-sm text-gray-500 mb-4">
          Prepare an equipment request for a practical session. The Principal will approve it before procurement.
        </p>
        <EquipmentRequestForm
          practicals={practicals.map((p) => ({
            id: p.id,
            title: p.title,
            venue: p.venue.name,
            startsAt: p.startsAt.toISOString(),
            equipment: p.equipment.map((e) => ({
              name: e.name,
              needed: e.needed,
              available: e.available,
              notes: e.notes,
            })),
          }))}
        />
      </div>

      {/* Equipment checklist per session */}
      {practicals.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-base mb-4">Current Checklists</h2>
          <div className="space-y-6">
            {practicals.map((p) => (
              <div key={p.id}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium text-sm">{p.title}</h3>
                  <span className="text-xs text-gray-400">
                    {p.venue.name} &middot; {new Date(p.startsAt).toLocaleString("en-UG")}
                  </span>
                </div>
                {p.equipment.length === 0 ? (
                  <p className="text-xs text-gray-400">No equipment items listed.</p>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-gray-400 border-b border-border">
                        <th className="pb-1 font-medium pr-4">Item</th>
                        <th className="pb-1 font-medium pr-4 text-center">Needed</th>
                        <th className="pb-1 font-medium pr-4 text-center">Available</th>
                        <th className="pb-1 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {p.equipment.map((item) => (
                        <tr key={item.id}>
                          <td className="py-1.5 pr-4 font-medium">{item.name}</td>
                          <td className="py-1.5 pr-4 text-center">{item.needed}</td>
                          <td className={`py-1.5 pr-4 text-center font-medium ${
                            item.available < item.needed ? "text-danger" : "text-green-600"
                          }`}>
                            {item.available}
                          </td>
                          <td className="py-1.5 text-gray-500">{item.notes ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {practicals.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3" aria-hidden="true">🔧</p>
          <p className="text-gray-500 text-sm">
            No practical sessions scheduled yet. Sessions are added in the Timetable.
          </p>
        </div>
      )}
    </div>
  );
}
