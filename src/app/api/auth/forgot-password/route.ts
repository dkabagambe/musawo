import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { randomBytes } from "crypto";
import { z } from "zod";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email: body.email } });

  // Always return 200 to avoid revealing whether email exists
  if (!user) {
    return NextResponse.json({ sent: true });
  }

  // Invalidate existing reset tokens
  await db.otpCode.updateMany({
    where: { userId: user.id, purpose: "RESET", usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.otpCode.create({
    data: {
      userId: user.id,
      code: token,
      purpose: "RESET",
      expiresAt,
    },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email!,
    subject: "Reset your Musawo Training Center password",
    template: "password-reset",
    variables: {
      name: user.name,
      resetUrl,
    },
  });

  return NextResponse.json({ sent: true });
}
