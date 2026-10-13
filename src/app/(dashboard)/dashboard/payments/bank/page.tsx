import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import BankPaymentForm from "@/components/payment/BankPaymentForm";

export const metadata = { title: "Pay by Bank Transfer" };

export default async function BankPaymentPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Get enrolled courses that are pending payment or need next instalment
  const enrolments = await db.enrolment.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["PENDING_PAYMENT", "ACTIVE"] },
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          fullFeeUgx: true,
          instalmentCount: true,
          slug: true,
        },
      },
      payments: {
        where: { status: "PENDING_APPROVAL" },
        select: { id: true, bankTransferRef: true, createdAt: true },
      },
    },
  });

  // Also get published courses not yet enrolled — student may want to pay first
  const allCourses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true, fullFeeUgx: true, instalmentCount: true, slug: true },
  });

  const enrolledCourseIds = new Set(enrolments.map((e) => e.courseId));
  const unenrolledCourses = allCourses.filter((c) => !enrolledCourseIds.has(c.id));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/payments" className="text-sm text-gray-400 hover:text-primary no-underline">
          ← Back to payments
        </Link>
      </div>

      <h1 className="text-2xl mb-2">Pay by Bank Transfer</h1>
      <p className="text-gray-500 text-sm mb-8">
        Deposit your fees at any bank branch or via mobile banking, then upload
        your receipt below. Your enrolment will be activated once an admin
        verifies the payment (usually within 1-2 business days).
      </p>

      {/* Pending approval notices */}
      {enrolments.some((e) => e.payments.length > 0) && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-amber-800 mb-1">⏳ Payments awaiting review</p>
          {enrolments
            .filter((e) => e.payments.length > 0)
            .map((e) =>
              e.payments.map((p) => (
                <p key={p.id} className="text-xs text-amber-700">
                  {e.course.title} - Ref: {p.bankTransferRef} - submitted{" "}
                  {new Date(p.createdAt).toLocaleDateString("en-UG")}
                </p>
              ))
            )}
        </div>
      )}

      {/* Course selector + form */}
      {enrolments.length === 0 && unenrolledCourses.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-gray-500">No courses available for payment right now.</p>
          <Link href="/courses" className="btn-primary mt-4 no-underline">Browse courses</Link>
        </div>
      )}

      {/* Show form for each enrolled pending course */}
      {enrolments
        .filter((e) => e.status === "PENDING_PAYMENT")
        .map((enr) => (
          <div key={enr.id} className="mb-8">
            <h2 className="text-base font-semibold mb-3">{enr.course.title}</h2>
            <BankPaymentForm
              courseId={enr.course.id}
              courseName={enr.course.title}
              fullFeeUgx={enr.totalAmountUgx}
              instalmentCount={enr.course.instalmentCount}
            />
          </div>
        ))}

      {/* Show form for unenrolled courses */}
      {unenrolledCourses.map((course) => (
        <div key={course.id} className="mb-8">
          <h2 className="text-base font-semibold mb-3">{course.title}</h2>
          <BankPaymentForm
            courseId={course.id}
            courseName={course.title}
            fullFeeUgx={course.fullFeeUgx}
            instalmentCount={course.instalmentCount}
          />
        </div>
      ))}
    </div>
  );
}
