import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "My Certificates" };

export default async function CertificatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const certificates = await db.certificate.findMany({
    where: { userId: session.user.id },
    include: {
      course: { select: { title: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl mb-6">My Certificates</h1>

      {certificates.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-4xl mb-3" aria-hidden="true">🎓</p>
          <p className="text-gray-500 text-sm">
            No certificates yet. Complete a course to earn your certificate.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {certificates.map((cert) => (
          <div
            key={cert.id}
            className={`card ${cert.revokedAt ? "opacity-50" : ""}`}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl" aria-hidden="true">📜</span>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm">{cert.course.title}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  ID: <span className="font-mono">{cert.uniqueId}</span>
                </p>
                <p className="text-xs text-gray-400">
                  Issued:{" "}
                  {new Date(cert.issuedAt).toLocaleDateString("en-UG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                {cert.revokedAt && (
                  <p className="text-xs text-danger mt-1 font-medium">
                    ⚠️ Revoked
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Link
                  href={`/verify/${cert.uniqueId}`}
                  className="text-xs text-accent no-underline hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Verify ↗
                </Link>
                {cert.fileS3Key && (
                  <Link
                    href={`/api/certificates/${cert.uniqueId}/download`}
                    className="btn-outline text-xs px-3 py-1 no-underline"
                  >
                    Download PDF
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
