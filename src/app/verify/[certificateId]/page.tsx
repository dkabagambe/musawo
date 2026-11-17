import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";

export const dynamic = "force-dynamic";

interface Props {
  params: { certificateId: string };
}

export default async function CertificateVerificationPage({ params }: Props) {
  const { certificateId } = params;

  // Look up certificate by uniqueId
  const certificate = await db.certificate.findUnique({
    where: { uniqueId: certificateId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          studentNumber: true,
        },
      },
      course: {
        select: {
          title: true,
          courseCode: true,
        },
      },
    },
  });

  if (!certificate) {
    notFound();
  }

  const isRevoked = !!certificate.revokedAt;

  // Log verification attempt
  await db.certVerification.create({
    data: {
      certificateId: certificate.id,
      // Would capture IP and user agent in production
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Certificate Verification</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Public verification system for Musawo Training College
          </p>
        </div>

        {/* Certificate Card */}
        <div className="card">
          {isRevoked ? (
            /* Revoked Certificate */
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                <span className="text-4xl">❌</span>
              </div>
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-3">
                Certificate Revoked
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This certificate has been revoked and is no longer valid.
              </p>
              <div className="inline-block bg-red-50 dark:bg-red-950 px-4 py-3 rounded-lg text-left">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Certificate ID:</strong> {certificate.uniqueId}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  <strong>Revoked on:</strong>{" "}
                  {new Date(certificate.revokedAt).toLocaleDateString("en-UG", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                {certificate.revokedReason && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    <strong>Reason:</strong> {certificate.revokedReason}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Valid Certificate */
            <>
              <div className="text-center py-8 border-b border-border">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                  <span className="text-4xl">✓</span>
                </div>
                <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                  Valid Certificate
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This certificate has been verified as authentic and valid
                </p>
              </div>

              <div className="py-6 space-y-6">
                {/* Certificate Details */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">
                    Certificate Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Certificate ID</p>
                      <p className="font-mono text-sm font-medium">{certificate.uniqueId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Date Issued</p>
                      <p className="text-sm font-medium">
                        {new Date(certificate.issuedAt).toLocaleDateString("en-UG", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Student Information */}
                <div className="pt-6 border-t border-border">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">
                    Student Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Full Name</p>
                      <p className="text-base font-semibold">{certificate.user.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Student Number</p>
                      <p className="text-sm font-medium">
                        {certificate.user.studentNumber || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Course Information */}
                <div className="pt-6 border-t border-border">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">
                    Course Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Course Title</p>
                      <p className="text-base font-semibold">{certificate.course.title}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Course Code</p>
                      <p className="text-sm font-medium">{certificate.course.courseCode}</p>
                    </div>
                  </div>
                </div>

                {/* Institution Information */}
                <div className="pt-6 border-t border-border">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">
                    Issuing Institution
                  </h3>
                  <p className="text-base font-semibold mb-1">Musawo Training College</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Kampala, Uganda
                  </p>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-center text-gray-500">
                  This is an official digital certificate verification page. For
                  inquiries, please contact Musawo Training College directly.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="text-sm text-primary hover:underline"
          >
            ← Return to Home
          </a>
        </div>
      </div>
    </div>
  );
}
