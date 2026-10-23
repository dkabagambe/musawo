import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/resources - list all public resources */
export async function GET(_req: NextRequest) {
  const resources = await db.resource.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      mimeType: true,
      category: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ resources });
}
