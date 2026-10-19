import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import crypto from "crypto";
import { z } from "zod";

const PatchSchema = z.object({
  action: z.enum(["ACCEPT", "REJECT", "UNDER_REVIEW"]),
  rejectionReason: z.string().min(5).max(2000).optional(),
});

interface Context {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try { requirePermission(session.user.role, "applications.process"); }
  catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: (e as Error).message }, { status: 403 });
    throw e;
  }

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { action, rejectionReason } = parsed.data;

  const application = await db.application.findUnique({
    where: { id: params.id },
    include: {
      course: { select: { id: true, title: true, fullFeeUgx: true } },
      intake: { select: { id: true, label: true } },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  if (application.status === "ACCEPTED" || application.status === "WITHDRAWN") {
    return NextResponse.json(
      { error: `Cannot action an application that is already ${application.status.toLowerCase()}.` },
      { status: 409 }
    );
  }

  if (action === "UNDER_REVIEW") {
    await db.application.update({
      where: { id: params.id },
      data: {
        status: "UNDER_REVIEW",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    await audit({
      actorId: session.user.id,
      action: "UPDATE",
      entityType: "Application",
      entityId: params.id,
      metadata: { action: "UNDER_REVIEW", applicant: application.fullName },
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({ status: "UNDER_REVIEW" });
  }

  if (action === "REJECT") {
    if (!rejectionReason) {
      return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 });
    }

    await db.application.update({
      where: { id: params.id },
      data: {
        status: "REJECTED",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        rejectionReason,
      },
    });

    await audit({
      actorId: session.user.id,
      action: "UPDATE",
      entityType: "Application",
      entityId: params.id,
      metadata: { action: "REJECTED", applicant: application.fullName, reason: rejectionReason },
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    });

    // Notify the applicant
    try {
      await sendEmail({
        to: application.email,
        subject: `Your application to Musawo Training Center`,
        template: "application-rejected",
        variables: {
          name: application.fullName,
          courseName: application.course?.title ?? "the course",
          reason: rejectionReason,
        },
      });
    } catch (emailErr) {
      console.error("[applications PATCH] rejection email failed:", emailErr);
      // Don't block the response — rejection is saved regardless
    }

    return NextResponse.json({ status: "REJECTED" });
  }

  // ── ACCEPT: create student account via invite link ──────────────────────────
  if (action === "ACCEPT") {
    // Check if user already exists (reapplication edge case)
    const existingUser = await db.user.findUnique({ where: { email: application.email } });
    if (existingUser) {
      // Just mark the application as accepted and link the user
      await db.application.update({
        where: { id: params.id },
        data: {
          status: "ACCEPTED",
          reviewedById: session.user.id,
          reviewedAt: new Date(),
          createdUserId: existingUser.id,
        },
      });
      return NextResponse.json({ status: "ACCEPTED", userId: existingUser.id, alreadyExisted: true });
    }

    // Delete any previous unused invite for this email
    await db.staffInvite.deleteMany({ where: { email: application.email, acceptedAt: null } });

    // Create a student invite token (valid 7 days)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.staffInvite.create({
      data: {
        email: application.email,
        role: "STUDENT",
        token,
        expiresAt,
        createdById: session.user.id,
      },
    });

    const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const acceptUrl = `${siteUrl}/invite/${token}`;

    // Send the invite email
    try {
      await sendEmail({
        to: application.email,
        subject: `Your application has been accepted - ${application.course?.title ?? "Musawo Training Center"}`,
        template: "application-accepted",
        variables: {
          name:        application.fullName,
          courseName:  application.course?.title ?? "your course",
          intakeLabel: application.intake?.label ?? "",
          inviteUrl:   acceptUrl,
          expiresIn:   "7 days",
          feeUgx:      application.course?.fullFeeUgx
            ? `UGX ${application.course.fullFeeUgx.toLocaleString()}`
            : "see course page",
        },
      });
    } catch (emailErr) {
      console.error("[applications PATCH] acceptance email failed:", emailErr);
    }

    // Update the application status (createdUserId will be set when they accept the invite)
    await db.application.update({
      where: { id: params.id },
      data: {
        status: "ACCEPTED",
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    await audit({
      actorId: session.user.id,
      action: "CREATE",
      entityType: "Application",
      entityId: params.id,
      metadata: {
        action: "ACCEPTED",
        applicant: application.fullName,
        email: application.email,
        courseId: application.courseId,
      },
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({ status: "ACCEPTED", inviteSent: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
