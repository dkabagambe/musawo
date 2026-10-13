import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { z } from "zod";

/** GET /api/admin/students — list students with search/filter/pagination */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "students.view"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 }); throw e; }

  const { searchParams } = new URL(req.url);
  const q      = searchParams.get("q") ?? "";
  const status = searchParams.get("status") as "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION" | null;
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const take   = 50;
  const skip   = (page - 1) * take;

  const where = {
    role: "STUDENT" as const,
    ...(status ? { status } : {}),
    ...(q ? {
      OR: [
        { name:          { contains: q, mode: "insensitive" as const } },
        { email:         { contains: q, mode: "insensitive" as const } },
        { phone:         { contains: q, mode: "insensitive" as const } },
        { studentNumber: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [students, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone: true,
        studentNumber: true, status: true, createdAt: true,
        _count: { select: { enrolments: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({ students, total, page, pages: Math.ceil(total / take) });
}

const CreateSchema = z.object({
  name:     z.string().min(2).max(200),
  email:    z.string().email().optional(),
  phone:    z.string().min(7).max(20).optional(),
  password: z.string().min(8),
});

/** POST /api/admin/students — create a student account */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "students.create"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 }); throw e; }

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { hashPassword } = await import("@/lib/auth/password");
  const passwordHash = await hashPassword(parsed.data.password);

  const student = await db.user.create({
    data: {
      name:          parsed.data.name,
      email:         parsed.data.email ?? null,
      phone:         parsed.data.phone ?? null,
      passwordHash,
      role:          "STUDENT",
      status:        "ACTIVE",
      dataConsentAt: new Date(),
    },
    select: { id: true, name: true, email: true, studentNumber: true },
  });

  return NextResponse.json({ student }, { status: 201 });
}
