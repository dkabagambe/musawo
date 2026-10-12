import { describe, it, expect } from "vitest";
import { markExam } from "@/lib/exam/marking";
import type { QuizQuestion } from "@prisma/client";

function makeQuestion(
  overrides: Partial<QuizQuestion> & { id: string }
): QuizQuestion {
  return {
    id: overrides.id,
    lessonId: null,
    examId: "exam-1",
    text: "Sample question",
    type: overrides.type ?? "MCQ",
    options: overrides.options ?? null,
    correctAnswer: overrides.correctAnswer ?? "a",
    points: overrides.points ?? 1,
    explanation: null,
    createdAt: new Date(),
  };
}

describe("markExam", () => {
  it("marks all MCQ correct", () => {
    const questions = [
      makeQuestion({ id: "q1", type: "MCQ", correctAnswer: "a", points: 2 }),
      makeQuestion({ id: "q2", type: "MCQ", correctAnswer: "b", points: 2 }),
    ];
    const answers = { q1: "a", q2: "b" };
    const result = markExam(questions, answers, 60);

    expect(result.score).toBe(4);
    expect(result.maxScore).toBe(4);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.needsTutorReview).toBe(false);
  });

  it("marks all MCQ wrong", () => {
    const questions = [
      makeQuestion({ id: "q1", type: "MCQ", correctAnswer: "a", points: 1 }),
      makeQuestion({ id: "q2", type: "MCQ", correctAnswer: "b", points: 1 }),
    ];
    const answers = { q1: "c", q2: "c" };
    const result = markExam(questions, answers, 60);

    expect(result.score).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("marks true/false correctly", () => {
    const questions = [
      makeQuestion({ id: "q1", type: "TRUE_FALSE", correctAnswer: "true", points: 1 }),
      makeQuestion({ id: "q2", type: "TRUE_FALSE", correctAnswer: "false", points: 1 }),
    ];
    const answers = { q1: "true", q2: "true" };
    const result = markExam(questions, answers, 50);

    expect(result.score).toBe(1);
    expect(result.percentage).toBe(50);
    expect(result.passed).toBe(true); // exactly at pass mark
  });

  it("is case-insensitive for answers", () => {
    const questions = [
      makeQuestion({ id: "q1", type: "MCQ", correctAnswer: "A", points: 1 }),
    ];
    const result = markExam(questions, { q1: "a" }, 60);
    expect(result.score).toBe(1);
  });

  it("short answers require tutor review and are not auto-passed", () => {
    const questions = [
      makeQuestion({ id: "q1", type: "MCQ", correctAnswer: "a", points: 2 }),
      makeQuestion({ id: "q2", type: "SHORT_ANSWER", correctAnswer: "", points: 3 }),
    ];
    const answers = { q1: "a", q2: "Some long answer" };
    const result = markExam(questions, answers, 60);

    expect(result.needsTutorReview).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(2); // Only MCQ scored
    const shortAnswerEntry = result.breakdown.find((b) => b.questionId === "q2");
    expect(shortAnswerEntry?.correct).toBeNull();
    expect(shortAnswerEntry?.awarded).toBe(0);
  });

  it("fails below pass mark", () => {
    const questions = [
      makeQuestion({ id: "q1", type: "MCQ", correctAnswer: "a", points: 1 }),
      makeQuestion({ id: "q2", type: "MCQ", correctAnswer: "b", points: 1 }),
      makeQuestion({ id: "q3", type: "MCQ", correctAnswer: "c", points: 1 }),
    ];
    // Only 1 out of 3 correct = 33%
    const result = markExam(questions, { q1: "a", q2: "x", q3: "x" }, 60);
    expect(result.percentage).toBe(33);
    expect(result.passed).toBe(false);
  });
});
