import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";

/**
 * GET /api/admin/admissions
 * Returns all applications with optional status filter.
 * Requires applications.process permission (Admin or above).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    requirePermission(session.user.role, "applications.process");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const take = 30;
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;

  const [applications, total] = await Promise.all([
    db.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        course: { select: { id: true, title: true, courseCode: true } },
        intake: { select: { id: true, label: true } },
      },
    }),
    db.application.count({ where }),
  ]);

  return NextResponse.json({ applications, total, page, pages: Math.ceil(total / take) });
}
