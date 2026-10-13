import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

/** GET /api/admin/courses — list all courses */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "courses.view"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 }); throw e; }

  const courses = await db.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tutor:  { select: { name: true } },
      _count: { select: { enrolments: true, blocks: true } },
    },
  });

  return NextResponse.json({ courses });
}

const CreateSchema = z.object({
  title:              z.string().min(3).max(300),
  slug:               z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only"),
  description:        z.string().min(10),
  shortDescription:   z.string().max(300).optional(),
  tutorId:            z.string().cuid(),
  fullFeeUgx:         z.number().int().positive(),
  instalmentCount:    z.number().int().min(1).max(12).default(1),
  durationWeeks:      z.number().int().positive().optional(),
  freePreviewPercent: z.number().int().min(0).max(100).default(12),
  accreditationText:  z.string().max(300).optional(),
  thumbnailUrl:       z.string().url().optional(),
});

/** POST /api/admin/courses — create a course */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "courses.create"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 }); throw e; }

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  // Check slug uniqueness
  const existing = await db.course.findUnique({ where: { slug: parsed.data.slug } });
  if (existing)
    return NextResponse.json({ error: "A course with this slug already exists" }, { status: 409 });

  const course = await db.course.create({ data: { ...parsed.data, status: "DRAFT" } });

  await audit({
    actorId:    session.user.id,
    action:     "CREATE",
    entityType: "Course",
    entityId:   course.id,
    metadata:   { title: course.title },
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ course }, { status: 201 });
}
