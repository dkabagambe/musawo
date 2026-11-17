"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  mode: "create" | "edit";
  courses: any[];
  exam: any | null;
  userId: string;
};

export default function ExamBuilder({ mode, courses, exam, userId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState(exam?.questions || []);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    try {
      const data = {
        courseId: formData.get("courseId") as string,
        blockId: (formData.get("blockId") as string) || null,
        title: formData.get("title") as string,
        instructions: formData.get("instructions") as string,
        timeLimitMin: parseInt(formData.get("timeLimitMin") as string) || null,
        perQuestionSec: parseInt(formData.get("perQuestionSec") as string) || null,
        attemptLimit: parseInt(formData.get("attemptLimit") as string) || 2,
        passPercent: parseInt(formData.get("passPercent") as string) || 60,
        shuffleQuestions: formData.get("shuffleQuestions") === "true",
        startWindowAt: (formData.get("startWindowAt") as string) || null,
        status: formData.get("status") as string,
        questions: questions.map((q: any) => ({
          id: q.id,
          type: q.type,
          question: q.question,
          points: q.points,
          options: q.options,
          correctAnswer: q.correctAnswer,
        })),
      };

      const url = mode === "create"
        ? "/api/principal/examinations"
        : `/api/principal/examinations/${exam.id}`;

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to save exam");

      const result = await response.json();
      router.push("/principal/examinations");
    } catch (error) {
      console.error(error);
      alert("Failed to save exam");
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = (questionData: any) => {
    if (editingQuestion) {
      setQuestions(questions.map((q: any) =>
        q.id === editingQuestion.id ? { ...questionData, id: q.id } : q
      ));
      setEditingQuestion(null);
    } else {
      setQuestions([...questions, { ...questionData, id: `temp-${Date.now()}` }]);
    }
    setShowQuestionForm(false);
  };

  const handleEditQuestion = (question: any) => {
    setEditingQuestion(question);
    setShowQuestionForm(true);
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (confirm("Delete this question?")) {
      setQuestions(questions.filter((q: any) => q.id !== questionId));
    }
  };

  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    const newQuestions = [...questions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;

    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    setQuestions(newQuestions);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/principal/examinations" className="hover:text-primary">
            Examinations
          </Link>
          <span>/</span>
          <span>{mode === "create" ? "Create" : "Edit"} Exam</span>
        </div>
        <h1 className="text-2xl font-bold">
          {mode === "create" ? "Create New Exam" : "Edit Exam"}
        </h1>
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}>
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Course <span className="text-red-500">*</span>
                </label>
                <select
                  name="courseId"
                  required
                  defaultValue={exam?.courseId || ""}
                  className="input w-full"
                >
                  <option value="">Select a course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courseCode} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Block (Optional)
                </label>
                <select
                  name="blockId"
                  defaultValue={exam?.blockId || ""}
                  className="input w-full"
                >
                  <option value="">No specific block</option>
                  {courses.find((c) => c.id === exam?.courseId)?.blocks.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Exam Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={exam?.title || ""}
                  className="input w-full"
                  placeholder="e.g., Midterm Exam, Final Assessment"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Instructions</label>
                <textarea
                  name="instructions"
                  rows={4}
                  defaultValue={exam?.instructions || ""}
                  className="input w-full"
                  placeholder="Instructions for students..."
                />
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Exam Settings</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Total Time Limit (minutes)
                </label>
                <input
                  type="number"
                  name="timeLimitMin"
                  min="1"
                  defaultValue={exam?.timeLimitMin || ""}
                  className="input w-full"
                  placeholder="Leave empty for no limit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Per-Question Time (seconds)
                </label>
                <input
                  type="number"
                  name="perQuestionSec"
                  min="5"
                  defaultValue={exam?.perQuestionSec || ""}
                  className="input w-full"
                  placeholder="Leave empty for no limit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Attempt Limit <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="attemptLimit"
                  required
                  min="1"
                  max="5"
                  defaultValue={exam?.attemptLimit || 2}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Pass Mark (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="passPercent"
                  required
                  min="0"
                  max="100"
                  defaultValue={exam?.passPercent || 60}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Start Window (Optional)
                </label>
                <input
                  type="datetime-local"
                  name="startWindowAt"
                  defaultValue={exam?.startWindowAt ? new Date(exam.startWindowAt).toISOString().slice(0, 16) : ""}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  required
                  defaultValue={exam?.status || "DRAFT"}
                  className="input w-full"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="shuffleQuestions"
                  value="true"
                  defaultChecked={exam?.shuffleQuestions ?? true}
                  className="checkbox"
                />
                <span className="text-sm font-medium">Shuffle questions for each student</span>
              </label>
            </div>
          </div>

          {/* Questions */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Questions ({questions.length})</h2>
                <p className="text-sm text-gray-500">
                  Total Points: {questions.reduce((sum: number, q: any) => sum + (q.points || 0), 0)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null);
                  setShowQuestionForm(true);
                }}
                className="btn-primary text-sm"
              >
                + Add Question
              </button>
            </div>

            {questions.length === 0 ? (
              <p className="text-center py-12 text-gray-400 text-sm">
                No questions added yet. Click "Add Question" to create your first question.
              </p>
            ) : (
              <div className="space-y-3">
                {questions.map((q: any, index: number) => (
                  <div key={q.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-gray-500">Q{index + 1}</span>
                          <span className="badge badge-info text-xs">{q.type}</span>
                          <span className="text-xs text-gray-400">{q.points} pts</span>
                        </div>
                        <p className="text-sm font-medium mb-2">{q.question}</p>
                        {q.type === "MCQ" && q.options && (
                          <ul className="text-xs text-gray-500 space-y-1 ml-4">
                            {q.options.map((opt: string, i: number) => (
                              <li key={i} className={q.correctAnswer === opt ? "text-green-600 font-medium" : ""}>
                                {String.fromCharCode(65 + i)}. {opt}
                                {q.correctAnswer === opt && " ✓"}
                              </li>
                            ))}
                          </ul>
                        )}
                        {q.type === "TRUE_FALSE" && (
                          <p className="text-xs text-gray-500">
                            Correct: <span className="text-green-600 font-medium">{q.correctAnswer}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(index, "up")}
                          disabled={index === 0}
                          className="btn-secondary text-xs px-2 py-1"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveQuestion(index, "down")}
                          disabled={index === questions.length - 1}
                          className="btn-secondary text-xs px-2 py-1"
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditQuestion(q)}
                          className="btn-secondary text-xs px-2 py-1"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="btn-danger text-xs px-2 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button type="submit" disabled={loading || questions.length === 0} className="btn-primary">
              {loading ? "Saving..." : mode === "create" ? "Create Exam" : "Update Exam"}
            </button>
            <Link href="/principal/examinations" className="btn-secondary no-underline">
              Cancel
            </Link>
          </div>
        </div>
      </form>

      {/* Question Form Modal */}
      {showQuestionForm && (
        <QuestionForm
          question={editingQuestion}
          onSave={handleAddQuestion}
          onCancel={() => {
            setShowQuestionForm(false);
            setEditingQuestion(null);
          }}
        />
      )}
    </div>
  );
}

function QuestionForm({ question, onSave, onCancel }: any) {
  const [type, setType] = useState(question?.type || "MCQ");
  const [options, setOptions] = useState(question?.options || ["", "", "", ""]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: any = {
      type,
      question: formData.get("question") as string,
      points: parseInt(formData.get("points") as string) || 1,
    };

    if (type === "MCQ") {
      data.options = options.filter((o: string) => o.trim());
      data.correctAnswer = formData.get("correctAnswer") as string;
    } else if (type === "TRUE_FALSE") {
      data.correctAnswer = formData.get("correctAnswer") as string;
    } else if (type === "SHORT_ANSWER") {
      data.correctAnswer = formData.get("correctAnswer") as string;
    }

    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">
          {question ? "Edit Question" : "Add Question"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Question Type <span className="text-red-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="input w-full"
              >
                <option value="MCQ">Multiple Choice</option>
                <option value="TRUE_FALSE">True/False</option>
                <option value="SHORT_ANSWER">Short Answer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Question <span className="text-red-500">*</span>
              </label>
              <textarea
                name="question"
                required
                rows={3}
                defaultValue={question?.question || ""}
                className="input w-full"
                placeholder="Enter the question..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Points <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="points"
                required
                min="1"
                defaultValue={question?.points || 1}
                className="input w-full"
              />
            </div>

            {type === "MCQ" && (
              <div>
                <label className="block text-sm font-medium mb-2">Options</label>
                {options.map((opt: string, i: number) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <span className="text-sm font-medium w-6">{String.fromCharCode(65 + i)}.</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[i] = e.target.value;
                        setOptions(newOpts);
                      }}
                      className="input flex-1"
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setOptions([...options, ""])}
                  className="btn-secondary text-sm mt-2"
                >
                  + Add Option
                </button>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">
                    Correct Answer <span className="text-red-500">*</span>
                  </label>
                  <select name="correctAnswer" required className="input w-full">
                    <option value="">Select correct answer</option>
                    {options.filter((o: string) => o.trim()).map((opt: string) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {type === "TRUE_FALSE" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Correct Answer <span className="text-red-500">*</span>
                </label>
                <select
                  name="correctAnswer"
                  required
                  defaultValue={question?.correctAnswer || ""}
                  className="input w-full"
                >
                  <option value="">Select correct answer</option>
                  <option value="TRUE">True</option>
                  <option value="FALSE">False</option>
                </select>
              </div>
            )}

            {type === "SHORT_ANSWER" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Model Answer / Keywords
                </label>
                <textarea
                  name="correctAnswer"
                  rows={2}
                  defaultValue={question?.correctAnswer || ""}
                  className="input w-full"
                  placeholder="Enter model answer or keywords for manual grading reference..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Short answer questions require manual grading
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <button type="submit" className="btn-primary">
              {question ? "Update" : "Add"} Question
            </button>
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
