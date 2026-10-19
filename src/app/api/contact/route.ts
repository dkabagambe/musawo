import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_demo");

const Schema = z.object({
  name:    z.string().min(1).max(100),
  email:   z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // In demo / dev mode just log and return success
  if (process.env.NODE_ENV !== "production" || !process.env.RESEND_API_KEY) {
    console.log("[contact form]", body);
    return NextResponse.json({ ok: true });
  }

  await resend.emails.send({
    from: "noreply@mtc.ac.ug",
    to:   "info@mtc.ac.ug",
    replyTo: body.email,
    subject: `[Contact] ${body.subject} - from ${body.name}`,
    text: `From: ${body.name} <${body.email}>\n\n${body.message}`,
  });

  return NextResponse.json({ ok: true });
}
