import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "payments.export")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url    = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";
  const method = url.searchParams.get("method") ?? "";
  const q      = url.searchParams.get("q")?.trim() ?? "";
  const period = url.searchParams.get("period") ?? "all";

  const periodDays = period === "30" ? 30 : period === "90" ? 90 : period === "365" ? 365 : null;
  const since = periodDays ? new Date(Date.now() - periodDays * 86_400_000) : undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (method) where.method = method;
  if (since)  where.createdAt = { gte: since };
  if (q) where.enrolment = { user: { name: { contains: q, mode: "insensitive" } } };

  const payments = await db.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take:    10000,
    select: {
      id: true, amount: true, method: true, status: true,
      createdAt: true, paidAt: true,
      bankTransferRef: true, gatewayRef: true, fraudStrike: true,
      enrolment: {
        select: {
          status: true, paidPercent: true,
          user:   { select: { name: true, studentNumber: true } },
          course: { select: { title: true } },
        },
      },
    },
  });

  await audit({
    actorId:    session.user.id,
    action:     "BULK_EXPORT",
    entityType: "Payment",
    metadata:   {
      type:    "payments",
      filters: { status, method, q, period },
      count:   payments.length,
      format:  "CSV",
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  const METHOD_LABEL: Record<string, string> = {
    MTN_MOMO:     "MTN MoMo",
    AIRTEL_MONEY: "Airtel Money",
    BANK_TRANSFER:"Bank transfer",
    CARD:         "Card",
    MANUAL:       "Manual",
  };

  function csvEscape(val: unknown): string {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const header = [
    "Student Name", "Student Number", "Programme",
    "Amount (UGX)", "Method", "Reference",
    "Status", "Enrolment Status", "Paid %",
    "Created Date", "Paid Date", "Fraud Flag",
  ].join(",");

  const rows = payments.map((p) =>
    [
      p.enrolment?.user?.name ?? "",
      p.enrolment?.user?.studentNumber ?? "",
      p.enrolment?.course?.title ?? "",
      p.amount,
      METHOD_LABEL[p.method] ?? p.method,
      p.bankTransferRef ?? p.gatewayRef ?? "",
      p.status,
      p.enrolment?.status ?? "",
      p.enrolment?.paidPercent ?? "",
      new Date(p.createdAt).toLocaleDateString("en-UG"),
      p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-UG") : "",
      p.fraudStrike ? "Yes" : "No",
    ].map(csvEscape).join(",")
  );

  const csv = [header, ...rows].join("\n");
  const filename = `payments-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
