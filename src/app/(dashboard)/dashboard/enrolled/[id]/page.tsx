import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { getAccessLevel } from "@/lib/enrolment/access";

export const metadata = { title: "You're enrolled! - Musawo Training Center" };

export default async function EnrolledPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrolment = await db.enrolment.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      course: {
        select: {
          title: true,
          slug: true,
          thumbnailUrl: true,
          accreditationText: true,
          tutor: { select: { name: true } },
          blocks: {
            orderBy: { order: "asc" },
            take: 1,
            include: { lessons: { orderBy: { order: "asc" }, take: 1 } },
          },
        },
      },
      payments: {
        where: { status: "COMPLETED" },
        orderBy: { paidAt: "desc" },
        take: 1,
      },
      intake: { select: { label: true, startDate: true } },
    },
  });

  if (!enrolment) notFound();

  const level = getAccessLevel({
    status: enrolment.status,
    paidPercent: enrolment.paidPercent,
    unlockedBlockOrder: enrolment.unlockedBlockOrder,
    provisionalUntil: enrolment.provisionalUntil,
    graceUntil: enrolment.graceUntil,
    overdueSince: enrolment.overdueSince,
  });

  const firstLesson = enrolment.course.blocks[0]?.lessons[0];
  const lastPayment = enrolment.payments[0];

  const canStart = level === "FULL" || level === "PARTIAL" || level === "PROVISIONAL" || level === "COMPLETED";

  const CHECKLIST = [
    { done: true,     label: "Account created" },
    { done: canStart, label: "Payment confirmed" },
    { done: false,    label: "Watch your first lesson" },
    { done: false,    label: "Join your first live class" },
    { done: false,    label: "Pass your first block exam" },
    { done: false,    label: "Earn your certificate" },
  ];

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Hero */}
      <div className="card text-center mb-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <p className="text-5xl mb-3" aria-hidden="true">🎉</p>
        <h1 className="text-2xl font-bold text-primary mb-1">You&apos;re enrolled!</h1>
        <p className="text-gray-600 text-sm">
          Welcome to <span className="font-semibold">{enrolment.course.title}</span>
        </p>
        {enrolment.course.tutor && (
          <p className="text-xs text-gray-400 mt-1">Tutor: {enrolment.course.tutor.name}</p>
        )}
        {enrolment.intake && (
          <p className="text-xs text-gray-400 mt-0.5">
            Intake: {enrolment.intake.label} · starts{" "}
            {new Date(enrolment.intake.startDate).toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
        {enrolment.course.accreditationText && (
          <p className="text-xs text-success mt-2">✓ {enrolment.course.accreditationText}</p>
        )}
      </div>

      {/* Payment receipt summary */}
      {lastPayment && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-3">Payment receipt</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Amount paid</span>
              <span className="font-semibold">UGX {lastPayment.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span>{lastPayment.paidAt ? new Date(lastPayment.paidAt).toLocaleDateString("en-UG") : "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Reference</span>
              <span className="font-mono text-xs">{lastPayment.gatewayRef ?? lastPayment.id.slice(-8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="badge badge-success text-xs">Confirmed</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <Link
              href={`/dashboard/payments`}
              className="text-xs text-accent no-underline hover:underline"
            >
              View all payments →
            </Link>
          </div>
        </div>
      )}

      {/* Getting started checklist */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4">Getting started</h2>
        <ul className="space-y-3">
          {CHECKLIST.map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  item.done ? "bg-success text-white" : "bg-border text-gray-400"
                }`}
                aria-hidden="true"
              >
                {item.done ? "✓" : i + 1}
              </span>
              <span className={item.done ? "line-through text-gray-400" : ""}>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        {canStart && firstLesson ? (
          <Link
            href={`/dashboard/courses/${enrolment.course.slug}?lesson=${firstLesson.id}`}
            className="btn-primary no-underline text-center flex-1"
          >
            Start learning →
          </Link>
        ) : (
          <Link href="/dashboard/courses" className="btn-primary no-underline text-center flex-1">
            Go to my courses
          </Link>
        )}
        <Link href="/dashboard" className="btn-outline no-underline text-center flex-1">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
