import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "graduates.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url     = new URL(req.url);
  const q       = url.searchParams.get("q")?.trim()   ?? "";
  const course  = url.searchParams.get("course")      ?? "";
  const year    = url.searchParams.get("year")        ?? "";
  const revoked = url.searchParams.get("revoked") === "1";

  const certWhere: Record<string, unknown> = {
    revokedAt: revoked ? { not: null } : null,
  };
  if (course) certWhere.courseId = course;
  if (year)   certWhere.issuedAt = {
    gte: new Date(`${year}-01-01`),
    lt:  new Date(`${Number(year) + 1}-01-01`),
  };
  if (q) certWhere.user = { name: { contains: q, mode: "insensitive" } };

  const certs = await db.certificate.findMany({
    where:   certWhere,
    orderBy: { issuedAt: "desc" },
    take:    5000,
    select: {
      uniqueId: true, issuedAt: true, revokedAt: true, revokedReason: true,
      user:   { select: { name: true, studentNumber: true, email: true, phone: true } },
      course: { select: { title: true, courseCode: true } },
    },
  });

  await audit({
    actorId:    session.user.id,
    action:     "BULK_EXPORT",
    entityType: "Certificate",
    metadata:   {
      type:    "graduates",
      filters: { q, course, year, revoked },
      count:   certs.length,
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
    "Name", "Student Number", "Email", "Phone",
    "Programme", "Course Code", "Certificate Number",
    "Issued Date", "Revoked Date", "Revocation Reason",
  ].join(",");

  const rows = certs.map((c) =>
    [
      c.user.name,
      c.user.studentNumber ?? "",
      c.user.email ?? "",
      c.user.phone ?? "",
      c.course.title,
      c.course.courseCode ?? "",
      c.uniqueId,
      new Date(c.issuedAt).toLocaleDateString("en-UG"),
      c.revokedAt ? new Date(c.revokedAt).toLocaleDateString("en-UG") : "",
      c.revokedReason ?? "",
    ].map(csvEscape).join(",")
  );

  const csv = [header, ...rows].join("\n");
  const filename = `graduates-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
