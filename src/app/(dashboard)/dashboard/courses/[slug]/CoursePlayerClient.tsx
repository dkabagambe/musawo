"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, AlertCircle, CreditCard } from "lucide-react";

// ── Access thresholds (must match src/lib/enrolment/access.ts) ──────────────
const THRESHOLDS = {
  block1: 50,   // Phase 1: 50% unlocks course start
  block2: 75,   // Phase 2: 75% unlocks blocks 2-3 and practicals
  block3: 75,
  final:  100,  // Phase 3: 100% unlocks final exam and certificate
} as const;

function blockUnlocked(blockOrder: number, paidPercent: number, isFull: boolean): boolean {
  if (isFull) return true;
  if (blockOrder >= 4) return paidPercent >= THRESHOLDS.final;
  if (blockOrder === 3) return paidPercent >= THRESHOLDS.block3;
  if (blockOrder === 2) return paidPercent >= THRESHOLDS.block2;
  return paidPercent >= THRESHOLDS.block1;
}

function blockLockMessage(blockOrder: number, paidPercent: number): string {
  if (blockOrder >= 4 && paidPercent < THRESHOLDS.final)
    return "Pay the final 25% of your tuition to unlock this block and your certificate.";
  if ((blockOrder === 2 || blockOrder === 3) && paidPercent < THRESHOLDS.block2)
    return "Pay 75% of your tuition to unlock this block and book your practical day.";
  return "Pay 50% of your tuition to start your course and unlock Block 1.";
}

// ── Types ───────────────────────────────────────────────────────────────────
interface Lesson {
  id: string;
  order: number;
  title: string;
  type: "VIDEO" | "NOTES" | "QUIZ";
  isFree: boolean;
  durationSec: number | null;
}

interface Block {
  id: string;
  order: number;
  title: string;
  prerequisiteBlockOrder: number | null;
  lessons: Lesson[];
  exams: Array<{ id: string; title: string; timeLimitMin: number | null; attemptLimit: number; passPercent: number }>;
  assignments: Array<{ id: string; title: string; dueDate: string | null }>;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  pinned: boolean;
}

interface Props {
  course: { id: string; slug: string; title: string; tutor: { name: string }; blocks: Block[] };
  enrolment: { id: string; paidPercent: number; status: string; accessLevel: string };
  activeLessonId: string | null;
  viewerName: string;
  studentNumber: string;
  videoUrl: string | null;
  notesUrl: string | null;
  completedLessonIds: string[];
  progressPercent: number;
  announcements: Announcement[];
}

