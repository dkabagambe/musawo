import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import AttendanceView from "./AttendanceView";
export const dynamic = "force-dynamic";

export const metadata = { title: "Attendance - Principal" };

interface Props {
  searchParams: {
    view?: string;
    courseId?: string;
    instructorId?: string;
    studentId?: string;
    classId?: string;
  };
}

export default async function PrincipalAttendancePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) redirect("/403");

  const canEdit = can(session.user.role, "students.edit");
  const view = searchParams.view || "by-class";

  // Fetch data based on view
  let data: any = {};

  if (view === "by-class") {
    // Recent completed/live classes with attendance records
    const recentClasses = await db.liveClass.findMany({
      where: {
        status: { in: ["COMPLETED", "LIVE"] },
        attendance: { some: {} },
      },
      orderBy: { scheduledAt: "desc" },
      take: 50,
      include: {
        course: { select: { id: true, title: true } },
        tutor: { select: { id: true, name: true } },
        _count: { select: { attendance: true } },
      },
    });

    const selectedId = searchParams.classId ?? recentClasses[0]?.id ?? null;

    const attendanceRecords = selectedId
      ? await db.attendance.findMany({
          where: { liveClassId: selectedId },
          orderBy: { user: { name: "asc" } },
          include: {
            user: { select: { id: true, name: true, studentNumber: true } },
          },
        })
      : [];

    data = {
      classes: recentClasses,
      selectedClassId: selectedId,
      attendanceRecords,
    };
  } else if (view === "by-course") {
    // Group by course
    const courses = await db.course.findMany({
      where: {
        status: "PUBLISHED",
        liveClasses: { some: { attendance: { some: {} } } },
      },
      select: {
        id: true,
        title: true,
        courseCode: true,
      },
      orderBy: { title: "asc" },
    });

    const selectedCourseId = searchParams.courseId ?? courses[0]?.id ?? null;

    if (selectedCourseId) {
      const attendanceStats = await db.attendance.findMany({
        where: {
          liveClass: { courseId: selectedCourseId },
        },
        include: {
          user: { select: { id: true, name: true, studentNumber: true } },
          liveClass: { select: { id: true, title: true, scheduledAt: true } },
        },
        orderBy: { liveClass: { scheduledAt: "desc" } },
      });

      data = {
        courses,
        selectedCourseId,
        attendanceStats,
      };
    } else {
      data = { courses, selectedCourseId: null, attendanceStats: [] };
    }
  } else if (view === "by-instructor") {
    // Group by instructor
    const instructors = await db.user.findMany({
      where: {
        role: "INSTRUCTOR",
        taughtClasses: { some: { attendance: { some: {} } } },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    const selectedInstructorId = searchParams.instructorId ?? instructors[0]?.id ?? null;

    if (selectedInstructorId) {
      const attendanceStats = await db.attendance.findMany({
        where: {
          liveClass: { tutorId: selectedInstructorId },
        },
        include: {
          user: { select: { id: true, name: true, studentNumber: true } },
          liveClass: {
            select: {
              id: true,
              title: true,
              scheduledAt: true,
              course: { select: { title: true } },
            },
          },
        },
        orderBy: { liveClass: { scheduledAt: "desc" } },
      });

      data = {
        instructors,
        selectedInstructorId,
        attendanceStats,
      };
    } else {
      data = { instructors, selectedInstructorId: null, attendanceStats: [] };
    }
  } else if (view === "by-student") {
    // Group by student
    const students = await db.user.findMany({
      where: {
        role: "STUDENT",
        attendance: { some: {} },
      },
      select: {
        id: true,
        name: true,
        studentNumber: true,
      },
      orderBy: { name: "asc" },
      take: 100,
    });

    const selectedStudentId = searchParams.studentId ?? students[0]?.id ?? null;

    if (selectedStudentId) {
      const attendanceRecords = await db.attendance.findMany({
        where: { userId: selectedStudentId },
        include: {
          liveClass: {
            select: {
              id: true,
              title: true,
              scheduledAt: true,
              course: { select: { id: true, title: true } },
              tutor: { select: { name: true } },
            },
          },
        },
        orderBy: { liveClass: { scheduledAt: "desc" } },
      });

      // Calculate attendance rate
      const totalClasses = attendanceRecords.length;
      const presentCount = attendanceRecords.filter((a) => a.markedPresent).length;
      const attendanceRate = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

      data = {
        students,
        selectedStudentId,
        attendanceRecords,
        attendanceRate,
      };
    } else {
      data = { students, selectedStudentId: null, attendanceRecords: [], attendanceRate: 0 };
    }
  } else if (view === "low-attendance") {
    // Students below minimum attendance threshold (75%)
    const MINIMUM_ATTENDANCE = 75;
    const MINIMUM_CLASSES = 3;

    // Get all students with attendance records
    const studentsWithAttendance = await db.user.findMany({
      where: {
        role: "STUDENT",
        attendance: { some: {} },
      },
      select: {
        id: true,
        name: true,
        studentNumber: true,
        attendance: {
          select: {
            id: true,
            markedPresent: true,
            liveClass: {
              select: {
                course: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });

    // Calculate attendance rates
    const lowAttendanceStudents = studentsWithAttendance
      .map((student) => {
        const totalClasses = student.attendance.length;
        const presentCount = student.attendance.filter((a) => a.markedPresent).length;
        const attendanceRate = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

        return {
          id: student.id,
          name: student.name,
          studentNumber: student.studentNumber,
          totalClasses,
          presentCount,
          absentCount: totalClasses - presentCount,
          attendanceRate,
        };
      })
      .filter((s) => s.totalClasses >= MINIMUM_CLASSES && s.attendanceRate < MINIMUM_ATTENDANCE)
      .sort((a, b) => a.attendanceRate - b.attendanceRate);

    data = {
      lowAttendanceStudents,
      minimumAttendance: MINIMUM_ATTENDANCE,
      minimumClasses: MINIMUM_CLASSES,
    };
  }

  return <AttendanceView view={view} data={data} canEdit={canEdit} />;
}
