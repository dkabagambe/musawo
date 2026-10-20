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
  email:               z.string().trim().email().toLowerCase().optional(),
  phone:               z.string().min(7).max(20).optional(),
  courseId:            z.string().cuid().optional(),
  intakeId:            z.string().cuid().optional(),
  category:            z.enum(["OPEN", "PROFESSIONAL"]).default("OPEN"),
  professionalTitle:   z.string().max(120).optional(),
  registrationNumber:  z.string().max(80).optional(),
  dateOfBirth:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender:              z.string().max(20).optional(),
  district:            z.string().max(80).optional(),
  highestQualification:z.string().max(100).optional(),
  emergencyContact:    z.string().max(200).optional(),
  idNumber:            z.string().max(80).optional(),
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
  if (d.category === "PROFESSIONAL" && !d.registrationNumber)
    return NextResponse.json({ error: "Professional registration number is required for professional category." }, { status: 400 });

  let courseDetails: { id: string; title: string; category: string; fullFeeUgx: number | null } | null = null;
  if (d.courseId) {
    courseDetails = await db.course.findUnique({ where: { id: d.courseId }, select: { id: true, title: true, category: true, fullFeeUgx: true } });
    if (!courseDetails) return NextResponse.json({ error: "Selected course was not found." }, { status: 400 });
    if (courseDetails.category === "PROFESSIONAL" && d.category !== "PROFESSIONAL") {
      return NextResponse.json({ error: "This course requires a professional category." }, { status: 400 });
    }
  }
  if (d.intakeId) {
    const intake = await db.intake.findUnique({ where: { id: d.intakeId }, select: { courseId: true } });
    if (!intake || (d.courseId && intake.courseId !== d.courseId)) {
      return NextResponse.json({ error: "Selected intake does not match the course." }, { status: 400 });
    }
  }

  // Uniqueness checks
  if (d.email) {
    const ex = await db.user.findUnique({ where: { email: d.email } });
    if (ex) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }
  if (d.phone) {
    const ex = await db.user.findUnique({ where: { phone: d.phone } });
    if (ex) return NextResponse.json({ error: "An account with this phone already exists." }, { status: 409 });
  }

  const { createStudentWithNumber } = await import("@/lib/students");
  const { encryptPersonalData } = await import("@/lib/crypto/personal-data");

  // Create user in PENDING_ACCEPTANCE status - they must accept the invite before login
  const { user: createdStudent, studentNumber } = await createStudentWithNumber({
      name:          d.name,
      email:         d.email ?? null,
      phone:         d.phone ?? null,
      role:          "STUDENT",
      status:        "PENDING_ACCEPTANCE",
  });
  const student = {
    id: createdStudent.id,
    name: createdStudent.name,
    email: createdStudent.email,
    phone: createdStudent.phone,
    studentNumber,
    status: createdStudent.status,
  };

  const { saveStudentProfile } = await import("@/lib/students/profile");
  await saveStudentProfile(student.id, {
    professionalTitle: d.professionalTitle,
    registrationNumber: d.registrationNumber,
    dateOfBirth: d.dateOfBirth ? new Date(`${d.dateOfBirth}T00:00:00.000Z`) : null,
    gender: d.gender,
    district: d.district,
    highestQualification: d.highestQualification,
    idNumberEncrypted: d.idNumber ? encryptPersonalData(d.idNumber) : null,
    emergencyContact: d.emergencyContact,
  });

  if (courseDetails && courseDetails.fullFeeUgx !== null) {
    await db.enrolment.create({
      data: {
        userId: student.id,
        courseId: courseDetails.id,
        intakeId: d.intakeId ?? null,
        totalAmountUgx: courseDetails.fullFeeUgx,
        status: "PENDING_PAYMENT",
      },
    });
  }

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

  const studentInvite = await db.staffInvite.create({
    data: {
      email:       d.email ?? `${student.id}@placeholder.mtc`,
      role:        "STUDENT",
      token,
      expiresAt,
      createdById: session.user.id,
      userId:      student.id,   // link to the pre-created student record
    },
  });
  if (d.courseId || d.intakeId) await db.$executeRaw`UPDATE staff_invites SET "courseId" = ${d.courseId ?? null}, "intakeId" = ${d.intakeId ?? null} WHERE id = ${studentInvite.id}`;

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
        courseName:    courseDetails?.title ?? "",
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
