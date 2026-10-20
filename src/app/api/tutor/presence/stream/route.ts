import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redis } from "@/lib/db/redis";
import { can } from "@/lib/rbac";
import { teachingCourseWhere } from "@/lib/teaching/scope";

export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "attendance.view")) return new Response("Forbidden", { status: 403 });
  const courseId = new URL(req.url).searchParams.get("courseId");
  const global = can(session.user.role, "attendance.view.all");
  const courses = await db.course.findMany({ where: courseId ? { id: courseId, ...(global ? {} : teachingCourseWhere(session.user.id)) } : global ? {} : teachingCourseWhere(session.user.id), select: { id: true } });
  if (courseId && !courses.length) return new Response("Course not found", { status: 404 });
  const ids = courses.map((course) => course.id);
  const recipients = ids.length ? await db.enrolment.findMany({ where: { courseId: { in: ids }, user: { role: "STUDENT" }, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } }, select: { userId: true } }) : [];
  const allowed = new Set(recipients.map((item) => item.userId));
  const subscriber = redis.duplicate();
  await subscriber.subscribe("presence:events");
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      const onMessage = (_channel: string, raw: string) => {
        try {
          const event = JSON.parse(raw) as { userId: string; presence: { lastSeenAt: number; classId: string | null } | null };
          if (allowed.has(event.userId)) send({ userId: event.userId, presence: event.presence });
        } catch { /* ignore malformed bus messages */ }
      };
      subscriber.on("message", onMessage);
      const ping = setInterval(() => send({ type: "ping", at: Date.now() }), 20_000);
      const refreshExpiry = setInterval(async () => {
        try {
          if (!allowed.size) return;
          const keys = Array.from(allowed).map((id) => `presence:${id}`);
          const values = await redis.mget(...keys);
          send({ type: "snapshot", users: keys.map((key, index) => ({ userId: key.slice("presence:".length), presence: values[index] ? JSON.parse(values[index]!) : null })) });
        } catch { /* existing statuses remain visible until the next refresh */ }
      }, 30_000);
      req.signal.addEventListener("abort", () => {
        clearInterval(ping); clearInterval(refreshExpiry); subscriber.removeListener("message", onMessage);
        void subscriber.unsubscribe("presence:events").finally(() => subscriber.quit());
        controller.close();
      }, { once: true });
    },
    cancel() { void subscriber.unsubscribe("presence:events").finally(() => subscriber.quit()); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}
