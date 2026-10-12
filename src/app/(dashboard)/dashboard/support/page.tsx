import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import NewTicketForm from "./NewTicketForm";

export const metadata = { title: "Support" };

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tickets = await db.supportTicket.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { replies: true } } },
    orderBy: { createdAt: "desc" },
  });

  const statusColour: Record<string, string> = {
    OPEN: "badge-warning",
    IN_PROGRESS: "badge-info",
    RESOLVED: "badge-success",
    CLOSED: "badge",
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl">Student Support</h1>
          <p className="text-sm text-gray-500 mt-1">
            Need help? Our team responds within 1 business day. You can also reach us on{" "}
            <a href="tel:+256700000000" className="text-accent">+256 700 000000</a>.
          </p>
        </div>
      </div>

      <NewTicketForm />

      {tickets.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">My support tickets</h2>
          <div className="space-y-3">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/support/${t.id}`}
                className="card flex items-center justify-between hover:shadow-md transition-shadow no-underline"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-primary">{t.subject}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(t.createdAt).toLocaleDateString("en-UG")} · {t._count.replies} replies
                  </p>
                </div>
                <span className={`badge text-xs ${statusColour[t.status] ?? "badge"} ml-3 flex-shrink-0`}>
                  {t.status.replace("_", " ")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
