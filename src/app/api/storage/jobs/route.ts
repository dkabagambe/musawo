/**
 * POST /api/storage/jobs
 * Actions on cleanup jobs: confirm or cancel.
 * Only Principal (storage.manage) can confirm/cancel.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { confirmJob, cancelJob } from "@/lib/storage/retention";
import { z } from "zod";

export const runtime = "nodejs";

const ActionSchema = z.object({
  jobId: z.string().min(1),
  action: z.enum(["confirm", "cancel"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role, "storage.manage");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  const body = ActionSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { jobId, action } = body.data;

  try {
    if (action === "confirm") {
      await confirmJob(jobId, session.user.id);
      return NextResponse.json({ ok: true, status: "IN_TRASH" });
    } else {
      await cancelJob(jobId, session.user.id);
      return NextResponse.json({ ok: true, status: "CANCELLED" });
    }
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 400 },
    );
  }
}
