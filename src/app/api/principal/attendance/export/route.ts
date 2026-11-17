import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/principal/attendance/export
 * Export attendance records as CSV
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "by-class";
    const classId = searchParams.get("classId");
    const courseId = searchParams.get("courseId");
    const instructorId = searchParams.get("instructorId");
    const studentId = searchParams.get("studentId");

    let attendanceRecords: any[] = [];
    let filename = "attendance-export.csv";

    // Fetch data based on view
    if (view === "by-class" && classId) {
      const records = await db.attendance.findMany({
        where: { liveClassId: classId },
        include: {
          user: { select: { name: true, studentNumber: true, email: true } },
          liveClass: {
            select: {
              title: true,
              scheduledAt: true,
              course: { select: { title: true, courseCode: true } },
              tutor: { select: { name: true } },
            },
          },
        },
        orderBy: { user: { name: "asc" } },
      });
      attendanceRecords = records;
      filename = `attendance-class-${classId}.csv`;
    } else if (view === "by-course" && courseId) {
      const records = await db.attendance.findMany({
        where: { liveClass: { courseId } },
        include: {
          user: { select: { name: true, studentNumber: true, email: true } },
          liveClass: {
            select: {
              title: true,
              scheduledAt: true,
              course: { select: { title: true, courseCode: true } },
              tutor: { select: { name: true } },
            },
          },
        },
        orderBy: [{ liveClass: { scheduledAt: "desc" } }, { user: { name: "asc" } }],
      });
      attendanceRecords = records;
      filename = `attendance-course-${courseId}.csv`;
    } else if (view === "by-instructor" && instructorId) {
      const records = await db.attendance.findMany({
        where: { liveClass: { tutorId: instructorId } },
        include: {
          user: { select: { name: true, studentNumber: true, email: true } },
          liveClass: {
            select: {
              title: true,
              scheduledAt: true,
              course: { select: { title: true, courseCode: true } },
              tutor: { select: { name: true } },
            },
          },
        },
        orderBy: [{ liveClass: { scheduledAt: "desc" } }, { user: { name: "asc" } }],
      });
      attendanceRecords = records;
      filename = `attendance-instructor-${instructorId}.csv`;
    } else if (view === "by-student" && studentId) {
      const records = await db.attendance.findMany({
        where: { userId: studentId },
        include: {
          user: { select: { name: true, studentNumber: true, email: true } },
          liveClass: {
            select: {
              title: true,
              scheduledAt: true,
              course: { select: { title: true, courseCode: true } },
              tutor: { select: { name: true } },
            },
          },
        },
        orderBy: { liveClass: { scheduledAt: "desc" } },
      });
      attendanceRecords = records;
      filename = `attendance-student-${studentId}.csv`;
    } else if (view === "low-attendance") {
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
          email: true,
          attendance: {
            select: {
              id: true,
              markedPresent: true,
              liveClass: {
                select: {
                  title: true,
                  scheduledAt: true,
                  course: { select: { title: true } },
                },
              },
            },
          },
        },
      });

      // Calculate attendance rates
      const MINIMUM_ATTENDANCE = 75;
      const MINIMUM_CLASSES = 3;

      const lowAttendanceData = studentsWithAttendance
        .map((student) => {
          const totalClasses = student.attendance.length;
          const presentCount = student.attendance.filter((a) => a.markedPresent).length;
          const attendanceRate = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

          return {
            name: student.name,
            studentNumber: student.studentNumber || "-",
            email: student.email || "-",
            totalClasses,
            presentCount,
            absentCount: totalClasses - presentCount,
            attendanceRate: attendanceRate.toFixed(2),
          };
        })
        .filter((s) => s.totalClasses >= MINIMUM_CLASSES && parseFloat(s.attendanceRate) < MINIMUM_ATTENDANCE);

      // Generate CSV for low attendance
      const csvLines = [
        "Student Name,Student Number,Email,Total Classes,Present,Absent,Attendance Rate",
        ...lowAttendanceData.map(
          (s) =>
            `"${s.name}","${s.studentNumber}","${s.email}",${s.totalClasses},${s.presentCount},${s.absentCount},${s.attendanceRate}%`
        ),
      ];

      const csvContent = csvLines.join("\n");
      filename = "low-attendance-students.csv";

      // Audit log
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "EXPORT",
          entity: "Attendance",
          entityId: "low-attendance",
          details: `Exported low attendance report (${lowAttendanceData.length} students)`,
        },
      });

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } else {
      return NextResponse.json({ error: "Invalid export parameters" }, { status: 400 });
    }

    // Generate CSV for regular attendance records
    const csvLines = [
      "Student Name,Student Number,Email,Class Title,Course,Course Code,Instructor,Date,Status,Joined At,Admitted At",
    ];

    for (const record of attendanceRecords) {
      const row = [
        `"${record.user.name}"`,
        `"${record.user.studentNumber || "-"}"`,
        `"${record.user.email || "-"}"`,
        `"${record.liveClass.title}"`,
        `"${record.liveClass.course.title}"`,
        `"${record.liveClass.course.courseCode}"`,
        `"${record.liveClass.tutor.name}"`,
        `"${new Date(record.liveClass.scheduledAt).toLocaleDateString("en-UG")}"`,
        `"${record.markedPresent ? "Present" : "Absent"}"`,
        `"${record.joinedAt ? new Date(record.joinedAt).toLocaleTimeString("en-UG") : "-"}"`,
        `"${record.admittedAt ? new Date(record.admittedAt).toLocaleTimeString("en-UG") : "-"}"`,
      ];
      csvLines.push(row.join(","));
    }

    const csvContent = csvLines.join("\n");

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EXPORT",
        entity: "Attendance",
        entityId: classId || courseId || instructorId || studentId || "all",
        details: `Exported attendance records (${attendanceRecords.length} records, view: ${view})`,
      },
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to export attendance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
