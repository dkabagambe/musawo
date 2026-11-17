import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import SupportDesk from "./SupportDesk";
import AllTicketsView from "./AllTicketsView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support - Principal" };

interface Props {
  searchParams: { tab?: string };
}

export default async function PrincipalSupportPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "support.view")) redirect("/403");

  const tab = searchParams.tab ?? "all-tickets";

  // Fetch all institution tickets for Principal view
  const allTickets = tab === "all-tickets" ? await db.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      assignedUser: { select: { name: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { name: true } },
        },
      },
    },
  }) : [];

  const TABS = [
    { value: "all-tickets", label: "All Tickets" },
    { value: "my-tickets", label: "My Tickets" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-sm text-gray-500 mt-1">
          View all institutional support tickets, comment, and escalate to IT Admin
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/principal/support?tab=${t.value}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium no-underline transition-colors ${
              tab === t.value
                ? "bg-primary text-white"
                : "text-gray-500 hover:bg-surface"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "all-tickets" && (
        <AllTicketsView tickets={allTickets.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
          assignedTo: t.assignedUser ? { name: t.assignedUser.name } : null,
          replies: t.replies.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            author: { name: r.user.name },
          })),
        }))} />
      )}

      {tab === "my-tickets" && <SupportDesk />}
    </div>
  );
}
