import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "Self-registration is unavailable. Submit an application at /apply." },
    { status: 410 }
  );
}
