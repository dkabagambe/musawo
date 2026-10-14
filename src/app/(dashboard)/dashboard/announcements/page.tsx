import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Megaphone, MessageSquare, Pin } from "lucide-react";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: { in: ["ACTIVE","COMPLETED"] } },
    select: { courseId: true },
  });
  const courseIds = enrolments.map((e) => e.courseId);

  const announcements = await db.announcement.findMany({
    where: { OR: [{ courseId: { in: courseIds } }, { courseId: null }] },
    include: { author: { select: { name: true, role: true } }, course: { select: { title: true } } },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  const ROLE_LABEL: Record<string, string> = {
    TUTOR: "Tutor", REGISTRAR: "Registrar", SUPERADMIN: "Director", BURSAR: "Bursar",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Announcements</h1>
        <p className="text-gray-500 text-sm mt-1">{announcements.length} announcement{announcements.length !== 1 ? "s" : ""}</p>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-7 h-7 text-primary/40" />
          </div>
          <h2 className="font-bold text-primary mb-2">No announcements</h2>
          <p className="text-gray-500 text-sm">Nothing to show at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <article key={ann.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${ann.pinned ? "border-accent/40" : "border-border"}`}>
              {ann.pinned && <div className="h-1 bg-accent" />}
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ann.pinned ? "bg-accent/10" : "bg-primary/10"}`}>
                    {ann.pinned ? <Pin className="w-5 h-5 text-accent" /> : <Megaphone className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {ann.pinned && (
                        <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Pinned</span>
                      )}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ann.course ? "bg-primary/10 text-primary" : "bg-surface text-gray-500"}`}>
                        {ann.course?.title ?? "Site-wide"}
                      </span>
                    </div>
                    <h2 className="font-bold text-primary text-sm leading-snug mb-2">{ann.title}</h2>
                    <p className="text-sm text-gray-600 leading-relaxed">{ann.body}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                      <span>{ann.author.name}</span>
                      {ROLE_LABEL[ann.author.role] && (
                        <span className="bg-surface px-2 py-0.5 rounded-full">{ROLE_LABEL[ann.author.role]}</span>
                      )}
                      <span>·</span>
                      <span>{new Date(ann.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="pt-2">
        <Link href="/dashboard/forum" className="inline-flex items-center gap-2 text-sm font-semibold text-primary border border-border bg-white px-5 py-2.5 rounded-xl no-underline hover:bg-surface transition-colors">
          <MessageSquare className="w-4 h-4" /> Go to Discussion Forum
        </Link>
      </div>
    </div>
  );
}
