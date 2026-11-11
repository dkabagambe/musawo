import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import Link from "next/link";
import ForumReplyForm from "@/app/(dashboard)/dashboard/forum/[threadId]/ReplyForm";
export const dynamic = "force-dynamic";

interface Props { params: { threadId: string } }

export const metadata = { title: "Forum Thread - Teaching Portal" };

export default async function TutorForumThreadPage({ params }: Props) {
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

  // Instructor must teach this course
  const isTutorOrAdmin = can(session.user.role, "classes.view");
  if (!isTutorOrAdmin) redirect("/tutor/forum");

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={
          thread.liveClassId
            ? `/tutor/forum?classId=${thread.liveClassId}`
            : "/tutor/forum"
        }
        className="text-sm text-gray-400 hover:text-primary no-underline mb-4 block"
      >
        &larr; Back to forum
      </Link>

      <div className="card mb-4">
        <span className="badge-info badge text-xs mb-2 inline-block">{thread.course.title}</span>
        <h1 className="text-xl font-semibold mb-2">{thread.title}</h1>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <span className="font-medium text-gray-600">{thread.author.name}</span>
          {can(thread.author.role as Parameters<typeof can>[0], "classes.view") && (
            <span className="badge-success badge">Instructor</span>
          )}
          <span>&middot;</span>
          <span>{new Date(thread.createdAt).toLocaleDateString("en-UG")}</span>
        </div>
        <p className="text-gray-700 whitespace-pre-wrap text-sm">{thread.body}</p>
      </div>

      {thread.replies.length > 0 && (
        <div className="space-y-3 mb-6">
          {thread.replies.map((reply) => (
            <div
              key={reply.id}
              className={`card text-sm ${
                can(reply.author.role as Parameters<typeof can>[0], "classes.view")
                  ? "border-accent/30 bg-accent/5"
                  : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
                <span className="font-medium text-gray-700">{reply.author.name}</span>
                {can(reply.author.role as Parameters<typeof can>[0], "classes.view") && (
                  <span className="badge-success badge">Staff</span>
                )}
                <span>&middot; {new Date(reply.createdAt).toLocaleDateString("en-UG")}</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{reply.body}</p>
            </div>
          ))}
        </div>
      )}

      {!thread.locked ? (
        <ForumReplyForm threadId={thread.id} />
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">This thread is locked.</p>
      )}
    </div>
  );
}
