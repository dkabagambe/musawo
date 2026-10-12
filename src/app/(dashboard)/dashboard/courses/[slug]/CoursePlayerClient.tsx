"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Lesson {
  id: string;
  order: number;
  title: string;
  type: "VIDEO" | "NOTES" | "QUIZ";
  isFree: boolean;
  durationSec: number | null;
  bunnyVideoId?: string | null;
  notesS3Key?: string | null;
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
  enrolment: { id: string; unlockedBlockOrder: number; status: string };
  activeLessonId: string | null;
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

  const allLessons = course.blocks.flatMap((b) => b.lessons);
  const activeLesson = allLessons.find((l) => l.id === activeLessonId) ?? allLessons[0];
  const activeBlock = course.blocks.find((b) => b.lessons.some((l) => l.id === activeLesson?.id));

  const isBlockUnlocked = (block: Block) =>
    block.order <= enrolment.unlockedBlockOrder || enrolment.unlockedBlockOrder >= 9999;

  const isLessonAccessible = (lesson: Lesson, block: Block) =>
    lesson.isFree || isBlockUnlocked(block);

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

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden -m-4 -mb-6 md:-mb-6">
      {/* Sidebar */}
      <aside
        className={`
          ${sidebarOpen ? "w-72" : "w-0 overflow-hidden"}
          transition-all duration-200 bg-white border-r border-border flex flex-col flex-shrink-0
        `}
        aria-label="Course navigation"
      >
        <div className="p-4 border-b border-border flex-shrink-0">
          <p className="font-semibold text-sm text-primary leading-tight">{course.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{course.tutor.name}</p>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {course.blocks.map((block) => {
            const unlocked = isBlockUnlocked(block);
            return (
              <div key={block.id} className="mb-1">
                <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide flex items-center gap-2 ${
                  unlocked ? "text-primary" : "text-gray-300"
                }`}>
                  {!unlocked && <span aria-label="locked">🔒</span>}
                  Block {block.order}: {block.title}
                </div>
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
                        ${!accessible ? "opacity-40 cursor-not-allowed" : "hover:bg-surface"}
                      `}
                    >
                      <span aria-hidden="true" className="flex-shrink-0 text-base">
                        {done ? "✅" : lesson.type === "VIDEO" ? "▶️" : lesson.type === "NOTES" ? "📄" : "✏️"}
                      </span>
                      <span className="flex-1 leading-tight">{lesson.title}</span>
                      {lesson.durationSec && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {Math.round(lesson.durationSec / 60)}m
                        </span>
                      )}
                    </button>
                  );
                })}
                {/* Exams for this block */}
                {block.exams.map((exam) => (
                  <Link
                    key={exam.id}
                    href={`/dashboard/exams/${exam.id}`}
                    className={`w-full text-left px-4 pl-6 py-2.5 text-sm flex items-center gap-2 no-underline
                      ${!unlocked ? "opacity-40 pointer-events-none" : "hover:bg-surface"}
                    `}
                  >
                    <span aria-hidden="true" className="flex-shrink-0">📝</span>
                    <span className="flex-1 text-danger font-medium">{exam.title}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">Exam</span>
                  </Link>
                ))}
                {/* Assignments for this block */}
                {block.assignments.map((asgn) => (
                  <Link
                    key={asgn.id}
                    href={`/dashboard/assignments/${asgn.id}`}
                    className={`w-full text-left px-4 pl-6 py-2.5 text-sm flex items-center gap-2 no-underline
                      ${!unlocked ? "opacity-40 pointer-events-none" : "hover:bg-surface"}
                    `}
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
              className={`pb-1 font-medium border-b-2 transition-colors ${
                activeTab === "content" ? "border-accent text-accent" : "border-transparent text-gray-400"
              }`}
            >
              Lesson
            </button>
            <button
              onClick={() => setActiveTab("announcements")}
              className={`pb-1 font-medium border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === "announcements" ? "border-accent text-accent" : "border-transparent text-gray-400"
              }`}
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
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(a.createdAt).toLocaleDateString("en-UG")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeLesson ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-info badge text-xs">
                  Block {activeBlock?.order} — Lesson {activeLesson.order}
                </span>
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
                        onLoad={() => {
                          // Mark complete after starting video
                          setTimeout(() => markLessonComplete(activeLesson.id), 5000);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="bg-primary/10 rounded-2xl p-10 text-center mb-4">
                      <p className="text-4xl mb-2" aria-hidden="true">🔒</p>
                      <p className="text-sm text-gray-500">
                        This video is locked. Complete payment to unlock.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* NOTES */}
              {activeLesson.type === "NOTES" && (
                <div className="mb-4">
                  {notesUrl ? (
                    <div>
                      <div className="flex gap-3 mb-4">
                        <a
                          href={notesUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary no-underline"
                          onClick={() => markLessonComplete(activeLesson.id)}
                        >
                          📄 Open notes (PDF)
                        </a>
                        <a
                          href={notesUrl}
                          download
                          className="btn-outline no-underline"
                          onClick={() => markLessonComplete(activeLesson.id)}
                        >
                          ⬇ Download
                        </a>
                      </div>
                      {/* Embed PDF inline */}
                      <div className="rounded-2xl overflow-hidden border border-border" style={{ height: "65vh" }}>
                        <iframe
                          src={notesUrl}
                          className="w-full h-full"
                          title={`Notes: ${activeLesson.title}`}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-primary/10 rounded-2xl p-10 text-center">
                      <p className="text-4xl mb-2" aria-hidden="true">🔒</p>
                      <p className="text-sm text-gray-500">Notes locked — complete payment to access.</p>
                    </div>
                  )}
                </div>
              )}

              {/* QUIZ (inline) */}
              {activeLesson.type === "QUIZ" && (
                <div className="card bg-accent/5 border-accent/20 text-center py-8">
                  <p className="text-3xl mb-3" aria-hidden="true">✏️</p>
                  <h3 className="font-semibold mb-2">{activeLesson.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    This is a graded quiz for this lesson block.
                  </p>
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
                  className={`btn text-sm ${
                    completed.has(activeLesson.id)
                      ? "bg-success/10 text-green-700 cursor-default"
                      : "btn-outline"
                  }`}
                >
                  {completed.has(activeLesson.id) ? "✅ Completed" : "Mark as complete"}
                </button>
                {nextLesson && (
                  <button
                    onClick={() => goToLesson(nextLesson.id)}
                    className="btn-primary text-sm"
                  >
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
