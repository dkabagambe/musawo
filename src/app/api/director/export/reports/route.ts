import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "reports.academic")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url    = new URL(req.url);
  const course = url.searchParams.get("course") ?? "";
  const intake = url.searchParams.get("intake") ?? "";
  const period = url.searchParams.get("period") ?? "all";

  const periodDays = period === "30" ? 30 : period === "90" ? 90 : period === "365" ? 365 : null;
  const since = periodDays ? new Date(Date.now() - periodDays * 86_400_000) : undefined;

  const enrolWhere: Record<string, unknown> = {};
  if (course) enrolWhere.courseId = course;
  if (intake) enrolWhere.intakeId = intake;
  if (since)  enrolWhere.createdAt = { gte: since };

  // Gather the same data as the page, flattened for CSV
  const enrolments = await db.enrolment.findMany({
    where: enrolWhere,
    select: {
      status: true, paidPercent: true, paidAmountUgx: true, totalAmountUgx: true,
      createdAt: true,
      user:   { select: { name: true, studentNumber: true, status: true } },
      course: { select: { title: true, courseCode: true } },
      intake: { select: { label: true } },
    },
    orderBy: [{ courseId: "asc" }, { user: { name: "asc" } }],
    take:    10000,
  });

  await audit({
    actorId:    session.user.id,
    action:     "BULK_EXPORT",
    entityType: "Report",
    metadata:   {
      type:    "enrolment-report",
      filters: { course, intake, period },
      count:   enrolments.length,
      format:  "CSV",
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  function csvEscape(val: unknown): string {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const header = [
    "Student Name", "Student Number", "Account Status",
    "Programme", "Course Code", "Intake",
    "Enrolment Status", "Paid %", "Paid (UGX)", "Total Fee (UGX)",
    "Enrolled Date",
  ].join(",");

  const rows = enrolments.map((e) =>
    [
      e.user.name,
      e.user.studentNumber ?? "",
      e.user.status,
      e.course.title,
      e.course.courseCode ?? "",
      e.intake?.label ?? "",
      e.status,
      e.paidPercent,
      e.paidAmountUgx,
      e.totalAmountUgx,
      new Date(e.createdAt).toLocaleDateString("en-UG"),
    ].map(csvEscape).join(",")
  );

  const csv = [header, ...rows].join("\n");
  const filename = `report-enrolments-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
