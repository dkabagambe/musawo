import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "payments.export"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 }); throw e; }

  const payments = await db.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      enrolment: {
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true } },
        },
      },
    },
  });

  const rows = [
    ["Student", "Email", "Course", "Amount (UGX)", "Method", "Gateway", "Status", "Date"],
    ...payments.map((p) => [
      p.enrolment.user.name,
      p.enrolment.user.email ?? "",
      p.enrolment.course.title,
      String(p.amount),
      p.method,
      p.gateway,
      p.status,
      new Date(p.createdAt).toISOString(),
    ]),
  ];

  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
