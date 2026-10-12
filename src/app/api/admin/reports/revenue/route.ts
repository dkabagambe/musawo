import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    ["Student Name", "Email", "Course", "Amount (UGX)", "Method", "Gateway", "Status", "Paid At", "Gateway Ref"],
    ...payments.map((p) => [
      p.enrolment.user.name,
      p.enrolment.user.email ?? "",
      p.enrolment.course.title,
      String(p.amount),
      p.method,
      p.gateway,
      p.status,
      p.paidAt ? new Date(p.paidAt).toISOString() : "",
      p.gatewayRef ?? "",
    ]),
  ];

  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="revenue-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
