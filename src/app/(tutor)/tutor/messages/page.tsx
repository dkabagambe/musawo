import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { can } from "@/lib/rbac";
import TutorMessagesClient from "./TutorMessagesClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Messages - Instructor" };

export default async function TutorMessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.role, "messaging.students.own")) redirect("/403");

  return (
    <main className="max-w-5xl mx-auto space-y-4">
      <div className="portal-page-header">
        <h1 className="portal-page-title">Messages</h1>
        <p className="portal-page-subtitle">
          Direct messages with your students. Use the Message button on the Students page to start a conversation.
        </p>
      </div>
      <div style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
        <TutorMessagesClient currentUserId={session.user.id} />
      </div>
    </main>
  );
}
