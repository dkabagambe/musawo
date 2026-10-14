import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";

export const runtime = "nodejs";

const Schema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.errors[0]?.message : "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Look up the reset token
  const record = await db.otpCode.findFirst({
    where: {
      code:    body.token,
      purpose: "RESET",
      usedAt:  null,
    },
    include: { user: true },
  });

  if (!record) {
    return NextResponse.json({ error: "This reset link is invalid or has already been used." }, { status: 400 });
  }

  if (record.expiresAt < new Date()) {
    return NextResponse.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });
  }

  // Hash the new password and mark the token used - atomically
  const hashed = await hashPassword(body.password);

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data:  { passwordHash: hashed },
    }),
    db.otpCode.update({
      where: { id: record.id },
      data:  { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
