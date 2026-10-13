import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import AcceptInviteForm from "./AcceptInviteForm";

export const metadata = { title: "Accept Staff Invite — Musawo Training Center" };

export default async function AcceptInvitePage({ params }: { params: { token: string } }) {
  const invite = await db.staffInvite.findUnique({ where: { token: params.token } });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    notFound();
  }

  return <AcceptInviteForm token={params.token} email={invite.email} role={invite.role} />;
}
