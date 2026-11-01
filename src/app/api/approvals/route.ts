import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can, requirePermission, ForbiddenError } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { randomBytes } from "crypto";
import { z } from "zod";

const CreateSchema = z.object({
  type: z.enum([
    "REFUND","WAIVER","FEE_CHANGE",
    "STAFF_ACCOUNT_CREATE","STAFF_ACCOUNT_SUSPEND","STAFF_ACCOUNT_ROLE_CHANGE",
    "MARKS_CHANGE","BULK_EXPORT",
    "ADMISSION","ACADEMIC_PROGRAMME_CHANGE","COURSE_CHANGE",
    "RESULTS_PUBLICATION","CERTIFICATE_ISSUANCE","PAYMENT_PROOF",
    "EQUIPMENT_REQUEST","STORAGE_CLEARING","ROLE_ASSIGNMENT",
  ]),
  reason:        z.string().min(10).max(2000),
  amount:        z.number().int().positive().optional(),
  studentId:     z.string().cuid().optional(),
  enrolmentId:   z.string().cuid().optional(),
  paymentId:     z.string().cuid().optional(),
  staffUserId:   z.string().cuid().optional(),
  gradeEntryId:  z.string().cuid().optional(),
  examId:        z.string().cuid().optional(),
  proposedScore: z.number().int().min(0).optional(),
  courseId:      z.string().cuid().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId } = session.user;

  let where: Record<string, unknown> = {};
  if (can(role, "approvals.decide")) {
    // SUPER_ADMIN sees all; other approvers see all too (they need to action them)
  } else if (can(role, "approvals.view")) {
    // sees own requests only
    where = { initiatorId: userId };
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await db.approvalRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      initiator: { select: { name: true, role: true } },
      decidedBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  // SUPERADMIN cannot initiate requests they'll also approve (no one else is SUPERADMIN)
  // Other roles: check they have initiation permission for this type
  const initiationPermMap: Record<string, string> = {
    REFUND:                    "refunds.initiate",
    WAIVER:                    "waivers.initiate",
    FEE_CHANGE:                "fees.change.initiate",
    STAFF_ACCOUNT_CREATE:      "staff.create.initiate",
    STAFF_ACCOUNT_SUSPEND:     "staff.suspend.initiate",
    STAFF_ACCOUNT_ROLE_CHANGE: "staff.suspend.initiate",
    MARKS_CHANGE:              "marks.change.request",
    BULK_EXPORT:               "students.export",
    ADMISSION:                 "applications.process",
    ACADEMIC_PROGRAMME_CHANGE: "courses.publish",
    COURSE_CHANGE:             "courses.edit",
    RESULTS_PUBLICATION:       "exams.release",
    CERTIFICATE_ISSUANCE:      "certificates.issue",
    PAYMENT_PROOF:             "payments.collect",
    EQUIPMENT_REQUEST:         "equipment.manage",
    STORAGE_CLEARING:          "student.documents.manage",
    ROLE_ASSIGNMENT:           "staff.create.approve",
  };

  try {
    requirePermission(session.user.role, initiationPermMap[data.type] as never);
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  // Generate a secure approval token (48-char hex, valid 72 h)
  const approvalToken        = randomBytes(24).toString("hex");
  const approvalTokenExpires = new Date(Date.now() + 72 * 60 * 60 * 1000);

  const request = await db.approvalRequest.create({
    data: {
      type:          data.type,
      initiatorId:   session.user.id,
      reason:        data.reason,
      amount:        data.amount ?? null,
      studentId:     data.studentId ?? null,
      enrolmentId:   data.enrolmentId ?? null,
      paymentId:     data.paymentId ?? null,
      staffUserId:   data.staffUserId ?? null,
      gradeEntryId:  data.gradeEntryId ?? null,
      examId:        data.examId ?? null,
      proposedScore: data.proposedScore ?? null,
      courseId:      data.courseId ?? null,
      approvalToken,
      approvalTokenExpires,
    },
    include: { initiator: { select: { name: true } } },
  });

  await audit({
    actorId:    session.user.id,
    action:     "APPROVAL_REQUESTED",
    entityType: "ApprovalRequest",
    entityId:   request.id,
    metadata:   { type: data.type },
    ip:         req.headers.get("x-forwarded-for") ?? undefined,
  });

  // Email every DIRECTOR (final approver for all requests)
  const superadmins = await db.user.findMany({
    where: { role: "DIRECTOR", status: "ACTIVE" },
    select: { email: true, name: true },
  });

  const approvalUrl = `${process.env.NEXTAUTH_URL}/approval/${approvalToken}`;
  const typeLabel = data.type.replace(/_/g, " ");

  for (const sa of superadmins) {
    if (!sa.email) continue;
    await sendEmail({
      to:       sa.email,
      subject:  `Action required: ${typeLabel} request from ${request.initiator.name}`,
      template: "approval-request",
      variables: {
        name:        sa.name,
        requester:   request.initiator.name,
        type:        typeLabel,
        reason:      data.reason,
        amount:      data.amount ? `UGX ${data.amount.toLocaleString()}` : "N/A",
        approvalUrl,
        expiresIn:   "72 hours",
      },
    });
  }

  return NextResponse.json({ id: request.id }, { status: 201 });
}
