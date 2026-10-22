import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Reports - Admin" };

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.operational"))
    redirect("/403");

  const now = new Date();
  const [venues, bookings, practicals, openTickets] = await Promise.all([
    db.venue.count({ where: { active: true } }),
    db.venueBooking.count({
      where: { startsAt: { gte: now }, status: "CONFIRMED" },
    }),
    db.practicalSession.findMany({
      where: { startsAt: { gte: now } },
      include: { equipment: true },
    }),
    db.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
  ]);
  const needsEquipment = practicals.filter((session) =>
    session.equipment.some((item) => item.available < item.needed),
  ).length;
  const stats = [
    { label: "Active venues", value: venues },
    { label: "Upcoming room bookings", value: bookings },
    { label: "Upcoming practical sessions", value: practicals.length },
    { label: "Sessions needing equipment", value: needsEquipment },
    { label: "Open support tickets", value: openTickets },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="mb-6 text-2xl">Operational Reports</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <p className="text-2xl font-semibold text-primary">{stat.value}</p>
            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
