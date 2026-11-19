/**
 * GET /api/support/[id]/user-profile
 * Returns ONLY technical (non-business) info about the ticket owner:
 *   name, role, account status, last login, 2FA enrolled, active session count.
 * IT Admin only. Never returns grades, payments, enrolments, or any other business data.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "support.manage"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ticket = await db.supportTicket.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await db.user.findUnique({
    where: { id: ticket.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      totpEnabled: true,
      sessions: {
        where: { expires: { gt: new Date() } },
        select: { id: true, expires: true },
        take: 10,
      },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const activeSessions = user.sessions ?? [];
  const lastActive =
    activeSessions.length > 0
      ? activeSessions.sort((a, b) => new Date(b.expires).getTime() - new Date(a.expires).getTime())[0].expires
      : null;

  // Role label from settings or sensible default
  const roleLabels: Record<string, string> = {
    STUDENT: "Student",
    INSTRUCTOR: "Instructor",
    ADMIN: "Admin",
    PRINCIPAL: "Principal",
    DIRECTOR: "Director",
    ACADEMIC_REGISTRAR: "Academic Registrar",
    SYSTEM_IT: "IT Admin",
  };

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: roleLabels[user.role] ?? user.role,
    status: user.status,
    joinedAt: user.createdAt,
    totpEnabled: user.totpEnabled ?? false,
    activeSessionCount: activeSessions.length,
    lastActive,
    // Explicitly NOT included: grades, payments, enrolments, results, documents
  });
}
