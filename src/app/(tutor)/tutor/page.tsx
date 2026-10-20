import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { AlertCircle, ChevronRight, Users, ClipboardCheck, Video, FileText } from "lucide-react";
import {
  CalendarMeta,
  ClockMeta,
  DashboardWidgetVisibility,
  ListRow,
  MiniCard,
  ProfileCard,
  ViewMoreLink,
  Widget,
} from "@/components/ui/DashboardWidgets";
import { teachingCourseWhere } from "@/lib/teaching/scope";
import { formatCount } from "@/lib/dashboard/format";
import { DashboardTabBody } from "@/components/dashboard/DashboardTabBody";
import type { DashboardTab } from "@/lib/dashboard/widgets";

export const metadata = { title: "Tutor Dashboard" };

const VALID_TABS = new Set<string>([
  "general", "teaching", "students", "assessment", "support",
]);

export default async function TutorDashboardPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tab = searchParams.tab;
  if (tab && tab !== "general" && VALID_TABS.has(tab)) {
    return (
      <DashboardTabBody
        userId={session.user.id}
        role={session.user.role}
        tab={tab as DashboardTab}
      />
    );
  }
  const canViewContacts = can(session.user.role, "students.view.contacts");

  const [
    courses,
    upcomingClasses,
    pendingReviews,
    recentStudents,
    rollCallNeeded,
    recordingPending,
    pendingAssignment,
  ] = await Promise.all([
    db.course.findMany({
      where: teachingCourseWhere(session.user.id),
      include: { _count: { select: { enrolments: true } } },
    }),
    db.liveClass.findMany({
      where: {
        course: teachingCourseWhere(session.user.id),
        OR: [
          { scheduledAt: { gt: new Date() }, status: "SCHEDULED" },
          { status: "LIVE" },
        ],
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { course: { select: { title: true } } },
    }),
    db.examAttempt.count({
      where: {
        status: "SUBMITTED",
        exam: { course: teachingCourseWhere(session.user.id) },
      },
    }),
    db.enrolment.findMany({
      where: {
        status: { in: ["ACTIVE", "COMPLETED"] },
        user: { role: "STUDENT" },
        course: teachingCourseWhere(session.user.id),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            name: true,
            studentNumber: true,
            phone: canViewContacts,
            email: canViewContacts,
          },
        },
        course: { select: { title: true } },
      },
    }),
    // classes completed today with no roll call yet
    db.liveClass.findFirst({
      where: {
        course: teachingCourseWhere(session.user.id),
        status: "COMPLETED",
        attendance: { some: { startMark: null } },
        scheduledAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      select: { id: true, title: true },
    }),
    // classes whose recording is pending upload
    db.liveClass.count({
      where: {
        course: teachingCourseWhere(session.user.id),
        status: "COMPLETED",
        recordingEnabled: true,
        recordingStatus: "PENDING",
      },
    }),
    // published assignments awaiting grading
    db.assignmentSubmission.findFirst({
      where: {
        status: "SUBMITTED",
        assignment: { course: teachingCourseWhere(session.user.id) },
      },
      select: { id: true, assignment: { select: { title: true } } },
    }),
  ]);

  const enrolledTotal = courses.reduce(
    (sum, course) => sum + course._count.enrolments,
    0,
  );
  const sortedStudents = [...recentStudents].sort((left, right) => {
    const lastName = (name: string | null) =>
      (name ?? "").trim().split(/\s+/).at(-1)?.toLocaleLowerCase() ?? "";
    const byLastName = lastName(left.user.name).localeCompare(
      lastName(right.user.name),
    );
    return (
      byLastName || (left.user.name ?? "").localeCompare(right.user.name ?? "")
    );
  });
  const visibleClassCount =
    upcomingClasses.length >= 4 ? 4 : Math.min(upcomingClasses.length, 2);
  const visibleStudentCount =
    sortedStudents.length >= 4 ? 4 : Math.min(sortedStudents.length, 2);
  const visibleCourseCount =
    courses.length >= 4 ? 4 : Math.min(courses.length, 2);

  return (
    <div className="dashboard-role-content">
      <div className="dashboard-widget-grid dashboard-widget-masonry">
        <div className="dashboard-widget-column">
          <DashboardWidgetVisibility id="todos" tab="general">
            <Widget title="To Dos" href="/tutor/exams">
              {pendingReviews === 0 && !rollCallNeeded && recordingPending === 0 && !pendingAssignment ? (
                <p className="dashboard-widget-empty">You are all caught up.</p>
              ) : (
                <>
                  {rollCallNeeded && (
                    <ListRow href="/tutor/attendance" icon={<ClipboardCheck size={16} />}>
                      Take roll call for today&apos;s class: {rollCallNeeded.title}
                    </ListRow>
                  )}
                  {recordingPending > 0 && (
                    <ListRow href="/tutor/classes" icon={<Video size={16} />}>
                      {recordingPending === 1
                        ? "Add the recording link for 1 completed class"
                        : `Add recording links for ${recordingPending} completed classes`}
                    </ListRow>
                  )}
                  {pendingReviews > 0 && (
                    <ListRow href="/tutor/exams" icon={<AlertCircle size={16} />}>
                      {pendingReviews === 1
                        ? "1 exam submission awaits your review"
                        : `${pendingReviews} exam submissions await your review`}
                    </ListRow>
                  )}
                  {pendingAssignment && (
                    <ListRow href="/tutor/exams" icon={<FileText size={16} />}>
                      Mark assignment: {pendingAssignment.assignment.title}
                    </ListRow>
                  )}
                </>
              )}
            </Widget>
          </DashboardWidgetVisibility>
          <DashboardWidgetVisibility id="upcoming-classes" tab="general">
            <Widget
              title="Upcoming Classes"
              href="/tutor/classes"
              footer={
                upcomingClasses.length > visibleClassCount ? (
                  <ViewMoreLink href="/tutor/classes">
                    View {upcomingClasses.length - visibleClassCount} more
                  </ViewMoreLink>
                ) : undefined
              }
            >
              {upcomingClasses.length === 0 ? (
                <p className="dashboard-widget-empty">
                  No upcoming classes scheduled.
                </p>
              ) : (
                <div className="dashboard-mini-grid">
                  {upcomingClasses.slice(0, visibleClassCount).map((cls) => {
                    const date = new Date(cls.scheduledAt);
                    const dateKey = (value: Date) =>
                      new Intl.DateTimeFormat("en-CA", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        timeZone: "Africa/Kampala",
                      }).format(value);
                    const todayKey = dateKey(new Date());
                    const classDayKey = dateKey(date);
                    const dayDifference = Math.round(
                      (new Date(`${classDayKey}T00:00:00Z`).getTime() -
                        new Date(`${todayKey}T00:00:00Z`).getTime()) /
                        86_400_000,
                    );
                    const classStatus =
                      cls.status === "LIVE"
                        ? { label: "Live now", tone: "live" as const }
                        : dayDifference <= 0
                          ? { label: "Today", tone: "today" as const }
                          : {
                              label: `In ${dayDifference} days`,
                              tone: "soon" as const,
                            };
                    return (
                      <MiniCard
                        key={cls.id}
                        title={cls.title}
                        subtitle={cls.course.title}
                        href="/tutor/classes"
                        actionLabel="Manage"
                        status={classStatus}
                      >
                        <CalendarMeta>
                          {date
                            .toLocaleDateString("en-GB", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                              timeZone: "Africa/Kampala",
                            })
                            .replace(",", "")}
                        </CalendarMeta>
                        <ClockMeta timeZone="East Africa Time">
                          {date.toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                            timeZone: "Africa/Kampala",
                          })}{" "}
                          to{" "}
                          {new Date(
                            date.getTime() + cls.durationMin * 60_000,
                          ).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                            timeZone: "Africa/Kampala",
                          })}
                        </ClockMeta>
                      </MiniCard>
                    );
                  })}
                </div>
              )}
            </Widget>
          </DashboardWidgetVisibility>
          <DashboardWidgetVisibility id="my-students" tab="general">
            <Widget
              title="My Students"
              href="/tutor/students"
              footer={
                sortedStudents.length > visibleStudentCount ? (
                  <ViewMoreLink href="/tutor/students">
                    View {sortedStudents.length - visibleStudentCount} more
                  </ViewMoreLink>
                ) : undefined
              }
            >
              {recentStudents.length === 0 ? (
                <p className="dashboard-widget-empty">
                  No students enrolled yet.
                </p>
              ) : (
                <div className="dashboard-profile-grid">
                  {sortedStudents.slice(0, visibleStudentCount).map((enr) => (
                    <ProfileCard
                      key={enr.id}
                      name={(() => {
                        const parts = (enr.user.name ?? "Student").trim().split(/\s+/).filter(Boolean);
                        return parts.length > 1 ? `${parts.at(-1)} ${parts.slice(0, -1).join(" ")}` : (parts[0] ?? "Student");
                      })()}
                      id={enr.user.studentNumber ?? undefined}
                      phone={
                        canViewContacts
                          ? (enr.user.phone ?? undefined)
                          : undefined
                      }
                      email={
                        canViewContacts
                          ? (enr.user.email ?? undefined)
                          : undefined
                      }
                      status={
                        enr.status === "COMPLETED" ? "Completed" : "Active"
                      }
                      href="/tutor/students"
                    />
                  ))}
                </div>
              )}
            </Widget>
          </DashboardWidgetVisibility>
          {courses.length > 0 && (
            <DashboardWidgetVisibility id="my-courses" tab="general">
              <Widget
                title="My Courses"
                href="/tutor/courses"
                footer={
                  courses.length > visibleCourseCount ? (
                    <ViewMoreLink href="/tutor/courses">
                      View {courses.length - visibleCourseCount} more
                    </ViewMoreLink>
                  ) : undefined
                }
              >
                <div className="dashboard-mini-grid">
                  {courses.slice(0, visibleCourseCount).map((c) => (
                    <MiniCard
                      key={c.id}
                      title={c.title}
                      subtitle={formatCount(c._count.enrolments, "student")}
                      subtitleIcon={<Users size={16} aria-hidden="true" />}
                      href="/tutor/courses"
                    />
                  ))}
                </div>
              </Widget>
            </DashboardWidgetVisibility>
          )}
        </div>
        <div className="dashboard-widget-column">
          <DashboardWidgetVisibility id="at-a-glance" tab="general">
            <Widget title="At a glance">
              <div className="dashboard-glance-grid">
                <a href="/tutor/courses">
                  <span>Courses</span>
                  <strong>{courses.length}</strong>
                  <ChevronRight size={16} />
                </a>
                <a href="/tutor/students">
                  <span>Students</span>
                  <strong>{enrolledTotal}</strong>
                  <ChevronRight size={16} />
                </a>
                <a href="/tutor/classes">
                  <span>Classes</span>
                  <strong>{upcomingClasses.length}</strong>
                  <ChevronRight size={16} />
                </a>
                <a href="/tutor/exams">
                  <span>Reviews</span>
                  <strong>{pendingReviews}</strong>
                  <ChevronRight size={16} />
                </a>
              </div>
            </Widget>
          </DashboardWidgetVisibility>
        </div>
      </div>
    </div>
  );
}
