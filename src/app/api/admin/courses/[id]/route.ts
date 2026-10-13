import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const Schema = z.object({ status: z.enum(["PUBLISHED", "DRAFT", "ARCHIVED"]) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "courses.publish"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 }); throw e; }

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const course = await db.course.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  });

  await audit({
    actorId:    session.user.id,
    action:     "UPDATE",
    entityType: "Course",
    entityId:   course.id,
    metadata:   { status: parsed.data.status },
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ course });
}
