"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  status: string;
}

interface Student {
  id: string;
  name: string;
  email: string | null;
  studentNumber: string | null;
  avatarUrl: string | null;
}

interface Instructor {
  id: string;
  name: string;
  email: string | null;
}

interface Enrolment {
  id: string;
  userId: string;
  status: string;
  user: User;
}

interface Intake {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  isOpen: boolean;
  enrolments: Enrolment[];
}

interface CoTutor {
  tutor: { id: string; name: string };
}

interface Course {
  id: string;
  title: string;
  courseCode: string | null;
  status: string;
  tutor: { id: string; name: string };
  coTutors: CoTutor[];
  intakes: Intake[];
}

interface Props {
  courses: Course[];
  students: Student[];
  instructors: Instructor[];
  canEdit: boolean;
}

export default function ClassesClient({ courses, students, instructors, canEdit }: Props) {
  const router = useRouter();
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [expandedIntake, setExpandedIntake] = useState<string | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ courseId: string; intakeId: string } | null>(
    null,
  );
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleAssignStudents = (courseId: string, intakeId: string) => {
    setAssignTarget({ courseId, intakeId });
    setSelectedStudents([]);
    setSearchQuery("");
    setShowAssignDialog(true);
  };

  const handleSubmitAssignment = async () => {
    if (!assignTarget || selectedStudents.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/principal/enrolments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: assignTarget.courseId,
          intakeId: assignTarget.intakeId,
          studentIds: selectedStudents,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to assign students");
      }

      router.refresh();
      setShowAssignDialog(false);
      setAssignTarget(null);
      setSelectedStudents([]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalEnrolments = courses.reduce(
    (sum, c) => sum + c.intakes.reduce((iSum, i) => iSum + i.enrolments.length, 0),
    0,
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Classes & Groups</h1>
        <p className="text-sm text-gray-500 mt-1">
          Student cohorts by programme and intake ({totalEnrolments} total enrolments)
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-gray-500 text-sm">No programmes configured yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const totalStudents = course.intakes.reduce(
              (sum, i) => sum + i.enrolments.length,
              0,
            );
            const isExpanded = expandedCourse === course.id;

            return (
              <div key={course.id} className="card">
                <div
                  className="flex items-start justify-between gap-4 cursor-pointer"
                  onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-semibold text-lg">{course.title}</h2>
                      {course.courseCode && (
                        <span className="font-mono text-xs text-gray-400">
                          {course.courseCode}
                        </span>
                      )}
                      <span className="badge badge-neutral text-xs">{course.status}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      👤 Lead: {course.tutor.name}
                      {course.coTutors.length > 0 &&
                        ` + ${course.coTutors.length} co-instructor${course.coTutors.length > 1 ? "s" : ""}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      {course.intakes.length} intake{course.intakes.length !== 1 ? "s" : ""} •{" "}
                      {totalStudents} student{totalStudents !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button className="btn-ghost text-sm">{isExpanded ? "▼" : "▶"}</button>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    {course.intakes.length === 0 ? (
                      <p className="text-sm text-gray-400">No intakes configured.</p>
                    ) : (
                      course.intakes.map((intake) => {
                        const isIntakeExpanded = expandedIntake === intake.id;
                        return (
                          <div
                            key={intake.id}
                            className="border border-border rounded-lg p-4 bg-surface/30"
                          >
                            <div
                              className="flex items-start justify-between gap-4 cursor-pointer"
                              onClick={() =>
                                setExpandedIntake(isIntakeExpanded ? null : intake.id)
                              }
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium">{intake.label}</h3>
                                  <span
                                    className={`badge text-xs ${intake.isOpen ? "badge-success" : "badge-neutral"}`}
                                  >
                                    {intake.isOpen ? "Open" : "Closed"}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {new Date(intake.startDate).toLocaleDateString()} -{" "}
                                  {new Date(intake.endDate).toLocaleDateString()}
                                </p>
                                <p className="text-sm font-medium text-gray-700 mt-1">
                                  {intake.enrolments.length} student
                                  {intake.enrolments.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                              <div className="flex gap-2 items-center">
                                {canEdit && (
                                  <>
                                    <Link
                                      href={`/principal/intakes/${intake.id}/roster`}
                                      className="btn-ghost text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      View Roster
                                    </Link>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAssignStudents(course.id, intake.id);
                                      }}
                                      className="btn-ghost text-xs"
                                    >
                                      + Assign
                                    </button>
                                    <Link
                                      href={`/principal/intakes/${intake.id}/groups`}
                                      className="btn-ghost text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Groups
                                    </Link>
                                  </>
                                )}
                                <button className="btn-ghost text-sm">
                                  {isIntakeExpanded ? "▼" : "▶"}
                                </button>
                              </div>
                            </div>

                            {isIntakeExpanded && (
                              <div className="mt-4 pt-4 border-t border-border">
                                {intake.enrolments.length === 0 ? (
                                  <p className="text-sm text-gray-400 text-center py-4">
                                    No students enrolled yet.
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {intake.enrolments.map((enrolment) => (
                                      <div
                                        key={enrolment.id}
                                        className="flex items-center gap-2 p-2 border border-border rounded hover:bg-surface/50"
                                      >
                                        <div className="relative w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                                          {enrolment.user.avatarUrl ? (
                                            <Image
                                              src={enrolment.user.avatarUrl}
                                              alt={enrolment.user.name}
                                              fill
                                              className="object-cover"
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-gray-600">
                                              {enrolment.user.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .toUpperCase()
                                                .slice(0, 2)}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">
                                            {enrolment.user.name}
                                          </p>
                                          <p className="text-xs text-gray-400 truncate">
                                            {enrolment.user.status}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 card bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>ℹ About Classes & Groups:</strong>
        </p>
        <p className="text-sm text-blue-700 mt-1">
          A "class" is a cohort of students in a programme intake. Students are assigned
          individually or in bulk. Breakaway groups (default size 5) are auto-created during
          live practical sessions.
        </p>
      </div>

      {showAssignDialog && assignTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Assign Students</h2>
              <button onClick={() => setShowAssignDialog(false)} className="btn-ghost text-lg">
                ×
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search students by name, email, or student number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full"
              />
            </div>

            <p className="text-sm text-gray-600 mb-3">
              {selectedStudents.length} student{selectedStudents.length !== 1 ? "s" : ""}{" "}
              selected
            </p>

            <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No students found.</p>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = selectedStudents.includes(student.id);
                  return (
                    <div
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-surface/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4"
                      />
                      <div className="relative w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                        {student.avatarUrl ? (
                          <Image
                            src={student.avatarUrl}
                            alt={student.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-gray-600">
                            {student.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{student.name}</p>
                        <p className="text-xs text-gray-500">
                          {student.studentNumber ?? "No reg number"} • {student.email}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <button
                onClick={() => setShowAssignDialog(false)}
                className="btn-ghost"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAssignment}
                className="btn-primary"
                disabled={loading || selectedStudents.length === 0}
              >
                {loading
                  ? "Assigning..."
                  : `Assign ${selectedStudents.length} Student${selectedStudents.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
