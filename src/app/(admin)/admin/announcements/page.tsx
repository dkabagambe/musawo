import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
export const dynamic = "force-dynamic";


export const metadata = { title: "Announcements - Admin" };

export default async function AdminAnnouncementsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "announcements.manage"))
    redirect("/admin");

  const announcements = await db.announcement.findMany({
    where: {
      OR: [
        { courseId: null }, // institution-wide
        { authorId: session.user.id }, // own announcements
      ],
    },
    include: {
      author: { select: { name: true, role: true } },
      course: { select: { title: true } },
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  const roleLabels: Record<string, string> = {
    DIRECTOR: "Director",
    PRINCIPAL: "Principal",
    ADMIN: "Admin",
    INSTRUCTOR: "Instructor",
    SYSTEM_IT: "IT Admin",
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="text-sm text-gray-500 mt-1">
          Administrative announcements. Institution-wide announcements require Principal approval.
        </p>
      </div>

      {announcements.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📢</p>
          <p className="text-gray-500 text-sm">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`card ${a.pinned ? "border-l-4 border-l-primary" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {a.pinned && (
                      <span className="badge badge-accent text-xs">Pinned</span>
                    )}
                    <p className="font-semibold text-sm">{a.title}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                    {a.body}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">
                      {a.author?.name ?? "Unknown"} ({roleLabels[a.author?.role ?? ""] ?? a.author?.role ?? "?"})
                    </span>
                    {a.course && (
                      <span className="text-xs text-gray-400">
                        {a.course.title}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(a.createdAt).toLocaleDateString("en-UG")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
