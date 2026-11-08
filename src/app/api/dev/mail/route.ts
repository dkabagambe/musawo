import { NextRequest, NextResponse } from "next/server";
import { getDevEmails, clearDevEmails } from "@/lib/email/dev-store";
import { isDemoAllowed } from "@/lib/env";

export function GET() {
  if (!isDemoAllowed()) {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  return NextResponse.json({ emails: getDevEmails() });
}

export async function DELETE(_req: NextRequest) {
  if (!isDemoAllowed()) {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  clearDevEmails();
  return NextResponse.json({ ok: true });
}
