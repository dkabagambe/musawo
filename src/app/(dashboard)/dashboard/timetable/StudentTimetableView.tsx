"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  Clock,
  MapPin,
  Video,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import StudentJoinClass from "./StudentJoinClass";
import PresentationViewer from "@/components/live/PresentationViewer";
import AvatarOrInitials from "@/components/ui/AvatarOrInitials";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudentTimetableClass {
  id: string;
  title: string;
  scheduledAt: string;
  durationMin: number;
  joinUrl: string;
  platform: string;
  status: string;
  venue: string | null;
  cancelReason: string | null;
  rescheduleReason: string | null;
  originalScheduledAt: string | null;
  recordingUrl: string | null;
  course: { id: string; title: string; courseCode: string | null };
  tutor: { id: string; name: string; avatarUrl: string | null };
  attendance: { startMark: string | null; endMark: string | null } | null;
}

interface CourseOption {
  id: string;
  title: string;
  courseCode: string | null;
}

interface Props {
  initialClasses: StudentTimetableClass[];
  courses: CourseOption[];
}

// ─── Colour palette per course ──────────────────────────────────────────────

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

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  SCHEDULED:   { label: "Scheduled",   cls: "badge-info" },
  LIVE:        { label: "Live now",     cls: "badge-danger" },
  COMPLETED:   { label: "Ended",        cls: "badge-success" },
  CANCELLED:   { label: "Cancelled",    cls: "badge" },
  RESCHEDULED: { label: "Rescheduled",  cls: "badge bg-amber-100 text-amber-800 border-amber-300" },
};

const MARK_ICON: Record<string, React.ReactNode> = {
  PRESENT: <CheckCircle2 className="w-4 h-4 text-success" />,
  ABSENT:  <XCircle className="w-4 h-4 text-danger" />,
  LATE:    <Clock className="w-4 h-4 text-warning" />,
  EXCUSED: <Clock className="w-4 h-4 text-gray-400" />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" });
}