export default function CoursePlayerClient({
  course,
  enrolment,
  activeLessonId,
  viewerName,
  studentNumber,
  videoUrl,
  notesUrl,
  completedLessonIds: initialCompleted,
  progressPercent: initialProgress,
  announcements,
}: Props) {
  const router = useRouter();
  const [completed, setCompleted] = useState(new Set(initialCompleted));
  const [progress, setProgress] = useState(initialProgress);
  const [markingDone, setMarkingDone] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"content" | "announcements">("content");

  const { paidPercent, status } = enrolment;
  const isFull = status === "ACTIVE" || status === "COMPLETED" || paidPercent >= 100;
  const isOverdue = status === "OVERDUE";

  const allLessons = course.blocks.flatMap((b) => b.lessons);
  const activeLesson = allLessons.find((l) => l.id === activeLessonId) ?? allLessons[0];
  const activeBlock = course.blocks.find((b) => b.lessons.some((l) => l.id === activeLesson?.id));

  const isLessonAccessible = (lesson: Lesson, block: Block) =>
    lesson.isFree || blockUnlocked(block.order, paidPercent, isFull);

  async function markLessonComplete(lessonId: string) {
    if (completed.has(lessonId) || markingDone) return;
    setMarkingDone(true);
    try {
      await fetch("/api/courses/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, completed: true }),
      });
      const newCompleted = new Set(completed);
      newCompleted.add(lessonId);
      setCompleted(newCompleted);
      const total = allLessons.length;
      setProgress(total > 0 ? Math.round((newCompleted.size / total) * 100) : 0);
    } catch { /* non-fatal */ }
    finally { setMarkingDone(false); }
  }

  function goToLesson(lessonId: string) {
    router.push(`/dashboard/courses/${course.slug}?lesson=${lessonId}`);
  }

  const nextLesson = (() => {
    const idx = allLessons.findIndex((l) => l.id === activeLesson?.id);
    return idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : null;
  })();

  // ── Payment reminder ────────────────────────────────────────────────────
  const paymentPhase =
    isFull ? null
    : paidPercent >= 75 ? { label: "Final 25%", unlocks: "the final exam and certificate" }
    : paidPercent >= 50 ? { label: "Next 25%", unlocks: "Block 2, Block 3 and practical booking" }
    : { label: "First 50%", unlocks: "your course content (Block 1)" };

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden -m-4 -mb-6 md:-mb-6">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-72" : "w-0 overflow-hidden"} transition-all duration-200 bg-white border-r border-border flex flex-col flex-shrink-0`}
        aria-label="Course navigation"
      >
        <div className="p-4 border-b border-border flex-shrink-0">
          <p className="font-semibold text-sm text-primary leading-tight">{course.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{course.tutor.name}</p>
          {/* Lesson progress */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-success rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          {/* Fees paid indicator */}
          {!isFull && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Fees paid</span>
                <span className={`font-semibold ${isOverdue ? "text-danger" : "text-amber-600"}`}>{paidPercent}%</span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isOverdue ? "bg-danger" : "bg-amber-400"}`}
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {course.blocks.map((block) => {
            const unlocked = blockUnlocked(block.order, paidPercent, isFull);
            return (
              <div key={block.id} className="mb-1">
                <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide flex items-center gap-2 ${unlocked ? "text-primary" : "text-gray-300"}`}>
                  {!unlocked && <Lock size={12} aria-label="locked" />}
                  Block {block.order}: {block.title}
                </div>
                {!unlocked && (
                  <p className="px-4 pb-2 text-xs text-amber-600 italic leading-tight">
                    {blockLockMessage(block.order, paidPercent)}
                  </p>
                )}
                {block.lessons.map((lesson) => {
                  const accessible = isLessonAccessible(lesson, block);
                  const done = completed.has(lesson.id);
                  const isActive = lesson.id === activeLesson?.id;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => accessible ? goToLesson(lesson.id) : undefined}
                      disabled={!accessible}
                      className={`w-full text-left px-4 pl-6 py-2.5 text-sm flex items-center gap-2 transition-colors
                        ${isActive ? "bg-accent/10 text-accent font-medium" : ""}
                        ${!accessible ? "opacity-40 cursor-not-allowed" : "hover:bg-surface"}`}
                    >
                      <span aria-hidden="true" className="flex-shrink-0 text-base">
                        {done ? "✅" : lesson.type === "VIDEO" ? "▶️" : lesson.type === "NOTES" ? "📄" : "✏️"}
                      </span>
                      <span className="flex-1 leading-tight">{lesson.title}</span>
                      {lesson.durationSec && (
                        <span className="text-xs text-gray-400 flex-shrink-0">{Math.round(lesson.durationSec / 60)}m</span>
                      )}
                    </button>
                  );
                })}
                {block.exams.map((exam) => (
                  <Link
                    key={exam.id}
                    href={unlocked ? `/dashboard/exams/${exam.id}` : "#"}
                    className={`w-full text-left px-4 pl-6 py-2.5 text-sm flex items-center gap-2 no-underline ${!unlocked ? "opacity-40 pointer-events-none" : "hover:bg-surface"}`}
                    aria-disabled={!unlocked}
                  >
                    <span aria-hidden="true" className="flex-shrink-0">📝</span>
                    <span className="flex-1 text-danger font-medium">{exam.title}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">Exam</span>
                  </Link>
                ))}
                {block.assignments.map((asgn) => (
                  <Link
                    key={asgn.id}
                    href={unlocked ? `/dashboard/assignments/${asgn.id}` : "#"}
                    className={`w-full text-left px-4 pl-6 py-2.5 text-sm flex items-center gap-2 no-underline ${!unlocked ? "opacity-40 pointer-events-none" : "hover:bg-surface"}`}
                    aria-disabled={!unlocked}
                  >
                    <span aria-hidden="true" className="flex-shrink-0">📋</span>
                    <span className="flex-1">{asgn.title}</span>
                    {asgn.dueDate && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        Due {new Date(asgn.dueDate).toLocaleDateString("en-UG")}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-surface">
        {/* Payment reminder banner */}
        {paymentPhase && (
          <div className={`px-4 py-3 text-sm flex items-start gap-3 border-b ${
            isOverdue
              ? "bg-danger/10 border-danger/20 text-danger"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}>
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span className="flex-1">
              {isOverdue
                ? "Your instalment is overdue. Pay now to keep access to your course content."
                : `You have paid ${paidPercent}% of your fees. Paying ${paymentPhase.label} unlocks ${paymentPhase.unlocks}.`
              }
            </span>
            <Link
              href="/dashboard/payments/claim"
              className="flex items-center gap-1 font-semibold underline flex-shrink-0"
            >
              <CreditCard size={14} aria-hidden="true" /> Pay now
            </Link>
          </div>
        )}

        {/* Top bar */}
        <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-ghost p-2"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            ☰
          </button>
          <div className="flex gap-3 text-sm">
            <button
              onClick={() => setActiveTab("content")}
              className={`pb-1 font-medium border-b-2 transition-colors ${activeTab === "content" ? "border-accent text-accent" : "border-transparent text-gray-400"}`}
            >
              Lesson
            </button>
            <button
              onClick={() => setActiveTab("announcements")}
              className={`pb-1 font-medium border-b-2 transition-colors flex items-center gap-1 ${activeTab === "announcements" ? "border-accent text-accent" : "border-transparent text-gray-400"}`}
            >
              Announcements
              {announcements.length > 0 && (
                <span className="bg-accent text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {announcements.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6">
          {activeTab === "announcements" ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Announcements</h2>
              {announcements.length === 0 ? (
                <p className="text-gray-400 text-sm">No announcements yet.</p>
              ) : (
                <div className="space-y-4">
                  {announcements.map((a) => (
                    <div key={a.id} className={`card ${a.pinned ? "border-accent/40 bg-accent/5" : ""}`}>
                      {a.pinned && <span className="text-xs text-accent font-medium mb-1 block">📌 Pinned</span>}
                      <h3 className="font-semibold mb-1">{a.title}</h3>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{a.body}</p>
                      <p className="text-xs text-gray-400 mt-2">{new Date(a.createdAt).toLocaleDateString("en-UG")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeLesson ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-info badge text-xs">Block {activeBlock?.order} - Lesson {activeLesson.order}</span>
              </div>
              <h2 className="text-xl font-semibold mb-4">{activeLesson.title}</h2>

              {/* VIDEO */}
              {activeLesson.type === "VIDEO" && (
                <div>
                  {videoUrl ? (
                    <div className="relative w-full rounded-2xl overflow-hidden bg-black mb-4" style={{ aspectRatio: "16/9" }}>
                      <iframe
                        src={videoUrl}
                        className="absolute inset-0 w-full h-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                        title={activeLesson.title}
                        onLoad={() => { setTimeout(() => markLessonComplete(activeLesson.id), 5000); }}
                      />
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10 text-center mb-4">
                      <Lock className="w-10 h-10 text-amber-400 mx-auto mb-3" aria-hidden="true" />
                      <p className="text-sm font-semibold text-amber-800 mb-1">Video locked</p>
                      <p className="text-sm text-amber-700 mb-4">
                        {activeBlock ? blockLockMessage(activeBlock.order, paidPercent) : "Complete your payment to access this video."}
                      </p>
                      <Link href="/dashboard/payments/claim" className="btn-primary no-underline text-sm inline-flex items-center gap-2">
                        <CreditCard size={14} aria-hidden="true" /> Submit payment
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* NOTES */}
              {activeLesson.type === "NOTES" && (
                <div className="mb-4">
                  {notesUrl ? (
                    <div>
                      <div className="relative rounded-2xl overflow-hidden border border-border" style={{ height: "65vh" }} onContextMenu={(e) => e.preventDefault()}>
                        <iframe src={notesUrl} className="w-full h-full" title={`Notes: ${activeLesson.title}`} referrerPolicy="same-origin" />
                        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-[0.12] grid place-items-center">
                          <span className="rotate-[-28deg] text-gray-900 text-xl font-bold whitespace-nowrap">
                            {viewerName} {studentNumber && `· ${studentNumber}`} · {new Date().toLocaleDateString("en-UG")}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">For in-platform study only. Screenshots and photography cannot be fully prevented.</p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10 text-center">
                      <Lock className="w-10 h-10 text-amber-400 mx-auto mb-3" aria-hidden="true" />
                      <p className="text-sm font-semibold text-amber-800 mb-1">Notes locked</p>
                      <p className="text-sm text-amber-700 mb-4">
                        {activeBlock ? blockLockMessage(activeBlock.order, paidPercent) : "Complete your payment to access these notes."}
                      </p>
                      <Link href="/dashboard/payments/claim" className="btn-primary no-underline text-sm inline-flex items-center gap-2">
                        <CreditCard size={14} aria-hidden="true" /> Submit payment
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* QUIZ */}
              {activeLesson.type === "QUIZ" && (
                <div className="card bg-accent/5 border-accent/20 text-center py-8">
                  <p className="text-3xl mb-3" aria-hidden="true">✏️</p>
                  <h3 className="font-semibold mb-2">{activeLesson.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">This is a graded quiz for this lesson block.</p>
                  <Link
                    href={`/dashboard/exams/${activeLesson.id}`}
                    className="btn-primary no-underline"
                    onClick={() => markLessonComplete(activeLesson.id)}
                  >
                    Start quiz
                  </Link>
                </div>
              )}

              {/* Mark complete + Next */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <button
                  onClick={() => markLessonComplete(activeLesson.id)}
                  disabled={completed.has(activeLesson.id) || markingDone}
                  className={`btn text-sm ${completed.has(activeLesson.id) ? "bg-success/10 text-green-700 cursor-default" : "btn-outline"}`}
                >
                  {completed.has(activeLesson.id) ? "✅ Completed" : "Mark as complete"}
                </button>
                {nextLesson && (
                  <button onClick={() => goToLesson(nextLesson.id)} className="btn-primary text-sm">
                    Next lesson →
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Select a lesson from the sidebar.</p>
          )}
        </div>
      </main>
    </div>
  );
}
