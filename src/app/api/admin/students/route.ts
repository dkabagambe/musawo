import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { z } from "zod";

/** GET /api/admin/students - list students with search/filter/pagination */
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
  name:                z.string().min(2).max(200),
  email:               z.string().email().optional(),
  phone:               z.string().min(7).max(20).optional(),
  courseId:            z.string().cuid().optional(),
  intakeId:            z.string().cuid().optional(),
  category:            z.enum(["OPEN", "PROFESSIONAL"]).default("OPEN"),
  professionalTitle:   z.string().max(120).optional(),
  registrationNumber:  z.string().max(80).optional(),
  dateOfBirth:         z.string().optional(),     // ISO date string
  gender:              z.string().max(20).optional(),
  district:            z.string().max(80).optional(),
  highestQualification:z.string().max(100).optional(),
  emergencyContact:    z.string().max(200).optional(),
  // sourceApplicationId: link to the Application record if created from one
  sourceApplicationId: z.string().cuid().optional(),
});

/** POST /api/admin/students - create a student account (Registrar flow) */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { requirePermission(session.user.role, "students.create"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 }); throw e; }

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  if (!d.email && !d.phone)
    return NextResponse.json({ error: "Provide at least an email or phone number." }, { status: 400 });

  // Professional courses require professional fields
  if (d.category === "PROFESSIONAL" && !d.professionalTitle)
    return NextResponse.json({ error: "Professional title is required for professional category." }, { status: 400 });

  // Uniqueness checks
  if (d.email) {
    const ex = await db.user.findUnique({ where: { email: d.email } });
    if (ex) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }
  if (d.phone) {
    const ex = await db.user.findUnique({ where: { phone: d.phone } });
    if (ex) return NextResponse.json({ error: "An account with this phone already exists." }, { status: 409 });
  }

  const { generateStudentNumber } = await import("@/lib/students");
  const studentNumber = await generateStudentNumber();

  // Create user in PENDING_ACCEPTANCE status — they must accept the invite before login
  const student = await db.user.create({
    data: {
      name:          d.name,
      email:         d.email ?? null,
      phone:         d.phone ?? null,
      role:          "STUDENT",
      status:        "PENDING_ACCEPTANCE",
      studentNumber,
      // Store extra fields in a JSON metadata column if available, else ignore for now
      // (schema already has these as nullable fields from Batch A3)
    },
    select: {
      id: true, name: true, email: true, phone: true,
      studentNumber: true, status: true,
    },
  });

  // If created from an application, mark it accepted and link the user
  if (d.sourceApplicationId) {
    await db.application.update({
      where: { id: d.sourceApplicationId },
      data: {
        status: "ACCEPTED",
        createdUserId: student.id,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    }).catch(() => { /* application may not exist - non-fatal */ });
  }

  // Send invite email so student can set password and confirm details
  const crypto = await import("crypto");
  const token     = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.staffInvite.create({
    data: {
      email:       d.email ?? `${student.id}@placeholder.mtc`,
      role:        "STUDENT",
      token,
      expiresAt,
      createdById: session.user.id,
      userId:      student.id,   // link to the pre-created student record
    },
  });

  const siteUrl   = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${siteUrl}/invite/${token}`;

  const { sendEmail } = await import("@/lib/email");
  if (d.email) {
    await sendEmail({
      to:      d.email,
      subject: "Your Musawo Training Center student account is ready",
      template: "student-invite",
      variables: {
        name:          d.name,
        studentNumber,
        courseName:    "",   // populated by caller if needed
        inviteUrl,
      },
    }).catch(() => { /* non-fatal */ });
  }

  const { audit } = await import("@/lib/audit");
  await audit({
    actorId:    session.user.id,
    action:     "CREATE",
    entityType: "User",
    entityId:   student.id,
    metadata:   { role: "STUDENT", studentNumber, email: d.email },
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  return NextResponse.json({ student, inviteUrl }, { status: 201 });
}
