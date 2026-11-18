import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can, canVia } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "reports.operational"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const reportType = searchParams.get("reportType") ?? "students";
  const format = searchParams.get("format") ?? "csv";
  const courseId = searchParams.get("courseId");
  const intakeId = searchParams.get("intakeId");
  const status = searchParams.get("status");

  // Audit log the export
  await audit({
    actorId: session.user.id,
    action: "EXPORT_REPORT",
    entityType: "Report",
    entityId: reportType,
    metadata: {
      reportType,
      format,
      filters: { courseId, intakeId, status },
      via: canVia(session.user.role, "reports.operational"),
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  // Generate report based on type
  let data: unknown[] = [];
  let headers: string[] = [];

  try {
    if (reportType === "students") {
      const students = await db.student.findMany({
        where: {
          ...(courseId && {
            enrolments: { some: { courseId, status: "ACTIVE" } },
          }),
          ...(intakeId && { intakeId }),
          ...(status && { status }),
        },
        include: {
          user: { select: { name: true, email: true } },
          intake: { select: { year: true, semester: true } },
          enrolments: {
            where: { status: "ACTIVE" },
            include: { course: { select: { code: true } } },
          },
        },
        orderBy: { registrationNumber: "asc" },
      });

      headers = ["Registration Number", "Name", "Email", "Intake", "Course", "Status"];
      data = students.map((s) => ({
        registrationNumber: s.registrationNumber,
        name: s.user.name,
        email: s.user.email ?? "",
        intake: `${s.intake.year} S${s.intake.semester}`,
        course: s.enrolments.map((e) => e.course.code).join(", "),
        status: s.status,
      }));
    } else if (reportType === "registrations") {
      const students = await db.student.findMany({
        where: {
          ...(courseId && {
            enrolments: { some: { courseId, status: "ACTIVE" } },
          }),
          ...(intakeId && { intakeId }),
        },
        include: {
          user: { select: { name: true } },
          intake: { select: { year: true, semester: true } },
          enrolments: {
            where: { status: "ACTIVE" },
            include: { course: { select: { code: true, title: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      headers = ["Registration Number", "Name", "Course", "Intake", "Registered At"];
      data = students.map((s) => ({
        registrationNumber: s.registrationNumber,
        name: s.user.name,
        course: s.enrolments.map((e) => `${e.course.code} - ${e.course.title}`).join("; "),
        intake: `${s.intake.year} S${s.intake.semester}`,
        registeredAt: new Date(s.createdAt).toLocaleDateString("en-UG"),
      }));
    } else if (reportType === "classes") {
      const classes = await db.class.findMany({
        where: {
          ...(intakeId && { intakeId }),
        },
        include: {
          intake: { select: { year: true, semester: true } },
          course: { select: { code: true, title: true } },
          students: {
            include: {
              student: {
                include: {
                  user: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      headers = ["Class Name", "Course", "Intake", "Student Count", "Students"];
      data = classes.map((c) => ({
        className: c.name,
        course: `${c.course.code} - ${c.course.title}`,
        intake: `${c.intake.year} S${c.intake.semester}`,
        studentCount: c.students.length,
        students: c.students.map((cs) => cs.student.user.name).join(", "),
      }));
    } else if (reportType === "attendance") {
      headers = ["Report", "Value"];
      data = [
        { report: "Attendance Summary Report", value: "Coming soon" },
      ];
    } else if (reportType === "results") {
      headers = ["Report", "Value"];
      data = [
        { report: "Results Summary Report", value: "Coming soon" },
      ];
    } else if (reportType === "applications") {
      const applications = await db.application.findMany({
        where: {
          ...(courseId && { courseId }),
          ...(status && { status }),
        },
        include: {
          course: { select: { code: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      headers = ["Name", "Email", "Phone", "Course", "Status", "Applied At"];
      data = applications.map((a) => ({
        name: a.fullName,
        email: a.email,
        phone: a.phone,
        course: `${a.course.code} - ${a.course.title}`,
        status: a.status,
        appliedAt: new Date(a.createdAt).toLocaleDateString("en-UG"),
      }));
    } else if (reportType === "documents") {
      headers = ["Report", "Value"];
      data = [
        { report: "Missing Documents Report", value: "Coming soon" },
      ];
    }

    // Generate CSV or PDF
    if (format === "csv") {
      const csv = generateCSV(headers, data);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${reportType}-report-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } else {
      // Simplified PDF (plain text for now)
      const text = generatePlainText(reportType, headers, data);
      return new NextResponse(text, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="${reportType}-report-${new Date().toISOString().split("T")[0]}.txt"`,
        },
      });
    }
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Could not generate report" },
      { status: 500 }
    );
  }
}

function generateCSV(headers: string[], data: unknown[]): string {
  const rows = [headers.join(",")];
  
  for (const item of data) {
    const row = headers.map((header) => {
      const key = header.toLowerCase().replace(/ /g, "");
      const value = (item as Record<string, unknown>)[key] ?? "";
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    rows.push(row.join(","));
  }

  return rows.join("\n");
}

function generatePlainText(reportType: string, headers: string[], data: unknown[]): string {
  let text = `${reportType.toUpperCase()} REPORT\n`;
  text += `Generated: ${new Date().toLocaleString("en-UG")}\n`;
  text += "=".repeat(60) + "\n\n";

  for (const item of data) {
    for (const header of headers) {
      const key = header.toLowerCase().replace(/ /g, "");
      const value = (item as Record<string, unknown>)[key] ?? "";
      text += `${header}: ${value}\n`;
    }
    text += "\n";
  }

  return text;
}
