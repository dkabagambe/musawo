import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Award, Download, ExternalLink, XCircle } from "lucide-react";

export const metadata = { title: "My Certificates" };

export default async function CertificatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const certificates = await db.certificate.findMany({
    where: { userId: session.user.id },
    include: { course: { select: { title: true } } },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">My Certificates</h1>
        <p className="text-gray-500 text-sm mt-1">Your earned qualifications</p>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-primary/40" />
          </div>
          <h2 className="font-bold text-primary mb-2">No certificates yet</h2>
          <p className="text-gray-500 text-sm">Complete a course to earn your digital certificate with QR verification.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert) => (
            <div key={cert.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${cert.revokedAt ? "border-danger/20 opacity-75" : "border-border"}`}>
              {/* Decorative top stripe */}
              <div className={`h-1.5 ${cert.revokedAt ? "bg-danger" : "bg-gradient-to-r from-primary to-accent"}`} />

              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${cert.revokedAt ? "bg-danger/10" : "bg-primary/10"}`}>
                    {cert.revokedAt
                      ? <XCircle className="w-7 h-7 text-danger" />
                      : <Award className="w-7 h-7 text-primary" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-primary leading-snug">{cert.course.title}</h2>
                        <p className="text-xs text-gray-400 mt-1 font-mono">{cert.uniqueId}</p>
                      </div>
                      {cert.revokedAt && (
                        <span className="text-xs font-bold bg-danger/10 text-danger px-2.5 py-1 rounded-full flex-shrink-0">
                          Revoked
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>
                        Issued: {new Date(cert.issuedAt).toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      {cert.revokedAt && (
                        <span className="text-danger">
                          Revoked: {new Date(cert.revokedAt).toLocaleDateString("en-UG")}
                        </span>
                      )}
                    </div>

                    {cert.revokedReason && (
                      <p className="text-xs text-danger mt-2 bg-danger/5 px-3 py-2 rounded-lg">{cert.revokedReason}</p>
                    )}
                  </div>
                </div>

                {!cert.revokedAt && (
                  <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
                    <Link href={`/verify/${cert.uniqueId}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent no-underline hover:underline">
                      <ExternalLink className="w-3.5 h-3.5" /> Verify certificate
                    </Link>
                    {cert.fileS3Key && (
                      <Link href={`/api/certificates/${cert.uniqueId}/download`}
                        className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl no-underline hover:bg-primary/90 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
