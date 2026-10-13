import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "students.export"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 }); throw e; }

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
