import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { enrolments: true } } },
  });

  const rows = [
    ["Student Number", "Name", "Email", "Phone", "Status", "Enrolments", "Joined At"],
    ...students.map((s) => [
      s.studentNumber ?? "",
      s.name,
      s.email ?? "",
      s.phone ?? "",
      s.status,
      String(s._count.enrolments),
      new Date(s.createdAt).toISOString(),
    ]),
  ];

  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
