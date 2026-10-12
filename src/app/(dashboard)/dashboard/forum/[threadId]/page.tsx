import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import ForumReplyForm from "./ReplyForm";

interface Props { params: { threadId: string } }

export default async function ForumThreadPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const thread = await db.forumThread.findUnique({
    where: { id: params.threadId },
    include: {
      author: { select: { name: true, role: true } },
      course: { select: { id: true, title: true } },
      replies: {
        include: { author: { select: { name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!thread) notFound();

  // Check user is enrolled in this course
  const enrolment = await db.enrolment.findFirst({
    where: { userId: session.user.id, courseId: thread.courseId, status: { in: ["ACTIVE", "COMPLETED"] } },
  });
  const isTutorOrAdmin = ["TUTOR", "ADMIN"].includes(session.user.role);
  if (!enrolment && !isTutorOrAdmin) redirect("/dashboard/forum");

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/dashboard/forum" className="text-sm text-gray-400 hover:text-primary no-underline mb-4 block">
        ← Back to forum
      </Link>

      <div className="card mb-4">
        <span className="badge-info badge text-xs mb-2 inline-block">{thread.course.title}</span>
        <h1 className="text-xl font-semibold mb-2">{thread.title}</h1>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <span className="font-medium text-gray-600">{thread.author.name}</span>
          {thread.author.role === "TUTOR" && <span className="badge-success badge">Tutor</span>}
          <span>·</span>
          <span>{new Date(thread.createdAt).toLocaleDateString("en-UG")}</span>
        </div>
        <p className="text-gray-700 whitespace-pre-wrap text-sm">{thread.body}</p>
      </div>

      {/* Replies */}
      {thread.replies.length > 0 && (
        <div className="space-y-3 mb-6">
          {thread.replies.map((reply) => (
            <div key={reply.id} className={`card text-sm ${reply.author.role === "TUTOR" || reply.author.role === "ADMIN" ? "border-accent/30 bg-accent/5" : ""}`}>
              <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
                <span className="font-medium text-gray-700">{reply.author.name}</span>
                {(reply.author.role === "TUTOR" || reply.author.role === "ADMIN") && (
                  <span className="badge-success badge">Staff</span>
                )}
                <span>· {new Date(reply.createdAt).toLocaleDateString("en-UG")}</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{reply.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply form */}
      {!thread.locked ? (
        <ForumReplyForm threadId={thread.id} />
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">This thread is locked.</p>
      )}
    </div>
  );
}
