import MessageInbox from "@/components/dashboard/MessageInbox";

export const dynamic = "force-dynamic";

export const metadata = { title: "Messages - Instructor" };

export default function TutorMessagesPage() {
  return (
    <main className="max-w-4xl mx-auto space-y-6">
      <div className="portal-page-header">
        <h1 className="portal-page-title">Messages</h1>
        <p className="portal-page-subtitle">
          Direct messages from the Director, Principal or Admin.
        </p>
      </div>
      <MessageInbox />
    </main>
  );
}
