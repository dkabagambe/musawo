import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/sms";
import { z } from "zod";

export const runtime = "nodejs";

const Schema = z.object({
  phone: z.string().min(9).max(20),
  purpose: z.enum(["LOGIN", "REGISTER", "RESET"]),
});

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { phone: body.phone } });
  if (!user) {
    // Don't reveal whether phone exists
    return NextResponse.json({ sent: true });
  }

  if (user.status === "SUSPENDED") {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }

  // Invalidate any existing OTPs for this user/purpose
  await db.otpCode.updateMany({
    where: { userId: user.id, purpose: body.purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  await db.otpCode.create({
    data: {
      userId: user.id,
      code,
      purpose: body.purpose,
      expiresAt,
    },
  });

  await sendSms({
    to: body.phone,
    message: `Your Musawo Training Center code is: ${code}. Valid for 5 minutes. Do not share.`,
  });

  return NextResponse.json({ sent: true });
}
