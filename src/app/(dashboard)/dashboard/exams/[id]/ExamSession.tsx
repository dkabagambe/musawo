"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface Question {
  id: string;
  text: string;
  type: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";
  options: Array<{ id: string; text: string }> | null;
  points: number;
}

interface ExamSessionProps {
  examId: string;
  examTitle: string;
  courseTitle: string;
  passPercent: number;
}

export default function ExamSession({ examId, examTitle, courseTitle, passPercent }: ExamSessionProps) {
  const router = useRouter();

  const [state, setState] = useState<"idle" | "loading" | "active" | "submitting" | "done" | "error">("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  // Total exam countdown
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeLimitEndsAt, setTimeLimitEndsAt] = useState<string | null>(null);
  // Per-question countdown
  const [perQuestionSec, setPerQuestionSec] = useState<number | null>(null);
  const [questionDeadlineAt, setQuestionDeadlineAt] = useState<string | null>(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean | null;
    needsTutorReview: boolean;
  } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);

  // Tab-switch detection
  useEffect(() => {
    if (state !== "active" || !attemptId) return;

    function onVisibilityChange() {
      if (document.hidden && attemptId) {
        fetch("/api/exams?action=tab-switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId }),
        }).catch(() => {});
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [state, attemptId]);

  // Total exam timer
  useEffect(() => {
    if (!timeLimitEndsAt || state !== "active") return;

    function tick() {
      const ms = new Date(timeLimitEndsAt!).getTime() - Date.now();
      if (ms <= 0) {
        setTimeLeft(0);
        if (!submittedRef.current) submitExam();
        return;
      }
      setTimeLeft(Math.floor(ms / 1000));
    }

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLimitEndsAt, state]);

  // Per-question timer — auto-advances when it hits zero
  useEffect(() => {
    if (!questionDeadlineAt || state !== "active") return;
    if (qTimerRef.current) clearInterval(qTimerRef.current);

    function tick() {
      const ms = new Date(questionDeadlineAt!).getTime() - Date.now();
      if (ms <= 0) {
        setQuestionTimeLeft(0);
        if (!advancing) advance();
        return;
      }
      setQuestionTimeLeft(Math.floor(ms / 1000));
    }

    tick();
    qTimerRef.current = setInterval(tick, 1000);
    return () => {
      if (qTimerRef.current) clearInterval(qTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionDeadlineAt, state]);

  async function startExam() {
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/exams?action=start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Could not start exam.");
        setState("error");
        return;
      }
      setAttemptId(data.attemptId);
      setQuestions(data.questions ?? []);
      setTimeLimitEndsAt(data.timeLimitEndsAt ?? null);
      setPerQuestionSec(data.perQuestionSec ?? null);
      setQuestionDeadlineAt(data.questionDeadlineAt ?? null);
      // Resume a forward-only attempt at the saved position.
      setCurrentIdx(typeof data.currentQuestionIndex === "number" ? data.currentQuestionIndex : 0);
      setState("active");
    } catch {
      setErrorMsg("Failed to connect. Please try again.");
      setState("error");
    }
  }

  // Finalise the attempt using the answers already committed on the server.
  const submitExam = useCallback(async () => {
    if (submittedRef.current || !attemptId) return;
    submittedRef.current = true;
    setState("submitting");
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await fetch("/api/exams?action=submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Submission failed.");
        setState("error");
        return;
      }
      setResult(data);
      setState("done");
    } catch {
      setErrorMsg("Submission failed. Please try again.");
      submittedRef.current = false;
      setState("active");
    }
  }, [attemptId]);

  // Commit the current question to the server and move forward. The exam is
  // forward-only: once a question is left it cannot be reopened.
  const advance = useCallback(async () => {
    if (state !== "active" || !attemptId || advancing) return;
    const q = questions[currentIdx];
    if (!q) return;
    setAdvancing(true);
    try {
      const res = await fetch("/api/exams?action=answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, questionId: q.id, answer: answers[q.id] ?? "", index: currentIdx }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Could not save your answer.");
        setState("error");
        return;
      }
      if (currentIdx >= questions.length - 1) {
        await submitExam();
      } else {
        setCurrentIdx((i) => i + 1);
        // Update per-question deadline from server response
        if (data.questionDeadlineAt) {
          setQuestionDeadlineAt(data.questionDeadlineAt);
          setQuestionTimeLeft(null); // reset display; effect will recompute
        }
      }
    } catch {
      setErrorMsg("Connection lost. Please try again.");
      setState("error");
    } finally {
      setAdvancing(false);
    }
  }, [state, attemptId, advancing, currentIdx, questions, answers, submitExam]);

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const current = questions[currentIdx];
  // Questions before the current index have already been committed and closed.
  const answered = currentIdx;

  // ─── STATES ───────────────────────────────────────────────────────────────

  if (state === "idle" || state === "loading") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-10">
          <p className="text-4xl mb-4" aria-hidden="true">📝</p>
          <h1 className="text-xl font-bold mb-2">{examTitle}</h1>
          <p className="text-sm text-gray-500 mb-1">{courseTitle}</p>
          <p className="text-sm text-gray-400 mb-6">
            Pass mark: {passPercent}%
          </p>
          <ul className="text-sm text-gray-500 text-left mb-8 space-y-1 inline-block">
            <li>Do not switch tabs during the exam - it will be logged.</li>
            <li>Submit before the timer runs out.</li>
            <li>The exam is forward-only: once you move to the next question you cannot go back.</li>
            {perQuestionSec && <li>Each question has a {perQuestionSec}s time limit - it advances automatically.</li>}
            <li>MCQ and True/False answers are auto-marked.</li>
            <li>Short answers are reviewed by your tutor.</li>
          </ul>
          <button
            onClick={startExam}
            disabled={state === "loading"}
            className="btn-primary"
          >
            {state === "loading" ? "Starting…" : "Start exam"}
          </button>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-10">
          <p className="text-4xl mb-4" aria-hidden="true">⚠️</p>
          <p className="text-danger font-semibold mb-4">{errorMsg}</p>
          <button onClick={() => { setState("idle"); submittedRef.current = false; }} className="btn-outline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (state === "done" && result) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-10">
          <p className="text-5xl mb-4" aria-hidden="true">
            {result.needsTutorReview ? "⏳" : result.passed ? "🎉" : "😔"}
          </p>
          <h1 className="text-2xl font-bold mb-2">
            {result.needsTutorReview
              ? "Submitted for review"
              : result.passed
              ? "Congratulations!"
              : "Keep trying!"}
          </h1>
          {!result.needsTutorReview && (
            <p className="text-4xl font-bold text-primary mb-2">
              {result.percentage}%
            </p>
          )}
          <p className="text-sm text-gray-500 mb-6">
            {result.needsTutorReview
              ? "Your short-answer responses will be reviewed by your tutor. You'll be notified when results are ready."
              : `${result.score} out of ${result.maxScore} points · Pass mark: ${passPercent}%`}
          </p>
          {!result.needsTutorReview && (
            <p className={`font-semibold mb-6 ${result.passed ? "text-success" : "text-danger"}`}>
              {result.passed ? "✅ PASS" : "❌ FAIL"}
            </p>
          )}
          <button
            onClick={() => router.push("/dashboard/results")}
            className="btn-primary no-underline"
          >
            View all results
          </button>
        </div>
      </div>
    );
  }

  // ─── ACTIVE EXAM ──────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold">{examTitle}</h1>
          <p className="text-xs text-gray-400">{courseTitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">
            {answered}/{questions.length} answered
          </p>
          {/* Per-question timer */}
          {questionTimeLeft !== null && perQuestionSec && (
            <div
              className={`font-mono font-bold text-base px-3 py-1 rounded-xl ${
                questionTimeLeft < 10 ? "text-danger bg-danger/10 animate-pulse" : "text-amber-700 bg-amber-50"
              }`}
              aria-live="polite"
              aria-label={`Time for this question: ${formatTime(questionTimeLeft)}`}
              title="Time remaining for this question"
            >
              Q: {formatTime(questionTimeLeft)}
            </div>
          )}
          {/* Total exam timer */}
          {timeLeft !== null && (
            <div
              className={`font-mono font-bold text-lg px-3 py-1 rounded-xl ${
                timeLeft < 60 ? "text-danger bg-danger/10" : "text-primary bg-primary/10"
              }`}
              aria-live="polite"
              aria-label={`Time remaining: ${formatTime(timeLeft)}`}
            >
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </div>

      {/* Question */}
      {current && (
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-info text-xs">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <span className="badge badge-warning text-xs">
              {current.points} pt{current.points !== 1 ? "s" : ""}
            </span>
            <span className="badge text-xs bg-surface">
              {current.type === "MCQ" ? "Multiple choice" : current.type === "TRUE_FALSE" ? "True / False" : "Short answer"}
            </span>
          </div>

          <p className="text-base font-medium mb-4 whitespace-pre-wrap">{current.text}</p>

          {/* MCQ */}
          {current.type === "MCQ" && current.options && (
            <div className="space-y-2" role="radiogroup" aria-label="Answer options">
              {current.options.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    answers[current.id] === opt.id
                      ? "border-accent bg-accent/10"
                      : "border-border hover:bg-surface"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${current.id}`}
                    value={opt.id}
                    checked={answers[current.id] === opt.id}
                    onChange={() => setAnswer(current.id, opt.id)}
                    className="accent-accent"
                  />
                  <span className="text-sm">{opt.text}</span>
                </label>
              ))}
            </div>
          )}

          {/* TRUE_FALSE */}
          {current.type === "TRUE_FALSE" && (
            <div className="flex gap-4" role="radiogroup" aria-label="True or False">
              {["true", "false"].map((val) => (
                <label
                  key={val}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors text-sm font-medium ${
                    answers[current.id] === val
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border hover:bg-surface"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${current.id}`}
                    value={val}
                    checked={answers[current.id] === val}
                    onChange={() => setAnswer(current.id, val)}
                    className="accent-accent"
                  />
                  {val.charAt(0).toUpperCase() + val.slice(1)}
                </label>
              ))}
            </div>
          )}

          {/* SHORT_ANSWER */}
          {current.type === "SHORT_ANSWER" && (
            <textarea
              rows={5}
              value={answers[current.id] ?? ""}
              onChange={(e) => setAnswer(current.id, e.target.value)}
              className="input resize-y"
              placeholder="Type your answer here…"
              aria-label="Short answer"
            />
          )}
        </div>
      )}

      {/* Navigation - forward only, no Previous button, no question dots */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">
          Your answer is saved when you continue. You cannot return to an earlier question.
        </p>
        {currentIdx < questions.length - 1 ? (
          <button
            onClick={advance}
            disabled={advancing || state === "submitting"}
            className="btn-primary"
          >
            {advancing ? "Saving…" : "Next →"}
          </button>
        ) : (
          <button
            onClick={advance}
            disabled={advancing || state === "submitting"}
            className="btn-primary bg-success hover:bg-green-600"
          >
            {state === "submitting" ? "Submitting…" : advancing ? "Saving…" : "Submit exam"}
          </button>
        )}
      </div>
    </div>
  );
}
