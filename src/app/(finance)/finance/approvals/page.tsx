import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import FinanceApprovalsClient from "./FinanceApprovalsClient";

export const metadata = { title: "Approval Requests - Finance" };

export default async function FinanceApprovalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "claims.review") && !can(session.user.role, "fees.change.initiate") && !can(session.user.role, "refunds.initiate")) {
    redirect("/403");
  }

  const [myRequests, enrolments] = await Promise.all([
    db.approvalRequest.findMany({
      where: { initiatorId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        decidedBy: { select: { name: true } },
      },
    }),
    db.enrolment.findMany({
      where: { status: { in: ["ACTIVE", "PARTIALLY_PAID", "OVERDUE", "PENDING_PAYMENT"] } },
      select: {
        id: true,
        status: true,
        user: { select: { id: true, name: true, studentNumber: true } },
        course: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return (
    <FinanceApprovalsClient
      myRequests={myRequests.map((r) => ({
        id: r.id,
        type: r.type as "REFUND" | "WAIVER" | "FEE_CHANGE",
        status: r.status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED",
        reason: r.reason,
        amount: r.amount,
        studentId: r.studentId,
        enrolmentId: r.enrolmentId,
        decisionNote: r.decisionNote,
        decidedBy: r.decidedBy?.name ?? null,
        decidedAt: r.decidedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      }))}
      enrolments={enrolments.map((e) => ({
        id: e.id,
        studentName: e.user.name,
        studentNumber: e.user.studentNumber ?? "",
        studentId: e.user.id,
        courseTitle: e.course.title,
        status: e.status,
      }))}
    />
  );
}
