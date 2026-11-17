import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { z } from "zod";

const CreateStudentSchema = z.object({
  fullName: z.string().min(3).max(200),
  email: z.string().email().max(200),
  phone: z.string().min(9).max(20),
  courseId: z.string(),
  intakeId: z.string(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["Male", "Female", "Other"]),
  district: z.string().max(100).optional(),
  highestQualification: z.string().max(100).optional(),
  professionalTitle: z.string().max(100).optional(),
  professionalRegistrationNumber: z.string().max(100).optional(),
  emergencyContact: z.string().max(200).optional(),
  idNumber: z.string().max(50).optional(),
  category: z.enum(["REGULAR", "PROFESSIONAL", "INTERNATIONAL"]),
  applicationId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "students.create")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = CreateStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for duplicate email or phone
    const existing = await db.user.findFirst({
      where: {
        OR: [{ email: data.email }, { phone: data.phone }],
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            existing.email === data.email
              ? "Email already in use"
              : "Phone number already in use",
        },
        { status: 409 }
      );
    }

    // Get course code for registration number generation
    const course = await db.course.findUnique({
      where: { id: data.courseId },
      select: { courseCode: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Generate registration number: YYYY/COURSE_CODE/NNN
    const year = new Date().getFullYear();
    const existingCount = await db.user.count({
      where: {
        studentNumber: {
          startsWith: `${year}/${course.courseCode}/`,
        },
      },
    });
    const nextNumber = existingCount + 1;
    const registrationNumber = `${year}/${course.courseCode}/${nextNumber.toString().padStart(3, "0")}`;

    // Create student record (no password yet, will be set after approval)
    const student = await db.user.create({
      data: {
        name: data.fullName,
        email: data.email,
        phone: data.phone,
        role: "STUDENT",
        status: "PENDING", // Will become ACTIVE after Principal approval and password set
        studentNumber: registrationNumber,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        district: data.district || null,
        highestQualification: data.highestQualification || null,
        professionalTitle: data.professionalTitle || null,
        professionalRegistrationNumber: data.professionalRegistrationNumber || null,
        emergencyContact: data.emergencyContact || null,
        countryCode: "UG",
        emailVerified: null, // Will be set when they set their password
        dataConsentAt: new Date(), // Admin creating on behalf
        // Placeholder password hash (will be replaced when student sets password)
        passwordHash: await hash(Math.random().toString(36), 10),
      },
    });

    // Create enrolment record
    await db.enrolment.create({
      data: {
        userId: student.id,
        courseId: data.courseId,
        intakeId: data.intakeId,
        status: "PENDING", // Will become ACTIVE after approval
        enrolmentDate: new Date(),
      },
    });

    // If created from application, link it
    if (data.applicationId) {
      await db.application.update({
        where: { id: data.applicationId },
        data: { status: "UNDER_REVIEW" },
      });
    }

    // Create approval request for Principal
    await db.approvalRequest.create({
      data: {
        type: "ADMISSION",
        requestedBy: session.user.id,
        reason: `Student admission: ${data.fullName} for ${course.courseCode}${data.applicationId ? " (from application)" : " (walk-in registration)"}`,
        applicationId: data.applicationId || null,
        status: "PENDING",
        submittedAt: new Date(),
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        action: "STUDENT_CREATE",
        performedBy: session.user.id,
        targetUser: student.id,
        details: {
          registrationNumber,
          course: course.courseCode,
          fromApplication: !!data.applicationId,
        },
      },
    });

    return NextResponse.json({
      studentId: student.id,
      registrationNumber,
      message: "Student account created. Awaiting Principal approval.",
    });
  } catch (error) {
    console.error("[POST /api/admin/students]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
