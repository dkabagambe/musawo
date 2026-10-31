import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "My Programmes - Student" };

export default async function MyProgrammesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id },
    include: {
      course: { select: { title: true, slug: true, thumbnailUrl: true, courseCode: true } },
      intake: { select: { label: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">My Programmes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {enrolments.length} enrolment{enrolments.length !== 1 ? "s" : ""}
        </p>
      </div>

      {enrolments.length === 0 ? (
        <div className="card py-16 text-center text-gray-400 text-sm">
          You are not enrolled in any programme yet.{" "}
          <Link href="/courses" className="text-accent underline">Browse courses</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {enrolments.map((e) => (
            <Link
              key={e.id}
              href={`/dashboard/enrolled/${e.id}`}
              className="card flex items-center gap-4 hover:border-accent transition-colors no-underline"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary truncate">{e.course.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {e.intake?.label ?? "No intake"} &middot;{" "}
                  <span className={`font-medium ${
                    e.status === "ACTIVE" || e.status === "COMPLETED"
                      ? "text-green-600"
                      : e.status === "OVERDUE"
                      ? "text-red-500"
                      : "text-yellow-600"
                  }`}>{e.status.replace(/_/g, " ")}</span>
                </p>
              </div>
              <span className="text-xs text-gray-400 shrink-0">View &rarr;</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
