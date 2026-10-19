import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export const metadata = { title: "Graduands - Principal" };

export default async function PrincipalGraduandsPage() {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "graduands.approve")) redirect("/dashboard");

  const completedEnrolments = await db.enrolment.findMany({
    where: { status: "COMPLETED" },
    orderBy: { updatedAt: "desc" },
    include: {
      user:   { select: { name: true, studentNumber: true, email: true } },
      course: { select: { id: true, title: true } },
    },
  });

  const userCourseKeys = completedEnrolments.map((e) => ({ userId: e.userId, courseId: e.courseId }));
  const certificates = userCourseKeys.length > 0
    ? await db.certificate.findMany({
        where: { OR: userCourseKeys },
        select: { id: true, userId: true, courseId: true, issuedAt: true, revokedAt: true },
      })
    : [];

  const certMap = new Map(certificates.map((c) => [`${c.userId}:${c.courseId}`, c]));

  const awaiting = completedEnrolments.filter((e) => {
    const c = certMap.get(`${e.userId}:${e.courseId}`);
    return !c || !!c.revokedAt;
  });
  const issued = completedEnrolments.filter((e) => {
    const c = certMap.get(`${e.userId}:${e.courseId}`);
    return c && !c.revokedAt;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">Graduands</h1>
        <p className="text-sm text-gray-500 mt-1">
          {completedEnrolments.length} completed enrolment{completedEnrolments.length !== 1 ? "s" : ""} -{" "}
          {awaiting.length} awaiting certificate, {issued.length} issued
        </p>
      </div>

      {awaiting.length > 0 && (
        <section>
          <h2 className="font-semibold text-lg mb-3 text-amber-700">Awaiting certificate approval ({awaiting.length})</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-4">Student</th>
                  <th className="pb-2 font-medium pr-4">Course</th>
                  <th className="pb-2 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {awaiting.map((e) => (
                  <tr key={e.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-primary">{e.user.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{e.user.studentNumber ?? e.user.email}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-sm text-gray-600">{e.course.title}</td>
                    <td className="py-2.5 text-xs text-gray-400">
                      {new Date(e.updatedAt).toLocaleDateString("en-UG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {issued.length > 0 && (
        <section>
          <h2 className="font-semibold text-lg mb-3 text-success">Certificates issued ({issued.length})</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-border">
                  <th className="pb-2 font-medium pr-4">Student</th>
                  <th className="pb-2 font-medium pr-4">Course</th>
                  <th className="pb-2 font-medium">Issued</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {issued.map((e) => {
                  const cert = certMap.get(`${e.userId}:${e.courseId}`)!;
                  return (
                    <tr key={e.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium text-primary">{e.user.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{e.user.studentNumber ?? e.user.email}</p>
                      </td>
                      <td className="py-2.5 pr-4 text-sm text-gray-600">{e.course.title}</td>
                      <td className="py-2.5">
                        <a
                          href={`/verify/${cert.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-accent hover:underline font-mono"
                        >
                          {new Date(cert.issuedAt).toLocaleDateString("en-UG")}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {completedEnrolments.length === 0 && (
        <div className="card py-12 text-center">
          <p className="text-gray-400 text-sm">No completed enrolments yet.</p>
        </div>
      )}
    </div>
  );
}
