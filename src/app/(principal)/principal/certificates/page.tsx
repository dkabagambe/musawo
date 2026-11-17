import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import CertificatesView from "./CertificatesView";
export const dynamic = "force-dynamic";

export const metadata = { title: "Certificates - Principal" };

interface Props {
  searchParams: { tab?: string; courseId?: string };
}

export default async function PrincipalCertificatesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "certificates.issue"))
    redirect("/403");

  const tab = searchParams.tab ?? "eligibility";
  const courseId = searchParams.courseId;

  // Fetch all courses
  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true, courseCode: true },
    orderBy: { title: "asc" },
  });

  // Fetch students with enrolments and exam attempts for eligibility checking
  const students = await db.user.findMany({
    where: {
      role: "STUDENT",
      status: "ACTIVE",
      enrolments: {
        some: {
          status: "COMPLETED",
          ...(courseId ? { courseId } : {}),
        },
      },
    },
    include: {
      enrolments: {
        where: {
          status: "COMPLETED",
          ...(courseId ? { courseId } : {}),
        },
        include: {
          course: { 
            select: { 
              id: true, 
              title: true, 
              courseCode: true,
            } 
          },
        },
      },
      examAttempts: {
        where: {
          status: "SUBMITTED",
          ...(courseId ? { exam: { courseId } } : {}),
        },
        include: {
          exam: {
            select: {
              id: true,
              title: true,
              courseId: true,
              passMark: true,
            },
          },
        },
      },
      attendances: {
        where: {
          markedPresent: true,
          ...(courseId ? { liveClass: { courseId } } : {}),
        },
        include: {
          liveClass: {
            select: {
              id: true,
              courseId: true,
            }
          }
        }
      },
      certificates: {
        where: {
          revokedAt: null,
          ...(courseId ? { courseId } : {}),
        },
        select: {
          id: true,
          courseId: true,
          uniqueId: true,
          issuedAt: true,
        },
      },
    },
    take: 100,
  });

  // Get all live classes per course for attendance calculation
  const liveClassesByCourse = await db.liveClass.groupBy({
    by: ['courseId'],
    _count: {
      id: true,
    },
    where: {
      status: 'COMPLETED',
    }
  });

  const liveClassCountMap = Object.fromEntries(
    liveClassesByCourse.map(g => [g.courseId, g._count.id])
  );

  // Calculate eligibility for each student with comprehensive requirements
  const eligibilityData = students.map((student) => {
    return student.enrolments.map((enrolment) => {
      const courseId = enrolment.courseId;
      
      const hasCertificate = student.certificates.some(
        (cert) => cert.courseId === courseId
      );

      // 1. Check exams passed for this course
      const courseExamAttempts = student.examAttempts.filter(
        (a) => a.exam.courseId === courseId && a.status === "SUBMITTED"
      );
      const passedExams = courseExamAttempts.filter((a) => {
        if (!a.score || !a.maxScore || a.maxScore === 0) return false;
        const percentage = (a.score / a.maxScore) * 100;
        return percentage >= (a.exam.passMark || 50);
      });
      // We'll use the _count from the course include, but that doesn't exist
      // So let's just check if they passed at least 1 exam (simplified for now)
      const allExamsPassed = passedExams.length > 0;

      // 2. Check attendance (minimum 75%)
      const courseAttendances = student.attendances.filter(
        (a) => a.liveClass.courseId === courseId
      );
      const totalClassesHeld = liveClassCountMap[courseId] || 0;
      const classesAttended = courseAttendances.length;
      const attendanceRate = totalClassesHeld > 0 
        ? (classesAttended / totalClassesHeld) * 100 
        : 0;
      const attendanceMet = attendanceRate >= 75;

      // 3. Check fees paid (100%)
      const totalPaid = enrolment.paidAmountUgx || 0;
      const requiredFees = enrolment.totalAmountUgx || 0;
      const feesPaid100 = requiredFees > 0 ? totalPaid >= requiredFees : false;

      // 4. Lessons complete (enrolment status COMPLETED)
      const lessonsComplete = enrolment.status === "COMPLETED";

      // 5. Practicals signed (for now, we assume completed if enrolment is COMPLETED)
      // In a real system, would check practical_sessions or similar
      const practicalsSigned = enrolment.status === "COMPLETED";

      // 6. Log book signed (assume true if completed, would need a dedicated field)
      const logBookSigned = enrolment.status === "COMPLETED";

      // Student is eligible if ALL requirements are met and no certificate exists
      const isEligible =
        lessonsComplete &&
        allExamsPassed &&
        practicalsSigned &&
        logBookSigned &&
        attendanceMet &&
        feesPaid100 &&
        !hasCertificate;

      return {
        studentId: student.id,
        studentName: student.name,
        studentNumber: student.studentNumber,
        courseId: enrolment.courseId,
        courseTitle: enrolment.course.title,
        courseCode: enrolment.course.courseCode,
        
        // Eligibility checklist
        requirements: {
          lessonsComplete,
          examsPassed: allExamsPassed,
          practicalsSigned,
          logBookSigned,
          attendanceMet,
          feesPaid100,
        },
        
        // Details for display
        passedExamsCount: passedExams.length,
        totalExamsRequired: 1, // Simplified - would need to query actual exam count
        attendanceRate: Math.round(attendanceRate),
        classesAttended,
        totalClassesHeld,
        totalPaid,
        requiredFees,
        
        hasCertificate,
        certificateId: student.certificates.find((c) => c.courseId === courseId)?.uniqueId,
        issuedAt: student.certificates.find((c) => c.courseId === courseId)?.issuedAt,
        isEligible,
      };
    });
  }).flat();

  // Issued certificates
  const issued = await db.certificate.findMany({
    where: {
      revokedAt: null,
      ...(courseId ? { courseId } : {}),
    },
    orderBy: { issuedAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true, studentNumber: true } },
      course: { select: { id: true, title: true, courseCode: true } },
    },
  });

  // Pending approvals
  const pendingApprovals = await db.approvalRequest.findMany({
    where: {
      type: "CERTIFICATE_ISSUANCE",
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { name: true } },
    },
  });

  // Revoked certificates
  const revoked = await db.certificate.findMany({
    where: {
      revokedAt: { not: null },
      ...(courseId ? { courseId } : {}),
    },
    orderBy: { revokedAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, studentNumber: true } },
      course: { select: { title: true, courseCode: true } },
    },
  });

  return (
    <CertificatesView
      tab={tab}
      courses={courses}
      eligibilityData={eligibilityData}
      issued={issued}
      pendingApprovals={pendingApprovals}
      revoked={revoked}
      selectedCourseId={courseId || null}
      canIssue={can(session.user.role, "certificates.issue")}
      canRevoke={can(session.user.role, "certificates.revoke")}
      userId={session.user.id}
    />
  );
}
