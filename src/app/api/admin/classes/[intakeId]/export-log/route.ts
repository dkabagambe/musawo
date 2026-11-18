import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function POST(
  req: Request,
  { params }: { params: { intakeId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user || !can(session.user.role, "students.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { format, includeContact, count } = await req.json();

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "students.export_class_list",
        details: {
          intakeId: params.intakeId,
          format,
          includeContact,
          count,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error logging export:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log export" },
      { status: 500 },
    );
  }
}
