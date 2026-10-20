import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { renderToBuffer } from "@react-pdf/renderer";
import AttendancePdf from "./AttendancePdf";

export const runtime = "nodejs";
type Row = { name: string; studentNumber: string | null; startMark: string | null; endMark: string | null; startComment: string | null; endComment: string | null; joinedAt: Date | null; leftAt: Date | null };
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role, "attendance.export")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const params = new URL(req.url).searchParams;
  const classId = params.get("classId");
  const format = params.get("format") ?? "csv";
  if (!classId || !["csv", "pdf"].includes(format)) return NextResponse.json({ error: "classId and csv or pdf format are required" }, { status: 400 });
  const liveClass = await db.liveClass.findFirst({ where: { id: classId, course: teachingCourseWhere(session.user.id) }, include: { course: { select: { title: true } } } });
  if (!liveClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  const rows = await db.$queryRaw<Row[]>`
    SELECT u.name, u."studentNumber", a."startMark"::text, a."endMark"::text, a."startComment", a."endComment", a."joinedAt", a."leftAt"
    FROM enrolments e JOIN users u ON u.id = e."userId"
    LEFT JOIN attendance a ON a."liveClassId" = ${classId} AND a."userId" = u.id
    WHERE e."courseId" = ${liveClass.courseId} AND e.status IN ('ACTIVE','PARTIALLY_PAID','COMPLETED') AND u.role = 'STUDENT'
    ORDER BY u.name ASC`;
  const duration = liveClass.durationMin;
  const output = rows.map((row) => {
    const minutes = row.joinedAt ? Math.max(0, Math.floor(((row.leftAt ?? new Date()).getTime() - row.joinedAt.getTime()) / 60_000)) : 0;
    return { ...row, joinedAt: row.joinedAt?.toISOString() ?? null, leftAt: row.leftAt?.toISOString() ?? null, minutes, percentage: duration ? Math.min(100, Math.round(minutes / duration * 100)) : 0 };
  });
  const safe = liveClass.title.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 80);
  if (format === "csv") {
    const header = ["Student", "Student number", "Status at start", "Start comment", "Status at end", "End comment", "Joined at", "Left at", "Minutes", "Attendance percent"];
    const csv = [header, ...output.map((row) => [row.name, row.studentNumber ?? "", row.startMark ?? "", row.startComment ?? "", row.endMark ?? "", row.endComment ?? "", row.joinedAt ?? "", row.leftAt ?? "", row.minutes, row.percentage])]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    return new NextResponse(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="attendance-${safe}.csv"` } });
  }
  const pdf = await renderToBuffer(<AttendancePdf title={liveClass.title} course={liveClass.course.title} rows={output} />);
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="attendance-${safe}.pdf"` } });
}
