import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.export")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const q      = url.searchParams.get("q")?.trim()  ?? "";
  const course = url.searchParams.get("course")     ?? "";
  const intake = url.searchParams.get("intake")     ?? "";
  const status = url.searchParams.get("status")     ?? "";
  const phase  = url.searchParams.get("phase")      ?? "";

  const PHASE_MAP: Record<string, string[]> = {
    pending: ["PENDING_PAYMENT"],
    partial: ["PARTIALLY_PAID"],
    active:  ["ACTIVE"],
    overdue: ["OVERDUE"],
    done:    ["COMPLETED"],
  };
  const phaseStatuses = phase ? PHASE_MAP[phase] ?? [] : [];

  const userWhere: Record<string, unknown> = { role: "STUDENT" };
  if (q) {
    userWhere.OR = [
      { name:          { contains: q, mode: "insensitive" } },
      { email:         { contains: q, mode: "insensitive" } },
      { studentNumber: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) userWhere.status = status;

  const enrolmentWhere: Record<string, unknown> = {};
  if (course) enrolmentWhere.courseId = course;
  if (intake) enrolmentWhere.intakeId = intake;
  if (phaseStatuses.length) enrolmentWhere.status = { in: phaseStatuses };
  if (Object.keys(enrolmentWhere).length > 0) {
    const userIds = await db.enrolment
      .findMany({ where: enrolmentWhere, select: { userId: true }, distinct: ["userId"] })
      .then((rows) => rows.map((r) => r.userId));
    userWhere.id = { in: userIds };
  }

  const students = await db.user.findMany({
    where:   userWhere,
    orderBy: { name: "asc" },
    take:    5000,
    select: {
      id: true, name: true, email: true, phone: true, studentNumber: true,
      status: true, gender: true, district: true, createdAt: true,
      enrolments: {
        select: {
          status: true, paidPercent: true, paidAmountUgx: true, totalAmountUgx: true,
          course: { select: { title: true } },
          intake: { select: { label: true } },
        },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  await audit({
    actorId:    session.user.id,
    action:     "BULK_EXPORT",
    entityType: "User",
    metadata:   {
      role:    "STUDENT",
      filters: { q, course, intake, status, phase },
      count:   students.length,
      format:  "CSV",
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  const header = [
    "Student Number", "Name", "Email", "Phone", "Gender", "District",
    "Account Status", "Programme", "Intake", "Enrolment Status",
    "Paid (UGX)", "Total Fee (UGX)", "Paid %", "Registered",
  ].join(",");

  function csvEscape(val: unknown): string {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const rows = students.map((s) => {
    const enr = s.enrolments[0];
    return [
      s.studentNumber ?? "",
      s.name,
      s.email ?? "",
      s.phone ?? "",
      s.gender ?? "",
      s.district ?? "",
      s.status,
      enr?.course.title ?? "",
      enr?.intake?.label ?? "",
      enr?.status ?? "",
      enr?.paidAmountUgx ?? "",
      enr?.totalAmountUgx ?? "",
      enr?.paidPercent ?? "",
      new Date(s.createdAt).toLocaleDateString("en-UG"),
    ].map(csvEscape).join(",");
  });

  const csv = [header, ...rows].join("\n");
  const filename = `students-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
