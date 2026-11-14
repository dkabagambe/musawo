"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface Course { id: string; title: string; blocks: { id: string; title: string; order: number }[] }

type QuestionType = "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";

interface Question {
  text: string;
  type: QuestionType;
  points: number;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

function newQuestion(): Question {
  return { text: "", type: "MCQ", points: 1, options: [{ id: "a", text: "" }, { id: "b", text: "" }, { id: "c", text: "" }, { id: "d", text: "" }], correctAnswer: "a", explanation: "" };
}

export default function CreateExamForm({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    courseId: courses[0]?.id ?? "",
    blockId: "",
    title: "",
    instructions: "",
    timeLimitMin: "",
    passPercent: "60",
    shuffleQuestions: true,
    status: "DRAFT" as "DRAFT" | "PUBLISHED",
  });
  const [questions, setQuestions] = useState<Question[]>([newQuestion()]);

  const selectedCourse = courses.find((c) => c.id === form.courseId);

  function setF<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function addQuestion() { setQuestions((q) => [...q, newQuestion()]); }
  function removeQuestion(i: number) { setQuestions((q) => q.filter((_, idx) => idx !== i)); }

  function setQ<K extends keyof Question>(i: number, k: K, v: Question[K]) {
    setQuestions((qs) => qs.map((q, idx) => idx === i ? { ...q, [k]: v } : q));
  }

