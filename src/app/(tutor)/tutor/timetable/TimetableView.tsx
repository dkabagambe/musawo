"use client";

import React, { useState, useCallback } from "react";
import {
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  X,
  Clock,
  MapPin,
  Users,
  Video,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import CreateClassModal from "./CreateClassModal";
import RescheduleModal from "./RescheduleModal";
import CancelModal from "./CancelModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimetableClass {
  id: string;
  title: string;
  scheduledAt: string;
  durationMin: number;
  joinUrl: string;
  platform: string;
  status: string;
  venue: string | null;
  recordingUrl: string | null;
  cancelReason: string | null;
  rescheduleReason: string | null;
  originalScheduledAt: string | null;
  studentCount: number;
  course: { id: string; title: string; courseCode: string | null };
  block: { id: string; title: string; order: number } | null;
}

interface CourseOption {
  id: string;
  title: string;
  courseCode: string | null;
}

interface Props {
  initialClasses: TimetableClass[];
  courses: CourseOption[];
  userId: string;
}

// ─── Colour palette per course (cycles through) ───────────────────────────────

const COURSE_COLOURS = [
  { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-400", text: "text-blue-800 dark:text-blue-200", dot: "bg-blue-500" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-emerald-400", text: "text-emerald-800 dark:text-emerald-200", dot: "bg-emerald-500" },
  { bg: "bg-violet-100 dark:bg-violet-900/30", border: "border-violet-400", text: "text-violet-800 dark:text-violet-200", dot: "bg-violet-500" },
  { bg: "bg-orange-100 dark:bg-orange-900/30", border: "border-orange-400", text: "text-orange-800 dark:text-orange-200", dot: "bg-orange-500" },
  { bg: "bg-rose-100 dark:bg-rose-900/30", border: "border-rose-400", text: "text-rose-800 dark:text-rose-200", dot: "bg-rose-500" },
  { bg: "bg-teal-100 dark:bg-teal-900/30", border: "border-teal-400", text: "text-teal-800 dark:text-teal-200", dot: "bg-teal-500" },
  { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-400", text: "text-amber-800 dark:text-amber-200", dot: "bg-amber-500" },
  { bg: "bg-sky-100 dark:bg-sky-900/30", border: "border-sky-400", text: "text-sky-800 dark:text-sky-200", dot: "bg-sky-500" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" });
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay(); // 0=Sun
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function addWeeks(d: Date, n: number) {
  return addDays(d, n * 7);
}

function addMonths(d: Date, n: number) {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + n);
  return copy;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getEndTime(cls: TimetableClass) {
  return new Date(new Date(cls.scheduledAt).getTime() + cls.durationMin * 60_000);
}

function detectOverlaps(classes: TimetableClass[]): Set<string> {
  const overlapping = new Set<string>();
  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      const a = classes[i]!, b = classes[j]!;
      if (a.status === "CANCELLED" || b.status === "CANCELLED") continue;
      const aStart = new Date(a.scheduledAt).getTime();
      const aEnd = aStart + a.durationMin * 60_000;
      const bStart = new Date(b.scheduledAt).getTime();
      const bEnd = bStart + b.durationMin * 60_000;
      if (aStart < bEnd && aEnd > bStart) {
        overlapping.add(a.id);
        overlapping.add(b.id);
      }
    }
  }
  return overlapping;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: "Scheduled", cls: "badge-info" },
  LIVE: { label: "Live now", cls: "badge-danger" },
  COMPLETED: { label: "Completed", cls: "badge-success" },
  CANCELLED: { label: "Cancelled", cls: "badge" },
  RESCHEDULED: { label: "Rescheduled", cls: "badge bg-amber-100 text-amber-800 border-amber-300" },
};

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  cls,
  onClose,
  colour,
  isOverlap,
  onReschedule,
  onCancel,
}: {
  cls: TimetableClass;
  onClose: () => void;
  colour: (typeof COURSE_COLOURS)[0];
  isOverlap: boolean;
  onReschedule: (cls: TimetableClass) => void;
  onCancel: (cls: TimetableClass) => void;
}) {
  const start = new Date(cls.scheduledAt);
  const end = getEndTime(cls);
  const statusInfo = STATUS_LABEL[cls.status] ?? { label: cls.status, cls: "badge" };
  const canAct =
    cls.status === "SCHEDULED" || cls.status === "RESCHEDULED";

  return (
    <div
      role="dialog"
      aria-label="Class details"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${colour.bg} border-b ${colour.border} px-6 py-5 rounded-t-2xl`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`badge text-xs ${statusInfo.cls}`}>{statusInfo.label}</span>
                {isOverlap && (
                  <span className="badge bg-yellow-100 text-yellow-800 border-yellow-300 text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Overlap
                  </span>
                )}
              </div>
              <h2 className={`font-bold text-lg leading-tight ${colour.text}`}>{cls.title}</h2>
              <p className={`text-sm mt-0.5 ${colour.text} opacity-80`}>{cls.course.title}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-black/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Date and time */}
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary">{fmtDate(start)}</p>
              <p className="text-xs text-gray-500">
                {fmtTime(start)} to {fmtTime(end)} EAT ({cls.durationMin} min)
              </p>
              {cls.originalScheduledAt && (
                <p className="text-xs text-amber-600 mt-0.5">
                  Originally: {fmtDate(new Date(cls.originalScheduledAt))} {fmtTime(new Date(cls.originalScheduledAt))}
                </p>
              )}
            </div>
          </div>

          {/* Block */}
          {cls.block && (
            <div className="flex items-start gap-3">
              <List className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Block {cls.block.order}: {cls.block.title}
              </p>
            </div>
          )}

          {/* Venue */}
          {cls.venue && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600 dark:text-gray-300">{cls.venue}</p>
            </div>
          )}

          {/* Students count */}
          <div className="flex items-start gap-3">
            <Users className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {cls.studentCount} student{cls.studentCount !== 1 ? "s" : ""} in attendance records
            </p>
          </div>

          {/* Join link */}
          {cls.joinUrl && cls.status !== "CANCELLED" && (
            <div className="flex items-start gap-3">
              <Video className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <a
                href={cls.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate"
              >
                {cls.joinUrl}
              </a>
            </div>
          )}

          {/* Reschedule reason */}
          {cls.rescheduleReason && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Reschedule reason</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">{cls.rescheduleReason}</p>
            </div>
          )}

          {/* Cancel reason */}
          {cls.cancelReason && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">Cancellation reason</p>
              <p className="text-sm text-red-800 dark:text-red-300">{cls.cancelReason}</p>
            </div>
          )}

          {/* Recording */}
          {cls.recordingUrl && (
            <div className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3">
              <span className="text-xs font-semibold text-success">Recording available</span>
              <a
                href={cls.recordingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline truncate"
              >
                Watch replay
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <a
              href={`/tutor/attendance?classId=${cls.id}`}
              className="btn-outline text-xs no-underline"
            >
              Roll call
            </a>
            {cls.status === "LIVE" && (
              <a
                href={cls.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs no-underline"
              >
                Join live
              </a>
            )}
            {canAct && (
              <>
                <button
                  onClick={() => onReschedule(cls)}
                  className="btn-outline text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" /> Reschedule
                </button>
                <button
                  onClick={() => onCancel(cls)}
                  className="btn-outline text-xs text-danger border-danger/40 hover:bg-danger/5 flex items-center gap-1.5"
                >
                  <X className="w-3 h-3" /> Cancel class
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  weekStart,
  classes,
  courseColourMap,
  overlapIds,
  onSelectClass,
}: {
  weekStart: Date;
  classes: TimetableClass[];
  courseColourMap: Map<string, number>;
  overlapIds: Set<string>;
  onSelectClass: (cls: TimetableClass) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="min-w-[700px]">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={day.toISOString()} className="text-center py-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  {day.toLocaleDateString("en-UG", { weekday: "short" })}
                </p>
                <p
                  className={`text-sm font-bold mt-0.5 w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                    isToday
                      ? "bg-primary text-white"
                      : "text-primary dark:text-gray-200"
                  }`}
                >
                  {day.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Grid cells */}
        <div className="grid grid-cols-7 gap-1 min-h-[200px]">
          {days.map((day) => {
            const dayClasses = classes.filter((c) =>
              isSameDay(new Date(c.scheduledAt), day)
            );
            const isToday = isSameDay(day, today);
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[160px] rounded-xl p-1.5 space-y-1 border ${
                  isToday
                    ? "bg-primary/5 border-primary/20"
                    : "bg-surface/40 border-border"
                }`}
              >
                {dayClasses.map((cls) => {
                  const colIdx = courseColourMap.get(cls.course.id) ?? 0;
                  const colour = COURSE_COLOURS[colIdx % COURSE_COLOURS.length]!;
                  const isOverlap = overlapIds.has(cls.id);
                  const isCancelled = cls.status === "CANCELLED";
                  return (
                    <button
                      key={cls.id}
                      onClick={() => onSelectClass(cls)}
                      title={`${cls.title} - ${fmtTime(new Date(cls.scheduledAt))}`}
                      className={`w-full text-left rounded-lg border-l-4 px-2 py-1.5 text-xs cursor-pointer transition-all hover:opacity-80 hover:shadow-sm ${colour.bg} ${colour.border} ${
                        isCancelled ? "opacity-50 line-through" : ""
                      } ${isOverlap ? "ring-2 ring-yellow-400 ring-offset-1" : ""}`}
                    >
                      <p className={`font-semibold truncate leading-tight ${colour.text}`}>
                        {cls.title}
                      </p>
                      <p className={`opacity-70 leading-tight mt-0.5 ${colour.text}`}>
                        {fmtTime(new Date(cls.scheduledAt))}
                      </p>
                      {cls.status === "LIVE" && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  monthStart,
  classes,
  courseColourMap,
  overlapIds,
  onSelectClass,
}: {
  monthStart: Date;
  classes: TimetableClass[];
  courseColourMap: Map<string, number>;
  overlapIds: Set<string>;
  onSelectClass: (cls: TimetableClass) => void;
}) {
  const today = new Date();
  // Build weeks array
  const firstDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const gridStart = startOfWeek(firstDay);
  const days: Date[] = [];
  let cursor = new Date(gridStart);
  while (days.length < 42) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="min-w-[700px]">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 uppercase tracking-wider py-2 font-medium">
              {d}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, today);
            const dayClasses = classes.filter((c) =>
              isSameDay(new Date(c.scheduledAt), day)
            );
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[80px] rounded-lg p-1.5 border ${
                  isToday
                    ? "bg-primary/5 border-primary/30"
                    : isCurrentMonth
                    ? "bg-white dark:bg-gray-800/50 border-border"
                    : "bg-gray-50 dark:bg-gray-900/30 border-border opacity-50"
                }`}
              >
                <p
                  className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                    isToday
                      ? "bg-primary text-white"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {day.getDate()}
                </p>
                <div className="space-y-0.5">
                  {dayClasses.slice(0, 3).map((cls) => {
                    const colIdx = courseColourMap.get(cls.course.id) ?? 0;
                    const colour = COURSE_COLOURS[colIdx % COURSE_COLOURS.length]!;
                    const isOverlap = overlapIds.has(cls.id);
                    return (
                      <button
                        key={cls.id}
                        onClick={() => onSelectClass(cls)}
                        title={cls.title}
                        className={`w-full text-left rounded px-1 py-0.5 text-[10px] font-medium truncate leading-tight ${colour.bg} ${colour.text} ${
                          cls.status === "CANCELLED" ? "opacity-40 line-through" : ""
                        } ${isOverlap ? "ring-1 ring-yellow-400" : ""}`}
                      >
                        {fmtTime(new Date(cls.scheduledAt))} {cls.title}
                      </button>
                    );
                  })}
                  {dayClasses.length > 3 && (
                    <p className="text-[10px] text-gray-400 pl-1">
                      +{dayClasses.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({
  classes,
  courseColourMap,
  overlapIds,
  onSelectClass,
}: {
  classes: TimetableClass[];
  courseColourMap: Map<string, number>;
  overlapIds: Set<string>;
  onSelectClass: (cls: TimetableClass) => void;
}) {
  const today = new Date();

  // Group by date
  const groups = new Map<string, TimetableClass[]>();
  for (const cls of classes) {
    const key = new Date(cls.scheduledAt).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(cls);
  }

  if (classes.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-10 text-center">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-6 h-6 text-primary/40" />
        </div>
        <p className="text-gray-500 text-sm">No classes in this range.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="list-view">
      {Array.from(groups.entries()).map(([dateKey, dayClasses]) => {
        const date = new Date(dayClasses[0]!.scheduledAt);
        const isToday = isSameDay(date, today);
        const isPast = date < today && !isToday;
        return (
          <div key={dateKey}>
            <div className={`flex items-center gap-3 mb-3 ${isPast ? "opacity-70" : ""}`}>
              <div
                className={`w-12 h-12 flex-shrink-0 rounded-xl flex flex-col items-center justify-center text-center ${
                  isToday ? "bg-primary text-white" : "bg-surface border border-border"
                }`}
              >
                <span className={`text-[10px] font-bold uppercase leading-none ${isToday ? "text-white/80" : "text-gray-400"}`}>
                  {date.toLocaleDateString("en-UG", { month: "short" })}
                </span>
                <span className={`text-xl font-extrabold leading-tight ${isToday ? "text-white" : "text-primary"}`}>
                  {date.getDate()}
                </span>
                <span className={`text-[9px] leading-none ${isToday ? "text-white/70" : "text-gray-400"}`}>
                  {date.toLocaleDateString("en-UG", { weekday: "short" })}
                </span>
              </div>
              <div>
                <p className={`text-sm font-bold ${isToday ? "text-primary" : "text-gray-700 dark:text-gray-200"}`}>
                  {isToday ? "Today" : date.toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p className="text-xs text-gray-400">{dayClasses.length} class{dayClasses.length !== 1 ? "es" : ""}</p>
              </div>
            </div>
            <div className="space-y-2 pl-16">
              {dayClasses.map((cls) => {
                const colIdx = courseColourMap.get(cls.course.id) ?? 0;
                const colour = COURSE_COLOURS[colIdx % COURSE_COLOURS.length]!;
                const isOverlap = overlapIds.has(cls.id);
                const statusInfo = STATUS_LABEL[cls.status] ?? { label: cls.status, cls: "badge" };
                const start = new Date(cls.scheduledAt);
                const end = getEndTime(cls);
                return (
                  <button
                    key={cls.id}
                    onClick={() => onSelectClass(cls)}
                    data-testid="timetable-entry"
                    className={`w-full text-left bg-white dark:bg-gray-800 rounded-xl border ${
                      isOverlap ? "border-yellow-300 ring-2 ring-yellow-200" : "border-border"
                    } p-4 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group`}
                  >
                    {/* Colour stripe */}
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${colour.dot}`} />
                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className={`font-bold text-sm ${cls.status === "CANCELLED" ? "line-through text-gray-400" : "text-primary"}`}>
                          {cls.title}
                        </h3>
                        <span className={`badge text-xs ${statusInfo.cls}`}>{statusInfo.label}</span>
                        {isOverlap && (
                          <span className="badge bg-yellow-100 text-yellow-800 border-yellow-300 text-xs flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Overlap
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{cls.course.title}</p>
                      <div className="flex items-center gap-4 flex-wrap text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {fmtTime(start)} to {fmtTime(end)}
                        </span>
                        {cls.venue && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {cls.venue}
                          </span>
                        )}
                        {cls.block && (
                          <span>Block {cls.block.order}: {cls.block.title}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {cls.studentCount}
                        </span>
                      </div>
                    </div>
                    {/* Join link */}
                    {cls.status === "LIVE" && (
                      <span className="flex-shrink-0 badge badge-danger text-xs animate-pulse">LIVE</span>
                    )}
                    {cls.joinUrl && cls.status === "SCHEDULED" && (
                      <span className="flex-shrink-0 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <Video className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main TimetableView ───────────────────────────────────────────────────────

export default function TimetableView({ initialClasses, courses, userId }: Props) {
  const [classes, setClasses] = useState<TimetableClass[]>(initialClasses);
  const [viewMode, setViewMode] = useState<"week" | "month" | "list">("list");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<TimetableClass | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<TimetableClass | null>(null);
  const [cancelTarget, setCancelTarget] = useState<TimetableClass | null>(null);

  // Build stable course-to-colour map
  const courseColourMap = React.useMemo(() => {
    const map = new Map<string, number>();
    courses.forEach((c, i) => map.set(c.id, i));
    return map;
  }, [courses]);

  // Filtered classes
  const filteredClasses = React.useMemo(() => {
    let arr = classes;
    if (filterCourse !== "all") arr = arr.filter((c) => c.course.id === filterCourse);
    return arr;
  }, [classes, filterCourse]);

  // Classes for current view window
  const windowClasses = React.useMemo(() => {
    if (viewMode === "list") {
      // Show all classes (sorted) for list mode
      return [...filteredClasses].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
    }
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate);
      const we = addDays(ws, 7);
      return filteredClasses.filter((c) => {
        const d = new Date(c.scheduledAt);
        return d >= ws && d < we;
      });
    }
    // month
    const ms = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const me = addMonths(ms, 1);
    return filteredClasses.filter((c) => {
      const d = new Date(c.scheduledAt);
      return d >= ms && d < me;
    });
  }, [filteredClasses, viewMode, currentDate]);

  const overlapIds = React.useMemo(
    () => detectOverlaps(filteredClasses),
    [filteredClasses]
  );

  // Navigation label
  const navLabel = React.useMemo(() => {
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate);
      const we = addDays(ws, 6);
      const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
      return `${ws.toLocaleDateString("en-UG", opts)} - ${we.toLocaleDateString("en-UG", opts)}, ${we.getFullYear()}`;
    }
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("en-UG", { month: "long", year: "numeric" });
    }
    return "All classes";
  }, [viewMode, currentDate]);

  function goBack() {
    if (viewMode === "week") setCurrentDate((d) => addWeeks(d, -1));
    else if (viewMode === "month") setCurrentDate((d) => addMonths(d, -1));
  }

  function goForward() {
    if (viewMode === "week") setCurrentDate((d) => addWeeks(d, 1));
    else if (viewMode === "month") setCurrentDate((d) => addMonths(d, 1));
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  const handleClassCreated = useCallback((created: TimetableClass[]) => {
    setClasses((prev) => [...prev, ...created]);
    setShowCreate(false);
  }, []);

  const handleRescheduled = useCallback((updated: TimetableClass) => {
    setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setRescheduleTarget(null);
    setSelectedClass(null);
  }, []);

  const handleCancelled = useCallback((id: string, reason: string) => {
    setClasses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "CANCELLED", cancelReason: reason } : c))
    );
    setCancelTarget(null);
    setSelectedClass(null);
  }, []);

  const colourForClass = (cls: TimetableClass) =>
    COURSE_COLOURS[(courseColourMap.get(cls.course.id) ?? 0) % COURSE_COLOURS.length]!;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Timetable</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your class schedule across all courses</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/api/tutor/classes?format=ics"
            download="timetable.ics"
            className="btn-outline text-xs flex items-center gap-1.5 no-underline"
            aria-label="Download timetable as ICS calendar file"
          >
            <Download className="w-3.5 h-3.5" />
            Export .ics
          </a>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New class
          </button>
        </div>
      </div>

      {/* ── Course legend ────────────────────────────────────────── */}
      {courses.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Course colour legend">
          {courses.map((c, i) => {
            const colour = COURSE_COLOURS[i % COURSE_COLOURS.length]!;
            return (
              <button
                key={c.id}
                onClick={() => setFilterCourse(filterCourse === c.id ? "all" : c.id)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                  filterCourse === c.id
                    ? `${colour.bg} ${colour.border} ${colour.text} font-semibold`
                    : "bg-surface border-border text-gray-500 hover:border-gray-400"
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colour.dot}`} />
                {c.courseCode ?? c.title.slice(0, 20)}
              </button>
            );
          })}
          {filterCourse !== "all" && (
            <button
              onClick={() => setFilterCourse("all")}
              className="text-xs text-gray-400 hover:text-primary px-2 py-1"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* ── View controls ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View mode tabs */}
        <div className="flex rounded-xl border border-border overflow-hidden">
          {(["list", "week", "month"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                viewMode === mode
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-surface"
              }`}
            >
              {mode === "list" ? <span className="flex items-center gap-1"><List className="w-3.5 h-3.5" />List</span>
               : mode === "week" ? <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Week</span>
               : <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Month</span>}
            </button>
          ))}
        </div>

        {viewMode !== "list" && (
          <>
            <button
              onClick={goBack}
              aria-label="Previous"
              className="p-1.5 rounded-lg border border-border bg-white dark:bg-gray-800 hover:bg-surface transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-primary min-w-[200px] text-center">
              {navLabel}
            </span>
            <button
              onClick={goForward}
              aria-label="Next"
              className="p-1.5 rounded-lg border border-border bg-white dark:bg-gray-800 hover:bg-surface transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={goToday}
              className="btn-outline text-xs"
            >
              Today
            </button>
          </>
        )}

        <span className="text-xs text-gray-400 ml-auto">
          {windowClasses.length} class{windowClasses.length !== 1 ? "es" : ""}
          {filterCourse !== "all" ? " (filtered)" : ""}
        </span>
      </div>

      {/* ── Overlap warning ──────────────────────────────────────── */}
      {overlapIds.size > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {overlapIds.size} class{overlapIds.size !== 1 ? "es" : ""}{" "}
          {overlapIds.size !== 1 ? "have" : "has"} overlapping times. Check highlighted entries.
        </div>
      )}

      {/* ── Calendar / List area ─────────────────────────────────── */}
      {viewMode === "week" && (
        <WeekView
          weekStart={startOfWeek(currentDate)}
          classes={windowClasses}
          courseColourMap={courseColourMap}
          overlapIds={overlapIds}
          onSelectClass={setSelectedClass}
        />
      )}
      {viewMode === "month" && (
        <MonthView
          monthStart={new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)}
          classes={windowClasses}
          courseColourMap={courseColourMap}
          overlapIds={overlapIds}
          onSelectClass={setSelectedClass}
        />
      )}
      {viewMode === "list" && (
        <ListView
          classes={windowClasses}
          courseColourMap={courseColourMap}
          overlapIds={overlapIds}
          onSelectClass={setSelectedClass}
        />
      )}

      {/* ── Detail panel ────────────────────────────────────────── */}
      {selectedClass && (
        <DetailPanel
          cls={selectedClass}
          colour={colourForClass(selectedClass)}
          isOverlap={overlapIds.has(selectedClass.id)}
          onClose={() => setSelectedClass(null)}
          onReschedule={(cls) => {
            setRescheduleTarget(cls);
            setSelectedClass(null);
          }}
          onCancel={(cls) => {
            setCancelTarget(cls);
            setSelectedClass(null);
          }}
        />
      )}

      {/* ── Modals ─────────────────────────────────────────────── */}
      {showCreate && (
        <CreateClassModal
          courses={courses}
          onClose={() => setShowCreate(false)}
          onCreated={handleClassCreated}
        />
      )}
      {rescheduleTarget && (
        <RescheduleModal
          cls={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onRescheduled={handleRescheduled}
        />
      )}
      {cancelTarget && (
        <CancelModal
          cls={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancelled={handleCancelled}
        />
      )}
    </div>
  );
}
