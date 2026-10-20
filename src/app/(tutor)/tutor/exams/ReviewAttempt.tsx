"use client";

import { useState } from "react";

type Question = { id: string; text: string; points: number };
type Review = { questionId: string; score: number; feedback: string | null };

export default function ReviewAttempt({ attemptId, questions, answers, reviews }: { attemptId: string; questions: Question[]; answers: Record<string, string>; reviews: Review[] }) {
  const [scores, setScores] = useState<Record<string, string>>(() => Object.fromEntries(reviews.map((review) => [review.questionId, String(review.score)])));
  const [feedback, setFeedback] = useState<Record<string, string>>(() => Object.fromEntries(reviews.map((review) => [review.questionId, review.feedback ?? ""])));
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function save(question: Question) {
    setBusy(question.id);
    try {
      const response = await fetch("/api/tutor/exams/mark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId, questionId: question.id, score: Number(scores[question.id] ?? 0), feedback: feedback[question.id] ?? "" }) });
      const data = await response.json();
      setMessages((items) => ({ ...items, [question.id]: response.ok ? "Saved" : data.error ?? "Could not save" }));
    } catch { setMessages((items) => ({ ...items, [question.id]: "Could not save" })); }
    finally { setBusy(null); }
  }

  return <div className="mt-4 space-y-3">{questions.map((question) => <div key={question.id} className="rounded-xl border border-border p-3"><p className="text-sm font-medium">{question.text}</p><p className="my-2 whitespace-pre-wrap rounded-lg bg-surface p-3 text-sm text-gray-600">{answers[question.id] || "No answer supplied"}</p><div className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-end"><label className="text-xs">Score out of {question.points}<input className="input mt-1" type="number" min="0" max={question.points} value={scores[question.id] ?? "0"} onChange={(event) => setScores((items) => ({ ...items, [question.id]: event.target.value }))} /></label><label className="text-xs">Feedback<textarea className="input mt-1" rows={2} value={feedback[question.id] ?? ""} onChange={(event) => setFeedback((items) => ({ ...items, [question.id]: event.target.value }))} /></label><button type="button" className="btn-primary text-xs" disabled={busy !== null} onClick={() => save(question)}>{busy === question.id ? "Saving…" : "Save mark"}</button></div><p role="status" className="mt-1 text-xs text-gray-500">{messages[question.id]}</p></div>)}</div>;
}
