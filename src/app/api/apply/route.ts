import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const ApplySchema = z.object({
  fullName:             z.string().min(2).max(120),
  email:                z.string().trim().email().toLowerCase(),
  phone:                z.string().min(7).max(20),
  courseId:             z.string().cuid(),
  intakeLabel:          z.string().min(1).max(80),
  category:             z.enum(["OPEN", "PROFESSIONAL"]),
  professionalTitle:    z.string().max(120).optional(),
  registrationNumber:   z.string().max(80).optional(),
  highestQualification: z.string().min(1).max(80),
  howHeard:             z.string().max(80).optional(),
  notes:                z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json() as unknown;
    const parsed = ApplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please check your details and try again." },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify course exists and is published
    const course = await db.course.findUnique({
      where: { id: data.courseId, status: "PUBLISHED" },
      select: { id: true, title: true, slug: true, category: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    // Professional courses require professional details
    if (course.category === "PROFESSIONAL" && data.category !== "PROFESSIONAL") {
      return NextResponse.json(
        { error: "This course requires a professional category." },
        { status: 400 }
      );
    }
    if (data.category === "PROFESSIONAL" && !data.professionalTitle) {
      return NextResponse.json(
        { error: "Professional title is required for professional courses." },
        { status: 400 }
      );
    }

    // Check for duplicate application (same email + course) in last 30 days
    const existingApplication = await db.application.findFirst({
      where: {
        email: data.email,
        courseId: data.courseId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        status: { notIn: ["REJECTED", "WITHDRAWN"] },
      },
    });
    if (existingApplication) {
      return NextResponse.json(
        { error: "An application for this course already exists for this email address. Please contact admissions@musawo.ug if you need help." },
        { status: 409 }
      );
    }

    // Find the first open intake for this course
    const intake = await db.intake.findFirst({
      where: { courseId: data.courseId, isOpen: true },
      orderBy: { startDate: "asc" },
    });

    // Create the Application record
    const application = await db.application.create({
      data: {
        courseId:             data.courseId,
        intakeId:             intake?.id ?? null,
        fullName:             data.fullName,
        email:                data.email,
        phone:                data.phone,
        category:             data.category,
        professionalTitle:    data.professionalTitle ?? null,
        registrationNumber:   data.registrationNumber ?? null,
        highestQualification: data.highestQualification,
        howHeard:             data.howHeard ?? null,
        notes:                data.notes ?? null,
        status:               "SUBMITTED",
      },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.musawo.ug";

    // Email applicant confirmation
    await sendEmail({
      to:       data.email,
      subject:  `Application received - ${course.title}`,
      template: "application-confirmation",
      variables: {
        name:           data.fullName,
        courseName:     course.title,
        intakeLabel:    data.intakeLabel,
        applicationRef: application.id,
      },
    });

    // Notify Registrar(s)
    const registrars = await db.user.findMany({
      where: { role: "ACADEMIC_REGISTRAR", status: "ACTIVE" },
      select: { email: true, name: true },
    });

    for (const registrar of registrars) {
      if (!registrar.email) continue;
      await sendEmail({
        to:       registrar.email,
        subject:  `New application: ${data.fullName} for ${course.title}`,
        template: "application-received-registrar",
        variables: {
          name:        data.fullName,
          courseName:  course.title,
          category:    data.category === "PROFESSIONAL" ? "Professional" : "Open to all",
          email:       data.email,
          phone:       data.phone,
          submittedAt: new Date().toLocaleDateString("en-UG"),
          reviewUrl:   `${siteUrl}/registrar/applications/${application.id}`,
        },
      });
    }

    return NextResponse.json({ success: true, applicationId: application.id });
  } catch (err) {
    console.error("[api/apply] error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again or contact admissions@musawo.ug." },
      { status: 500 }
    );
  }
}
