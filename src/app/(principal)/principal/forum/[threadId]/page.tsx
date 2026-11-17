import { auth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import ThreadModerationView from "./ThreadModerationView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thread Details - Forum - Principal" };

interface Props {
  params: { threadId: string };
}

export default async function ForumThreadDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "forum.moderate")) 
    redirect("/403");

  const { threadId } = params;

  // Fetch thread with all replies
  const thread = await db.forumThread.findUnique({
    where: { id: threadId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
          email: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
          courseCode: true,
        },
      },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!thread) {
    notFound();
  }

  return (
    <ThreadModerationView
      thread={thread}
      canModerate={can(session.user.role, "forum.moderate")}
      userId={session.user.id}
    />
  );
}
