import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import AcceptInviteForm from "./AcceptInviteForm";
import StudentAcceptForm from "./StudentAcceptForm";

export const metadata = { title: "Accept Invite - Musawo Training Center" };

export default async function AcceptInvitePage({ params }: { params: { token: string } }) {
  const invite = await db.staffInvite.findUnique({
    where: { token: params.token },
    include: {
      user: {
        select: {
          id: true, name: true, email: true, phone: true,
          studentNumber: true, status: true,
        },
      },
    },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    notFound();
  }

  // Student invites have a userId pointing to the pre-created student account
  if (invite.userId && invite.user && invite.role === "STUDENT") {
    const [profiles, courseAssignments, application] = await Promise.all([
      db.$queryRaw<Array<{ professionalTitle: string | null; registrationNumber: string | null; dateOfBirth: Date | null; gender: string | null; district: string | null; highestQualification: string | null; emergencyContact: string | null }>>`SELECT "professionalTitle", "registrationNumber", "dateOfBirth", gender, district, "highestQualification", "emergencyContact" FROM users WHERE id = ${invite.user.id}`,
      db.$queryRaw<Array<{ courseName: string | null; intakeLabel: string | null }>>`SELECT c.title AS "courseName", i.label AS "intakeLabel" FROM staff_invites si LEFT JOIN courses c ON c.id = si."courseId" LEFT JOIN intakes i ON i.id = si."intakeId" WHERE si.id = ${invite.id} LIMIT 1`,
      db.application.findFirst({ where: { createdUserId: invite.user.id }, include: { course: { select: { title: true } }, intake: { select: { label: true } } } }),
    ]);
    const profile = profiles[0];
    const assignedCourse = courseAssignments[0];
    return (
      <StudentAcceptForm
        token={params.token}
        student={{
          ...invite.user,
          professionalTitle: profile?.professionalTitle ?? null,
          registrationNumber: profile?.registrationNumber ?? null,
          dateOfBirth: profile?.dateOfBirth?.toISOString().slice(0, 10) ?? null,
          gender: profile?.gender ?? null,
          district: profile?.district ?? null,
          highestQualification: profile?.highestQualification ?? null,
          emergencyContact: profile?.emergencyContact ?? null,
          courseName: application?.course?.title ?? assignedCourse?.courseName ?? null,
          intakeLabel: application?.intake?.label ?? assignedCourse?.intakeLabel ?? null,
        }}
      />
    );
  }

  return <AcceptInviteForm token={params.token} email={invite.email} role={invite.role} />;
}
