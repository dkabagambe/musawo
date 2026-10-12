import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: { in: ["ACTIVE", "COMPLETED"] } },
    select: { courseId: true },
  });
  const courseIds = enrolments.map((e) => e.courseId);

  const announcements = await db.announcement.findMany({
    where: {
      OR: [
        { courseId: { in: courseIds } },
        { courseId: null }, // site-wide
      ],
    },
    include: {
      author: { select: { name: true, role: true } },
      course: { select: { title: true } },
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6">Announcements</h1>

      {announcements.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-3xl mb-3" aria-hidden="true">📢</p>
          <p className="text-gray-500 text-sm">No announcements at the moment.</p>
        </div>
      )}

      <div className="space-y-4">
        {announcements.map((ann) => (
          <article
            key={ann.id}
            className={`card ${ann.pinned ? "border-accent/40 bg-accent/5" : ""}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5 flex-shrink-0" aria-hidden="true">
                {ann.pinned ? "📌" : "📢"}
              </span>
              <div className="flex-1 min-w-0">
                {ann.pinned && (
                  <p className="text-xs text-accent font-medium mb-1">Pinned</p>
                )}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="font-semibold text-sm">{ann.title}</h2>
                  {ann.course ? (
                    <span className="badge badge-info text-xs">
                      {ann.course.title}
                    </span>
                  ) : (
                    <span className="badge badge-warning text-xs">
                      Site-wide
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {ann.body}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {ann.author.name}
                  {ann.author.role === "TUTOR" && (
                    <span className="ml-1 badge badge-success text-xs">Tutor</span>
                  )}
                  {ann.author.role === "ADMIN" && (
                    <span className="ml-1 badge badge-info text-xs">Admin</span>
                  )}
                  {" · "}
                  {new Date(ann.createdAt).toLocaleDateString("en-UG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link href="/dashboard/forum" className="btn-outline no-underline text-sm">
          Go to Discussion Forum
        </Link>
      </div>
    </div>
  );
}
