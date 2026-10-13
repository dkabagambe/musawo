import { NextResponse } from "next/server";

/**
 * POST /api/payments/bank
 * @deprecated Use POST /api/payments/claim instead.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "This endpoint is deprecated. Use POST /api/payments/claim instead.",
      redirectTo: "/api/payments/claim",
    },
    { status: 410 }
  );
}
