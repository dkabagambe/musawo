import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const UpdateSchema = z.object({
  name:   z.string().min(2).max(200).optional(),
  email:  z.string().email().nullable().optional(),
  phone:  z.string().min(7).max(20).nullable().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION"]).optional(),
});

/** GET /api/admin/students/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "students.view"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 }); throw e; }

  const student = await db.user.findUnique({
    where: { id: params.id, role: "STUDENT" },
    include: {
      enrolments: {
        include: {
          course:   { select: { title: true, slug: true } },
          payments: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
      examAttempts: {
        orderBy: { startedAt: "desc" },
        take: 10,
        include: { exam: { select: { title: true } } },
      },
      certificates: { include: { course: { select: { title: true } } } },
    },
  });

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ student });
}

/** PATCH /api/admin/students/[id] — edit or suspend */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = UpdateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const perm = parsed.data.status === "SUSPENDED" ? "students.suspend" : "students.edit";
  try { requirePermission(session.user.role, perm); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 }); throw e; }

  const student = await db.user.update({
    where: { id: params.id, role: "STUDENT" },
    data:  parsed.data,
    select: { id: true, name: true, status: true },
  });

  await audit({
    actorId:    session.user.id,
    action:     parsed.data.status === "SUSPENDED" ? "ACCOUNT_SUSPENDED" : "UPDATE",
    entityType: "User",
    entityId:   params.id,
    metadata:   parsed.data,
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ student });
}
