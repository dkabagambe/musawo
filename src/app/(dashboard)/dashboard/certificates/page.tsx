import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Download, AlertCircle, CheckCircle2 } from "lucide-react";
export const dynamic = "force-dynamic";

export const metadata = { title: "My Certificates" };

export default async function MyCertificatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const certificates = await db.certificate.findMany({
    where: { userId: session.user.id, revokedAt: null },
    include: { course: { select: { title: true } } },
  });

  const enrolments = await db.enrolment.findMany({
    where: { userId: session.user.id, status: "COMPLETED" },
    include: { course: { select: { id: true, title: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Certificates</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {certificates.length} certificate{certificates.length !== 1 ? "s" : ""} earned
        </p>
      </div>

      {certificates.length === 0 && enrolments.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">No certificates yet.</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Complete all requirements for a course to earn your certificate.
          </p>
          <Link href="/dashboard/courses" className="text-blue-600 dark:text-blue-400 hover:underline inline-block">
            View My Courses
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Issued Certificates */}
          {certificates.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Issued Certificates</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <h3 className="font-semibold text-lg">{cert.course.title}</h3>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 mb-4">
                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Certificate ID</div>
                        <div className="font-mono text-sm font-medium">{cert.uniqueId}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Issued</div>
                        <div className="text-sm">{new Date(cert.issuedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = `/api/certificates/${cert.id}/download`;
                          link.click();
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </button>
                      <Link
                        href={`/verify/${cert.uniqueId}`}
                        target="_blank"
                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium transition-colors"
                      >
                        Verify Online
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Courses Without Certificates */}
          {enrolments.length > certificates.length && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Completed Courses</h2>
              <div className="space-y-4">
                {enrolments
                  .filter((e) => !certificates.some((c) => c.courseId === e.courseId))
                  .map((enr) => (
                    <div key={enr.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{enr.course.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Course completed. Certificate pending approval.</p>
                        </div>
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
