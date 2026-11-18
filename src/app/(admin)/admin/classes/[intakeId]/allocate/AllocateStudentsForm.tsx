"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Student = {
  id: string;
  name: string;
  email: string;
  registrationNumber: string | null;
};

type EnrolledStudent = {
  id: string;
  userId: string;
  user: Student;
};

type Props = {
  intakeId: string;
  courseId: string;
  availableStudents: Student[];
  enrolledStudents: EnrolledStudent[];
  availableSeats: number;
};

export default function AllocateStudentsForm({
  intakeId,
  courseId,
  availableStudents,
  enrolledStudents,
  availableSeats,
}: Props) {
  const router = useRouter();
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [moveStudentId, setMoveStudentId] = useState("");
  const [moveReason, setMoveReason] = useState("");

  const filteredAvailable = availableStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.registrationNumber &&
        s.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredAvailable.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredAvailable.map((s) => s.id));
    }
  };

  const handleAllocate = async () => {
    if (selectedStudents.length === 0) {
      setError("Please select at least one student.");
      return;
    }

    if (selectedStudents.length > availableSeats) {
      setError(
        `Cannot allocate ${selectedStudents.length} students. Only ${availableSeats} seats available.`,
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/classes/${intakeId}/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedStudents,
          courseId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to allocate students");
      }

      router.push(`/admin/classes/${intakeId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveStudent = async (enrolmentId: string) => {
    if (!moveReason.trim()) {
      setError("Please provide a reason for moving the student.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/classes/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrolmentId,
          newIntakeId: null, // Remove from this intake
          reason: moveReason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to move student");
      }

      setMoveStudentId("");
      setMoveReason("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Currently Enrolled */}
      {enrolledStudents.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Currently Enrolled ({enrolledStudents.length})</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {enrolledStudents.map((enrolment) => {
              const student = enrolment.user;
              const isMoving = moveStudentId === enrolment.id;

              return (
                <div
                  key={enrolment.id}
                  className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <div className="flex-1">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-gray-500">
                      {student.registrationNumber} - {student.email}
                    </p>
                  </div>
                  {!isMoving ? (
                    <button
                      onClick={() => setMoveStudentId(enrolment.id)}
                      className="btn btn-sm btn-outline"
                      disabled={loading}
                    >
                      Remove
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <input
                        type="text"
                        placeholder="Reason for removal"
                        value={moveReason}
                        onChange={(e) => setMoveReason(e.target.value)}
                        className="input input-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMoveStudent(enrolment.id)}
                          className="btn btn-sm btn-danger flex-1"
                          disabled={loading || !moveReason.trim()}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => {
                            setMoveStudentId("");
                            setMoveReason("");
                          }}
                          className="btn btn-sm btn-outline flex-1"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Students */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">
            Available Students ({filteredAvailable.length})
          </h2>
          {selectedStudents.length > 0 && (
            <span className="text-sm text-accent">
              {selectedStudents.length} selected
            </span>
          )}
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, email, or registration number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full"
          />
        </div>

        {filteredAvailable.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            {availableStudents.length === 0
              ? "No available students to allocate."
              : "No students match your search."}
          </p>
        ) : (
          <>
            <div className="mb-3">
              <button
                onClick={handleSelectAll}
                className="btn btn-sm btn-outline"
                disabled={loading}
              >
                {selectedStudents.length === filteredAvailable.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAvailable.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => handleToggle(student.id)}
                    className="w-4 h-4"
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-gray-500">
                      {student.registrationNumber || "No reg. number"} - {student.email}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleAllocate}
                disabled={loading || selectedStudents.length === 0}
                className="btn btn-primary"
              >
                {loading ? "Allocating..." : `Allocate ${selectedStudents.length} Student${selectedStudents.length !== 1 ? "s" : ""}`}
              </button>
              <button
                onClick={() => router.back()}
                disabled={loading}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
