import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "reports.academic"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 }); throw e; }

  const enrolments = await db.enrolment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true } },
      intake: { select: { label: true } },
    },
  });

  const rows = [
    ["Student Name", "Email", "Course", "Intake", "Status", "Paid (UGX)", "Total (UGX)", "Enrolled At"],
    ...enrolments.map((e) => [
      e.user.name,
      e.user.email ?? "",
      e.course.title,
      e.intake?.label ?? "",
      e.status,
      String(e.paidAmountUgx),
      String(e.totalAmountUgx),
      new Date(e.createdAt).toISOString(),
    ]),
  ];

  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="enrolments-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
