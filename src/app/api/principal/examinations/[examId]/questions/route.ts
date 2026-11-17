import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/principal/examinations/[examId]/questions
 * Download exam question paper as formatted text
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, "exams.mark")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const exam = await db.exam.findUnique({
      where: { id: params.examId },
      include: {
        course: { select: { title: true, courseCode: true } },
        block: { select: { title: true } },
        questions: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Generate formatted question paper
    const lines: string[] = [];

    lines.push("=".repeat(80));
    lines.push(exam.course.courseCode.toUpperCase() + " - " + exam.course.title.toUpperCase());
    lines.push(exam.title.toUpperCase());
    if (exam.block) {
      lines.push("Block: " + exam.block.title);
    }
    lines.push("=".repeat(80));
    lines.push("");

    if (exam.instructions) {
      lines.push("INSTRUCTIONS:");
      lines.push(exam.instructions);
      lines.push("");
    }

    lines.push("EXAM DETAILS:");
    if (exam.timeLimitMin) {
      lines.push(`Time Limit: ${exam.timeLimitMin} minutes`);
    }
    if (exam.perQuestionSec) {
      lines.push(`Per Question: ${exam.perQuestionSec} seconds`);
    }
    lines.push(`Pass Mark: ${exam.passPercent}%`);
    lines.push(`Total Questions: ${exam.questions.length}`);
    lines.push(`Total Points: ${exam.questions.reduce((sum, q) => sum + q.points, 0)}`);
    lines.push("");
    lines.push("-".repeat(80));
    lines.push("");

    // Questions
    exam.questions.forEach((q, index) => {
      lines.push(`QUESTION ${index + 1} [${q.points} point${q.points !== 1 ? "s" : ""}]`);
      lines.push(q.question);
      lines.push("");

      if (q.type === "MCQ" && q.options) {
        const options = JSON.parse(q.options as string);
        options.forEach((opt: string, i: number) => {
          const letter = String.fromCharCode(65 + i);
          lines.push(`${letter}. ${opt}`);
        });
        lines.push("");
        lines.push(`Correct Answer: ${q.correctAnswer}`);
      } else if (q.type === "TRUE_FALSE") {
        lines.push("A. True");
        lines.push("B. False");
        lines.push("");
        lines.push(`Correct Answer: ${q.correctAnswer}`);
      } else if (q.type === "SHORT_ANSWER") {
        lines.push("(Short answer question - requires manual grading)");
        if (q.correctAnswer) {
          lines.push("");
          lines.push("Model Answer / Keywords:");
          lines.push(q.correctAnswer);
        }
      }

      lines.push("");
      lines.push("-".repeat(80));
      lines.push("");
    });

    lines.push("END OF EXAMINATION");
    lines.push("=".repeat(80));

    const content = lines.join("\n");
    const filename = `exam-questions-${exam.course.courseCode}-${exam.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.txt`;

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EXPORT",
        entity: "Exam",
        entityId: exam.id,
        details: `Downloaded exam questions: ${exam.title} (${exam.course.title}) - ${exam.questions.length} questions`,
      },
    });

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to export exam questions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
