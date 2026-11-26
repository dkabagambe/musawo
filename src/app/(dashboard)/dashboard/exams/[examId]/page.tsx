"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Clock, ChevronRight, AlertCircle, CheckCircle2, AlertCircle as AlertIcon } from "lucide-react";

type Question = {
  id: string;
  text: string;
  type: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";
  options?: Array<{ id: string; text: string }>;
  points: number;
};

type ExamState = "loading" | "ready" | "exam" | "result";

export default function ExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;

  const [state, setState] = useState<ExamState>("loading");
  const [attemptId, setAttemptId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLimitEndsAt, setTimeLimitEndsAt] = useState<number>(0);
  const [questionDeadlineAt, setQuestionDeadlineAt] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState<number>(0);
  const [result, setResult] = useState<{ score: number; maxScore: number; percentage: number; passed: boolean; needsTutorReview: boolean } | null>(null);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tabSwitchWarning, setTabSwitchWarning] = useState(false);
  const visibilityRef = useRef(false);

  // Start exam on mount
  useEffect(() => {
    const startExam = async () => {
      try {
        const res = await fetch("/api/exams?action=start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to start exam");
          setState("ready");
          return;
        }
        setAttemptId(data.attemptId);
        setQuestions(data.questions);
        setCurrentQuestionIndex(data.currentQuestionIndex);
        setTimeLimitEndsAt(new Date(data.timeLimitEndsAt).getTime());
        if (data.questionDeadlineAt) {
          setQuestionDeadlineAt(new Date(data.questionDeadlineAt).getTime());
        }
        setState("exam");
      } catch (err) {
        setError("Failed to start exam");
        setState("ready");
      }
    };
    startExam();
  }, [examId]);

  // Timer countdown
  useEffect(() => {
    if (state !== "exam") return;
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((timeLimitEndsAt - now) / 1000));
      setTimeRemaining(remaining);
      if (remaining === 0) {
        setError("Time limit expired. Auto-submitting...");
        setState("loading");
        handleSubmit();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state, timeLimitEndsAt]);

  // Per-question timer
  useEffect(() => {
    if (state !== "exam" || !questionDeadlineAt) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((questionDeadlineAt - now) / 1000));
      setQuestionTimeRemaining(remaining);
      if (remaining === 0) {
        setError("Time for this question expired. Moving to next...");
        setTimeout(() => {
          setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answers[currentQuestion.id] || "" }));
          handleAdvance();
        }, 2000);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [state, questionDeadlineAt, currentQuestionIndex]);

  // Tab-switch tracking
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.hidden && !visibilityRef.current) {
        visibilityRef.current = true;
        setTabSwitchWarning(true);
        setTimeout(() => setTabSwitchWarning(false), 3000);
        await fetch("/api/exams?action=tab-switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId }),
        });
      } else if (!document.hidden) {
        visibilityRef.current = false;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [attemptId]);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const currentAnswer = answers[currentQuestion?.id] || "";

  const handleAnswerChange = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleAdvance = useCallback(async () => {
    if (!currentQuestion) return;
    if (!currentAnswer.trim()) {
      setError("Please answer the current question before moving on");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/exams?action=answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId: currentQuestion.id,
          answer: currentAnswer,
          index: currentQuestionIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit answer");
        setIsSubmitting(false);
        return;
      }
      setCurrentQuestionIndex(data.currentQuestionIndex);
      if (data.questionDeadlineAt) {
        setQuestionDeadlineAt(new Date(data.questionDeadlineAt).getTime());
      }
      setIsSubmitting(false);
    } catch (err) {
      setError("Failed to submit answer");
      setIsSubmitting(false);
    }
  }, [currentQuestion, currentAnswer, attemptId, currentQuestionIndex]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/exams?action=submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit exam");
        setIsSubmitting(false);
        return;
      }
      setResult(data);
      setState("result");
      setIsSubmitting(false);
    } catch (err) {
      setError("Failed to submit exam");
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (state === "ready" || (state === "ready" && !attemptId)) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          {error ? (
            <>
              <AlertIcon className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">{error}</h2>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Back to Exams
              </button>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Starting exam...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (state === "result" && result) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="rounded-lg border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-950/20 p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Exam Submitted Successfully</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {result.score}/{result.maxScore} ({result.percentage}%)
            </div>
            <div
              className={`text-xl font-semibold mt-2 ${
                result.passed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {result.passed ? "✓ PASSED" : "✗ FAILED"}
            </div>
          </div>
          {result.needsTutorReview && (
            <p className="text-yellow-700 dark:text-yellow-400 mb-4 flex items-center justify-center gap-2">
              <AlertIcon className="w-4 h-4" />
              This exam includes short-answer questions. Your tutor will review and provide feedback.
            </p>
          )}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push(`/dashboard/results/${examId}`)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              View Results
            </button>
            <button
              onClick={() => router.push("/dashboard/exams")}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
            >
              Back to Exams
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No question found. This should not happen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* Header with timers */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Exam in Progress</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Question {currentQuestionIndex + 1} of {questions.length}</p>
          </div>
          <div className="flex gap-6">
            {timeLimitEndsAt && (
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">Time Remaining</div>
                <div className={`text-2xl font-bold ${timeRemaining < 300 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
                  {formatTime(timeRemaining)}
                </div>
              </div>
            )}
            {questionTimeRemaining > 0 && (
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">Question Time</div>
                <div className={`text-2xl font-bold ${questionTimeRemaining < 30 ? "text-yellow-600 dark:text-yellow-400" : "text-blue-600 dark:text-blue-400"}`}>
                  {formatTime(questionTimeRemaining)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab-switch warning */}
      {tabSwitchWarning && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <p className="text-yellow-700 dark:text-yellow-400">Tab switches are tracked and recorded.</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Question */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{currentQuestion.text}</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">Points: {currentQuestion.points}</div>

        {/* MCQ */}
        {currentQuestion.type === "MCQ" && currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <label key={option.id} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value={option.id}
                  checked={currentAnswer === option.id}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="w-4 h-4"
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        )}

        {/* TRUE_FALSE */}
        {currentQuestion.type === "TRUE_FALSE" && (
          <div className="space-y-3">
            {[
              { id: "true", text: "True" },
              { id: "false", text: "False" },
            ].map((option) => (
              <label key={option.id} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value={option.id}
                  checked={currentAnswer === option.id}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="w-4 h-4"
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        )}

        {/* SHORT_ANSWER */}
        {currentQuestion.type === "SHORT_ANSWER" && (
          <textarea
            value={currentAnswer}
            onChange={(e) => handleAnswerChange(e.target.value.slice(0, 500))}
            placeholder="Enter your answer (max 500 characters)"
            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        )}
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">{currentAnswer.length}/500 characters</div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-4">
        <button
          onClick={() => router.push("/dashboard/exams")}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
        >
          Exit Exam
        </button>
        <div className="flex gap-4">
          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !currentAnswer.trim()}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isSubmitting ? "Submitting..." : "Submit Exam"}
            </button>
          ) : (
            <button
              onClick={handleAdvance}
              disabled={isSubmitting || !currentAnswer.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isSubmitting ? "Moving..." : "Next Question"}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