  function setOption(qi: number, oi: number, text: string) {
    setQuestions((qs) => qs.map((q, idx) => idx !== qi ? q : {
      ...q,
      options: q.options.map((o, oIdx) => oIdx === oi ? { ...o, text } : o),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.courseId) { setError("Select a course."); return; }
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (questions.length === 0) { setError("Add at least one question."); return; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) { setError(`Question ${i + 1} text is required.`); return; }
      if (q.type === "MCQ" && q.options.some((o: { id: string; text: string }) => !o.text.trim())) {
        setError(`All options for Question ${i + 1} must have text.`); return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch("/api/tutor/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: form.courseId,
          blockId: form.blockId || undefined,
          title: form.title.trim(),
          instructions: form.instructions.trim() || undefined,
          timeLimitMin: form.timeLimitMin ? Number(form.timeLimitMin) : undefined,
          passPercent: Number(form.passPercent),
          shuffleQuestions: form.shuffleQuestions,
          status: form.status,
          questions: questions.map((q) => ({
            text: q.text.trim(),
            type: q.type,
            points: q.points,
            options: q.type === "MCQ" ? q.options : undefined,
            correctAnswer: q.type !== "SHORT_ANSWER" ? q.correctAnswer : undefined,
            explanation: q.explanation.trim() || undefined,
          })),
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to create exam."); return; }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-primary"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Create new exam</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {error && <p role="alert" className="text-sm text-danger bg-danger/10 rounded-xl px-4 py-3">{error}</p>}

          {/* Exam settings */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="e-course" className="label">Course *</label>
              <select id="e-course" className="input" required value={form.courseId}
                onChange={(e) => { setF("courseId", e.target.value); setF("blockId", ""); }}>
                <option value="">Select a course...</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="e-block" className="label">Block / unit (optional)</label>
              <select id="e-block" className="input" value={form.blockId} onChange={(e) => setF("blockId", e.target.value)}>
                <option value="">No specific block</option>
                {selectedCourse?.blocks.map((b) => <option key={b.id} value={b.id}>Block {b.order}: {b.title}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="e-title" className="label">Exam title *</label>
              <input id="e-title" type="text" className="input" required maxLength={300} value={form.title}
                onChange={(e) => setF("title", e.target.value)} placeholder="e.g. Block 2 Assessment" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="e-instr" className="label">Instructions (optional)</label>
              <textarea id="e-instr" className="input min-h-[72px] resize-y" maxLength={5000} value={form.instructions}
                onChange={(e) => setF("instructions", e.target.value)} placeholder="Read each question carefully..." />
            </div>
            <div>
              <label htmlFor="e-time" className="label">Time limit (minutes, optional)</label>
              <input id="e-time" type="number" className="input" min={1} max={480} value={form.timeLimitMin}
                onChange={(e) => setF("timeLimitMin", e.target.value)} placeholder="Leave blank for no limit" />
            </div>
            <div>
              <label htmlFor="e-pass" className="label">Pass mark (%)</label>
              <input id="e-pass" type="number" className="input" min={1} max={100} required value={form.passPercent}
                onChange={(e) => setF("passPercent", e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <input id="e-shuffle" type="checkbox" checked={form.shuffleQuestions}
                onChange={(e) => setF("shuffleQuestions", e.target.checked)} className="rounded" />
              <label htmlFor="e-shuffle" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">Shuffle questions per attempt</label>
            </div>
            <div>
              <label htmlFor="e-status" className="label">Status</label>
              <select id="e-status" className="input" value={form.status} onChange={(e) => setF("status", e.target.value as "DRAFT" | "PUBLISHED")}>
                <option value="DRAFT">Draft (not visible to students)</option>
                <option value="PUBLISHED">Published (students can take it)</option>
              </select>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-primary">Questions ({questions.length})</h3>
              <button type="button" onClick={addQuestion} className="btn-outline text-xs flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add question
              </button>
            </div>

            {questions.map((q, i) => (
              <div key={i} className="bg-surface/60 rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase mt-2">Q{i + 1}</span>
                  <div className="flex-1 space-y-3">
                    {/* Question text */}
                    <textarea
                      required
                      rows={2}
                      className="input resize-y text-sm"
                      placeholder="Question text..."
                      value={q.text}
                      onChange={(e) => setQ(i, "text", e.target.value)}
                      maxLength={2000}
                    />
                    {/* Type + points row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Type</label>
                        <select className="input text-sm" value={q.type}
                          onChange={(e) => { setQ(i, "type", e.target.value as QuestionType); setQ(i, "correctAnswer", e.target.value === "TRUE_FALSE" ? "true" : "a"); }}>
                          <option value="MCQ">Multiple choice</option>
                          <option value="TRUE_FALSE">True / False</option>
                          <option value="SHORT_ANSWER">Short answer (manual mark)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Points</label>
                        <input type="number" min={1} max={100} className="input text-sm" value={q.points}
                          onChange={(e) => setQ(i, "points", Number(e.target.value) || 1)} />
                      </div>
                    </div>

                    {/* MCQ options */}
                    {q.type === "MCQ" && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">Options (mark the correct one)</p>
                        {q.options.map((opt, oi) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <input type="radio" name={`correct-${i}`} value={opt.id}
                              checked={q.correctAnswer === opt.id}
                              onChange={() => setQ(i, "correctAnswer", opt.id)}
                              className="flex-shrink-0" />
                            <input type="text" className="input text-sm flex-1" required placeholder={`Option ${opt.id.toUpperCase()}`}
                              value={opt.text} onChange={(e) => setOption(i, oi, e.target.value)} maxLength={500} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* True/False */}
                    {q.type === "TRUE_FALSE" && (
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name={`tf-${i}`} checked={q.correctAnswer === "true"} onChange={() => setQ(i, "correctAnswer", "true")} /> True
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name={`tf-${i}`} checked={q.correctAnswer === "false"} onChange={() => setQ(i, "correctAnswer", "false")} /> False
                        </label>
                      </div>
                    )}

                    {q.type === "SHORT_ANSWER" && (
                      <p className="text-xs text-gray-400 italic">Students type their answer. You will mark this manually.</p>
                    )}

                    {/* Explanation */}
                    <input type="text" className="input text-xs" placeholder="Explanation (shown after submission, optional)"
                      value={q.explanation} onChange={(e) => setQ(i, "explanation", e.target.value)} maxLength={1000} />
                  </div>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(i)}
                      className="p-1.5 rounded-lg hover:bg-danger/10 text-gray-400 hover:text-danger transition-colors flex-shrink-0 mt-2"
                      aria-label="Remove question">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create exam"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