function startOfWeek(d: Date) {
  const c = new Date(d);
  c.setDate(c.getDate() - c.getDay());
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function addWeeks(d: Date, n: number) { return addDays(d, n * 7); }

function addMonths(d: Date, n: number) {
  const c = new Date(d);
  c.setMonth(c.getMonth() + n);
  return c;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getEndTime(cls: StudentTimetableClass) {
  return new Date(new Date(cls.scheduledAt).getTime() + cls.durationMin * 60_000);
}

function detectOverlaps(classes: StudentTimetableClass[]): Set<string> {
  const overlapping = new Set<string>();
  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      const a = classes[i]!, b = classes[j]!;
      if (a.status === "CANCELLED" || b.status === "CANCELLED") continue;
      const aS = new Date(a.scheduledAt).getTime();
      const aE = aS + a.durationMin * 60_000;
      const bS = new Date(b.scheduledAt).getTime();
      const bE = bS + b.durationMin * 60_000;
      if (aS < bE && aE > bS) { overlapping.add(a.id); overlapping.add(b.id); }
    }
  }
  return overlapping;
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function StudentDetailPanel({
  cls,
  onClose,
  colour,
  isOverlap,
}: {
  cls: StudentTimetableClass;
  onClose: () => void;
  colour: (typeof COURSE_COLOURS)[0];
  isOverlap: boolean;
}) {
  const start = new Date(cls.scheduledAt);
  const end = getEndTime(cls);
  const statusInfo = STATUS_LABEL[cls.status] ?? { label: cls.status, cls: "badge" };
  const isLive = cls.status === "LIVE";
  
  // Calculate if scheduled class is starting within 30 minutes
  const msUntilStart = new Date(cls.scheduledAt).getTime() - Date.now();
  const isNearlyLive = !isLive && cls.status === "SCHEDULED" && msUntilStart < 30 * 60 * 1000 && msUntilStart > 0;
  const canShowPresentation = isLive || isNearlyLive;
  
  const att = cls.attendance;

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
            <button onClick={onClose} aria-label="Close" className="flex-shrink-0 p-1.5 rounded-lg hover:bg-black/10 transition-colors">
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
              <p className="text-xs text-gray-500">{fmtTime(start)} to {fmtTime(end)} EAT ({cls.durationMin} min)</p>
              {cls.originalScheduledAt && (
                <p className="text-xs text-amber-600 mt-0.5">
                  Originally: {fmtDate(new Date(cls.originalScheduledAt))} {fmtTime(new Date(cls.originalScheduledAt))}
                </p>
              )}
            </div>
          </div>

          {/* Instructor with avatar */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <AvatarOrInitials name={cls.tutor.name} avatarUrl={cls.tutor.avatarUrl} size={32} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Instructor</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{cls.tutor.name}</p>
            </div>
          </div>

          {/* Venue */}
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600 dark:text-gray-300">{cls.venue ?? "Online"}</p>
          </div>

          {/* Platform */}
          <div className="flex items-start gap-3">
            <Video className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {cls.platform === "bbb" ? "BigBlueButton" : cls.platform === "jitsi" ? "Jitsi" : "Google Meet"}
            </p>
          </div>

          {/* Roll call result */}
          {att && (att.startMark || att.endMark) && (
            <div className="bg-surface rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">Your roll call result</p>
              <div className="flex gap-6">
                <div className="flex items-center gap-1.5 text-xs">
                  {att.startMark ? MARK_ICON[att.startMark] ?? <Clock className="w-4 h-4 text-gray-400" /> : <span className="text-gray-400">-</span>}
                  <span className="text-gray-600 dark:text-gray-300">Start: {att.startMark ?? "-"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  {att.endMark ? MARK_ICON[att.endMark] ?? <Clock className="w-4 h-4 text-gray-400" /> : <span className="text-gray-400">-</span>}
                  <span className="text-gray-600 dark:text-gray-300">End: {att.endMark ?? "-"}</span>
                </div>
              </div>
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
          {cls.recordingUrl && cls.status === "COMPLETED" && (
            <div className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3">
              <span className="text-xs font-semibold text-success">Recording available</span>
              <a href="/dashboard/recordings" className="text-xs text-primary hover:underline">Watch replay</a>
            </div>
          )}

          {/* Live: Join button */}
          {isLive && (
            <div className="border-t border-border pt-4">
              <StudentJoinClass classId={cls.id} isLive={true} scheduledAt={cls.scheduledAt} />
            </div>
          )}

          {/* Live: Presentation panel */}
          {canShowPresentation && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Presentation slides {isNearlyLive && "(Pre-class preview)"}</p>
              <PresentationViewer classId={cls.id} />
            </div>
          )}

          {/* Scheduled: show near-live indicator if starting within 30 minutes, otherwise static hint */}
          {!isLive && cls.status === "SCHEDULED" && (
            <div className="border-t border-border pt-4">
              <StudentJoinClass classId={cls.id} isLive={false} scheduledAt={cls.scheduledAt} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  weekStart, classes, courseColourMap, overlapIds, onSelectClass,
}: {
  weekStart: Date;
  classes: StudentTimetableClass[];
  courseColourMap: Map<string, number>;
  overlapIds: Set<string>;
  onSelectClass: (cls: StudentTimetableClass) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="overflow-x-auto -mx-2 px-2" data-testid="week-view">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={day.toISOString()} className="text-center py-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider">{day.toLocaleDateString("en-UG", { weekday: "short" })}</p>
                <p className={`text-sm font-bold mt-0.5 w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isToday ? "bg-primary text-white" : "text-primary dark:text-gray-200"}`}>{day.getDate()}</p>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-7 gap-1 min-h-[200px]">
          {days.map((day) => {
            const dayClasses = classes.filter((c) => isSameDay(new Date(c.scheduledAt), day));
            const isToday = isSameDay(day, today);
            return (
              <div key={day.toISOString()} className={`min-h-[160px] rounded-xl p-1.5 space-y-1 border ${isToday ? "bg-primary/5 border-primary/20" : "bg-surface/40 border-border"}`}>
                {dayClasses.map((cls) => {
                  const colIdx = courseColourMap.get(cls.course.id) ?? 0;
                  const colour = COURSE_COLOURS[colIdx % COURSE_COLOURS.length]!;
                  const isOverlap = overlapIds.has(cls.id);
                  const isCancelled = cls.status === "CANCELLED";
                  return (
                    <button key={cls.id} onClick={() => onSelectClass(cls)} title={`${cls.title} - ${fmtTime(new Date(cls.scheduledAt))}`}
                      className={`w-full text-left rounded-lg border-l-4 px-2 py-1.5 text-xs cursor-pointer transition-all hover:opacity-80 hover:shadow-sm ${colour.bg} ${colour.border} ${isCancelled ? "opacity-50 line-through" : ""} ${isOverlap ? "ring-2 ring-yellow-400 ring-offset-1" : ""}`}>
                      <p className={`font-semibold truncate leading-tight ${colour.text}`}>{cls.title}</p>
                      <p className={`opacity-70 leading-tight mt-0.5 ${colour.text}`}>{fmtTime(new Date(cls.scheduledAt))}</p>
                      {cls.status === "LIVE" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
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
  monthStart, classes, courseColourMap, overlapIds, onSelectClass,
}: {
  monthStart: Date;
  classes: StudentTimetableClass[];
  courseColourMap: Map<string, number>;
  overlapIds: Set<string>;
  onSelectClass: (cls: StudentTimetableClass) => void;
}) {
  const today = new Date();
  const firstDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const gridStart = startOfWeek(firstDay);
  const days: Date[] = [];
  let cursor = new Date(gridStart);
  while (days.length < 42) { days.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1); }

  return (
    <div className="overflow-x-auto -mx-2 px-2" data-testid="month-view">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 uppercase tracking-wider py-2 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, today);
            const dayClasses = classes.filter((c) => isSameDay(new Date(c.scheduledAt), day));
            return (
              <div key={day.toISOString()} className={`min-h-[80px] rounded-lg p-1.5 border ${isToday ? "bg-primary/5 border-primary/30" : isCurrentMonth ? "bg-white dark:bg-gray-800/50 border-border" : "bg-gray-50 dark:bg-gray-900/30 border-border opacity-50"}`}>
                <p className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? "bg-primary text-white" : "text-gray-500 dark:text-gray-400"}`}>{day.getDate()}</p>
                <div className="space-y-0.5">
                  {dayClasses.slice(0, 3).map((cls) => {
                    const colIdx = courseColourMap.get(cls.course.id) ?? 0;
                    const colour = COURSE_COLOURS[colIdx % COURSE_COLOURS.length]!;
                    const isOverlap = overlapIds.has(cls.id);
                    return (
                      <button key={cls.id} onClick={() => onSelectClass(cls)} title={cls.title}
                        className={`w-full text-left rounded px-1 py-0.5 text-[10px] font-medium truncate leading-tight ${colour.bg} ${colour.text} ${cls.status === "CANCELLED" ? "opacity-40 line-through" : ""} ${isOverlap ? "ring-1 ring-yellow-400" : ""}`}>
                        {fmtTime(new Date(cls.scheduledAt))} {cls.title}
                      </button>
                    );
                  })}
                  {dayClasses.length > 3 && <p className="text-[10px] text-gray-400 pl-1">+{dayClasses.length - 3} more</p>}
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
  classes, courseColourMap, overlapIds, onSelectClass,
}: {
  classes: StudentTimetableClass[];
  courseColourMap: Map<string, number>;
  overlapIds: Set<string>;
  onSelectClass: (cls: StudentTimetableClass) => void;
}) {
  const today = new Date();
  const groups = new Map<string, StudentTimetableClass[]>();
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
              <div className={`w-12 h-12 flex-shrink-0 rounded-xl flex flex-col items-center justify-center text-center ${isToday ? "bg-primary text-white" : "bg-surface border border-border"}`}>
                <span className={`text-[10px] font-bold uppercase leading-none ${isToday ? "text-white/80" : "text-gray-400"}`}>{date.toLocaleDateString("en-UG", { month: "short" })}</span>
                <span className={`text-xl font-extrabold leading-tight ${isToday ? "text-white" : "text-primary"}`}>{date.getDate()}</span>
                <span className={`text-[9px] leading-none ${isToday ? "text-white/70" : "text-gray-400"}`}>{date.toLocaleDateString("en-UG", { weekday: "short" })}</span>
              </div>
              <div>
                <p className={`text-sm font-bold ${isToday ? "text-primary" : "text-gray-700 dark:text-gray-200"}`}>{isToday ? "Today" : date.toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long" })}</p>
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
                  <button key={cls.id} onClick={() => onSelectClass(cls)} data-testid="timetable-entry"
                    className={`w-full text-left bg-white dark:bg-gray-800 rounded-xl border ${isOverlap ? "border-yellow-300 ring-2 ring-yellow-200" : "border-border"} p-4 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group`}>
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${colour.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className={`font-bold text-sm ${cls.status === "CANCELLED" ? "line-through text-gray-400" : "text-primary"}`}>{cls.title}</h3>
                        <span className={`badge text-xs ${statusInfo.cls}`}>{statusInfo.label}</span>
                        {isOverlap && <span className="badge bg-yellow-100 text-yellow-800 border-yellow-300 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Overlap</span>}
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{cls.course.title}</p>
                      <div className="flex items-center gap-4 flex-wrap text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(start)} to {fmtTime(end)}</span>
                        {cls.venue && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{cls.venue}</span>}
                        <span>{cls.tutor.name}</span>
                      </div>
                    </div>
                    {cls.status === "LIVE" && <span className="flex-shrink-0 badge badge-danger text-xs animate-pulse">LIVE</span>}
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

// ─── Main StudentTimetableView ───────────────────────────────────────────────

export default function StudentTimetableView({ initialClasses, courses }: Props) {
  const [viewMode, setViewMode] = useState<"week" | "month" | "list">("list");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<StudentTimetableClass | null>(null);

  const courseColourMap = useMemo(() => {
    const map = new Map<string, number>();
    courses.forEach((c, i) => map.set(c.id, i));
    return map;
  }, [courses]);

  const filteredClasses = useMemo(() => {
    let arr = initialClasses;
    if (filterCourse !== "all") arr = arr.filter((c) => c.course.id === filterCourse);
    return arr;
  }, [initialClasses, filterCourse]);

  const windowClasses = useMemo(() => {
    if (viewMode === "list") {
      return [...filteredClasses].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    }
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate);
      const we = addDays(ws, 7);
      return filteredClasses.filter((c) => { const d = new Date(c.scheduledAt); return d >= ws && d < we; });
    }
    const ms = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const me = addMonths(ms, 1);
    return filteredClasses.filter((c) => { const d = new Date(c.scheduledAt); return d >= ms && d < me; });
  }, [filteredClasses, viewMode, currentDate]);

  const overlapIds = useMemo(() => detectOverlaps(filteredClasses), [filteredClasses]);

  const navLabel = useMemo(() => {
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate);
      const we = addDays(ws, 6);
      const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
      return `${ws.toLocaleDateString("en-UG", opts)} - ${we.toLocaleDateString("en-UG", opts)}, ${we.getFullYear()}`;
    }
    if (viewMode === "month") return currentDate.toLocaleDateString("en-UG", { month: "long", year: "numeric" });
    return "All classes";
  }, [viewMode, currentDate]);

  function goBack() { if (viewMode === "week") setCurrentDate((d) => addWeeks(d, -1)); else if (viewMode === "month") setCurrentDate((d) => addMonths(d, -1)); }
  function goForward() { if (viewMode === "week") setCurrentDate((d) => addWeeks(d, 1)); else if (viewMode === "month") setCurrentDate((d) => addMonths(d, 1)); }
  function goToday() { setCurrentDate(new Date()); }

  const colourForClass = (cls: StudentTimetableClass) => COURSE_COLOURS[(courseColourMap.get(cls.course.id) ?? 0) % COURSE_COLOURS.length]!;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Timetable</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your class schedule across all courses</p>
        </div>
        <a href="/api/dashboard/timetable/ics" download="timetable.ics" className="btn-outline text-xs flex items-center gap-1.5 no-underline" aria-label="Download timetable as ICS calendar file">
          <Download className="w-3.5 h-3.5" /> Export .ics
        </a>
      </div>

      {/* Course legend */}
      {courses.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Course colour legend">
          {courses.map((c, i) => {
            const colour = COURSE_COLOURS[i % COURSE_COLOURS.length]!;
            return (
              <button key={c.id} onClick={() => setFilterCourse(filterCourse === c.id ? "all" : c.id)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${filterCourse === c.id ? `${colour.bg} ${colour.border} ${colour.text} font-semibold` : "bg-surface border-border text-gray-500 hover:border-gray-400"}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colour.dot}`} />
                {c.courseCode ?? c.title.slice(0, 20)}
              </button>
            );
          })}
          {filterCourse !== "all" && <button onClick={() => setFilterCourse("all")} className="text-xs text-gray-400 hover:text-primary px-2 py-1">Clear filter</button>}
        </div>
      )}

      {/* View controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-xl border border-border overflow-hidden">
          {(["list", "week", "month"] as const).map((mode) => (
            <button key={mode} onClick={() => setViewMode(mode)} aria-pressed={viewMode === mode}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${viewMode === mode ? "bg-primary text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-surface"}`}>
              {mode === "list" ? <span className="flex items-center gap-1"><List className="w-3.5 h-3.5" />List</span>
               : mode === "week" ? <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Week</span>
               : <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Month</span>}
            </button>
          ))}
        </div>
        {viewMode !== "list" && (
          <>
            <button onClick={goBack} aria-label="Previous" className="p-1.5 rounded-lg border border-border bg-white dark:bg-gray-800 hover:bg-surface transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium text-primary min-w-[200px] text-center">{navLabel}</span>
            <button onClick={goForward} aria-label="Next" className="p-1.5 rounded-lg border border-border bg-white dark:bg-gray-800 hover:bg-surface transition-colors"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={goToday} className="btn-outline text-xs">Today</button>
          </>
        )}
        <span className="text-xs text-gray-400 ml-auto">{windowClasses.length} class{windowClasses.length !== 1 ? "es" : ""}{filterCourse !== "all" ? " (filtered)" : ""}</span>
      </div>

      {/* Overlap warning */}
      {overlapIds.size > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {overlapIds.size} class{overlapIds.size !== 1 ? "es" : ""} {overlapIds.size !== 1 ? "have" : "has"} overlapping times. Check highlighted entries.
        </div>
      )}

      {/* Views */}
      {viewMode === "week" && <WeekView weekStart={startOfWeek(currentDate)} classes={windowClasses} courseColourMap={courseColourMap} overlapIds={overlapIds} onSelectClass={setSelectedClass} />}
      {viewMode === "month" && <MonthView monthStart={new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)} classes={windowClasses} courseColourMap={courseColourMap} overlapIds={overlapIds} onSelectClass={setSelectedClass} />}
      {viewMode === "list" && <ListView classes={windowClasses} courseColourMap={courseColourMap} overlapIds={overlapIds} onSelectClass={setSelectedClass} />}

      {/* Detail panel */}
      {selectedClass && (
        <StudentDetailPanel cls={selectedClass} colour={colourForClass(selectedClass)} isOverlap={overlapIds.has(selectedClass.id)} onClose={() => setSelectedClass(null)} />
      )}
    </div>
  );
}
