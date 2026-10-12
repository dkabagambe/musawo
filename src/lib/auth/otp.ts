import { db } from "@/lib/db";
import { sendSms } from "@/lib/sms";
import crypto from "crypto";

const OTP_TTL_MINUTES = 5;

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function createOtp(
  userId: string,
  purpose: "LOGIN" | "REGISTER" | "RESET"
): Promise<string> {
  // Invalidate previous OTPs of the same purpose
  await db.otpCode.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await db.otpCode.create({
    data: { userId, code, purpose, expiresAt },
  });

  return code;
}

export async function sendLoginOtp(
  phone: string
): Promise<{ success: boolean; error?: string }> {
  const user = await db.user.findUnique({ where: { phone } });
  if (!user) return { success: false, error: "Phone not registered" };

  const code = await createOtp(user.id, "LOGIN");
  const message = `Your Musawo Training Center login code is: ${code}. Valid for ${OTP_TTL_MINUTES} minutes. Do not share this code.`;

  try {
    await sendSms({ to: phone, message });
    return { success: true };
  } catch (err) {
    console.error("OTP send failed:", err);
    return { success: false, error: "Failed to send OTP" };
  }
}

export async function verifyOtp(
  userId: string,
  code: string,
  purpose: "LOGIN" | "REGISTER" | "RESET"
): Promise<boolean> {
  const otp = await db.otpCode.findFirst({
    where: {
      userId,
      code,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!otp) return false;

  await db.otpCode.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  });

  return true;
}
