import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  partnerName: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60),
  heading: z.string().min(5).max(200),
  body: z.string().min(10),
  ctaText: z.string().default("Enrol Now"),
  ctaUrl: z.string().default("/register"),
});

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pages = await db.partnerPage.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ pages });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    body = await req.json();
  } else {
    const fd = await req.formData();
    body = {
      partnerName: fd.get("partnerName"),
      slug: fd.get("slug"),
      heading: fd.get("heading"),
      body: fd.get("body"),
      ctaText: fd.get("ctaText") || "Enrol Now",
      ctaUrl: fd.get("ctaUrl") || "/register",
    };
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const existing = await db.partnerPage.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return NextResponse.json({ error: "Slug already exists." }, { status: 409 });

  const page = await db.partnerPage.create({ data: parsed.data });

  if (!ct.includes("application/json")) {
    return new Response(null, { status: 302, headers: { Location: "/admin/partner-pages" } });
  }
  return NextResponse.json({ page }, { status: 201 });
}
