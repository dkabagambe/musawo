"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  tab: string;
  courses: any[];
  eligibilityData: any[];
  issued: any[];
  pendingApprovals: any[];
  revoked: any[];
  selectedCourseId: string | null;
  canIssue: boolean;
  canRevoke: boolean;
  userId: string;
};

export default function CertificatesView({
  tab,
  courses,
  eligibilityData,
  issued,
  pendingApprovals,
  revoked,
  selectedCourseId,
  canIssue,
  canRevoke,
  userId,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  const handleCourseFilter = (courseId: string) => {
    const params = new URLSearchParams({ tab });
    if (courseId) params.set("courseId", courseId);
    router.push(`/principal/certificates?${params.toString()}`);
  };

  const handleSelectStudent = (key: string, checked: boolean) => {
    const newSelection = new Set(selectedStudents);
    if (checked) {
      newSelection.add(key);
    } else {
      newSelection.delete(key);
    }
    setSelectedStudents(newSelection);
  };

  const handleRequestBatch = async () => {
    if (selectedStudents.size === 0) {
      alert("Please select at least one student");
      return;
    }

    const reason = prompt(
      `Request certificate issuance for ${selectedStudents.size} student(s)?\n\nProvide a reason:`
    );
    if (!reason || reason.trim().length < 10) {
      alert("Reason must be at least 10 characters");
      return;
    }

    setLoading(true);
    try {
      // Parse selected students (format: "studentId|courseId")
      const requests = Array.from(selectedStudents).map((key) => {
        const [studentId, courseId] = key.split("|");
        return { studentId, courseId };
      });

      const response = await fetch("/api/principal/certificates/request-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests, reason }),
      });

      if (!response.ok) throw new Error("Failed to request certificates");

      alert("Certificate issuance requested. Awaiting Director approval.");
      setSelectedStudents(new Set());
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to request certificates");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (certificateId: string) => {
    const reason = prompt("Reason for revoking this certificate (required):");
    if (!reason || reason.trim().length < 10) {
      alert("Reason must be at least 10 characters");
      return;
    }

    if (
      !confirm(
        "Revoke this certificate? This requires Director approval and cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/principal/certificates/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateId, reason }),
      });

      if (!response.ok) throw new Error("Failed to request revocation");

      alert("Revocation requested. Awaiting Director approval.");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to request revocation");
    } finally {
      setLoading(false);
    }
  };

  const eligibleStudents = eligibilityData.filter((e) => e.isEligible);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Certificates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Check eligibility, request issuance in batches, track status
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {[
          { value: "eligibility", label: `Eligibility (${eligibleStudents.length})` },
          { value: "issued", label: `Issued (${issued.length})` },
          { value: "pending", label: `Pending Approval (${pendingApprovals.length})` },
          { value: "revoked", label: `Revoked (${revoked.length})` },
          { value: "verify", label: "Verification" },
        ].map((t) => (
          <Link
            key={t.value}
            href={`/principal/certificates?tab=${t.value}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium no-underline transition-colors ${
              tab === t.value
                ? "bg-primary text-white"
                : "text-gray-500 hover:bg-surface"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Course Filter */}
      {(tab === "eligibility" || tab === "issued" || tab === "revoked") && (
        <div className="mb-4">
          <select
            value={selectedCourseId || ""}
            onChange={(e) => handleCourseFilter(e.target.value)}
            className="input max-w-md"
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.courseCode} - {c.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Eligibility Tab */}
      {tab === "eligibility" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Students who have completed all requirements and are eligible for certificates
            </p>
            {canIssue && selectedStudents.size > 0 && (
              <button
                onClick={handleRequestBatch}
                disabled={loading}
                className="btn-primary"
              >
                Request {selectedStudents.size} Certificate{selectedStudents.size !== 1 ? "s" : ""}
              </button>
            )}
          </div>

          {eligibleStudents.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-gray-500 text-sm">
                {selectedCourseId
                  ? "No eligible students for this course."
                  : "No eligible students at this time."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {eligibleStudents.map((e) => {
                const key = `${e.studentId}|${e.courseId}`;
                const req = e.requirements || {};
                const allMet = req.lessonsComplete && req.examsPassed && req.practicalsSigned 
                  && req.logBookSigned && req.attendanceMet && req.feesPaid100;
                
                return (
                  <div key={key} className="card">
                    <div className="flex items-start gap-4">
                      {canIssue && (
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(key)}
                          onChange={(ev) => handleSelectStudent(key, ev.target.checked)}
                          className="checkbox mt-1"
                        />
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-base">{e.studentName}</p>
                            <p className="text-xs text-gray-400">{e.studentNumber || "-"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{e.courseCode}</p>
                            <p className="text-xs text-gray-500">{e.courseTitle}</p>
                          </div>
                        </div>
                        
                        {/* Requirements Checklist */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className={req.lessonsComplete ? "text-green-600" : "text-red-600"}>
                              {req.lessonsComplete ? "✓" : "✗"}
                            </span>
                            <span className={req.lessonsComplete ? "" : "text-gray-400"}>
                              Lessons Complete
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={req.examsPassed ? "text-green-600" : "text-red-600"}>
                              {req.examsPassed ? "✓" : "✗"}
                            </span>
                            <span className={req.examsPassed ? "" : "text-gray-400"}>
                              Exams Passed ({e.passedExamsCount}/{e.totalExamsRequired})
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={req.practicalsSigned ? "text-green-600" : "text-red-600"}>
                              {req.practicalsSigned ? "✓" : "✗"}
                            </span>
                            <span className={req.practicalsSigned ? "" : "text-gray-400"}>
                              Practicals Signed
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={req.logBookSigned ? "text-green-600" : "text-red-600"}>
                              {req.logBookSigned ? "✓" : "✗"}
                            </span>
                            <span className={req.logBookSigned ? "" : "text-gray-400"}>
                              Log Book Signed
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={req.attendanceMet ? "text-green-600" : "text-red-600"}>
                              {req.attendanceMet ? "✓" : "✗"}
                            </span>
                            <span className={req.attendanceMet ? "" : "text-gray-400"}>
                              Attendance ≥75% ({e.attendanceRate}%, {e.classesAttended}/{e.totalClassesHeld})
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={req.feesPaid100 ? "text-green-600" : "text-red-600"}>
                              {req.feesPaid100 ? "✓" : "✗"}
                            </span>
                            <span className={req.feesPaid100 ? "" : "text-gray-400"}>
                              Fees 100% (UGX {e.totalPaid?.toLocaleString()}/{e.requiredFees?.toLocaleString()})
                            </span>
                          </div>
                        </div>
                        
                        {allMet && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <span className="badge badge-success text-xs">
                              ✓ All Requirements Met - Eligible for Certificate
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
            <p className="font-medium mb-2">📘 Eligibility Requirements:</p>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-4 list-disc">
              <li>Lessons complete (enrolment status COMPLETED)</li>
              <li>All exams passed for the course</li>
              <li>Practicals signed off</li>
              <li>Log book signed and verified</li>
              <li>Attendance at least 75% of all classes</li>
              <li>Fees paid at 100% (all phases completed)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Issued Tab */}
      {tab === "issued" && (
        <div>
          {issued.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">🎓</p>
              <p className="text-gray-500 text-sm">No certificates issued yet.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-border">
                    <th className="pb-2 font-medium pr-4">Student</th>
                    <th className="pb-2 font-medium pr-4">Course</th>
                    <th className="pb-2 font-medium pr-4">Certificate ID</th>
                    <th className="pb-2 font-medium pr-4">Issued</th>
                    {canRevoke && <th className="pb-2 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {issued.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-4">
                        <p className="font-medium">{c.user.name}</p>
                        <p className="text-xs text-gray-400">{c.user.studentNumber || "-"}</p>
                      </td>
                      <td className="py-2 pr-4">
                        <p className="text-sm">{c.course.courseCode}</p>
                        <p className="text-xs text-gray-500">{c.course.title}</p>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{c.uniqueId}</td>
                      <td className="py-2 pr-4 text-xs text-gray-400">
                        {new Date(c.issuedAt).toLocaleDateString("en-UG")}
                      </td>
                      {canRevoke && (
                        <td className="py-2">
                          <button
                            onClick={() => handleRevoke(c.id)}
                            disabled={loading}
                            className="btn-danger text-xs px-2 py-1"
                          >
                            Revoke
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pending Approval Tab */}
      {tab === "pending" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Certificate requests forwarded to Director, awaiting approval
          </p>

          {pendingApprovals.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-gray-500 text-sm">No pending requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge badge-warning text-xs">{approval.status}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(approval.createdAt).toLocaleDateString("en-UG")}
                        </span>
                      </div>
                      <p className="text-sm">{approval.description || "Certificate issuance request"}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Requested by {approval.requestedBy.name}
                      </p>
                    </div>
                    <Link
                      href={`/principal/approvals-inbox/${approval.id}`}
                      className="btn-secondary text-sm no-underline"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Revoked Tab */}
      {tab === "revoked" && (
        <div>
          {revoked.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-3xl mb-3">✅</p>
              <p className="text-gray-500 text-sm">No revoked certificates.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-border">
                    <th className="pb-2 font-medium pr-4">Student</th>
                    <th className="pb-2 font-medium pr-4">Course</th>
                    <th className="pb-2 font-medium pr-4">Certificate ID</th>
                    <th className="pb-2 font-medium pr-4">Revoked</th>
                    <th className="pb-2 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {revoked.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-4">
                        <p className="font-medium">{c.user.name}</p>
                        <p className="text-xs text-gray-400">{c.user.studentNumber || "-"}</p>
                      </td>
                      <td className="py-2 pr-4">
                        <p className="text-sm">{c.course.courseCode}</p>
                        <p className="text-xs text-gray-500">{c.course.title}</p>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{c.uniqueId}</td>
                      <td className="py-2 pr-4 text-xs text-gray-400">
                        {new Date(c.revokedAt).toLocaleDateString("en-UG")}
                      </td>
                      <td className="py-2 text-xs text-gray-500">{c.revokedReason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Verification Tab */}
      {tab === "verify" && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Certificate Verification</h2>
          <p className="text-sm text-gray-500 mb-4">
            Verify the authenticity of a certificate by entering its unique ID
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const certId = formData.get("certId") as string;

              if (!certId) return;

              setLoading(true);
              try {
                const response = await fetch(`/api/certificates/verify/${certId}`);
                const data = await response.json();

                if (response.ok && data.certificate) {
                  alert(
                    `✓ Valid Certificate\n\nStudent: ${data.certificate.user.name}\nCourse: ${data.certificate.course.title}\nIssued: ${new Date(data.certificate.issuedAt).toLocaleDateString("en-UG")}`
                  );
                } else {
                  alert("✗ Certificate not found or invalid");
                }
              } catch (error) {
                alert("Failed to verify certificate");
              } finally {
                setLoading(false);
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              name="certId"
              required
              placeholder="Enter certificate ID (e.g., MTC-2026-CNA-00042)"
              className="input flex-1"
            />
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
            <p className="font-medium mb-2">📄 Public Verification</p>
            <p className="text-xs text-gray-500">
              Students and employers can verify certificates at:{" "}
              <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">
                /verify/[certificateId]
              </code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
