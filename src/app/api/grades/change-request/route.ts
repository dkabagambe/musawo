/**
 * POST /api/grades/change-request
 *
 * An INSTRUCTOR or ACADEMIC_REGISTRAR requests a change to a released grade.
 * Creates an ApprovalRequest of type MARKS_CHANGE.
 * The PRINCIPAL (or delegated DEPUTY_PRINCIPAL) approves via PATCH /api/approvals/[id].
 *
 * Required permission: marks.change.request
 *
 * Body:
 *   gradeEntryId  - the GradeEntry to change
 *   proposedScore - the corrected score (integer)
 *   reason        - why the change is needed (min 20 chars)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, ForbiddenError, assertNotSelfApproval } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { randomBytes } from "crypto";
import { z } from "zod";

const ChangeRequestSchema = z.object({
  gradeEntryId:  z.string().cuid(),
  proposedScore: z.number().int().min(0),
  reason:        z.string().min(20).max(2000),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!can(session.user.role, "marks.change.request")) {
    return NextResponse.json({ error: "Forbidden: only Teaching Staff or Academic Registrar may request a mark change." }, { status: 403 });
  }

  const parsed = ChangeRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { gradeEntryId, proposedScore, reason } = parsed.data;

  // Load the grade entry
  const entry = await db.gradeEntry.findUnique({
    where:   { id: gradeEntryId },
    include: { user: { select: { name: true, studentNumber: true } }, course: { select: { title: true } } },
  });

  if (!entry) return NextResponse.json({ error: "Grade entry not found." }, { status: 404 });

  // Grade must be released to require a change request (unreleased grades can be edited directly)
  if (!entry.releasedAt) {
    return NextResponse.json(
      { error: "This grade has not been released. You can edit it directly without a change request." },
      { status: 422 }
    );
  }

  // Check the proposed score is within range
  if (entry.maxScore !== null && proposedScore > entry.maxScore) {
    return NextResponse.json(
      { error: `Proposed score (${proposedScore}) exceeds maximum score (${entry.maxScore}).` },
      { status: 422 }
    );
  }

  // Check no pending MARKS_CHANGE already exists for this entry
  const existing = await db.approvalRequest.findFirst({
    where: { gradeEntryId, type: "MARKS_CHANGE", status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json(
      { error: "There is already a pending marks-change request for this grade entry." },
      { status: 409 }
    );
  }

  // Generate a secure approval token (valid 7 days)
  const approvalToken        = randomBytes(24).toString("hex");
  const approvalTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const approvalRequest = await db.approvalRequest.create({
    data: {
      type:          "MARKS_CHANGE",
      initiatorId:   session.user.id,
      reason,
      studentId:     entry.userId,
      gradeEntryId,
      examId:        entry.itemType === "EXAM" ? entry.itemId : null,
      proposedScore,
      approvalToken,
      approvalTokenExpires,
    },
    include: { initiator: { select: { name: true } } },
  });

  await audit({
    actorId:    session.user.id,
    action:     "GRADE_CHANGE_REQUESTED",
    entityType: "GradeEntry",
    entityId:   gradeEntryId,
    metadata:   {
      approvalId:    approvalRequest.id,
      proposedScore,
      currentScore:  entry.score,
      reason,
      student:       entry.user.name,
      course:        entry.course.title,
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  // Notify Principal accounts by email
  const principals = await db.user.findMany({
    where: { role: "PRINCIPAL", status: "ACTIVE" },
    select: { email: true, name: true },
  });

  const approvalUrl = `${process.env.NEXTAUTH_URL}/approval/${approvalToken}`;

  for (const principal of principals) {
    if (!principal.email) continue;
    await sendEmail({
      to:       principal.email,
      subject:  `Marks change request from ${approvalRequest.initiator.name} - ${entry.course.title}`,
      template: "approval-request",
      variables: {
        name:        principal.name,
        requester:   approvalRequest.initiator.name,
        type:        "MARKS CHANGE",
        reason,
        amount:      `Current: ${entry.score ?? "N/A"} / ${entry.maxScore ?? "N/A"}. Proposed: ${proposedScore} / ${entry.maxScore ?? "N/A"}`,
        approvalUrl,
        expiresIn:   "7 days",
      },
    });
  }

  return NextResponse.json({ id: approvalRequest.id }, { status: 201 });
}
