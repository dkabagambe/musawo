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
  UsersMeta,
} from "@/components/ui/DashboardWidgets";
import {
  AlertCircle,
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
  Building2,
  ShieldCheck,
  Settings,
  FileSearch,
} from "lucide-react";
import type { UserRole, Prisma } from "@prisma/client";

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
      where: { userId, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] } },
      select: { courseId: true },
    });
    const courseIds = enrolments.map((e) => e.courseId);
    if (!courseIds.length) return <Empty>Enrol in a course to get started.</Empty>;
    const [exams, assignments] = await Promise.all([
      db.exam.findMany({
        where: { courseId: { in: courseIds }, status: "PUBLISHED" },
        take: 3,
        select: { id: true, title: true },
      }),
      db.assignment.findMany({
        where: { courseId: { in: courseIds }, status: "PUBLISHED", dueDate: { gte: new Date() } },
        take: 3,
        select: { id: true, title: true, dueDate: true },
      }),
    ]);
    if (!exams.length && !assignments.length)
      return <Empty>You are all caught up.</Empty>;
    return (
      <>
        {exams.map((exam) => (
          <ListRow key={exam.id} href="/dashboard/gradebook" icon={<ClipboardList size={16} />}>
            Upcoming exam: {exam.title}
          </ListRow>
        ))}
        {assignments.map((a) => (
          <ListRow key={a.id} href="/dashboard/assignments" icon={<FileText size={16} />} date={a.dueDate ? fmtDay(a.dueDate) : undefined}>
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
  if (pendingReviews === 0 && pendingRecordings === 0 && pendingAttendance === 0)
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
async function MetricsBody({ userId, role }: WidgetBodyProps) {
  const teachingWhere = teachingCourseWhere(userId);
  const [courses, students, classes, reviews] = await Promise.all([
    db.course.count({ where: teachingWhere }),
    db.enrolment.count({
      where: { course: teachingWhere, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] } },
    }),
    db.liveClass.count({
      where: {
        course: teachingWhere,
        OR: [{ scheduledAt: { gt: new Date() }, status: "SCHEDULED" }, { status: "LIVE" }],
      },
    }),
    db.examAttempt.count({ where: { status: "SUBMITTED", exam: { course: teachingWhere } } }),
  ]);
  return (
    <div className="dashboard-glance-grid">
      <a href="/tutor/courses"><span>Courses</span><strong>{courses}</strong><Users size={16} /></a>
      <a href="/tutor/students"><span>Students</span><strong>{students}</strong><Users size={16} /></a>
      <a href="/tutor/classes"><span>Classes</span><strong>{classes}</strong><Users size={16} /></a>
      <a href="/tutor/exams"><span>Reviews</span><strong>{reviews}</strong><Users size={16} /></a>
    </div>
  );
}

/* status-list  (student general - Holds) */
async function HoldsBody({ userId, fullPageHref }: WidgetBodyProps) {
  const enrolments = await db.enrolment.findMany({
    where: { userId, status: { in: ["PENDING_PAYMENT", "OVERDUE"] } },
    include: { course: { select: { title: true } } },
    take: 5,
  });
  if (!enrolments.length) return <Empty>No holds on your account.</Empty>;
  const href = fullPageHref ?? "/dashboard/payments";
  return (
    <>
      {enrolments.map((enr) => (
        <ListRow key={enr.id} href={href} icon={<AlertCircle size={16} />}>
          {enr.status === "OVERDUE"
            ? `Overdue payment: ${enr.course.title}`
            : `Complete payment for ${enr.course.title}`}
        </ListRow>
      ))}
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
          course: { enrolments: { some: { userId, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } } } },
        }
      : {
          course: teachingCourseWhere(userId),
          OR: [{ scheduledAt: { gt: new Date() }, status: "SCHEDULED" }, { status: "LIVE" }],
        };
  const upcoming = await db.liveClass.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
    take: 6,
    include: { course: { select: { title: true } } },
  });
  if (!upcoming.length) return <Empty>No upcoming classes scheduled.</Empty>;
  const visible = upcoming.slice(0, 4);
  const href = fullPageHref ?? (role === "STUDENT" ? "/dashboard/timetable" : "/tutor/classes");
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
async function CourseCardsBody({ userId, role, fullPageHref }: WidgetBodyProps) {
  const isStudent = role === "STUDENT";
  const enrolments = isStudent
    ? await db.enrolment.findMany({
        where: { userId, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] } },
        include: { course: { select: { title: true, slug: true, blocks: { select: { _count: { select: { lessons: true } } } } } } },
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
  if (isStudent && !enrolments.length) return <Empty>Browse our courses and enrol today.</Empty>;
  if (!isStudent && !courses.length) return <Empty>No courses assigned yet.</Empty>;
  const href = fullPageHref ?? (isStudent ? "/dashboard/courses" : "/tutor/courses");
  if (isStudent) {
    const courseIds = enrolments.map((e) => e.courseId);
    const allProgress = await db.lessonProgress.findMany({
      where: { userId, completedAt: { not: null }, lesson: { block: { courseId: { in: courseIds } } } },
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
            const total = enr.course.blocks.reduce((s, b) => s + b._count.lessons, 0);
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
  const href = fullPageHref ?? (isStudent ? "/dashboard/notifications" : "/tutor/announcements");
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

/* student-cards  (instructor - My Students) */
async function StudentCardsBody({ userId, role, fullPageHref }: WidgetBodyProps) {
  const canViewContacts = can(role, "students.view.contacts");
  const recent = await db.enrolment.findMany({
    where: { status: { in: ["ACTIVE", "COMPLETED", "PARTIALLY_PAID", "OVERDUE"] }, course: teachingCourseWhere(userId) },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, studentNumber: true, phone: canViewContacts, email: canViewContacts } },
    },
  });
  if (!recent.length) return <Empty>No students enrolled yet.</Empty>;
  const sorted = [...recent].sort((a, b) => {
    const ln = (n: string | null) => (n ?? "").trim().split(/\s+/).at(-1)?.toLocaleLowerCase() ?? "";
    return ln(a.user.name).localeCompare(ln(b.user.name)) || (a.user.name ?? "").localeCompare(b.user.name ?? "");
  });
  const visible = sorted.slice(0, 4);
  const href = fullPageHref ?? "/tutor/students";
  return (
    <>
      <div className="dashboard-profile-grid">
        {visible.map((enr) => (
          <ProfileCard
            key={enr.id}
            name={(enr.user.name ?? "Student").trim().split(/\s+/).join(" ")}
            id={enr.user.studentNumber ?? undefined}
            phone={canViewContacts ? (enr.user.phone ?? undefined) : undefined}
            email={canViewContacts ? (enr.user.email ?? undefined) : undefined}
            status={enr.status === "COMPLETED" ? "Completed" : "Active"}
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
    where: { userId, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] } },
    include: { course: { select: { title: true, slug: true, blocks: { select: { _count: { select: { lessons: true } } } } } } },
    take: 6,
  });
  if (!enrolments.length) return <Empty>No active courses yet.</Empty>;
  const courseIds = enrolments.map((e) => e.courseId);
  const allProgress = await db.lessonProgress.findMany({
    where: { userId, completedAt: { not: null }, lesson: { block: { courseId: { in: courseIds } } } },
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
        const total = enr.course.blocks.reduce((s, b) => s + b._count.lessons, 0);
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
    where: { userId, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] } },
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
    select: { id: true, score: true, maxScore: true, passed: true, submittedAt: true, exam: { select: { title: true } } },
  });
  if (!attempts.length) return <Empty>No results yet.</Empty>;
  const visible = attempts.slice(0, 5);
  const href = fullPageHref ?? "/dashboard/results";
  return (
    <>
      {visible.map((att) => {
        const pct = att.maxScore ? Math.round(((att.score ?? 0) / att.maxScore) * 100) : 0;
        return (
          <ListRow key={att.id} href={href} icon={att.passed ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}>
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
    include: { liveClass: { select: { title: true, course: { select: { title: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  if (!attendance.length) return <Empty>Your log book is empty. Attend live classes to build it.</Empty>;
  const visible = attendance.slice(0, 5);
  const href = fullPageHref ?? "/dashboard/courses";
  return (
    <>
      {visible.map((att) => (
        <ListRow key={att.id} href={href} icon={<CheckCircle2 size={16} />} date={att.joinedAt ? fmtDay(att.joinedAt) : undefined}>
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
async function SimulationsBody({ userId, fullPageHref }: WidgetBodyProps) {
  return (
    <Empty>
      Simulations are being prepared for each course topic. Check back soon.
    </Empty>
  );
}

/* fee-summary  (student finance - Fees Summary) */
async function FeeSummaryBody({ userId, fullPageHref }: WidgetBodyProps) {
  const enrolments = await db.enrolment.findMany({
    where: { userId, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE", "PENDING_PAYMENT"] } },
    include: { course: { select: { title: true } } },
    take: 6,
  });
  if (!enrolments.length) return <Empty>No fee records yet.</Empty>;
  const visible = enrolments.slice(0, 5);
  const href = fullPageHref ?? "/dashboard/payments";
  return (
    <>
      {visible.map((enr) => {
        const balance = enr.totalAmountUgx - enr.paidAmountUgx;
        return (
          <ListRow key={enr.id} href={href} icon={<Wallet size={16} />}>
            {enr.course.title}: {fmtUGX(enr.paidAmountUgx)} of {fmtUGX(enr.totalAmountUgx)}
            {balance > 0 ? ` (balance ${fmtUGX(balance)})` : " (cleared)"}
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
  const enrolmentIds = await db.enrolment.findMany({ where: { userId }, select: { id: true } });
  const ids = enrolmentIds.map((e) => e.id);
  if (!ids.length) return <Empty>No payments yet.</Empty>;
  const payments = await db.payment.findMany({
    where: { enrolmentId: { in: ids } },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true, amount: true, status: true, method: true, createdAt: true, enrolment: { select: { course: { select: { title: true } } } } },
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
  const enrolmentIds = await db.enrolment.findMany({ where: { userId }, select: { id: true } });
  const ids = enrolmentIds.map((e) => e.id);
  if (!ids.length) return <Empty>No receipts yet.</Empty>;
  const payments = await db.payment.findMany({
    where: { enrolmentId: { in: ids }, status: "COMPLETED", receiptNumber: { not: null } },
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
        <ListRow key={pay.id} href={href} icon={<Receipt size={16} />} date={pay.paidAt ? fmtDay(pay.paidAt) : undefined}>
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
    where: { userId, status: { in: ["PENDING_PAYMENT", "PARTIALLY_PAID", "OVERDUE"] } },
    include: { course: { select: { title: true } } },
    take: 5,
  });
  if (!enrolments.length) return <Empty>No outstanding payments.</Empty>;
  const href = fullPageHref ?? "/dashboard/payments";
  return (
    <>
      {enrolments.map((enr) => {
        const balance = enr.totalAmountUgx - enr.paidAmountUgx;
        return (
          <ListRow key={enr.id} href={href} icon={<Wallet size={16} />}>
            Pay {fmtUGX(balance)} for {enr.course.title}
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
      course: { enrolments: { some: { userId, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } } } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 6,
    include: { course: { select: { title: true } } },
  });
  if (!upcoming.length) return <Empty>No upcoming classes in your timetable.</Empty>;
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
      course: { enrolments: { some: { userId, status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED"] } } } },
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
        <ListRow key={cls.id} href={href} icon={<Video size={16} />} date={fmtDay(cls.scheduledAt)}>
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

/* attendance  (student classes - Attendance) */
async function AttendanceBody({ userId, fullPageHref }: WidgetBodyProps) {
  const records = await db.attendance.findMany({
    where: { userId, startMark: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { liveClass: { select: { title: true } } },
  });
  if (!records.length) return <Empty>No attendance records yet.</Empty>;
  const visible = records.slice(0, 5);
  const href = fullPageHref ?? "/dashboard/courses";
  return (
    <>
      {visible.map((att) => (
        <ListRow key={att.id} href={href} date={att.joinedAt ? fmtDay(att.joinedAt) : undefined}>
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
    where: { status: "SUBMITTED", exam: { course: teachingCourseWhere(userId) } },
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
    select: { id: true, fullName: true, status: true, createdAt: true, course: { select: { title: true } } },
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
    where: { role: "STUDENT", status: { in: ["PENDING_ACCEPTANCE", "DETAILS_DISPUTED"] } },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true, name: true, studentNumber: true, status: true, email: true },
  });
  if (!students.length) return <Empty>No students pending acceptance.</Empty>;
  const visible = students.slice(0, 5);
  const href = fullPageHref ?? "/registrar/students";
  return (
    <>
      {visible.map((stu) => (
        <ListRow key={stu.id} href={href} icon={<Users size={16} />}>
          {stu.name} ({stu.status === "DETAILS_DISPUTED" ? "details disputed" : "pending"})
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
    include: { user: { select: { name: true, studentNumber: true } }, course: { select: { title: true } } },
  });
  if (!enrolments.length) return <Empty>No graduands yet.</Empty>;
  const visible = enrolments.slice(0, 5);
  const href = fullPageHref ?? "/registrar/graduands";
  return (
    <>
      {visible.map((enr) => (
        <ListRow key={enr.id} href={href} icon={<GraduationCap size={16} />}>
          {(enr.user.name ?? "Student").trim().split(/\s+/).join(" ")} - {enr.course.title}
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
async function ApprovalListBody({ fullPageHref }: WidgetBodyProps) {
  const approvals = await db.approvalRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { initiator: { select: { name: true } } },
  });
  if (!approvals.length) return <Empty>No pending approvals.</Empty>;
  const visible = approvals.slice(0, 5);
  const href = fullPageHref ?? "/director/approvals";
  return (
    <>
      {visible.map((apr) => (
        <ListRow key={apr.id} href={href} icon={<ShieldCheck size={16} />} date={fmtDay(apr.createdAt)}>
          {apr.type.toLowerCase().replace(/_/g, " ")}
          {apr.amount ? ` (${fmtUGX(apr.amount)})` : ""}
        </ListRow>
      ))}
      {approvals.length > visible.length && (
        <ViewMoreLink href={href}>
          View {approvals.length - visible.length} more
        </ViewMoreLink>
      )}
    </>
  );
}

/* financial-reports  (finance/board/auditor reconciliation/reports - Financial Reports) */
async function FinancialReportsBody({ fullPageHref }: WidgetBodyProps) {
  const [totalPaid, pendingCount, pendingApprovalCount] = await Promise.all([
    db.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED" } }),
    db.payment.count({ where: { status: "PENDING" } }),
    db.payment.count({ where: { status: "PENDING_APPROVAL" } }),
  ]);
  const href = fullPageHref ?? "/finance/payments";
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
            name={(s.name ?? "Staff").trim().split(/\s+/).join(" ")}
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
   SYSTEM / AUDITOR WIDGETS
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
        <ListRow key={log.id} href={href} icon={<FileSearch size={16} />} date={fmtDay(log.createdAt)}>
          {log.action.toLowerCase().replace(/_/g, " ")} by {log.actor?.name ?? "system"}
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
};
