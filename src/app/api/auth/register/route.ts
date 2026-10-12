import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().min(9).max(20).optional(),
  password: z.string().min(8).max(128),
  consent: z.literal(true),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof RegisterSchema>;
  try {
    body = RegisterSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid input", details: err }, { status: 400 });
  }

  if (!body.email && !body.phone) {
    return NextResponse.json(
      { error: "Provide at least an email or phone number." },
      { status: 400 }
    );
  }

  // Check uniqueness
  if (body.email) {
    const existing = await db.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
  }
  if (body.phone) {
    const existing = await db.user.findUnique({ where: { phone: body.phone } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this phone number already exists." },
        { status: 409 }
      );
    }
  }

  const passwordHash = await hashPassword(body.password);

  // Generate student number
  const count = await db.user.count({ where: { role: "STUDENT" } });
  const year = new Date().getFullYear();
  const studentNumber = `MTC-${year}-${String(count + 1).padStart(5, "0")}`;

  const user = await db.user.create({
    data: {
      name: body.name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      passwordHash,
      studentNumber,
      dataConsentAt: new Date(),
      status: "ACTIVE",
      role: "STUDENT",
    },
  });

  // Send welcome email if email provided
  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: "Welcome to Musawo Training Center",
      template: "welcome",
      variables: {
        name: user.name,
        loginUrl: `${process.env.NEXTAUTH_URL}/login`,
      },
    });
  }

  return NextResponse.json({ id: user.id, studentNumber }, { status: 201 });
}
