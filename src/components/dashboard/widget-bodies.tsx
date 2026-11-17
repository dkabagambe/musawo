import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { formatCount } from "@/lib/dashboard/format";
import {
  ListRow,
  MiniCard,
  ProfileCard,
  ViewMoreLink,
  CalendarMeta,
  ClockMeta,
} from "@/components/ui/DashboardWidgets";
import {
  AlertCircle,
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  GraduationCap,
  Wallet,
  Receipt,
  Video,
  FileText,
  ClipboardList,
  ClipboardCheck,
  ShieldCheck,
  Settings,
  FileSearch,
  MessageSquare,
} from "lucide-react";
import type { UserRole, Prisma, ApprovalRequestType } from "@prisma/client";

export interface WidgetBodyProps {
  userId: string;
  role: UserRole;
  fullPageHref?: string;
}

/* ─────────────────────────────────────────────
   Date / currency helpers (EAT timezone)
   ───────────────────────────────────────────── */
function fmtDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "Africa/Kampala",
  })
    .format(date)
    .replace(",", "");
}
function fmtTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Kampala",
  }).format(date);
}
function fmtDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}
function fmtUGX(amount: number): string {
  return `UGX ${amount.toLocaleString("en-UG")}`;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="dashboard-widget-empty">{children}</p>;
}

function classStatusChip(
  scheduledAt: Date,
  status: string,
): { label: string; tone: "today" | "soon" | "live" } | undefined {
  if (status === "LIVE") return { label: "Live now", tone: "live" };
  const dateKey = (value: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Africa/Kampala",
    }).format(value);
  const diff = Math.round(
    (new Date(`${dateKey(scheduledAt)}T00:00:00Z`).getTime() -
      new Date(`${dateKey(new Date())}T00:00:00Z`).getTime()) /
      86_400_000,
  );
  if (diff <= 0) return { label: "Today", tone: "today" };
  if (diff === 1) return { label: "Tomorrow", tone: "soon" };
  return { label: `In ${diff} days`, tone: "soon" };
}

/* ═══════════════════════════════════════════════
   STUDENT WIDGETS
   ═══════════════════════════════════════════════ */

/* task-list  (instructor general / student general) */
async function TaskListBody({ userId, role, fullPageHref }: WidgetBodyProps) {
  if (role === "STUDENT") {
    const enrolments = await db.enrolment.findMany({
      where: {
        userId,
        status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] },
      },
      select: { courseId: true },
    });
    const courseIds = enrolments.map((e) => e.courseId);
    if (!courseIds.length)
      return <Empty>Enrol in a course to get started.</Empty>;
    const [exams, assignments] = await Promise.all([
      db.exam.findMany({
        where: { courseId: { in: courseIds }, status: "PUBLISHED" },
        take: 3,
        select: { id: true, title: true, startWindowAt: true },
      }),
      db.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          status: "PUBLISHED",
          dueDate: { gte: new Date() },
        },
        take: 3,
        select: { id: true, title: true, dueDate: true, courseId: true },
      }),
    ]);
    if (!exams.length && !assignments.length)
      return <Empty>You are all caught up.</Empty>;
    return (
      <>
        {exams.map((exam) => (
          <ListRow
            key={exam.id}
            href={`/dashboard/exams/${exam.id}`}
            icon={<ClipboardList size={16} />}
            date={exam.startWindowAt ? fmtDay(exam.startWindowAt) : undefined}
          >
            Upcoming exam: {exam.title}
          </ListRow>
        ))}
        {assignments.map((a) => (
          <ListRow
            key={a.id}
            href={`/dashboard/assignments/${a.id}`}
            icon={<FileText size={16} />}
            date={a.dueDate ? fmtDay(a.dueDate) : undefined}
          >
            Assignment due: {a.title}
          </ListRow>
        ))}
      </>
    );
  }
  const teachingWhere = teachingCourseWhere(userId);
  const pendingReviews = await db.examAttempt.count({
    where: { status: "SUBMITTED", exam: { course: teachingWhere } },
  });
  const pendingRecordings = await db.liveClass.count({
    where: {
      status: "COMPLETED",
      recordingEnabled: true,
      recordingStatus: "PENDING",
      course: teachingWhere,
    },
  });
  const pendingAttendance = await db.liveClass.count({
    where: {
      status: "COMPLETED",
      course: teachingWhere,
      AND: [
        { attendance: { some: { startMark: null } } },
        { attendance: { some: { endMark: null } } },
      ],
    },
  });
  if (
    pendingReviews === 0 &&
    pendingRecordings === 0 &&
    pendingAttendance === 0
  )
    return <Empty>You are all caught up.</Empty>;
  const href = fullPageHref ?? "/tutor/exams";
  return (
    <>
      {pendingReviews > 0 && (
        <ListRow href={href} icon={<AlertCircle size={16} />}>
          {pendingReviews === 1
            ? "1 exam submission awaits your review"
            : `${pendingReviews} exam submissions await your review`}
        </ListRow>
      )}
      {pendingRecordings > 0 && (
        <ListRow href="/tutor/classes" icon={<Video size={16} />}>
          {pendingRecordings === 1
            ? "1 recording pending upload"
            : `${pendingRecordings} recordings pending upload`}
        </ListRow>
      )}
      {pendingAttendance > 0 && (
        <ListRow href="/tutor/attendance" icon={<ClipboardCheck size={16} />}>
          Submit roll call for {pendingAttendance} completed class
          {pendingAttendance === 1 ? "" : "es"}
        </ListRow>
      )}
    </>
  );
}

/* metrics  (instructor general - At a glance) */
async function MetricsBody({ userId }: WidgetBodyProps) {
  const teachingWhere = teachingCourseWhere(userId);
  const [courses, students, classes, reviews] = await Promise.all([
    db.course.count({ where: teachingWhere }),
    db.enrolment.count({
      where: {
        course: teachingWhere,
        status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] },
      },
    }),
    db.liveClass.count({
      where: {
        course: teachingWhere,
        OR: [
          { scheduledAt: { gt: new Date() }, status: "SCHEDULED" },
          { status: "LIVE" },
        ],
      },
    }),
    db.examAttempt.count({
      where: { status: "SUBMITTED", exam: { course: teachingWhere } },
    }),
  ]);
  const stats = [
    {
      label: "Courses",
      value: courses,
      href: "/tutor/courses",
      icon: <FileText size={18} />,
    },
    {
      label: "Students",
      value: students,
      href: "/tutor/students",
      icon: <Users size={18} />,
    },
    {
      label: "Classes",
      value: classes,
      href: "/tutor/classes",
      icon: <Video size={18} />,
    },
    {
      label: "Reviews",
      value: reviews,
      href: "/tutor/exams",
      icon: <ClipboardCheck size={18} />,
    },
  ];
  return (
    <div className="dashboard-glance-grid">
      {stats.map((s) => (
        <a key={s.label} href={s.href} className="dashboard-stat-card">
          <span className="dashboard-stat-icon">{s.icon}</span>
          <span className="dashboard-stat-number">{s.value}</span>
          <span className="dashboard-stat-label">{s.label}</span>
        </a>
      ))}
    </div>
  );
}

