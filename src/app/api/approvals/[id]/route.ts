import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { requirePermission, assertNotSelfApproval, ForbiddenError, can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

// Requests are "actionable" when in these states
const ACTIONABLE = new Set(["SUBMITTED", "IN_REVIEW"]);

const DecideSchema = z.object({
  decision:     z.enum(["APPROVED", "REJECTED"]),
  decisionNote: z.string().min(5).max(2000),
});

const ForwardSchema = z.object({
  action:     z.literal("FORWARD"),
  reviewNote: z.string().max(2000).optional(),
});

/** GET /api/approvals/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const request = await db.approvalRequest.findUnique({
    where: { id: params.id },
    include: {
      initiator: { select: { name: true, role: true, email: true } },
      decidedBy: { select: { name: true } },
      reviewer:  { select: { name: true } },
    },
  });

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { role, id: userId } = session.user;
  const canDecide     = can(role, "approvals.decide");
  const canView       = can(role, "approvals.view");
  const isInitiator   = request.initiatorId === userId;
  const canMarkChange = request.type === "MARKS_CHANGE" && can(role, "marks.change.approve");

  if (!canDecide && !canView && !isInitiator && !canMarkChange) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ request });
}

/** PATCH /api/approvals/[id] - decide (APPROVED/REJECTED) or forward (Principal -> Director) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { role } = session.user;

  const request = await db.approvalRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!ACTIONABLE.has(request.status)) {
    return NextResponse.json({ error: "Request already decided." }, { status: 409 });
  }

  // ── FORWARD action (Principal marks IN_REVIEW and forwards to Director) ───
  if (body.action === "FORWARD") {
    const parsed = ForwardSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    // Only PRINCIPAL (or higher) may forward
    if (!can(role, "marks.change.approve") && !can(role, "approvals.decide") && !can(role, "refunds.initiate")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cannot forward your own request
    try { assertNotSelfApproval(request.initiatorId, session.user.id); }
    catch (e) {
      if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
      throw e;
    }

    const updated = await db.approvalRequest.update({
      where: { id: params.id },
      data: {
        status:     "IN_REVIEW",
        reviewerId: session.user.id,
        reviewedAt: new Date(),
        reviewNote: parsed.data.reviewNote ?? null,
      },
    });

    await audit({
      actorId:    session.user.id,
      action:     "APPROVAL_FORWARDED",
      entityType: "ApprovalRequest",
      entityId:   params.id,
      metadata:   { type: request.type, note: parsed.data.reviewNote },
      ip:         req.headers.get("x-forwarded-for") ?? undefined,
    });

    // Notify Director
    const directors = await db.user.findMany({
      where: { role: "DIRECTOR", status: "ACTIVE" },
      select: { email: true, name: true },
    });
    for (const d of directors) {
      if (!d.email) continue;
      await sendEmail({
        to: d.email,
        subject: `Forwarded for your approval: ${request.type.replace(/_/g, " ")}`,
        template: "approval-request",
        variables: {
          name:        d.name,
          requester:   session.user.name ?? "Staff",
          type:        request.type.replace(/_/g, " "),
          reason:      parsed.data.reviewNote ?? request.reason,
          amount:      request.amount ? `UGX ${request.amount.toLocaleString()}` : "N/A",
          approvalUrl: `${process.env.NEXTAUTH_URL}/director/approvals/${params.id}`,
          expiresIn:   "none",
        },
      });
    }

    return NextResponse.json({ request: updated });
  }

  // ── DECIDE action (APPROVED / REJECTED) ───────────────────────────────────
  const parsed = DecideSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // MARKS_CHANGE: Principal or Director may decide
  if (request.type === "MARKS_CHANGE") {
    if (!can(role, "marks.change.approve") && !can(role, "approvals.decide")) {
      return NextResponse.json(
        { error: "Only the Principal or Director may approve marks changes." },
        { status: 403 }
      );
    }
  } else {
    // ADMISSION: Principal may approve directly (no Director step)
    if (request.type === "ADMISSION") {
      if (!can(role, "applications.process") && !can(role, "approvals.decide")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      try { requirePermission(role, "approvals.decide"); }
      catch (e) {
        if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
        throw e;
      }
    }
  }

  // Separation of duties: no self-approval
  try { assertNotSelfApproval(request.initiatorId, session.user.id); }
  catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const updated = await db.approvalRequest.update({
    where: { id: params.id },
    data: {
      status:       parsed.data.decision,
      decidedById:  session.user.id,
      decidedAt:    new Date(),
      decisionNote: parsed.data.decisionNote,
    },
  });

  // ── Side-effects on APPROVED ──────────────────────────────────────────────
  if (parsed.data.decision === "APPROVED") {
    // PAYMENT_PROOF: mark payment COMPLETED and recalculate enrolment access
    if (request.type === "PAYMENT_PROOF" && request.paymentId) {
      const payment = await db.payment.findUnique({
        where: { id: request.paymentId },
        include: { enrolment: true },
      });
      if (payment) {
        await db.payment.update({
          where: { id: request.paymentId },
          data: { status: "COMPLETED", paidAt: new Date() },
        });
        const enrolment = payment.enrolment;
        const allPayments = await db.payment.findMany({
          where: { enrolmentId: enrolment.id, status: { in: ["COMPLETED"] } },
          select: { amount: true },
        });
        // Include the just-approved payment amount
        const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0) + payment.amount;
        const paidPercent = (enrolment as { totalFeeUgx?: number | null }).totalFeeUgx && (enrolment as { totalFeeUgx?: number | null }).totalFeeUgx! > 0
          ? Math.min(100, Math.round((totalPaid / (enrolment as { totalFeeUgx?: number | null }).totalFeeUgx!) * 100))
          : 0;
        const newStatus = paidPercent >= 100
          ? "ACTIVE" as const
          : paidPercent >= 50
          ? "PARTIALLY_PAID" as const
          : "PENDING_PAYMENT" as const;
        await db.enrolment.update({
          where: { id: enrolment.id },
          data: { paidPercent, status: newStatus },
        });
        await audit({
          actorId: session.user.id, action: "PAYMENT_CLAIM_VERIFIED",
          entityType: "Payment", entityId: request.paymentId,
          metadata: { approvalId: request.id, paidPercent, newStatus },
          ip: req.headers.get("x-forwarded-for") ?? undefined,
        });
      }
    }

    // ADMISSION: create student account and send set-password email
    const appId = (request as unknown as { applicationId?: string | null }).applicationId;
    if (request.type === "ADMISSION" && appId) {
      const application = await db.application.findUnique({
        where: { id: appId },
        include: { course: { select: { courseCode: true, title: true } } },
      });
      if (application && (application.status === "SUBMITTED" || application.status === "UNDER_REVIEW") && application.email) {
        const existingUser = await db.user.findUnique({ where: { email: application.email } });
        if (!existingUser) {
          const { createStudentWithNumber } = await import("@/lib/students");
          const { saveStudentProfile } = await import("@/lib/students/profile");
          const { user: student, studentNumber } = await createStudentWithNumber(
            { name: application.fullName, email: application.email, phone: application.phone, role: "STUDENT", status: "PENDING_ACCEPTANCE" },
            application.course?.courseCode ?? "GEN"
          );
          await saveStudentProfile(student.id, {
            professionalTitle: application.professionalTitle,
            registrationNumber: application.registrationNumber,
            dateOfBirth: application.dateOfBirth,
            gender: application.gender,
            district: application.district,
            highestQualification: application.highestQualification,
          });
          await db.staffInvite.deleteMany({ where: { email: application.email, acceptedAt: null } });
          const { randomBytes } = await import("crypto");
          const token = randomBytes(32).toString("hex");
          const studentInvite = await db.staffInvite.create({
            data: { email: application.email, role: "STUDENT", token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), createdById: session.user.id, userId: student.id },
          });
          await db.$executeRaw`UPDATE staff_invites SET "courseId" = ${application.courseId} WHERE id = ${studentInvite.id}`;
          const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
          try {
            await sendEmail({
              to: application.email,
              subject: `Your Musawo Training Center account is ready - ${application.course?.title ?? ""}`,
              template: "student-invite",
              variables: { name: application.fullName, studentNumber, courseName: application.course?.title ?? "your course", inviteUrl: `${siteUrl}/invite/${token}` },
            });
          } catch (emailErr) {
            console.error("[approvals PATCH ADMISSION] invite email failed:", emailErr);
          }
          await db.application.update({
            where: { id: appId },
            data: { status: "ACCEPTED", createdUserId: student.id, reviewedById: session.user.id, reviewedAt: new Date() },
          });
          await audit({
            actorId: session.user.id, action: "CREATE",
            entityType: "Application", entityId: appId,
            metadata: { action: "ADMISSION_APPROVED", applicant: application.fullName, email: application.email },
            ip: req.headers.get("x-forwarded-for") ?? undefined,
          });
        }
      }
    }

    // MARKS_CHANGE: apply the grade update
    if (request.type === "MARKS_CHANGE" && request.gradeEntryId) {
      const entry = await db.gradeEntry.findUnique({ where: { id: request.gradeEntryId } });
      if (entry && request.proposedScore != null) {
        const newScore   = request.proposedScore;
        const maxScore   = entry.maxScore ?? 100;
        const percentage = maxScore > 0 ? (newScore / maxScore) * 100 : 0;
        await db.gradeEntry.update({
          where: { id: request.gradeEntryId },
          data: { score: newScore, percentage, changeReason: request.reason, changeApprovalId: request.id },
        });
        await audit({
          actorId: session.user.id, action: "GRADE_CHANGE_APPROVED",
          entityType: "GradeEntry", entityId: request.gradeEntryId,
          metadata: { approvalId: request.id, newScore, reason: request.reason, via: role },
          ip: req.headers.get("x-forwarded-for") ?? undefined,
        });
      }
    }

    // Mark request as APPLIED after side-effect
    await db.approvalRequest.update({
      where: { id: params.id },
      data: { status: "APPLIED" },
    });
    await audit({
      actorId: session.user.id, action: "APPROVAL_APPLIED",
      entityType: "ApprovalRequest", entityId: params.id,
      metadata: { type: request.type },
      ip: req.headers.get("x-forwarded-for") ?? undefined,
    });
  }

  await audit({
    actorId:    session.user.id,
    action:     parsed.data.decision === "APPROVED" ? "APPROVAL_APPROVED" : "APPROVAL_REJECTED",
    entityType: "ApprovalRequest",
    entityId:   params.id,
    metadata:   { type: request.type, note: parsed.data.decisionNote },
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  // Notify initiator of decision
  const initiator = await db.user.findUnique({
    where: { id: request.initiatorId },
    select: { email: true, name: true },
  });
  if (initiator?.email) {
    await sendEmail({
      to:      initiator.email,
      subject: `Your request has been ${parsed.data.decision.toLowerCase()}: ${request.type.replace(/_/g, " ")}`,
      template: "approval-decision",
      variables: {
        name:       initiator.name,
        type:       request.type.replace(/_/g, " "),
        decision:   parsed.data.decision,
        decisionNote: parsed.data.decisionNote,
        decidedBy:  session.user.name ?? "Director",
      },
    });
  }

  return NextResponse.json({ request: updated });
}
