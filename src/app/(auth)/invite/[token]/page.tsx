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
    return (
      <StudentAcceptForm
        token={params.token}
        student={invite.user}
      />
    );
  }

  return <AcceptInviteForm token={params.token} email={invite.email} role={invite.role} />;
}
