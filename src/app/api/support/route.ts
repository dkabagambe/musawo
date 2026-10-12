import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const CreateTicketSchema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(10).max(3000),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateTicketSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const ticket = await db.supportTicket.create({
    data: {
      userId: session.user.id,
      subject: parsed.data.subject,
      body: parsed.data.body,
    },
  });

  // Notify admins
  const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" } });
  for (const admin of admins) {
    if (admin.email) {
      await sendEmail({
        to: admin.email,
        subject: `New support ticket: ${parsed.data.subject}`,
        template: "welcome",
        variables: {
          name: admin.name,
          loginUrl: `${process.env.NEXTAUTH_URL}/admin/support/${ticket.id}`,
        },
      });
    }
  }

  return NextResponse.json({ id: ticket.id });
}
