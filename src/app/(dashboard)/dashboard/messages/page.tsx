import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import StudentMessagesClient from "./StudentMessagesClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Messages - Student" };

export default async function StudentMessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="max-w-5xl mx-auto space-y-4">
      <div className="portal-page-header">
        <h1 className="portal-page-title">Messages</h1>
        <p className="portal-page-subtitle">
          Direct messages from your instructors and the administration.
        </p>
      </div>
      <div style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
        <StudentMessagesClient currentUserId={session.user.id} />
      </div>
    </main>
  );
}
