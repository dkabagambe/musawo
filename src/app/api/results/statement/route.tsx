/**
 * GET /api/results/statement
 *
 * Generates and streams the student's own academic results statement as a PDF.
 * Only includes published results (GradeEntry.releasedAt IS NOT NULL).
 * Requires authentication; students can only download their own statement.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSetting } from "@/lib/settings";
import ResultsStatementPdf from "./ResultsStatementPdf";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [user, grades, issuerName] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        studentNumber: true,
        enrolments: {
          where: { status: { in: ["ACTIVE", "PARTIALLY_PAID", "OVERDUE", "COMPLETED"] } },
          include: { course: { select: { title: true } } },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    db.gradeEntry.findMany({
      where: { userId, releasedAt: { not: null } },
      include: { course: { select: { title: true } } },
      orderBy: { releasedAt: "desc" },
    }),
    getSetting("certificate.issuerName", "Musawo Training Center"),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const programme =
    user.enrolments[0]?.course.title ?? "Student";

  const results = grades.map((g) => ({
    itemTitle: g.itemTitle,
    courseTitle: g.course.title,
    score: g.score,
    maxScore: g.maxScore,
    percentage: g.percentage,
    passed: g.passed ?? null,
    gradedAt: g.gradedAt,
    comments: g.comments ?? null,
  }));

  const pdf = await renderToBuffer(
    <ResultsStatementPdf
      studentName={user.name}
      studentNumber={user.studentNumber}
      programme={programme}
      printedAt={new Date()}
      results={results}
      issuerName={issuerName}
    />
  );

  const safeName = user.name.replace(/[^a-z0-9]/gi, "-").slice(0, 40).toLowerCase();

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="results-statement-${safeName}.pdf"`,
    },
  });
}