/* status-list  (student general - Payment and Fees) */
async function HoldsBody({ userId, fullPageHref }: WidgetBodyProps) {
  const allEnrolments = await db.enrolment.findMany({
    where: {
      userId,
      status: {
        in: ["PENDING_PAYMENT", "OVERDUE", "ACTIVE", "PARTIALLY_PAID", "COMPLETED"],
      },
    },
    include: { course: { select: { title: true } } },
    take: 6,
  });
  if (!allEnrolments.length) return <Empty>No fee records yet.</Empty>;

  const holds = allEnrolments.filter(
    (e) => e.status === "PENDING_PAYMENT" || e.status === "OVERDUE",
  );
  const active = allEnrolments.filter(
    (e) => e.status !== "PENDING_PAYMENT" && e.status !== "OVERDUE",
  );
  const href = fullPageHref ?? "/dashboard/payments";

  // Show holds first
  if (holds.length) {
    const visible = holds.slice(0, 4);
    return (
      <>
        {visible.map((enr) => (
          <ListRow key={enr.id} href={href} icon={<AlertCircle size={16} />}>
            {enr.status === "OVERDUE"
              ? `Overdue payment: ${enr.course.title}`
              : `Complete payment for ${enr.course.title}`}
          </ListRow>
        ))}
        {holds.length > visible.length && (
          <ViewMoreLink href={href}>
            View {holds.length - visible.length} more
          </ViewMoreLink>
        )}
      </>
    );
  }

  // No holds: show fee phase progress for active enrolments
  const visible = active.slice(0, 4);
  return (
    <>
      {visible.map((enr) => {
        const pct = enr.paidPercent;
        let phase = "Fully paid";
        if (pct < 50) phase = "First 50% due";
        else if (pct < 75) phase = "Next 25% due";
        else if (pct < 100) phase = "Final 25% due";
        return (
          <ListRow key={enr.id} href={href} icon={<Wallet size={16} />}>
            {enr.course.title}: {pct}% paid ({phase})
          </ListRow>
        );
      })}
      {active.length > visible.length && (
        <ViewMoreLink href={href}>
          View {active.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* class-list  (student/instructor general - Upcoming Classes) */
async function ClassListBody({ userId, role, fullPageHref }: WidgetBodyProps) {
  const where: Prisma.LiveClassWhereInput =
    role === "STUDENT"
      ? {
          scheduledAt: { gt: new Date() },
          status: "SCHEDULED",
          course: {
            enrolments: {
              some: {
                userId,
                status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] },
              },
            },
          },
        }
      : {
          course: teachingCourseWhere(userId),
          OR: [
            { scheduledAt: { gt: new Date() }, status: "SCHEDULED" },
            { status: "LIVE" },
          ],
        };
  const upcoming = await db.liveClass.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
    take: 6,
    include: { course: { select: { title: true } } },
  });
  if (!upcoming.length) return <Empty>No upcoming classes scheduled.</Empty>;
  const visible = upcoming.slice(0, 4);
  const href =
    fullPageHref ??
    (role === "STUDENT" ? "/dashboard/timetable" : "/tutor/classes");
  return (
    <>
      <div className="dashboard-mini-grid">
        {visible.map((cls) => {
          const date = new Date(cls.scheduledAt);
          const end = new Date(date.getTime() + cls.durationMin * 60_000);
          return (
            <MiniCard
              key={cls.id}
              title={cls.title}
              subtitle={cls.course.title}
              href={href}
              actionLabel={role === "STUDENT" ? "Join" : "Manage"}
              status={classStatusChip(date, cls.status)}
            >
              <CalendarMeta>{fmtDate(date)}</CalendarMeta>
              <ClockMeta timeZone="East Africa Time">
                {fmtTime(date)} to {fmtTime(end)}
              </ClockMeta>
            </MiniCard>
          );
        })}
      </div>
      {upcoming.length > visible.length && (
        <ViewMoreLink href={href}>
          View {upcoming.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* course-cards  (student/instructor general - My Courses) */
async function CourseCardsBody({
  userId,
  role,
  fullPageHref,
}: WidgetBodyProps) {
  const isStudent = role === "STUDENT";
  const enrolments = isStudent
    ? await db.enrolment.findMany({
        where: {
          userId,
          status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] },
        },
        include: {
          course: {
            select: {
              title: true,
              slug: true,
              blocks: { select: { _count: { select: { lessons: true } } } },
            },
          },
        },
        take: 6,
      })
    : [];
  const courses = !isStudent
    ? await db.course.findMany({
        where: teachingCourseWhere(userId),
        include: { _count: { select: { enrolments: true } } },
        take: 6,
      })
    : [];
  if (isStudent && !enrolments.length)
    return <Empty>Browse our courses and enrol today.</Empty>;
  if (!isStudent && !courses.length)
    return <Empty>No courses assigned yet.</Empty>;
  const href =
    fullPageHref ?? (isStudent ? "/dashboard/courses" : "/tutor/courses");
  if (isStudent) {
    const courseIds = enrolments.map((e) => e.courseId);
    const allProgress = await db.lessonProgress.findMany({
      where: {
        userId,
        completedAt: { not: null },
        lesson: { block: { courseId: { in: courseIds } } },
      },
      select: { lesson: { select: { block: { select: { courseId: true } } } } },
    });
    const doneByCourse = new Map<string, number>();
    allProgress.forEach((p) => {
      const cid = p.lesson.block.courseId;
      doneByCourse.set(cid, (doneByCourse.get(cid) ?? 0) + 1);
    });
    const visible = enrolments.slice(0, 4);
    return (
      <>
        <div className="dashboard-mini-grid">
          {visible.map((enr) => {
            const total = enr.course.blocks.reduce(
              (s, b) => s + b._count.lessons,
              0,
            );
            const done = doneByCourse.get(enr.courseId) ?? 0;
            return (
              <MiniCard
                key={enr.id}
                title={enr.course.title}
                subtitle={`${done}/${total} lessons`}
                href={`/dashboard/courses/${enr.course.slug}`}
              />
            );
          })}
        </div>
        {enrolments.length > visible.length && (
          <ViewMoreLink href={href}>
            View {enrolments.length - visible.length} more
          </ViewMoreLink>
        )}
      </>
    );
  }
  const visible = courses.slice(0, 4);
  return (
    <>
      <div className="dashboard-mini-grid">
        {visible.map((c) => (
          <MiniCard
            key={c.id}
            title={c.title}
            subtitle={formatCount(c._count.enrolments, "student")}
            subtitleIcon={<Users size={16} aria-hidden="true" />}
            href={href}
          />
        ))}
      </div>
      {courses.length > visible.length && (
        <ViewMoreLink href={href}>
          View {courses.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* inbox-list  (student/instructor - Inbox / Announcements) */
async function InboxListBody({ userId, role, fullPageHref }: WidgetBodyProps) {
  const isStudent = role === "STUDENT";
  const where = isStudent
    ? {
        OR: [
          { courseId: null },
          { course: { enrolments: { some: { userId } } } },
        ],
      }
    : { OR: [{ courseId: null }, { course: teachingCourseWhere(userId) }] };
  const announcements = await db.announcement.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 6,
    select: { id: true, title: true, pinned: true, createdAt: true },
  });
  if (!announcements.length) return <Empty>No announcements yet.</Empty>;
  const visible = announcements.slice(0, 5);
  const href =
    fullPageHref ??
    (isStudent ? "/dashboard/notifications" : "/tutor/announcements");
  return (
    <>
      {visible.map((a) => (
        <ListRow key={a.id} href={href} date={fmtDay(a.createdAt)}>
          {a.pinned ? `📌 ${a.title}` : a.title}
        </ListRow>
      ))}
      {announcements.length > visible.length && (
        <ViewMoreLink href={href}>
          View {announcements.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/** Natural display order "First Last". Sort callers sort by last name separately. */
function displayName(raw: string | null): string {
  return (raw ?? "").trim() || "Unknown";
}
/** Sort key: last name then first name (for stable surname-first ordering in lists). */
function lastNameKey(raw: string | null): string {
  const parts = (raw ?? "").trim().split(/\s+/).filter(Boolean);
  return `${parts.at(-1) ?? ""} ${parts.slice(0, -1).join(" ")}`.toLocaleLowerCase();
}

/* student-cards  (instructor - My Students) */
async function StudentCardsBody({
  userId,
  role,
  fullPageHref,
}: WidgetBodyProps) {
  const canViewContacts = can(role, "students.view.contacts");
  const recent = await db.enrolment.findMany({
    where: {
      status: { in: ["ACTIVE", "COMPLETED", "PARTIALLY_PAID", "OVERDUE"] },
      user: { role: "STUDENT" },
      course: teachingCourseWhere(userId),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          studentNumber: true,
          avatarUrl: true,
          phone: canViewContacts,
          email: canViewContacts,
        },
      },
    },
  });
  if (!recent.length) return <Empty>No students enrolled yet.</Empty>;
  const sorted = [...recent].sort(
    (a, b) =>
      lastNameKey(a.user.name).localeCompare(lastNameKey(b.user.name)) ||
      (a.user.name ?? "").localeCompare(b.user.name ?? ""),
  );
  const visible = sorted.slice(0, 4);
  const href = fullPageHref ?? "/tutor/students";
  return (
    <>
      <div className="dashboard-profile-grid">
        {visible.map((enr) => (
          <ProfileCard
            key={enr.id}
            name={displayName(enr.user.name)}
            id={enr.user.studentNumber ?? undefined}
            phone={canViewContacts ? (enr.user.phone ?? undefined) : undefined}
            email={canViewContacts ? (enr.user.email ?? undefined) : undefined}
            status={enr.status === "COMPLETED" ? "Completed" : "Active"}
            avatarUrl={enr.user.avatarUrl}
            href={href}
          />
        ))}
      </div>
      {sorted.length > visible.length && (
        <ViewMoreLink href={href}>
          View {sorted.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* progress  (student studies - Course Progress) */
async function CourseProgressBody({ userId, fullPageHref }: WidgetBodyProps) {
  const enrolments = await db.enrolment.findMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] },
    },
    include: {
      course: {
        select: {
          title: true,
          slug: true,
          blocks: { select: { _count: { select: { lessons: true } } } },
        },
      },
    },
    take: 6,
  });
  if (!enrolments.length) return <Empty>No active courses yet.</Empty>;
  const courseIds = enrolments.map((e) => e.courseId);
  const allProgress = await db.lessonProgress.findMany({
    where: {
      userId,
      completedAt: { not: null },
      lesson: { block: { courseId: { in: courseIds } } },
    },
    select: { lesson: { select: { block: { select: { courseId: true } } } } },
  });
  const doneByCourse = new Map<string, number>();
  allProgress.forEach((p) => {
    const cid = p.lesson.block.courseId;
    doneByCourse.set(cid, (doneByCourse.get(cid) ?? 0) + 1);
  });
  const visible = enrolments.slice(0, 5);
  const href = fullPageHref ?? "/dashboard/courses";
  return (
    <>
      {visible.map((enr) => {
        const total = enr.course.blocks.reduce(
          (s, b) => s + b._count.lessons,
          0,
        );
        const done = doneByCourse.get(enr.courseId) ?? 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <ListRow key={enr.id} href={`/dashboard/courses/${enr.course.slug}`}>
            {enr.course.title} ({done}/{total} lessons, {pct}%)
          </ListRow>
        );
      })}
      {enrolments.length > visible.length && (
        <ViewMoreLink href={href}>
          View {enrolments.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* exam-list  (student studies - Exams) */
async function ExamListBody({ userId, fullPageHref }: WidgetBodyProps) {
  const enrolments = await db.enrolment.findMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] },
    },
    select: { courseId: true, course: { select: { title: true } } },
  });
  if (!enrolments.length) return <Empty>No exams available yet.</Empty>;
  const courseIds = enrolments.map((e) => e.courseId);
  const exams = await db.exam.findMany({
    where: { courseId: { in: courseIds }, status: "PUBLISHED" },
    select: { id: true, title: true, course: { select: { title: true } } },
    take: 6,
  });
  if (!exams.length) return <Empty>No published exams yet.</Empty>;
  const visible = exams.slice(0, 5);
  const href = fullPageHref ?? "/dashboard/gradebook";
  return (
    <>
      {visible.map((exam) => (
        <ListRow key={exam.id} href={href}>
          {exam.title}
        </ListRow>
      ))}
      {exams.length > visible.length && (
        <ViewMoreLink href={href}>
          View {exams.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* results  (student studies - Results) */
async function ResultsBody({ userId, fullPageHref }: WidgetBodyProps) {
  const attempts = await db.examAttempt.findMany({
    where: { userId, status: "MARKED" },
    orderBy: { submittedAt: "desc" },
    take: 6,
    select: {
      id: true,
      score: true,
      maxScore: true,
      passed: true,
      submittedAt: true,
      exam: { select: { title: true } },
    },
  });
  if (!attempts.length) return <Empty>No results yet.</Empty>;
  const visible = attempts.slice(0, 5);
  const href = fullPageHref ?? "/dashboard/results";
  return (
    <>
      {visible.map((att) => {
        const pct = att.maxScore
          ? Math.round(((att.score ?? 0) / att.maxScore) * 100)
          : 0;
        return (
          <ListRow
            key={att.id}
            href={href}
            icon={
              att.passed ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )
            }
          >
            {att.exam.title} ({pct}%)
          </ListRow>
        );
      })}
      {attempts.length > visible.length && (
        <ViewMoreLink href={href}>
          View {attempts.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* log-book  (student studies - Log book) */
async function LogBookBody({ userId, fullPageHref }: WidgetBodyProps) {
  const attendance = await db.attendance.findMany({
    where: { userId, markedPresent: true },
    include: {
      liveClass: {
        select: { title: true, course: { select: { title: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  if (!attendance.length)
    return (
      <Empty>Your log book is empty. Attend live classes to build it.</Empty>
    );
  const visible = attendance.slice(0, 5);
  const href = fullPageHref ?? "/dashboard/courses";
  return (
    <>
      {visible.map((att) => (
        <ListRow
          key={att.id}
          href={href}
          icon={<CheckCircle2 size={16} />}
          date={att.joinedAt ? fmtDay(att.joinedAt) : undefined}
        >
          {att.liveClass.course.title}
        </ListRow>
      ))}
      {attendance.length > visible.length && (
        <ViewMoreLink href={href}>
          View {attendance.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* simulations  (student studies - Simulations) */
async function SimulationsBody(_props: WidgetBodyProps) {
  return (
    <Empty>
      Simulations are being prepared for each course topic. Check back soon.
    </Empty>
  );
}

/* fee-summary  (student finance - Fees Summary) */
async function FeeSummaryBody({ userId, fullPageHref }: WidgetBodyProps) {
  const enrolments = await db.enrolment.findMany({
    where: {
      userId,
      status: {
        in: [
          "ACTIVE",
          "PARTIALLY_PAID",
          "COMPLETED",
          "OVERDUE",
          "PENDING_PAYMENT",
        ],
      },
    },
    include: { course: { select: { title: true, instalmentCount: true } } },
    take: 6,
  });
  if (!enrolments.length) return <Empty>No fee records yet.</Empty>;
  const visible = enrolments.slice(0, 5);
  const href = fullPageHref ?? "/dashboard/payments";
  return (
    <>
      {visible.map((enr) => {
        const pct = enr.paidPercent;
        const instalments = enr.course.instalmentCount ?? 3;
        // Determine which phase the student is on
        let phaseLabel: string;
        if (pct >= 100) {
          phaseLabel = "Fully paid";
        } else if (pct >= 75) {
          phaseLabel = `Phase ${instalments} of ${instalments} due`;
        } else if (pct >= 50) {
          phaseLabel = `Phase 2 of ${instalments} due`;
        } else if (pct > 0) {
          phaseLabel = `Phase 1 of ${instalments}, ${pct}% paid`;
        } else {
          phaseLabel = `Phase 1 of ${instalments} due`;
        }
        const balance = enr.totalAmountUgx - enr.paidAmountUgx;
        return (
          <ListRow key={enr.id} href={href} icon={<Wallet size={16} />}>
            {enr.course.title}: {phaseLabel}
            {balance > 0 ? ` - balance ${fmtUGX(balance)}` : " (cleared)"}
          </ListRow>
        );
      })}
      {enrolments.length > visible.length && (
        <ViewMoreLink href={href}>
          View {enrolments.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* payment-history  (student finance - Payment History) */
async function PaymentHistoryBody({ userId, fullPageHref }: WidgetBodyProps) {
  const enrolmentIds = await db.enrolment.findMany({
    where: { userId },
    select: { id: true },
  });
  const ids = enrolmentIds.map((e) => e.id);
  if (!ids.length) return <Empty>No payments yet.</Empty>;
  const payments = await db.payment.findMany({
    where: { enrolmentId: { in: ids } },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      amount: true,
      status: true,
      method: true,
      createdAt: true,
      enrolment: { select: { course: { select: { title: true } } } },
    },
  });
  if (!payments.length) return <Empty>No payments recorded yet.</Empty>;
  const visible = payments.slice(0, 5);
  const href = fullPageHref ?? "/dashboard/payments";
  return (
    <>
      {visible.map((pay) => (
        <ListRow key={pay.id} href={href} date={fmtDay(pay.createdAt)}>
          {fmtUGX(pay.amount)} ({pay.status.toLowerCase()})
        </ListRow>
      ))}
      {payments.length > visible.length && (
        <ViewMoreLink href={href}>
          View {payments.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* receipts  (student finance - Receipts) */
async function ReceiptsBody({ userId, fullPageHref }: WidgetBodyProps) {
  const enrolmentIds = await db.enrolment.findMany({
    where: { userId },
    select: { id: true },
  });
  const ids = enrolmentIds.map((e) => e.id);
  if (!ids.length) return <Empty>No receipts yet.</Empty>;
  const payments = await db.payment.findMany({
    where: {
      enrolmentId: { in: ids },
      status: "COMPLETED",
      receiptNumber: { not: null },
    },
    orderBy: { paidAt: "desc" },
    take: 6,
    select: { id: true, amount: true, receiptNumber: true, paidAt: true },
  });
  if (!payments.length) return <Empty>No receipts available yet.</Empty>;
  const visible = payments.slice(0, 5);
  const href = fullPageHref ?? "/dashboard/payments";
  return (
    <>
      {visible.map((pay) => (
        <ListRow
          key={pay.id}
          href={href}
          icon={<Receipt size={16} />}
          date={pay.paidAt ? fmtDay(pay.paidAt) : undefined}
        >
          {pay.receiptNumber} ({fmtUGX(pay.amount)})
        </ListRow>
      ))}
      {payments.length > visible.length && (
        <ViewMoreLink href={href}>
          View {payments.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* payment-action  (student finance - Pay now) */
async function PaymentActionBody({ userId, fullPageHref }: WidgetBodyProps) {
  const enrolments = await db.enrolment.findMany({
    where: {
      userId,
      status: { in: ["PENDING_PAYMENT", "PARTIALLY_PAID", "OVERDUE"] },
    },
    include: { course: { select: { title: true } } },
    take: 5,
  });
  if (!enrolments.length) return <Empty>No outstanding payments.</Empty>;
  const href = fullPageHref ?? "/dashboard/payments/claim";
  return (
    <>
      {enrolments.map((enr) => {
        const balance = enr.totalAmountUgx - enr.paidAmountUgx;
        const phase =
          enr.paidPercent >= 75 ? "Final 25%" :
          enr.paidPercent >= 50 ? "Next 25%" : "First 50%";
        return (
          <ListRow key={enr.id} href={href} icon={<Wallet size={16} />}>
            {enr.course.title}: pay {phase} ({fmtUGX(balance)} remaining)
          </ListRow>
        );
      })}
    </>
  );
}

/* timetable  (student classes - Timetable) */
async function TimetableBody({ userId, fullPageHref }: WidgetBodyProps) {
  const upcoming = await db.liveClass.findMany({
    where: {
      scheduledAt: { gt: new Date() },
      status: "SCHEDULED",
      course: {
        enrolments: {
          some: {
            userId,
            status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] },
          },
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: 6,
    include: { course: { select: { title: true } } },
  });
  if (!upcoming.length)
    return <Empty>No upcoming classes in your timetable.</Empty>;
  const visible = upcoming.slice(0, 5);
  const href = fullPageHref ?? "/dashboard/timetable";
  return (
    <>
      {visible.map((cls) => {
        const date = new Date(cls.scheduledAt);
        const end = new Date(date.getTime() + cls.durationMin * 60_000);
        return (
          <ListRow key={cls.id} href={href} date={fmtDay(date)}>
            {cls.title} ({fmtTime(date)} to {fmtTime(end)})
          </ListRow>
        );
      })}
      {upcoming.length > visible.length && (
        <ViewMoreLink href={href}>
          View {upcoming.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* recordings  (student classes - Recordings) */
async function RecordingsBody({ userId, fullPageHref }: WidgetBodyProps) {
  const completed = await db.liveClass.findMany({
    where: {
      status: "COMPLETED",
      recordingUrl: { not: null },
      course: {
        enrolments: {
          some: {
            userId,
            status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] },
          },
        },
      },
    },
    orderBy: { scheduledAt: "desc" },
    take: 6,
    include: { course: { select: { title: true } } },
  });
  if (!completed.length) return <Empty>No recordings available yet.</Empty>;
  const visible = completed.slice(0, 5);
  const href = fullPageHref ?? "/dashboard/recordings";
  return (
    <>
      {visible.map((cls) => (
        <ListRow
          key={cls.id}
          href={href}
          icon={<Video size={16} />}
          date={fmtDay(cls.scheduledAt)}
        >
          {cls.title}
        </ListRow>
      ))}
      {completed.length > visible.length && (
        <ViewMoreLink href={href}>
          View {completed.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* attendance  (student classes - Attendance Summary) */
async function AttendanceBody({ userId, fullPageHref }: WidgetBodyProps) {
  const records = await db.attendance.findMany({
    where: { userId, startMark: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { liveClass: { select: { title: true } } },
  });
  if (!records.length) return <Empty>No attendance records yet.</Empty>;
  // Show a percentage summary
  const total = records.length;
  const present = records.filter((r) => r.startMark === "PRESENT").length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const visible = records.slice(0, 4);
  const href = fullPageHref ?? "/dashboard/attendance";
  return (
    <>
      <ListRow href={href} icon={<CheckCircle2 size={16} />}>
        {pct}% attendance ({present}/{total} present)
      </ListRow>
      {visible.map((att) => (
        <ListRow
          key={att.id}
          href={href}
          date={att.joinedAt ? fmtDay(att.joinedAt) : undefined}
        >
          {att.liveClass.title} ({(att.startMark ?? "n/a").toLowerCase()})
        </ListRow>
      ))}
      {records.length > visible.length && (
        <ViewMoreLink href={href}>
          View {records.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* assignments-due  (student studies - Assignments Due) */
async function AssignmentsDueBody({ userId, fullPageHref }: WidgetBodyProps) {
  const enrolments = await db.enrolment.findMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] },
    },
    select: { courseId: true },
  });
  const courseIds = enrolments.map((e) => e.courseId);
  if (!courseIds.length) return <Empty>No assignments yet.</Empty>;
  const assignments = await db.assignment.findMany({
    where: {
      courseId: { in: courseIds },
      status: "PUBLISHED",
      dueDate: { gte: new Date() },
    },
    orderBy: { dueDate: "asc" },
    take: 6,
    include: { course: { select: { title: true } } },
  });
  if (!assignments.length) return <Empty>No assignments due.</Empty>;
  const visible = assignments.slice(0, 5);
  const href = fullPageHref ?? "/dashboard/assignments";
  return (
    <>
      {visible.map((a) => (
        <ListRow
          key={a.id}
          href={href}
          icon={<FileText size={16} />}
          date={a.dueDate ? fmtDay(a.dueDate) : undefined}
        >
          {a.title}
        </ListRow>
      ))}
      {assignments.length > visible.length && (
        <ViewMoreLink href={href}>
          View {assignments.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* forum-activity  (student studies - Forum Activity) */
async function ForumActivityBody({ userId, fullPageHref }: WidgetBodyProps) {
  const enrolments = await db.enrolment.findMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] },
    },
    select: { courseId: true },
  });
  const courseIds = enrolments.map((e) => e.courseId);
  if (!courseIds.length) return <Empty>No forum activity yet.</Empty>;
  const threads = await db.forumThread.findMany({
    where: { courseId: { in: courseIds } },
    orderBy: { updatedAt: "desc" },
    take: 6,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      authorId: true,
      author: { select: { name: true } },
    },
  });
  if (!threads.length) return <Empty>No forum threads yet.</Empty>;
  // Fetch reply counts in a separate query
  const replyCounts = await db.forumReply.groupBy({
    by: ["threadId"],
    where: { threadId: { in: threads.map((t) => t.id) }, deletedAt: null },
    _count: { threadId: true },
  });
  const countMap = new Map(replyCounts.map((r) => [r.threadId, r._count.threadId]));
  const visible = threads.slice(0, 5);
  const href = fullPageHref ?? "/dashboard/forum";
  return (
    <>
      {visible.map((t) => (
        <ListRow
          key={t.id}
          href={href}
          icon={<MessageSquare size={16} />}
          date={fmtDay(t.updatedAt)}
        >
          {t.title} ({countMap.get(t.id) ?? 0} replies)
        </ListRow>
      ))}
      {threads.length > visible.length && (
        <ViewMoreLink href={href}>
          View {threads.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* live-now  (student classes - Live Now) */
async function LiveNowBody({ userId, fullPageHref }: WidgetBodyProps) {
  const live = await db.liveClass.findMany({
    where: {
      status: "LIVE",
      course: {
        enrolments: {
          some: {
            userId,
            status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] },
          },
        },
      },
    },
    include: { course: { select: { title: true } } },
    take: 5,
  });
  if (!live.length) return <Empty>No classes live right now.</Empty>;
  const href = fullPageHref ?? "/dashboard/classes";
  return (
    <>
      {live.map((cls) => (
        <ListRow key={cls.id} href={href} icon={<Video size={16} />}>
          {cls.title} ({cls.course.title})
        </ListRow>
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════
   INSTRUCTOR SECONDARY-TAB WIDGETS
   ═══════════════════════════════════════════════ */

/* teacher-classes  (instructor teaching - Today's Classes) */
async function TeacherClassesBody({ userId, fullPageHref }: WidgetBodyProps) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const classes = await db.liveClass.findMany({
    where: {
      course: teachingCourseWhere(userId),
      scheduledAt: { gte: startOfDay, lte: endOfWeek },
      status: { in: ["SCHEDULED", "LIVE"] },
    },
    orderBy: { scheduledAt: "asc" },
    take: 6,
    include: { course: { select: { title: true } } },
  });
  if (!classes.length) return <Empty>No classes scheduled this week.</Empty>;
  const visible = classes.slice(0, 4);
  const href = fullPageHref ?? "/tutor/classes";
  return (
    <>
      <div className="dashboard-mini-grid">
        {visible.map((cls) => {
          const date = new Date(cls.scheduledAt);
          const end = new Date(date.getTime() + cls.durationMin * 60_000);
          return (
            <MiniCard
              key={cls.id}
              title={cls.title}
              subtitle={cls.course.title}
              href={href}
              actionLabel="Manage"
              status={classStatusChip(date, cls.status)}
            >
              <CalendarMeta>{fmtDate(date)}</CalendarMeta>
              <ClockMeta timeZone="East Africa Time">
                {fmtTime(date)} to {fmtTime(end)}
              </ClockMeta>
            </MiniCard>
          );
        })}
      </div>
      {classes.length > visible.length && (
        <ViewMoreLink href={href}>
          View {classes.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* marking-queue  (instructor assessment - Exams and marking queue) */
async function MarkingQueueBody({ userId, fullPageHref }: WidgetBodyProps) {
  const attempts = await db.examAttempt.findMany({
    where: {
      status: "SUBMITTED",
      exam: { course: teachingCourseWhere(userId) },
    },
    orderBy: { submittedAt: "asc" },
    take: 6,
    include: {
      exam: { select: { title: true } },
      user: { select: { name: true, studentNumber: true } },
    },
  });
  if (!attempts.length) return <Empty>No submissions awaiting review.</Empty>;
  const visible = attempts.slice(0, 5);
  const href = fullPageHref ?? "/tutor/exams";
  return (
    <>
      {visible.map((att) => (
        <ListRow key={att.id} href={href} icon={<ClipboardCheck size={16} />}>
          {att.user.name ?? "Student"} - {att.exam.title}
        </ListRow>
      ))}
      {attempts.length > visible.length && (
        <ViewMoreLink href={href}>
          View {attempts.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════
   REGISTRAR / ADMIN WIDGETS
   ═══════════════════════════════════════════════ */

/* application-list  (registrar admissions - Applications) */
async function ApplicationListBody({ fullPageHref }: WidgetBodyProps) {
  const applications = await db.application.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      fullName: true,
      status: true,
      createdAt: true,
      course: { select: { title: true } },
    },
  });
  if (!applications.length) return <Empty>No applications yet.</Empty>;
  const visible = applications.slice(0, 5);
  const href = fullPageHref ?? "/registrar/applications";
  return (
    <>
      {visible.map((app) => (
        <ListRow key={app.id} href={href} date={fmtDay(app.createdAt)}>
          {app.fullName} ({app.status.toLowerCase()})
        </ListRow>
      ))}
      {applications.length > visible.length && (
        <ViewMoreLink href={href}>
          View {applications.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* pending-students  (registrar/admin students - Students pending acceptance) */
async function PendingStudentsBody({ fullPageHref }: WidgetBodyProps) {
  const students = await db.user.findMany({
    where: {
      role: "STUDENT",
      status: { in: ["PENDING_ACCEPTANCE", "DETAILS_DISPUTED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      name: true,
      studentNumber: true,
      status: true,
      email: true,
    },
  });
  if (!students.length) return <Empty>No students pending acceptance.</Empty>;
  const visible = students.slice(0, 5);
  const href = fullPageHref ?? "/registrar/students";
  return (
    <>
      {visible.map((stu) => (
        <ListRow key={stu.id} href={href} icon={<Users size={16} />}>
          {stu.name} (
          {stu.status === "DETAILS_DISPUTED" ? "details disputed" : "pending"})
        </ListRow>
      ))}
      {students.length > visible.length && (
        <ViewMoreLink href={href}>
          View {students.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* graduand-list  (registrar/board academics - Graduands) */
async function GraduandListBody({ fullPageHref }: WidgetBodyProps) {
  const enrolments = await db.enrolment.findMany({
    where: { status: "COMPLETED" },
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: {
      user: { select: { name: true, studentNumber: true } },
      course: { select: { title: true } },
    },
  });
  if (!enrolments.length) return <Empty>No graduands yet.</Empty>;
  const visible = enrolments.slice(0, 5);
  const href = fullPageHref ?? "/registrar/graduands";
  return (
    <>
      {visible.map((enr) => (
        <ListRow key={enr.id} href={href} icon={<GraduationCap size={16} />}>
          {(enr.user.name ?? "Student").trim().split(/\s+/).join(" ")} -{" "}
          {enr.course.title}
        </ListRow>
      ))}
      {enrolments.length > visible.length && (
        <ViewMoreLink href={href}>
          View {enrolments.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════
   DIRECTOR / FINANCE / BOARD WIDGETS
   ═══════════════════════════════════════════════ */

/* approval-list  (director/admin/finance approvals - Approvals) */
async function ApprovalListBody({ fullPageHref, role }: WidgetBodyProps) {
  // For the Director, only show types the Director is authorised to decide.
  const isDirector = role === "DIRECTOR";
  const DIRECTOR_TYPES: ApprovalRequestType[] = [
    "ACADEMIC_PROGRAMME_CHANGE", "COURSE_CHANGE", "RESULTS_PUBLICATION",
    "CERTIFICATE_ISSUANCE", "PAYMENT_PROOF", "EQUIPMENT_REQUEST",
    "ROLE_ASSIGNMENT", "FEE_CHANGE", "WAIVER", "REFUND",
  ];
  const typeFilter = isDirector ? { type: { in: DIRECTOR_TYPES } } : {};

  const approvals = await db.approvalRequest.findMany({
    where: {
      status: { in: ["SUBMITTED" as const, "IN_REVIEW" as const] },
      ...typeFilter,
    },
    orderBy: { createdAt: "asc" }, // oldest first
    take: 6,
    include: {
      initiator: { select: { name: true, role: true } },
    },
  });
  if (!approvals.length) return <Empty>No pending approvals.</Empty>;

  // Human-readable approval type labels
  const TYPE_LABELS: Record<string, string> = {
    ACADEMIC_PROGRAMME_CHANGE: "Programme change",
    COURSE_CHANGE:             "Course change",
    RESULTS_PUBLICATION:       "Results publication",
    CERTIFICATE_ISSUANCE:      "Certificate issuance",
    PAYMENT_PROOF:             "Payment proof",
    EQUIPMENT_REQUEST:         "Equipment request",
    ROLE_ASSIGNMENT:           "Role assignment",
    FEE_CHANGE:                "Fee change",
    WAIVER:                    "Fee waiver",
    REFUND:                    "Refund",
    ADMISSION:                 "Admission",
    MARKS_CHANGE:              "Marks change",
    STORAGE_CLEARING:          "Storage clearing",
    STAFF_ACCOUNT_CREATE:      "Staff account",
    STAFF_ACCOUNT_SUSPEND:     "Account suspension",
    STAFF_ACCOUNT_ROLE_CHANGE: "Role change",
    BULK_EXPORT:               "Bulk export",
  };

  function ageDays(date: Date) {
    return Math.floor((Date.now() - date.getTime()) / 86_400_000);
  }

  const href = fullPageHref ?? "/director/approvals";
  return (
    <>
      {approvals.map((apr) => {
        const age = ageDays(apr.createdAt);
        const ageStr = age === 0 ? "today" : age === 1 ? "1 day ago" : `${age} days ago`;
        const label = TYPE_LABELS[apr.type] ?? apr.type.replace(/_/g, " ").toLowerCase();
        const requester = apr.initiator?.name ?? "unknown";
        return (
          <ListRow
            key={apr.id}
            href={`${href}/${apr.id}`}
            icon={<ShieldCheck size={16} />}
            date={ageStr}
          >
            {label} from {requester}
            {apr.amount ? ` (${fmtUGX(apr.amount)})` : ""}
          </ListRow>
        );
      })}
    </>
  );
}

/* financial-reports  (finance/board/auditor reconciliation/reports - Financial Reports) */
async function FinancialReportsBody({ fullPageHref }: WidgetBodyProps) {
  const [totalPaid, pendingCount, pendingApprovalCount] = await Promise.all([
    db.payment.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED" },
    }),
    db.payment.count({ where: { status: "PENDING" } }),
    db.payment.count({ where: { status: "PENDING_APPROVAL" } }),
  ]);
  const href = fullPageHref ?? "/director/finance";
  return (
    <>
      <ListRow href={href} icon={<Wallet size={16} />}>
        Total collected: {fmtUGX(totalPaid._sum.amount ?? 0)}
      </ListRow>
      <ListRow href={href} icon={<Clock size={16} />}>
        {formatCount(pendingCount, "payment")} pending
      </ListRow>
      <ListRow href={href} icon={<AlertCircle size={16} />}>
        {formatCount(pendingApprovalCount, "payment")} awaiting approval
      </ListRow>
    </>
  );
}

/* staff-list  (admin/director staff - Staff) */
async function StaffListBody({ fullPageHref }: WidgetBodyProps) {
  const staff = await db.user.findMany({
    where: { role: { not: "STUDENT" }, status: "ACTIVE" },
    orderBy: { name: "asc" },
    take: 6,
    select: { id: true, name: true, email: true, role: true },
  });
  if (!staff.length) return <Empty>No staff accounts yet.</Empty>;
  const visible = staff.slice(0, 4);
  const href = fullPageHref ?? "/admin/tutors";
  return (
    <>
      <div className="dashboard-profile-grid">
        {visible.map((s) => (
          <ProfileCard
            key={s.id}
            name={displayName(s.name)}
            id={s.role.toLowerCase().replace(/_/g, " ")}
            email={s.email ?? undefined}
            href={href}
            status="Active"
          />
        ))}
      </div>
      {staff.length > visible.length && (
        <ViewMoreLink href={href}>
          View {staff.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════
   SYSTEM_IT WIDGETS
   ═══════════════════════════════════════════════ */

/* support-list  (deputy/HR support - open support tickets) */
async function SupportListBody({ fullPageHref }: WidgetBodyProps) {
  const tickets = await db.supportTicket.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { user: { select: { name: true } } },
  });
  if (!tickets.length) return <Empty>No open support tickets.</Empty>;
  const visible = tickets.slice(0, 5);
  const href = fullPageHref ?? "/deputy/complaints";
  return (
    <>
      {visible.map((t) => (
        <ListRow key={t.id} href={href} date={fmtDay(t.createdAt)}>
          {t.subject} ({t.status.toLowerCase().replace("_", " ")})
        </ListRow>
      ))}
      {tickets.length > visible.length && (
        <ViewMoreLink href={href}>
          View {tickets.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* system-status  (system/admin - System Status) */
async function SystemStatusBody({ fullPageHref }: WidgetBodyProps) {
  const [userCount, courseCount, settingCount] = await Promise.all([
    db.user.count(),
    db.course.count(),
    db.siteSetting.count(),
  ]);
  const href = fullPageHref ?? "/system/settings";
  return (
    <>
      <ListRow href={href} icon={<Users size={16} />}>
        {formatCount(userCount, "user")} registered
      </ListRow>
      <ListRow href={href} icon={<FileText size={16} />}>
        {formatCount(courseCount, "course")} published
      </ListRow>
      <ListRow href={href} icon={<Settings size={16} />}>
        {formatCount(settingCount, "setting")} configured
      </ListRow>
    </>
  );
}

/* audit-list  (auditor/admin/system/board - Audit Log) */
async function AuditListBody({ fullPageHref }: WidgetBodyProps) {
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { actor: { select: { name: true } } },
  });
  if (!logs.length) return <Empty>No audit entries yet.</Empty>;
  const visible = logs.slice(0, 5);
  const href = fullPageHref ?? "/system/audit";
  return (
    <>
      {visible.map((log) => (
        <ListRow
          key={log.id}
          href={href}
          icon={<FileSearch size={16} />}
          date={fmtDay(log.createdAt)}
        >
          {log.action.toLowerCase().replace(/_/g, " ")} by{" "}
          {log.actor?.name ?? "system"}
        </ListRow>
      ))}
      {logs.length > visible.length && (
        <ViewMoreLink href={href}>
          View {logs.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* attendance-overview  (tutor teaching/students - Attendance Summary) */
async function AttendanceOverviewBody({
  userId,
  fullPageHref,
}: WidgetBodyProps) {
  const classes = await db.liveClass.findMany({
    where: {
      course: teachingCourseWhere(userId),
      status: "COMPLETED",
    },
    orderBy: { scheduledAt: "desc" },
    take: 5,
    include: {
      course: { select: { title: true } },
      _count: { select: { attendance: true } },
    },
  });
  if (!classes.length) return <Empty>No completed classes yet.</Empty>;
  const href = fullPageHref ?? "/tutor/attendance";
  return (
    <>
      {classes.map((cls) => (
        <ListRow
          key={cls.id}
          href={href}
          icon={<ClipboardCheck size={16} />}
          date={fmtDay(cls.scheduledAt)}
        >
          {cls.title} - {formatCount(cls._count.attendance, "student")}
        </ListRow>
      ))}
    </>
  );
}

/* student-progress-overview  (tutor students - Course Progress) */
async function StudentProgressOverviewBody({
  userId,
  fullPageHref,
}: WidgetBodyProps) {
  const enrolments = await db.enrolment.findMany({
    where: {
      status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] },
      course: teachingCourseWhere(userId),
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      user: { select: { id: true, name: true } },
      course: {
        select: {
          title: true,
          blocks: { select: { _count: { select: { lessons: true } } } },
        },
      },
    },
  });
  if (!enrolments.length) return <Empty>No students enrolled yet.</Empty>;
  const courseIds = Array.from(new Set(enrolments.map((e) => e.courseId)));
  const allProgress = await db.lessonProgress.findMany({
    where: {
      completedAt: { not: null },
      lesson: { block: { courseId: { in: courseIds } } },
    },
    select: {
      userId: true,
      lesson: { select: { block: { select: { courseId: true } } } },
    },
  });
  const doneMap = new Map<string, number>();
  allProgress.forEach((p) => {
    const key = `${p.userId}:${p.lesson.block.courseId}`;
    doneMap.set(key, (doneMap.get(key) ?? 0) + 1);
  });
  const href = fullPageHref ?? "/tutor/students";
  return (
    <>
      {enrolments.slice(0, 5).map((enr) => {
        const total = enr.course.blocks.reduce(
          (s, b) => s + b._count.lessons,
          0,
        );
        const done = doneMap.get(`${enr.user.id}:${enr.courseId}`) ?? 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <ListRow key={enr.id} href={href} icon={<ClipboardList size={16} />}>
            {displayName(enr.user.name)} - {pct}% complete
          </ListRow>
        );
      })}
    </>
  );
}

/* ═══════════════════════════════════════════════
   GENERAL-TAB WIDGETS FOR ADMIN ROLES
   These replace the bespoke page.tsx general-tab layouts.
   ═══════════════════════════════════════════════ */

/* registrar-todos  (registrar general) */
async function RegistrarTodosBody({ fullPageHref }: WidgetBodyProps) {
  const [pendingApps, pendingAcceptance, disputed] = await Promise.all([
    db.application.count({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
    }),
    db.user.count({ where: { role: "STUDENT", status: "PENDING_ACCEPTANCE" } }),
    db.user.count({ where: { role: "STUDENT", status: "DETAILS_DISPUTED" } }),
  ]);
  const allClear =
    pendingApps === 0 && pendingAcceptance === 0 && disputed === 0;
  const href = fullPageHref ?? "/registrar/applications";
  if (allClear) return <Empty>All caught up. No pending actions.</Empty>;
  return (
    <>
      {pendingApps > 0 && (
        <ListRow href={href} icon={<ClipboardList size={16} />}>
          {formatCount(pendingApps, "new application")} awaiting review
        </ListRow>
      )}
      {pendingAcceptance > 0 && (
        <ListRow href="/registrar/students" icon={<Clock size={16} />}>
          {formatCount(pendingAcceptance, "student")} pending acceptance
        </ListRow>
      )}
      {disputed > 0 && (
        <ListRow href="/registrar/students" icon={<AlertCircle size={16} />}>
          {formatCount(disputed, "student")} disputed their details
        </ListRow>
      )}
    </>
  );
}

/* deputy-todos  (deputy general) */
async function DeputyTodosBody({ fullPageHref }: WidgetBodyProps) {
  const [tickets, overdue, suspended] = await Promise.all([
    db.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    db.enrolment.count({ where: { status: "OVERDUE" } }),
    db.user.count({ where: { role: "STUDENT", status: "SUSPENDED" } }),
  ]);
  const allClear = tickets === 0 && overdue === 0 && suspended === 0;
  const href = fullPageHref ?? "/deputy/complaints";
  if (allClear) return <Empty>All caught up. No pending actions.</Empty>;
  return (
    <>
      {tickets > 0 && (
        <ListRow href={href} icon={<ClipboardList size={16} />}>
          {formatCount(tickets, "open support ticket")}
        </ListRow>
      )}
      {overdue > 0 && (
        <ListRow href="/deputy/students" icon={<AlertCircle size={16} />}>
          {formatCount(overdue, "overdue enrolment")}
        </ListRow>
      )}
      {suspended > 0 && (
        <ListRow href="/deputy/students" icon={<AlertCircle size={16} />}>
          {formatCount(suspended, "suspended student")}
        </ListRow>
      )}
    </>
  );
}

/* principal-todos  (principal general) */
async function PrincipalTodosBody({ fullPageHref }: WidgetBodyProps) {
  const [pendingResults, pendingApprovals, draftCourses] = await Promise.all([
    db.examAttempt.count({ where: { status: "SUBMITTED" } }),
    db.approvalRequest.count({ where: { status: { in: ["SUBMITTED" as const, "IN_REVIEW" as const] } } }),
    db.course.count({ where: { status: "DRAFT" } }),
  ]);
  const allClear =
    pendingResults === 0 && pendingApprovals === 0 && draftCourses === 0;
  const href = fullPageHref ?? "/principal/results";
  if (allClear) return <Empty>All caught up. No pending actions.</Empty>;
  return (
    <>
      {pendingResults > 0 && (
        <ListRow href={href} icon={<ClipboardCheck size={16} />}>
          {formatCount(pendingResults, "exam submission")} awaiting release
        </ListRow>
      )}
      {pendingApprovals > 0 && (
        <ListRow href="/director/approvals" icon={<ShieldCheck size={16} />}>
          {formatCount(pendingApprovals, "approval")} pending your decision
        </ListRow>
      )}
      {draftCourses > 0 && (
        <ListRow href="/principal/courses" icon={<FileText size={16} />}>
          {formatCount(draftCourses, "course")} in draft awaiting review
        </ListRow>
      )}
    </>
  );
}

/* finance-todos  (finance general) */
async function FinanceTodosBody({ fullPageHref }: WidgetBodyProps) {
  const [pendingClaims, pendingPayments, pendingApprovals] = await Promise.all([
    db.manualPaymentClaim.count({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
    }),
    db.payment.count({ where: { status: "PENDING_APPROVAL" } }),
    db.approvalRequest.count({ where: { status: { in: ["SUBMITTED" as const, "IN_REVIEW" as const] } } }),
  ]);
  const allClear =
    pendingClaims === 0 && pendingPayments === 0 && pendingApprovals === 0;
  const href = fullPageHref ?? "/finance/payments";
  if (allClear) return <Empty>All caught up. No pending actions.</Empty>;
  return (
    <>
      {pendingClaims > 0 && (
        <ListRow href={href} icon={<Receipt size={16} />}>
          {formatCount(pendingClaims, "manual payment claim")} to verify
        </ListRow>
      )}
      {pendingPayments > 0 && (
        <ListRow href={href} icon={<Wallet size={16} />}>
          {formatCount(pendingPayments, "payment")} awaiting approval
        </ListRow>
      )}
      {pendingApprovals > 0 && (
        <ListRow href="/finance/approvals" icon={<ShieldCheck size={16} />}>
          {formatCount(pendingApprovals, "approval request")} pending
        </ListRow>
      )}
    </>
  );
}

/* director-todos  (Director) */
async function DirectorTodosBody({ fullPageHref }: WidgetBodyProps) {
  // Director decides: programme/course changes, results publication, certificate
  // issuance, payment proof, equipment requests, role assignments, fee/waiver/refund.
  // Does NOT decide: admissions, marks changes, storage clearing.
  const DIRECTOR_TYPES: ApprovalRequestType[] = [
    "ACADEMIC_PROGRAMME_CHANGE", "COURSE_CHANGE", "RESULTS_PUBLICATION",
    "CERTIFICATE_ISSUANCE", "PAYMENT_PROOF", "EQUIPMENT_REQUEST",
    "ROLE_ASSIGNMENT", "FEE_CHANGE", "WAIVER", "REFUND",
  ];
  const [pendingApprovals, pendingClaims] = await Promise.all([
    db.approvalRequest.count({
      where: {
        status: { in: ["SUBMITTED" as const, "IN_REVIEW" as const] },
        type:   { in: DIRECTOR_TYPES },
      },
    }),
    db.manualPaymentClaim.count({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
    }),
  ]);
  const allClear = pendingApprovals === 0 && pendingClaims === 0;
  const href = fullPageHref ?? "/director/approvals";
  if (allClear) return <Empty>All caught up. No pending actions.</Empty>;
  return (
    <>
      {pendingApprovals > 0 && (
        <ListRow href={href} icon={<ShieldCheck size={16} />}>
          {formatCount(pendingApprovals, "approval")} requiring your decision
        </ListRow>
      )}
      {pendingClaims > 0 && (
        <ListRow href="/director/finance" icon={<Receipt size={16} />}>
          {formatCount(pendingClaims, "payment claim")} awaiting verification
        </ListRow>
      )}
    </>
  );
}

/* hr-todos  (HR system admin general) */
async function HrTodosBody({ fullPageHref }: WidgetBodyProps) {
  const [pendingInvites, openTickets] = await Promise.all([
    db.staffInvite
      .count({ where: { acceptedAt: null, expiresAt: { gt: new Date() } } })
      .catch(() => 0),
    db.supportTicket
      .count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } })
      .catch(() => 0),
  ]);
  const allClear = pendingInvites === 0 && openTickets === 0;
  const href = fullPageHref ?? "/admin/staff";
  if (allClear) return <Empty>All caught up. No pending actions.</Empty>;
  return (
    <>
      {pendingInvites > 0 && (
        <ListRow href={href} icon={<Users size={16} />}>
          {formatCount(pendingInvites, "staff invite")} pending acceptance
        </ListRow>
      )}
      {openTickets > 0 && (
        <ListRow href="/admin/support" icon={<ClipboardList size={16} />}>
          {formatCount(openTickets, "open support ticket")}
        </ListRow>
      )}
    </>
  );
}

async function AdminOperationsTodosBody({ fullPageHref }: WidgetBodyProps) {
  const [openTickets, pendingInvites, upcomingPracticals] = await Promise.all([
    db.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    db.staffInvite.count({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
    }),
    db.practicalSession.count({ where: { startsAt: { gte: new Date() } } }),
  ]);
  const href = fullPageHref ?? "/admin/support";
  if (openTickets + pendingInvites + upcomingPracticals === 0)
    return <Empty>No operational actions pending.</Empty>;
  return (
    <>
      {openTickets > 0 && (
        <ListRow href="/admin/support" icon={<ClipboardList size={16} />}>
          {formatCount(openTickets, "ticket")} awaiting response
        </ListRow>
      )}
      {pendingInvites > 0 && (
        <ListRow href="/admin/students" icon={<Users size={16} />}>
          {formatCount(pendingInvites, "invite")} pending acceptance
        </ListRow>
      )}
      {upcomingPracticals > 0 && (
        <ListRow href="/admin/equipment" icon={<ClipboardCheck size={16} />}>
          {formatCount(upcomingPracticals, "practical session")} need
          preparation
        </ListRow>
      )}
      <ViewMoreLink href={href}>Open operations</ViewMoreLink>
    </>
  );
}

async function AdminOperationsOverviewBody({ fullPageHref }: WidgetBodyProps) {
  const now = new Date();
  const [venueCount, bookingCount, practicals, notice] = await Promise.all([
    db.venue.count({ where: { active: true } }),
    db.venueBooking.count({
      where: { startsAt: { gte: now }, status: "CONFIRMED" },
    }),
    db.practicalSession.findMany({
      where: { startsAt: { gte: now } },
      include: { equipment: true },
      orderBy: { startsAt: "asc" },
      take: 10,
    }),
    db.operationalNotice.findFirst({
      orderBy: { sentAt: "desc" },
      select: { title: true, sentAt: true },
    }),
  ]);
  const missingEquipment = practicals.filter((session) =>
    session.equipment.some((item) => item.available < item.needed),
  ).length;
  return (
    <>
      <ListRow
        href={fullPageHref ?? "/admin/timetable"}
        icon={<Calendar size={16} />}
      >
        {formatCount(venueCount, "venue")} available
      </ListRow>
      <ListRow href="/admin/timetable" icon={<ClipboardList size={16} />}>
        {formatCount(bookingCount, "room booking")} upcoming
      </ListRow>
      <ListRow href="/admin/equipment" icon={<ClipboardCheck size={16} />}>
        {formatCount(missingEquipment, "practical session")} need equipment
      </ListRow>
      {notice && (
        <ListRow
          href="/admin/notices"
          icon={<FileText size={16} />}
          date={fmtDay(notice.sentAt)}
        >
          {notice.title}
        </ListRow>
      )}
    </>
  );
}

async function LeaveListBody({ fullPageHref }: WidgetBodyProps) {
  const requests = await db.leaveRequest.findMany({
    include: { user: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { startsAt: "asc" }],
    take: 5,
  });
  if (!requests.length) return <Empty>No leave requests submitted.</Empty>;
  const href = fullPageHref ?? "/admin/leave";
  return (
    <>
      {requests.map((request) => (
        <ListRow key={request.id} href={href} date={fmtDay(request.startsAt)}>
          {request.user.name}: {request.status.toLowerCase()} leave
        </ListRow>
      ))}
    </>
  );
}

async function AccessReviewSummaryBody({ fullPageHref }: WidgetBodyProps) {
  const staff = await db.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, role: true, lastAccessReviewAt: true },
  });
  const reviewable = staff.filter((user) => can(user.role, "staff.view"));
  const staleBefore = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const stale = reviewable.filter(
    (user) => !user.lastAccessReviewAt || user.lastAccessReviewAt < staleBefore,
  ).length;
  return (
    <>
      <ListRow
        href={fullPageHref ?? "/admin/access-review"}
        icon={<Users size={16} />}
      >
        {formatCount(reviewable.length, "staff account")} in review scope
      </ListRow>
      <ListRow href="/admin/access-review" icon={<AlertCircle size={16} />}>
        {formatCount(stale, "account")} need review
      </ListRow>
    </>
  );
}

/* system-todos  (system IT general) */
async function SystemTodosBody({ fullPageHref }: WidgetBodyProps) {
  const [unconfigured] = await Promise.all([
    db.siteSetting.count({ where: { value: "" } }).catch(() => 0),
  ]);
  const href = fullPageHref ?? "/system/settings";
  if (unconfigured === 0) return <Empty>All settings configured.</Empty>;
  return (
    <ListRow href={href} icon={<Settings size={16} />}>
      {formatCount(unconfigured, "setting")} not yet configured
    </ListRow>
  );
}

/* upcoming-classes-overview  (registrar/deputy/principal/hr general) */
async function UpcomingClassesOverviewBody({ fullPageHref }: WidgetBodyProps) {
  const now = new Date();
  const classes = await db.liveClass.findMany({
    where: {
      OR: [
        { scheduledAt: { gt: now }, status: "SCHEDULED" },
        { status: "LIVE" },
      ],
    },
    orderBy: { scheduledAt: "asc" },
    take: 5,
    include: {
      course: { select: { title: true } },
      tutor: { select: { name: true } },
    },
  });
  if (!classes.length) return <Empty>No classes scheduled.</Empty>;
  const href = fullPageHref ?? "/principal/students";
  return (
    <>
      {classes.map((cls) => {
        const chip = classStatusChip(cls.scheduledAt, cls.status);
        return (
          <MiniCard
            key={cls.id}
            title={cls.title}
            subtitle={cls.course.title}
            href={href}
            actionLabel="View"
            status={chip}
          >
            <CalendarMeta>{fmtDate(cls.scheduledAt)}</CalendarMeta>
            <ClockMeta timeZone="East Africa Time">
              {fmtTime(cls.scheduledAt)}
              {cls.durationMin
                ? ` to ${fmtTime(new Date(cls.scheduledAt.getTime() + cls.durationMin * 60_000))}`
                : ""}
            </ClockMeta>
          </MiniCard>
        );
      })}
    </>
  );
}

/* recent-students-list  (registrar/deputy general) */
async function RecentStudentsListBody({ fullPageHref }: WidgetBodyProps) {
  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      name: true,
      studentNumber: true,
      status: true,
      createdAt: true,
    },
  });
  if (!students.length) return <Empty>No students yet.</Empty>;
  const visible = students.slice(0, 5);
  const href = fullPageHref ?? "/registrar/students";
  return (
    <>
      {visible.map((s) => (
        <ListRow key={s.id} href={href} date={fmtDay(s.createdAt)}>
          {displayName(s.name)}
          {s.studentNumber ? ` - ${s.studentNumber}` : ""}
        </ListRow>
      ))}
      {students.length > visible.length && (
        <ViewMoreLink href={href}>
          View {students.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* exam-submissions-list  (principal general) */
async function ExamSubmissionsListBody({ fullPageHref }: WidgetBodyProps) {
  const attempts = await db.examAttempt.findMany({
    where: { status: { in: ["SUBMITTED", "MARKED"] } },
    orderBy: { submittedAt: "desc" },
    take: 6,
    include: {
      user: { select: { name: true } },
      exam: { select: { title: true } },
    },
  });
  if (!attempts.length) return <Empty>No exam submissions yet.</Empty>;
  const visible = attempts.slice(0, 5);
  const href = fullPageHref ?? "/principal/results";
  return (
    <>
      {visible.map((a) => (
        <ListRow
          key={a.id}
          href={href}
          icon={
            a.status === "MARKED" ? (
              a.passed ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )
            ) : (
              <Clock size={16} />
            )
          }
          date={a.submittedAt ? fmtDay(a.submittedAt) : undefined}
        >
          {displayName(a.user?.name ?? null)} - {a.exam.title}
        </ListRow>
      ))}
      {attempts.length > visible.length && (
        <ViewMoreLink href={href}>
          View {attempts.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* recent-payments-list  (finance/director general) */
async function RecentPaymentsListBody({ fullPageHref }: WidgetBodyProps) {
  const payments = await db.payment.findMany({
    where: { status: "COMPLETED" },
    orderBy: { paidAt: "desc" },
    take: 6,
    include: {
      enrolment: {
        include: {
          user: { select: { name: true } },
          course: { select: { title: true } },
        },
      },
    },
  });
  if (!payments.length) return <Empty>No payments recorded yet.</Empty>;
  const visible = payments.slice(0, 5);
  const href = fullPageHref ?? "/director/finance";
  return (
    <>
      {visible.map((p) => (
        <ListRow
          key={p.id}
          href={href}
          icon={<Receipt size={16} />}
          date={p.paidAt ? fmtDay(p.paidAt) : undefined}
        >
          {displayName(p.enrolment?.user?.name ?? null)} - {fmtUGX(p.amount)}
        </ListRow>
      ))}
      {payments.length > visible.length && (
        <ViewMoreLink href={href}>
          View {payments.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* revenue-summary  (finance/director general) */
async function RevenueSummaryBody({ fullPageHref }: WidgetBodyProps) {
  // Use last-30-days window so the widget always shows meaningful data
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [monthRev, outstanding, pendingClaims] = await Promise.all([
    db.payment.aggregate({
      where: { status: "COMPLETED", paidAt: { gte: since30d } },
      _sum: { amount: true },
    }),
    db.enrolment.aggregate({
      where: { status: { in: ["ACTIVE", "PARTIALLY_PAID", "OVERDUE"] } },
      _sum: { totalAmountUgx: true, paidAmountUgx: true },
    }),
    db.manualPaymentClaim.count({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
    }),
  ]);
  const href = fullPageHref ?? "/director/finance";
  const outstandingUgx = Math.max(
    0,
    (outstanding._sum.totalAmountUgx ?? 0) -
      (outstanding._sum.paidAmountUgx ?? 0),
  );
  return (
    <>
      <ListRow href={href} icon={<Wallet size={16} />}>
        Last 30 days: {fmtUGX(monthRev._sum.amount ?? 0)}
      </ListRow>
      <ListRow href={href} icon={<AlertCircle size={16} />}>
        Outstanding: {fmtUGX(outstandingUgx)}
      </ListRow>
      {pendingClaims > 0 && (
        <ListRow href={href} icon={<Receipt size={16} />}>
          {formatCount(pendingClaims, "payment claim")} to review
        </ListRow>
      )}
    </>
  );
}

/* board-overview  (board general - read-only aggregates) */
async function BoardOverviewBody({ fullPageHref }: WidgetBodyProps) {
  const [students, active, graduates, courses] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.enrolment.count({
      where: { status: { in: ["ACTIVE", "PARTIALLY_PAID"] } },
    }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
  ]);
  const href = fullPageHref ?? "/board/reports";
  return (
    <>
      <ListRow href={href} icon={<Users size={16} />}>
        {formatCount(students, "student")} total
      </ListRow>
      <ListRow href={href} icon={<ClipboardList size={16} />}>
        {formatCount(active, "active enrolment")}
      </ListRow>
      <ListRow href={href} icon={<GraduationCap size={16} />}>
        {formatCount(graduates, "graduate")}
      </ListRow>
      <ListRow href={href} icon={<FileText size={16} />}>
        {formatCount(courses, "course")} offered
      </ListRow>
    </>
  );
}

/* recent-graduates-list  (board general) */
async function RecentGraduatesListBody({ fullPageHref }: WidgetBodyProps) {
  const grads = await db.enrolment.findMany({
    where: { status: "COMPLETED" },
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: {
      user: { select: { name: true } },
      course: { select: { title: true } },
    },
  });
  if (!grads.length) return <Empty>No graduates yet.</Empty>;
  const visible = grads.slice(0, 5);
  const href = fullPageHref ?? "/board/graduates";
  return (
    <>
      {visible.map((g) => (
        <ListRow key={g.id} href={href} icon={<GraduationCap size={16} />}>
          {displayName(g.user.name)} - {g.course.title}
        </ListRow>
      ))}
      {grads.length > grads.length - visible.length &&
        grads.length > visible.length && (
          <ViewMoreLink href={href}>
            View {grads.length - visible.length} more
          </ViewMoreLink>
        )}
    </>
  );
}

/* course-enrolments  (board general - enrolments per course) */
async function CourseEnrolmentsBody({ fullPageHref }: WidgetBodyProps) {
  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    select: {
      title: true,
      slug: true,
      _count: { select: { enrolments: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!courses.length) return <Empty>No published courses yet.</Empty>;
  const href = fullPageHref ?? "/board/reports";
  return (
    <>
      {courses.map((c) => (
        <ListRow key={c.slug} href={href} icon={<FileText size={16} />}>
          {c.title} - {formatCount(c._count.enrolments, "enrolment")}
        </ListRow>
      ))}
    </>
  );
}

/* auditor-overview  (auditor general - summary) */
async function AuditorOverviewBody({ fullPageHref }: WidgetBodyProps) {
  const [students, payments, certs, tickets] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.payment.count({ where: { status: "COMPLETED" } }),
    db.certificate.count(),
    db.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
  ]);
  const href = fullPageHref ?? "/auditor/reports";
  return (
    <>
      <ListRow href={href} icon={<Users size={16} />}>
        {formatCount(students, "student")} registered
      </ListRow>
      <ListRow href="/auditor/reports" icon={<Receipt size={16} />}>
        {formatCount(payments, "payment")} verified
      </ListRow>
      <ListRow href="/auditor/reports" icon={<FileText size={16} />}>
        {formatCount(certs, "certificate")} issued
      </ListRow>
      {tickets > 0 && (
        <ListRow href="/auditor/reports" icon={<AlertCircle size={16} />}>
          {formatCount(tickets, "open support ticket")}
        </ListRow>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════
   DIRECTOR D2 WIDGETS
   ═══════════════════════════════════════════════ */

/* director-key-numbers  (Director general tab) */
async function DirectorKeyNumbersBody({ fullPageHref }: WidgetBodyProps) {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [
    activeStudents,
    thisIntake,
    passCount,
    totalAttempts,
    presentCount,
    totalAttendance,
    revCollected,
    outstanding,
  ] = await Promise.all([
    db.enrolment.count({
      where: { status: { in: ["ACTIVE", "PARTIALLY_PAID"] } },
    }),
    db.enrolment.count({
      where: { createdAt: { gte: since30d } },
    }),
    db.examAttempt.count({
      where: { passed: true },
    }),
    db.examAttempt.count(),
    db.attendance.count({ where: { markedPresent: true } }),
    db.attendance.count(),
    db.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
    db.enrolment.aggregate({
      where: { status: { in: ["ACTIVE", "PARTIALLY_PAID", "OVERDUE"] } },
      _sum: { totalAmountUgx: true, paidAmountUgx: true },
    }),
  ]);
  const passRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : null;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : null;
  const outstandingUgx = Math.max(
    0,
    (outstanding._sum.totalAmountUgx ?? 0) - (outstanding._sum.paidAmountUgx ?? 0),
  );
  const href = fullPageHref ?? "/director/reports";
  return (
    <>
      <ListRow href="/director/students" icon={<Users size={16} />}>
        {activeStudents.toLocaleString()} active students
      </ListRow>
      <ListRow href="/director/students" icon={<GraduationCap size={16} />}>
        {thisIntake.toLocaleString()} enrolments this month
      </ListRow>
      {passRate !== null && (
        <ListRow href="/director/examinations" icon={<CheckCircle2 size={16} />}>
          Pass rate: {passRate}%
        </ListRow>
      )}
      {attendanceRate !== null && (
        <ListRow href="/director/reports" icon={<Calendar size={16} />}>
          Attendance rate: {attendanceRate}%
        </ListRow>
      )}
      <ListRow href="/director/finance" icon={<Wallet size={16} />}>
        Collected: {fmtUGX(revCollected._sum.amount ?? 0)}
      </ListRow>
      <ListRow href="/director/finance" icon={<AlertCircle size={16} />}>
        Outstanding: {fmtUGX(outstandingUgx)}
      </ListRow>
    </>
  );
}

/* director-alerts  (Director general tab - security events, failed checks, system health) */
async function DirectorAlertsBody({ fullPageHref }: WidgetBodyProps) {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [securityLogins, failedPaymentChecks, pendingProofs] = await Promise.all([
    // Recent login events as a proxy for security events
    db.auditLog.count({
      where: {
        action: "LOGIN" as const,
        createdAt: { gte: since24h },
      },
    }).catch(() => 0),
    db.manualPaymentClaim.count({
      where: { status: "REJECTED" },
    }).catch(() => 0),
    db.approvalRequest.count({
      where: {
        type: "PAYMENT_PROOF",
        status: { in: ["SUBMITTED", "IN_REVIEW"] },
      },
    }).catch(() => 0),
  ]);
  const allClear = failedPaymentChecks === 0 && pendingProofs === 0;
  const href = fullPageHref ?? "/director/audit";
  if (allClear && securityLogins === 0) return <Empty>No alerts. Everything looks normal.</Empty>;
  return (
    <>
      {securityLogins > 0 && (
        <ListRow href={href} icon={<AlertCircle size={16} />}>
          {formatCount(securityLogins, "login event")} in the last 24 hours
        </ListRow>
      )}
      {failedPaymentChecks > 0 && (
        <ListRow href="/director/finance" icon={<AlertCircle size={16} />}>
          {formatCount(failedPaymentChecks, "rejected payment claim")}
        </ListRow>
      )}
      {pendingProofs > 0 && (
        <ListRow href="/director/approvals" icon={<Receipt size={16} />}>
          {formatCount(pendingProofs, "payment proof")} awaiting your review
        </ListRow>
      )}
    </>
  );
}

/* director-today  (Director general tab - live classes and exams today) */
async function DirectorTodayBody({ fullPageHref }: WidgetBodyProps) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const [liveClasses, examsToday] = await Promise.all([
    db.liveClass.findMany({
      where: {
        OR: [
          { status: "LIVE" },
          {
            status: "SCHEDULED",
            scheduledAt: { gte: now, lte: endOfDay },
          },
        ],
      },
      take: 4,
      orderBy: { scheduledAt: "asc" },
      include: { course: { select: { title: true } } },
    }).catch(() => []),
    db.exam.findMany({
      where: {
        startWindowAt: { gte: startOfDay, lte: endOfDay },
        status: "PUBLISHED",
      },
      take: 4,
      orderBy: { startWindowAt: "asc" },
      include: { course: { select: { title: true } } },
    }).catch(() => []),
  ]);
  const href = fullPageHref ?? "/director/examinations";
  if (!liveClasses.length && !examsToday.length)
    return <Empty>No live classes or exams scheduled today.</Empty>;
  return (
    <>
      {liveClasses.map((cls) => (
        <ListRow
          key={cls.id}
          href="/director/reports"
          icon={<Video size={16} />}
          date={cls.status === "LIVE" ? "Live now" : fmtTime(cls.scheduledAt)}
        >
          {cls.title} ({cls.course.title})
        </ListRow>
      ))}
      {examsToday.map((exam) => (
        <ListRow
          key={exam.id}
          href={href}
          icon={<ClipboardList size={16} />}
          date={exam.startWindowAt ? fmtTime(exam.startWindowAt) : "Today"}
        >
          Exam: {exam.title} ({exam.course.title})
        </ListRow>
      ))}
    </>
  );
}

/* director-recent-decisions  (Director general tab - last 5 approvals decided) */
async function DirectorRecentDecisionsBody({ fullPageHref }: WidgetBodyProps) {
  const DIRECTOR_TYPES: ApprovalRequestType[] = [
    "ACADEMIC_PROGRAMME_CHANGE", "COURSE_CHANGE", "RESULTS_PUBLICATION",
    "CERTIFICATE_ISSUANCE", "PAYMENT_PROOF", "EQUIPMENT_REQUEST",
    "ROLE_ASSIGNMENT", "FEE_CHANGE", "WAIVER", "REFUND",
  ];
  const TYPE_LABELS: Record<string, string> = {
    ACADEMIC_PROGRAMME_CHANGE: "Programme change",
    COURSE_CHANGE:             "Course change",
    RESULTS_PUBLICATION:       "Results publication",
    CERTIFICATE_ISSUANCE:      "Certificate issuance",
    PAYMENT_PROOF:             "Payment proof",
    EQUIPMENT_REQUEST:         "Equipment request",
    ROLE_ASSIGNMENT:           "Role assignment",
    FEE_CHANGE:                "Fee change",
    WAIVER:                    "Fee waiver",
    REFUND:                    "Refund",
  };
  const decisions = await db.approvalRequest.findMany({
    where: {
      type: { in: DIRECTOR_TYPES },
      status: { in: ["APPROVED", "REJECTED", "APPLIED"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: { initiator: { select: { name: true } } },
  });
  if (!decisions.length) return <Empty>No decisions recorded yet.</Empty>;
  const href = fullPageHref ?? "/director/approvals";
  return (
    <>
      {decisions.map((d) => {
        const label = TYPE_LABELS[d.type] ?? d.type.toLowerCase().replace(/_/g, " ");
        const outcome = d.status === "REJECTED" ? "Rejected" : "Approved";
        return (
          <ListRow
            key={d.id}
            href={`${href}/${d.id}`}
            icon={<ShieldCheck size={16} />}
            date={fmtDate(d.updatedAt)}
          >
            {outcome}: {label} from {d.initiator?.name ?? "unknown"}
          </ListRow>
        );
      })}
    </>
  );
}

/* director-enrolment-by-programme  (Director academics tab) */
async function DirectorEnrolmentByProgrammeBody({ fullPageHref }: WidgetBodyProps) {
  const courses = await db.course.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      courseCode: true,
      _count: {
        select: {
          enrolments: {
            where: { status: { in: ["ACTIVE", "PARTIALLY_PAID"] } },
          },
        },
      },
    },
    orderBy: { title: "asc" },
  });
  const withEnrolments = courses.filter((c) => c._count.enrolments > 0);
  if (!withEnrolments.length) return <Empty>No active enrolments yet.</Empty>;
  const href = fullPageHref ?? "/director/students";
  return (
    <>
      {withEnrolments.map((c) => (
        <ListRow
          key={c.id}
          href={href}
          icon={<GraduationCap size={16} />}
          date={c._count.enrolments.toString()}
        >
          {c.courseCode ?? c.title.slice(0, 30)}
        </ListRow>
      ))}
    </>
  );
}

/* director-instructor-activity  (Director academics tab) */
async function DirectorInstructorActivityBody({ fullPageHref }: WidgetBodyProps) {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const instructors = await db.user.findMany({
    where: { role: "INSTRUCTOR" },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      _count: {
        select: {
          liveClasses: {
            where: { scheduledAt: { gte: since30d } },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 6,
  }).catch(() => []);
  if (!instructors.length) return <Empty>No instructors found.</Empty>;
  const href = fullPageHref ?? "/director/instructors";
  return (
    <>
      {instructors.map((inst) => (
        <ListRow
          key={inst.id}
          href={href}
          icon={<Users size={16} />}
          date={fmtDate(inst.updatedAt)}
        >
          {inst.name} ({inst._count.liveClasses} classes)
        </ListRow>
      ))}
    </>
  );
}

/* director-certificates-awaiting  (Director academics tab) */
async function DirectorCertificatesAwaitingBody({ fullPageHref }: WidgetBodyProps) {
  const pending = await db.approvalRequest.count({
    where: {
      type: "CERTIFICATE_ISSUANCE",
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
    },
  });
  const recentlyIssued = await db.certificate.count({
    where: { issuedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
  }).catch(() => 0);
  const href = fullPageHref ?? "/director/certificates";
  if (pending === 0 && recentlyIssued === 0)
    return <Empty>No certificates pending or recently issued.</Empty>;
  return (
    <>
      {pending > 0 && (
        <ListRow href="/director/approvals" icon={<ShieldCheck size={16} />}>
          {formatCount(pending, "certificate batch")} awaiting your approval
        </ListRow>
      )}
      {recentlyIssued > 0 && (
        <ListRow href={href} icon={<Award size={16} />}>
          {formatCount(recentlyIssued, "certificate")} issued in the last 30 days
        </ListRow>
      )}
    </>
  );
}

/* director-payment-proofs  (Director finance tab) */
async function DirectorPaymentProofsBody({ fullPageHref }: WidgetBodyProps) {
  const proofs = await db.approvalRequest.findMany({
    where: {
      type: "PAYMENT_PROOF",
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
    include: {
      initiator: { select: { name: true } },
    },
  });
  if (!proofs.length) return <Empty>No payment proofs awaiting review.</Empty>;
  const href = fullPageHref ?? "/director/approvals";
  function ageDays(date: Date) {
    return Math.floor((Date.now() - date.getTime()) / 86_400_000);
  }
  return (
    <>
      {proofs.map((p) => {
        const age = ageDays(p.createdAt);
        const ageStr = age === 0 ? "today" : age === 1 ? "1 day ago" : `${age} days ago`;
        return (
          <ListRow
            key={p.id}
            href={`${href}/${p.id}`}
            icon={<Receipt size={16} />}
            date={ageStr}
          >
            Proof from {p.initiator?.name ?? "unknown"}
            {p.amount ? ` (${fmtUGX(p.amount)})` : ""}
          </ListRow>
        );
      })}
    </>
  );
}

/* director-finance-phase  (Director finance tab - collected vs outstanding by phase) */
async function DirectorFinanceByPhaseBody({ fullPageHref }: WidgetBodyProps) {
  const [collected50, collected25a, collected25b, totalFees, totalPaid] = await Promise.all([
    // Phase 1 (50%): enrolments with paidPercent >= 50
    db.enrolment.count({
      where: { paidPercent: { gte: 50 }, status: { not: "PENDING_PAYMENT" } },
    }),
    // Phase 2 (75%): paidPercent >= 75
    db.enrolment.count({
      where: { paidPercent: { gte: 75 }, status: { not: "PENDING_PAYMENT" } },
    }),
    // Phase 3 (100%): fully paid
    db.enrolment.count({
      where: { paidPercent: 100 },
    }),
    db.enrolment.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { totalAmountUgx: true },
    }),
    db.enrolment.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { paidAmountUgx: true },
    }),
  ]);
  const totalFeesUgx = totalFees._sum.totalAmountUgx ?? 0;
  const totalPaidUgx = totalPaid._sum.paidAmountUgx ?? 0;
  const outstandingUgx = Math.max(0, totalFeesUgx - totalPaidUgx);
  const href = fullPageHref ?? "/director/finance";
  return (
    <>
      <ListRow href={href} icon={<Wallet size={16} />}>
        Collected: {fmtUGX(totalPaidUgx)}
      </ListRow>
      <ListRow href={href} icon={<AlertCircle size={16} />}>
        Outstanding: {fmtUGX(outstandingUgx)}
      </ListRow>
      <ListRow href={href} icon={<Users size={16} />}>
        {collected50} at 50%, {collected25a} at 75%, {collected25b} complete
      </ListRow>
    </>
  );
}

/* director-fee-changes  (Director finance tab - fee changes and waivers pending) */
async function DirectorFeeChangesBody({ fullPageHref }: WidgetBodyProps) {
  const pending = await db.approvalRequest.findMany({
    where: {
      type: { in: ["FEE_CHANGE", "WAIVER", "REFUND"] as ApprovalRequestType[] },
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
    include: { initiator: { select: { name: true } } },
  });
  if (!pending.length) return <Empty>No fee changes or waivers pending.</Empty>;
  const TYPE_LABELS: Record<string, string> = {
    FEE_CHANGE: "Fee change",
    WAIVER: "Fee waiver",
    REFUND: "Refund",
  };
  const href = fullPageHref ?? "/director/approvals";
  function ageDays(date: Date) {
    return Math.floor((Date.now() - date.getTime()) / 86_400_000);
  }
  return (
    <>
      {pending.map((item) => {
        const age = ageDays(item.createdAt);
        const ageStr = age === 0 ? "today" : age === 1 ? "1 day ago" : `${age} days ago`;
        const label = TYPE_LABELS[item.type] ?? item.type.toLowerCase();
        return (
          <ListRow
            key={item.id}
            href={`${href}/${item.id}`}
            icon={<Receipt size={16} />}
            date={ageStr}
          >
            {label} from {item.initiator?.name ?? "unknown"}
            {item.amount ? ` (${fmtUGX(item.amount)})` : ""}
          </ListRow>
        );
      })}
    </>
  );
}

/* director-academic-reports  (Director reports tab - enrolment and pass rate summary) */
async function DirectorAcademicReportsBody({ fullPageHref }: WidgetBodyProps) {
  const [totalActive, totalGraduated, totalExamAttempts, passedAttempts, coursesPublished] = await Promise.all([
    db.enrolment.count({
      where: { status: { in: ["ACTIVE", "PARTIALLY_PAID"] } },
    }),
    db.enrolment.count({ where: { status: "COMPLETED" } }),
    db.examAttempt.count(),
    db.examAttempt.count({ where: { passed: true } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
  ]);
  const overallPass = totalExamAttempts > 0
    ? Math.round((passedAttempts / totalExamAttempts) * 100)
    : null;
  const href = fullPageHref ?? "/director/reports";
  return (
    <>
      <ListRow href="/director/students" icon={<Users size={16} />}>
        {totalActive.toLocaleString()} active enrolments
      </ListRow>
      <ListRow href="/director/graduates" icon={<GraduationCap size={16} />}>
        {totalGraduated.toLocaleString()} completed
      </ListRow>
      {overallPass !== null && (
        <ListRow href="/director/examinations" icon={<CheckCircle2 size={16} />}>
          Overall pass rate: {overallPass}%
        </ListRow>
      )}
      <ListRow href="/director/courses" icon={<FileText size={16} />}>
        {formatCount(coursesPublished, "course")} published
      </ListRow>
      <ViewMoreLink href={href}>Full reports</ViewMoreLink>
    </>
  );
}

/* ═══════════════════════════════════════════════
   WIDGET COMPONENT REGISTRY
   Maps the `component` string from DASHBOARD_WIDGETS to a server component.
   ═══════════════════════════════════════════════ */

type WidgetBodyComponent = (props: WidgetBodyProps) => Promise<React.ReactNode>;

export const WIDGET_COMPONENTS: Record<string, WidgetBodyComponent> = {
  "task-list": TaskListBody,
  metrics: MetricsBody,
  "status-list": HoldsBody,
  "class-list": ClassListBody,
  "course-cards": CourseCardsBody,
  "inbox-list": InboxListBody,
  "student-cards": StudentCardsBody,
  progress: CourseProgressBody,
  "exam-list": ExamListBody,
  results: ResultsBody,
  "log-book": LogBookBody,
  simulations: SimulationsBody,
  "fee-summary": FeeSummaryBody,
  "payment-history": PaymentHistoryBody,
  receipts: ReceiptsBody,
  "payment-action": PaymentActionBody,
  timetable: TimetableBody,
  recordings: RecordingsBody,
  attendance: AttendanceBody,
  "assignments-due": AssignmentsDueBody,
  "forum-activity": ForumActivityBody,
  "live-now": LiveNowBody,
  "teacher-classes": TeacherClassesBody,
  "marking-queue": MarkingQueueBody,
  "application-list": ApplicationListBody,
  "pending-students": PendingStudentsBody,
  "graduand-list": GraduandListBody,
  "approval-list": ApprovalListBody,
  "financial-reports": FinancialReportsBody,
  "staff-list": StaffListBody,
  "support-list": SupportListBody,
  "system-status": SystemStatusBody,
  "audit-list": AuditListBody,
  // General-tab widgets for admin roles
  "registrar-todos": RegistrarTodosBody,
  "deputy-todos": DeputyTodosBody,
  "principal-todos": PrincipalTodosBody,
  "finance-todos": FinanceTodosBody,
  "director-todos": DirectorTodosBody,
  "hr-todos": HrTodosBody,
  "admin-operations-todos": AdminOperationsTodosBody,
  "admin-operations-overview": AdminOperationsOverviewBody,
  "leave-list": LeaveListBody,
  "access-review-summary": AccessReviewSummaryBody,
  "system-todos": SystemTodosBody,
  "upcoming-classes-overview": UpcomingClassesOverviewBody,
  "recent-students-list": RecentStudentsListBody,
  "exam-submissions-list": ExamSubmissionsListBody,
  "recent-payments-list": RecentPaymentsListBody,
  "revenue-summary": RevenueSummaryBody,
  "board-overview": BoardOverviewBody,
  "recent-graduates-list": RecentGraduatesListBody,
  "course-enrolments": CourseEnrolmentsBody,
  "auditor-overview": AuditorOverviewBody,
  "attendance-overview": AttendanceOverviewBody,
  "student-progress-overview": StudentProgressOverviewBody,
  // Director-specific widgets added for D2
  "director-key-numbers": DirectorKeyNumbersBody,
  "director-alerts": DirectorAlertsBody,
  "director-today": DirectorTodayBody,
  "director-recent-decisions": DirectorRecentDecisionsBody,
  "director-enrolment-by-programme": DirectorEnrolmentByProgrammeBody,
  "director-instructor-activity": DirectorInstructorActivityBody,
  "director-certificates-awaiting": DirectorCertificatesAwaitingBody,
  "director-payment-proofs": DirectorPaymentProofsBody,
  "director-finance-phase": DirectorFinanceByPhaseBody,
  "director-fee-changes": DirectorFeeChangesBody,
  "director-academic-reports": DirectorAcademicReportsBody,
  // Principal-specific widgets added for P2
  "principal-approvals-inbox": PrincipalApprovalsInboxBody,
  "principal-live-classes": PrincipalLiveClassesBody,
  "principal-admissions-awaiting": PrincipalAdmissionsAwaitingBody,
  "principal-results-awaiting": PrincipalResultsAwaitingBody,
  "principal-alerts": PrincipalAlertsBody,
  "principal-recent-admissions": PrincipalRecentAdmissionsBody,
  "principal-enrolment-chart": PrincipalEnrolmentChartBody,
  "principal-class-monitor": PrincipalClassMonitorBody,
  "principal-attendance-alerts": PrincipalAttendanceAlertsBody,
  "principal-upcoming-exams": PrincipalUpcomingExamsBody,
  "principal-draft-courses": PrincipalDraftCoursesBody,
  "principal-approval-tracking": PrincipalApprovalTrackingBody,
  "principal-quick-exports": PrincipalQuickExportsBody,
  "principal-saved-reports": PrincipalSavedReportsBody,
};

/* ═══════════════════════════════════════════════
   PRINCIPAL WIDGETS (P2)
   ═══════════════════════════════════════════════ */

/* principal-approvals-inbox (General tab) */
async function PrincipalApprovalsInboxBody({ userId, fullPageHref }: WidgetBodyProps) {
  // Query approvals awaiting the Principal (SUBMITTED or IN_REVIEW, not yet forwarded to Director)
  const items = await db.approvalRequest.findMany({
    where: {
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
      decidedById: null,
    },
    include: { initiator: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  
  const href = fullPageHref ?? "/principal/approvals-inbox";
  if (!items.length) {
    return <p className="dashboard-widget-empty">No items awaiting your decision</p>;
  }
  
  const ageStr = (date: Date) => {
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    return days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
  };
  
  return (
    <>
      {items.map((item) => (
        <ListRow
          key={item.id}
          href={`${href}/${item.id}`}
          icon={<ClipboardList size={16} />}
          date={ageStr(item.createdAt)}
        >
          {item.type.replace(/_/g, " ")} from {item.initiator?.name ?? "Admin"}
        </ListRow>
      ))}
      {items.length >= 5 && <ViewMoreLink href={href}>View all approvals</ViewMoreLink>}
    </>
  );
}

/* principal-live-classes (General tab) */
async function PrincipalLiveClassesBody({ fullPageHref }: WidgetBodyProps) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  const classes = await db.liveClass.findMany({
    where: {
      scheduledAt: { gte: todayStart, lte: todayEnd },
      status: { in: ["SCHEDULED", "LIVE"] },
    },
    include: {
      tutor:  { select: { name: true } },
      course: { select: { title: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 5,
  });
  
  const href = fullPageHref ?? "/principal/timetable";
  if (!classes.length) {
    return <p className="dashboard-widget-empty">No classes scheduled today</p>;
  }
  
  return (
    <>
      {classes.map((cls) => (
        <ListRow
          key={cls.id}
          href={`${href}`}
          icon={<Calendar size={16} />}
          date={fmtTime(cls.scheduledAt)}
        >
          {cls.course?.title ?? "Untitled"} - {cls.tutor?.name ?? "No instructor"}
        </ListRow>
      ))}
      <ViewMoreLink href={href}>View timetable</ViewMoreLink>
    </>
  );
}

/* principal-admissions-awaiting (General tab) */
async function PrincipalAdmissionsAwaitingBody({ fullPageHref }: WidgetBodyProps) {
  const admissions = await db.approvalRequest.findMany({
    where: {
      type: "ADMISSION",
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
      decidedById: null,
    },
    include: {
      initiator: { select: { name: true } },
      student:   { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  
  const href = fullPageHref ?? "/principal/admissions";
  if (!admissions.length) {
    return <p className="dashboard-widget-empty">No admissions awaiting approval</p>;
  }
  
  return (
    <>
      {admissions.map((adm) => (
        <ListRow
          key={adm.id}
          href={`${href}/${adm.id}`}
          icon={<Users size={16} />}
        >
          {adm.student?.name ?? "Student application"}
        </ListRow>
      ))}
      <ViewMoreLink href={href}>View all admissions</ViewMoreLink>
    </>
  );
}

/* principal-results-awaiting (General tab) */
async function PrincipalResultsAwaitingBody({ fullPageHref }: WidgetBodyProps) {
  const results = await db.approvalRequest.findMany({
    where: {
      type: "RESULTS_PUBLICATION",
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
      decidedById: null,
    },
    include: {
      initiator: { select: { name: true } },
      course:    { select: { title: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  
  const href = fullPageHref ?? "/principal/results";
  if (!results.length) {
    return <p className="dashboard-widget-empty">No results awaiting review</p>;
  }
  
  return (
    <>
      {results.map((result) => (
        <ListRow
          key={result.id}
          href={`${href}/${result.id}`}
          icon={<ClipboardCheck size={16} />}
        >
          {result.course?.title ?? "Results"} from {result.initiator?.name ?? "Instructor"}
        </ListRow>
      ))}
      <ViewMoreLink href={href}>View all results</ViewMoreLink>
    </>
  );
}

/* principal-alerts (General tab) */
async function PrincipalAlertsBody({ fullPageHref }: WidgetBodyProps) {
  // Example alerts: low attendance, storage over 80%, exams starting soon
  const [lowAttendance, storagePercent, upcomingExams] = await Promise.all([
    db.enrolment.count({
      where: {
        // placeholder: would need attendance calculation
        status: "ACTIVE",
      },
    }),
    // Placeholder storage check
    Promise.resolve(65),
    db.exam.count({
      where: {
        startWindowAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
      },
    }),
  ]);
  
  const href = fullPageHref ?? "/principal/reports";
  const alerts = [];
  
  if (storagePercent > 80) {
    alerts.push({ icon: <AlertCircle size={16} />, text: `Storage at ${storagePercent}%`, href: "/principal/storage" });
  }
  if (upcomingExams > 0) {
    alerts.push({ icon: <Clock size={16} />, text: `${upcomingExams} exams starting soon`, href: "/principal/examinations" });
  }
  
  if (!alerts.length) {
    return <p className="dashboard-widget-empty">No alerts</p>;
  }
  
  return (
    <>
      {alerts.map((alert, i) => (
        <ListRow key={i} href={alert.href} icon={alert.icon}>
          {alert.text}
        </ListRow>
      ))}
    </>
  );
}

/* principal-recent-admissions (General tab) */
async function PrincipalRecentAdmissionsBody({ fullPageHref }: WidgetBodyProps) {
  const recentAdmissions = await db.user.findMany({
    where: {
      role: "STUDENT",
      createdAt: { gte: new Date(Date.now() - 14 * 86400000) },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, studentNumber: true, createdAt: true, status: true },
  });
  
  const href = fullPageHref ?? "/principal/admissions";
  if (!recentAdmissions.length) {
    return <p className="dashboard-widget-empty">No recent admissions</p>;
  }
  
  return (
    <>
      {recentAdmissions.map((student) => (
        <ListRow
          key={student.id}
          href={`${href}/${student.id}`}
          icon={<Users size={16} />}
          date={fmtDate(student.createdAt)}
        >
          {student.name} ({student.studentNumber}) - {student.status}
        </ListRow>
      ))}
      <ViewMoreLink href={href}>View all admissions</ViewMoreLink>
    </>
  );
}

/* principal-enrolment-chart (Academics tab) */
async function PrincipalEnrolmentChartBody({ fullPageHref }: WidgetBodyProps) {
  const enrolments = await db.enrolment.groupBy({
    by: ["courseId"],
    where: { status: { in: ["ACTIVE", "PARTIALLY_PAID"] } },
    _count: { id: true },
  });
  
  const courses = await db.course.findMany({
    where: { id: { in: enrolments.map((e) => e.courseId).filter((id): id is string => id !== null) } },
    select: { id: true, title: true, courseCode: true },
  });
  
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  
  const href = fullPageHref ?? "/principal/students";
  if (!enrolments.length) {
    return <p className="dashboard-widget-empty">No enrolments</p>;
  }
  
  return (
    <>
      {enrolments.slice(0, 5).map((enrol) => {
        const course = enrol.courseId ? courseMap.get(enrol.courseId) : null;
        return (
          <ListRow key={enrol.courseId ?? "null"} href={href} icon={<GraduationCap size={16} />}>
            {course?.courseCode ?? "Unknown"}: {enrol._count.id} students
          </ListRow>
        );
      })}
      <ViewMoreLink href={href}>View all students</ViewMoreLink>
    </>
  );
}

/* principal-class-monitor (Academics tab) */
async function PrincipalClassMonitorBody({ fullPageHref }: WidgetBodyProps) {
  const liveClasses = await db.liveClass.findMany({
    where: { status: "LIVE" },
    include: {
      tutor:  { select: { name: true } },
      course: { select: { title: true } },
    },
    take: 5,
  });
  
  const href = fullPageHref ?? "/principal/timetable";
  if (!liveClasses.length) {
    return <p className="dashboard-widget-empty">No live classes</p>;
  }
  
  return (
    <>
      {liveClasses.map((cls) => (
        <ListRow key={cls.id} href={href} icon={<Video size={16} />}>
          {cls.course?.title ?? "Class"} - {cls.tutor?.name ?? "No instructor"}
        </ListRow>
      ))}
    </>
  );
}

/* principal-attendance-alerts (Academics tab) */
async function PrincipalAttendanceAlertsBody({ fullPageHref }: WidgetBodyProps) {
  // Placeholder: would need actual attendance calculation
  const href = fullPageHref ?? "/principal/attendance";
  return <p className="dashboard-widget-empty">No attendance alerts</p>;
}

/* principal-upcoming-exams (Academics tab) */
async function PrincipalUpcomingExamsBody({ fullPageHref }: WidgetBodyProps) {
  const upcomingExams = await db.exam.findMany({
    where: {
      startWindowAt: { gte: new Date(), lte: new Date(Date.now() + 14 * 86400000) },
    },
    include: { course: { select: { title: true } } },
    orderBy: { startWindowAt: "asc" },
    take: 5,
  });
  
  const href = fullPageHref ?? "/principal/examinations";
  if (!upcomingExams.length) {
    return <p className="dashboard-widget-empty">No upcoming exams</p>;
  }
  
  return (
    <>
      {upcomingExams.map((exam) => (
        <ListRow
          key={exam.id}
          href={`${href}`}
          icon={<ClipboardCheck size={16} />}
          date={exam.startWindowAt ? fmtDate(exam.startWindowAt) : undefined}
        >
          {exam.course?.title ?? "Exam"} - {exam.title}
        </ListRow>
      ))}
      <ViewMoreLink href={href}>View all exams</ViewMoreLink>
    </>
  );
}

/* principal-draft-courses (Academics tab) */
async function PrincipalDraftCoursesBody({ fullPageHref }: WidgetBodyProps) {
  const draftCourses = await db.course.findMany({
    where: { status: "DRAFT" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, courseCode: true, createdAt: true },
  });
  
  const href = fullPageHref ?? "/principal/programmes";
  if (!draftCourses.length) {
    return <p className="dashboard-widget-empty">No draft courses</p>;
  }
  
  return (
    <>
      {draftCourses.map((course) => (
        <ListRow
          key={course.id}
          href={`${href}/${course.id}`}
          icon={<FileText size={16} />}
        >
          {course.courseCode ?? "N/A"} - {course.title}
        </ListRow>
      ))}
      <ViewMoreLink href={href}>View all programmes</ViewMoreLink>
    </>
  );
}

/* principal-approval-tracking (Approvals tab) */
async function PrincipalApprovalTrackingBody({ userId, fullPageHref }: WidgetBodyProps) {
  // Items the Principal forwarded to the Director (reviewer = Principal)
  const tracking = await db.approvalRequest.findMany({
    where: {
      reviewerId: userId,
      status: { in: ["SUBMITTED", "IN_REVIEW"] },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  
  const href = fullPageHref ?? "/principal/approval-tracking";
  if (!tracking.length) {
    return <p className="dashboard-widget-empty">Nothing awaiting Director approval</p>;
  }
  
  const ageStr = (date: Date) => {
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    return days === 0 ? "today" : days === 1 ? "1 day" : `${days} days`;
  };
  
  return (
    <>
      {tracking.map((item) => (
        <ListRow
          key={item.id}
          href={`${href}/${item.id}`}
          icon={<ClipboardList size={16} />}
          date={ageStr(item.createdAt)}
        >
          {item.type.replace(/_/g, " ")} - {item.status}
        </ListRow>
      ))}
      <ViewMoreLink href={href}>View all tracking</ViewMoreLink>
    </>
  );
}

/* principal-quick-exports (Reports tab) */
async function PrincipalQuickExportsBody({ fullPageHref }: WidgetBodyProps) {
  const href = fullPageHref ?? "/principal/reports";
  return (
    <>
      <ListRow href={`${href}?export=students`} icon={<FileSearch size={16} />}>
        Export students (CSV)
      </ListRow>
      <ListRow href={`${href}?export=attendance`} icon={<FileSearch size={16} />}>
        Export attendance (CSV)
      </ListRow>
      <ListRow href={`${href}?export=results`} icon={<FileSearch size={16} />}>
        Export results (CSV)
      </ListRow>
      <ListRow href={`${href}?export=finance`} icon={<FileSearch size={16} />}>
        Export finance (CSV)
      </ListRow>
    </>
  );
}

/* principal-saved-reports (Reports tab) */
async function PrincipalSavedReportsBody({ fullPageHref }: WidgetBodyProps) {
  const href = fullPageHref ?? "/principal/reports";
  return <p className="dashboard-widget-empty">No saved reports</p>;
}
