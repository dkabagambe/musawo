import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getInlineObject } from "@/lib/s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const resource = await db.resource.findUnique({
    where: { id: params.id, isPublic: true },
  });

  if (!resource) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const object = await getInlineObject(resource.s3Key);
  return new NextResponse(object.body, { headers: { "Content-Type": object.contentType, "Content-Disposition": `inline; filename="${resource.title.replace(/[^a-zA-Z0-9 _-]/g, "")}"`, "Cache-Control": "public, max-age=60", "X-Content-Type-Options": "nosniff" } });
}
