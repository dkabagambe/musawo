import { NextRequest, NextResponse } from "next/server";
import { getDevEmails, clearDevEmails } from "@/lib/email/dev-store";

export function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  return NextResponse.json({ emails: getDevEmails() });
}

export async function DELETE(_req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  clearDevEmails();
  return NextResponse.json({ ok: true });
}
