import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Award, Download, ExternalLink, XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import QRCode from "qrcode";
import { getSetting } from "@/lib/settings";
export const dynamic = "force-dynamic";

export const metadata = { title: "My Certificates" };

function RequirementRow({
  label,
  met,
  note,
}: {
  label: string;
  met: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      {met ? (
        <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <span className={`text-xs ${met ? "text-gray-700" : "text-amber-700 font-medium"}`}>
          {label}
        </span>
        {note && <span className="text-xs text-gray-400 ml-1">({note})</span>}
      </div>
    </div>
  );
}

export default async function CertificatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [siteUrl, issuerName] = await Promise.all([
    getSetting("site.url", "https://app.musawo.ug"),
    getSetting("certificate.issuerName", "Musawo Training Center"),
  ]);

  // Issued certificates
  const certificates = await db.certificate.findMany({
    where: { userId: session.user.id },
    include: { course: { select: { title: true, id: true } } },
    orderBy: { issuedAt: "desc" },
  });

  // Enrolments for eligibility checklist
  const enrolments = await db.enrolment.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["ACTIVE", "PARTIALLY_PAID", "OVERDUE", "COMPLETED", "PENDING_PAYMENT"] },
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          accreditationText: true,
        },
      },
    },
  });

  // Certificate IDs already issued (by courseId)
  const issuedCourseIds = new Set(
    certificates.filter((c) => !c.revokedAt).map((c) => c.courseId)
  );

  // For each enrolment not yet certified, compute eligibility
  const eligibilityByCourse: Array<{
    courseId: string;
    courseTitle: string;
    eligible: boolean;
    checks: Array<{ label: string; met: boolean; note?: string }>;
  }> = [];

  for (const enrolment of enrolments) {
    const courseId = enrolment.courseId;
    if (issuedCourseIds.has(courseId)) continue; // already certified

    const paidPercent = enrolment.paidPercent;

    // Count completed lessons for this course
    const [
      totalLessons,
      completedLessons,
      totalExams,
      passedExams,
      attendanceSummary,
    ] = await Promise.all([
      db.lesson.count({ where: { block: { courseId } } }),
      db.lessonProgress.count({
        where: { userId: session.user.id, lesson: { block: { courseId } }, completedAt: { not: null } },
      }),
      db.exam.count({ where: { courseId, status: "PUBLISHED" } }),
      db.gradeEntry.count({
        where: {
          userId: session.user.id,
          courseId,
          itemType: "EXAM",
          passed: true,
          releasedAt: { not: null },
        },
      }),
      db.attendance.aggregate({
        where: { userId: session.user.id, liveClass: { courseId } },
        _count: { id: true },
      }),
    ]);

    const attendanceCount = attendanceSummary._count.id;
    const totalClasses = await db.liveClass.count({ where: { courseId, status: "COMPLETED" } });
    const attendancePct = totalClasses > 0 ? Math.round((attendanceCount / totalClasses) * 100) : 100;
    const attendanceMet = attendancePct >= 70;

    const lessonsComplete = totalLessons === 0 || completedLessons >= totalLessons;
    const examsPassed = totalExams === 0 || passedExams >= totalExams;
    const feesPaid = paidPercent >= 100;

    const checks = [
      {
        label: "Lessons complete",
        met: lessonsComplete,
        note: `${completedLessons}/${totalLessons}`,
      },
      {
        label: "All exams passed",
        met: examsPassed,
        note: `${passedExams}/${totalExams}`,
      },
      {
        label: "Attendance at least 70%",
        met: attendanceMet,
        note: `${attendancePct}%`,
      },
      {
        label: "Fees paid in full (100%)",
        met: feesPaid,
        note: `${paidPercent}% paid`,
      },
    ];

    eligibilityByCourse.push({
      courseId,
      courseTitle: enrolment.course.title,
      eligible: lessonsComplete && examsPassed && attendanceMet && feesPaid,
      checks,
    });
  }

  // Generate QR code data URLs for valid certificates
  const qrCodes: Record<string, string> = {};
  for (const cert of certificates) {
    if (!cert.revokedAt) {
      const verifyUrl = `${siteUrl}/verify/${cert.uniqueId}`;
      try {
        qrCodes[cert.id] = await QRCode.toDataURL(verifyUrl, {
          width: 128,
          margin: 1,
          color: { dark: "#111A3F", light: "#ffffff" },
        });
      } catch {
        // skip if QR fails
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">My Certificates</h1>
        <p className="text-gray-500 text-sm mt-1">Your earned qualifications from {issuerName}</p>
      </div>

      {/* Issued certificates */}
      {certificates.length > 0 && (
        <div className="space-y-4">
          {certificates.map((cert) => {
            const qrDataUrl = qrCodes[cert.id];
            const verifyUrl = `${siteUrl}/verify/${cert.uniqueId}`;
            return (
              <div
                key={cert.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  cert.revokedAt ? "border-danger/20 opacity-75" : "border-border"
                }`}
              >
                {/* Decorative top stripe */}
                <div
                  className={`h-1.5 ${
                    cert.revokedAt
                      ? "bg-danger"
                      : "bg-gradient-to-r from-primary to-accent"
                  }`}
                />

                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        cert.revokedAt ? "bg-danger/10" : "bg-primary/10"
                      }`}
                    >
                      {cert.revokedAt ? (
                        <XCircle className="w-7 h-7 text-danger" />
                      ) : (
                        <Award className="w-7 h-7 text-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-bold text-primary leading-snug">
                            {cert.course.title}
                          </h2>
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
                          Issued:{" "}
                          {new Date(cert.issuedAt).toLocaleDateString("en-UG", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                        {cert.revokedAt && (
                          <span className="text-danger">
                            Revoked:{" "}
                            {new Date(cert.revokedAt).toLocaleDateString("en-UG")}
                          </span>
                        )}
                      </div>

                      {cert.revokedReason && (
                        <p className="text-xs text-danger mt-2 bg-danger/5 px-3 py-2 rounded-lg">
                          {cert.revokedReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* QR code + actions for valid certs */}
                  {!cert.revokedAt && (
                    <div className="mt-5 pt-4 border-t border-border flex items-center gap-4 justify-between flex-wrap">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/verify/${cert.uniqueId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent no-underline hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Verify certificate
                        </Link>
                        <Link
                          href={`/api/certificates/${cert.uniqueId}/download`}
                          className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl no-underline hover:bg-primary/90 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download PDF
                        </Link>
                      </div>

                      {/* QR code */}
                      {qrDataUrl && (
                        <div className="flex flex-col items-center gap-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrDataUrl}
                            alt={`QR code to verify certificate ${cert.uniqueId}`}
                            width={72}
                            height={72}
                            className="rounded"
                          />
                          <span className="text-[10px] text-gray-400">Scan to verify</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Eligibility checklists for courses not yet certified */}
      {eligibilityByCourse.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
            Certificate Eligibility
          </h2>
          {eligibilityByCourse.map((item) => (
            <div
              key={item.courseId}
              className={`bg-white rounded-2xl border shadow-sm p-5 ${
                item.eligible ? "border-success/30" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-semibold text-primary text-sm leading-snug">
                  {item.courseTitle}
                </h3>
                {item.eligible ? (
                  <span className="text-xs font-bold bg-success/10 text-success px-2.5 py-1 rounded-full flex-shrink-0">
                    Eligible
                  </span>
                ) : (
                  <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full flex-shrink-0">
                    Not yet eligible
                  </span>
                )}
              </div>
              <div className="divide-y divide-border/50">
                {item.checks.map((check) => (
                  <RequirementRow
                    key={check.label}
                    label={check.label}
                    met={check.met}
                    note={check.note}
                  />
                ))}
              </div>
              {item.eligible && (
                <p className="text-xs text-success mt-3 bg-success/5 px-3 py-2 rounded-lg">
                  You meet all requirements. The Director will issue your certificate once approved.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completely empty state */}
      {certificates.length === 0 && eligibilityByCourse.length === 0 && (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-primary/40" />
          </div>
          <h2 className="font-bold text-primary mb-2">No certificates yet</h2>
          <p className="text-gray-500 text-sm">
            Complete a course and meet all requirements to earn your certificate.
          </p>
        </div>
      )}
    </div>
  );
}
