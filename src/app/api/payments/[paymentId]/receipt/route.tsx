import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSetting } from "@/lib/settings";
import ReceiptPdf from "./ReceiptPdf";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payment = await db.payment.findUnique({
    where: { id: params.paymentId },
    include: {
      enrolment: {
        include: {
          user: { select: { id: true, name: true, studentNumber: true } },
          course: { select: { title: true } },
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Students may only download their own receipts
  const { role, id: userId } = session.user;
  if (role === "STUDENT" && payment.enrolment.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (payment.status !== "COMPLETED") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 409 });
  }

  const issuerName = await getSetting("certificate.issuerName", "Musawo Training Center");

  const pdf = await renderToBuffer(
    <ReceiptPdf
      studentName={payment.enrolment.user.name}
      studentNumber={payment.enrolment.user.studentNumber}
      courseTitle={payment.enrolment.course.title}
      amount={payment.amount}
      method={payment.method}
      receiptNumber={payment.receiptNumber ?? "N/A"}
      paidAt={payment.paidAt ?? payment.createdAt}
      gatewayRef={payment.gatewayRef}
      issuerName={issuerName}
    />
  );

  const safeName = payment.enrolment.user.name.replace(/[^a-z0-9]/gi, "-").slice(0, 40).toLowerCase();

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${safeName}.pdf"`,
    },
  });
}
