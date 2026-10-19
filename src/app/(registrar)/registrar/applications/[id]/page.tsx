import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import ApplicationActions from "./ApplicationActions";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  const app = await db.application.findUnique({
    where: { id: params.id },
    select: { fullName: true },
  });
  return { title: app ? `Application: ${app.fullName} - Registrar` : "Application" };
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  SUBMITTED:    { label: "Submitted",    cls: "badge-info" },
  UNDER_REVIEW: { label: "Under review", cls: "badge-warning" },
  ACCEPTED:     { label: "Accepted",     cls: "badge-success" },
  REJECTED:     { label: "Rejected",     cls: "badge-danger" },
  WITHDRAWN:    { label: "Withdrawn",    cls: "bg-gray-100 text-gray-500" },
};

export default async function ApplicationDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "applications.view")) redirect("/dashboard");

  const application = await db.application.findUnique({
    where: { id: params.id },
    include: {
      course: { select: { id: true, title: true, slug: true, fullFeeUgx: true } },
      intake: { select: { id: true, label: true, startDate: true, seats: true } },
    },
  });

  if (!application) notFound();

  const canProcess = can(session.user.role, "applications.process");
  const isPending = application.status === "SUBMITTED" || application.status === "UNDER_REVIEW";

  // If accepted, look up the created user
  const createdUser = application.createdUserId
    ? await db.user.findUnique({
        where: { id: application.createdUserId },
        select: { id: true, name: true, email: true, studentNumber: true, status: true },
      })
    : null;

  const reviewedBy = application.reviewedById
    ? await db.user.findUnique({
        where: { id: application.reviewedById },
        select: { name: true, role: true },
      })
    : null;

  const st = STATUS_LABELS[application.status] ?? { label: application.status, cls: "badge-info" };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/registrar/applications" className="text-xs text-accent no-underline hover:underline">
            ← Back to applications
          </Link>
          <h1 className="text-2xl font-bold text-primary mt-1">{application.fullName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Applied {new Date(application.createdAt).toLocaleDateString("en-UG", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>
        <span className={`badge text-sm ${st.cls}`}>{st.label}</span>
      </div>

      {/* Applicant details */}
      <div className="card space-y-4">
        <h2 className="font-semibold">Applicant details</h2>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Detail label="Full name"   value={application.fullName} />
          <Detail label="Email"       value={application.email} />
          <Detail label="Phone"       value={application.phone} />
          <Detail label="Category"    value={application.category === "PROFESSIONAL" ? "Professional" : "Open"} />
          {application.professionalTitle && (
            <Detail label="Professional title" value={application.professionalTitle} />
          )}
          {application.registrationNumber && (
            <Detail label="Registration number" value={application.registrationNumber} />
          )}
          {application.highestQualification && (
            <Detail label="Highest qualification" value={application.highestQualification} />
          )}
          {application.dateOfBirth && (
            <Detail label="Date of birth" value={new Date(application.dateOfBirth).toLocaleDateString("en-UG")} />
          )}
          {application.gender && (
            <Detail label="Gender" value={application.gender} />
          )}
          {application.district && (
            <Detail label="District" value={application.district} />
          )}
          {application.howHeard && (
            <Detail label="How they heard about us" value={application.howHeard} />
          )}
        </dl>

        {application.notes && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Notes from applicant</p>
            <p className="text-sm text-gray-600 bg-surface rounded-xl p-3 border border-border">
              {application.notes}
            </p>
          </div>
        )}
      </div>

      {/* Course & intake */}
      <div className="card space-y-3">
        <h2 className="font-semibold">Course applied for</h2>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Detail label="Course" value={application.course?.title ?? "-"} />
          <Detail label="Intake" value={application.intake?.label ?? "-"} />
          {application.intake?.startDate && (
            <Detail label="Start date" value={new Date(application.intake.startDate).toLocaleDateString("en-UG", {
              day: "numeric", month: "long", year: "numeric",
            })} />
          )}
          {application.course?.fullFeeUgx && (
            <Detail label="Course fee" value={`UGX ${application.course.fullFeeUgx.toLocaleString()}`} />
          )}
        </dl>
      </div>

      {/* Review history */}
      {(application.reviewedById || application.rejectionReason) && (
        <div className="card space-y-3">
          <h2 className="font-semibold">Review</h2>
          {reviewedBy && (
            <Detail label="Reviewed by" value={`${reviewedBy.name} (${reviewedBy.role.replace(/_/g, " ")})`} />
          )}
          {application.reviewedAt && (
            <Detail label="Reviewed on" value={new Date(application.reviewedAt).toLocaleDateString("en-UG", {
              day: "numeric", month: "long", year: "numeric",
            })} />
          )}
          {application.rejectionReason && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Rejection reason</p>
              <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl p-3">
                {application.rejectionReason}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Created student account */}
      {createdUser && (
        <div className="card space-y-3 border-success/30 bg-success/5">
          <h2 className="font-semibold text-success">Student account created</h2>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <Detail label="Student number" value={createdUser.studentNumber ?? "-"} />
            <Detail label="Name"           value={createdUser.name} />
            <Detail label="Email"          value={createdUser.email ?? "-"} />
            <Detail label="Account status" value={createdUser.status} />
          </dl>
        </div>
      )}

      {/* Actions */}
      {canProcess && isPending && (
        <ApplicationActions
          applicationId={application.id}
          applicantName={application.fullName}
          applicantEmail={application.email}
          courseId={application.courseId ?? ""}
          courseTitle={application.course?.title ?? ""}
          intakeId={application.intakeId ?? undefined}
          currentStatus={application.status}
        />
      )}

      {!isPending && !canProcess && (
        <p className="text-sm text-gray-400 text-center">
          This application has been {application.status.toLowerCase()} and no further action is needed.
        </p>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</dt>
      <dd className="text-gray-700">{value}</dd>
    </div>
  );
}
