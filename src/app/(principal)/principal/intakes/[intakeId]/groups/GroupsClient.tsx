"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string | null;
  studentNumber: string | null;
  avatarUrl: string | null;
  status: string;
}

interface Enrolment {
  id: string;
  userId: string;
  user: User;
}

interface Course {
  id: string;
  title: string;
  courseCode: string | null;
}

interface Intake {
  id: string;
  label: string;
  course: Course;
  enrolments: Enrolment[];
}

interface Group {
  id: string;
  name: string;
  members: string[]; // user IDs
}

interface Props {
  intake: Intake;
}

export default function GroupsClient({ intake }: Props) {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupSize, setGroupSize] = useState(5);
  const [loading, setLoading] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAutoGenerate = () => {
    const students = intake.enrolments.map((e) => e.userId);
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    
    const newGroups: Group[] = [];
    let groupNumber = 1;

    for (let i = 0; i < shuffled.length; i += groupSize) {
      const groupMembers = shuffled.slice(i, i + groupSize);
      newGroups.push({
        id: `group-${groupNumber}`,
        name: `Group ${groupNumber}`,
        members: groupMembers,
      });
      groupNumber++;
    }

    setGroups(newGroups);
  };

  const handleCreateManual = () => {
    if (!newGroupName.trim() || selectedMembers.length === 0) return;

    const newGroup: Group = {
      id: `manual-${Date.now()}`,
      name: newGroupName,
      members: selectedMembers,
    };

    setGroups([...groups, newGroup]);
    setShowManualDialog(false);
    setNewGroupName("");
    setSelectedMembers([]);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm("Are you sure you want to delete this group?")) {
      setGroups(groups.filter((g) => g.id !== groupId));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/principal/intakes/${intake.id}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups }),
      });

      if (!res.ok) throw new Error("Failed to save groups");

      alert("Groups saved successfully!");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const assignedStudents = new Set(groups.flatMap((g) => g.members));
  const unassignedStudents = intake.enrolments.filter((e) => !assignedStudents.has(e.userId));

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/principal/intakes/${intake.id}/roster`}
          className="text-sm text-accent hover:underline mb-2 inline-block"
        >
          ← Back to Roster
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Breakaway Groups</h1>
            <p className="text-sm text-gray-500 mt-1">
              {intake.course.title} • {intake.label}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowManualDialog(true)}
              className="btn-ghost text-sm"
              disabled={groups.length > 0}
            >
              + Create Manual Group
            </button>
            {groups.length > 0 && (
              <button onClick={handleSave} className="btn-primary text-sm" disabled={loading}>
                {loading ? "Saving..." : "Save Groups"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="card bg-blue-50 border-blue-200 mb-6">
        <p className="text-sm text-blue-900">
          <strong>ℹ About Breakaway Groups:</strong>
        </p>
        <p className="text-sm text-blue-700 mt-1">
          Breakaway groups are used during practical sessions for small-group activities. Auto-generate
          creates balanced groups based on the specified size, or create manual groups with specific students.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="card">
          {/* Auto-Generate Form */}
          <div className="max-w-md mx-auto text-center py-8">
            <h2 className="text-xl font-bold mb-4">Generate Breakaway Groups</h2>
            <p className="text-sm text-gray-600 mb-6">
              Automatically create balanced groups from the {intake.enrolments.length} enrolled students.
            </p>

            <div className="mb-6">
              <label className="label">Group Size (default: 5 students per group)</label>
              <input
                type="number"
                min="2"
                max="20"
                value={groupSize}
                onChange={(e) => setGroupSize(parseInt(e.target.value) || 5)}
                className="input w-full text-center text-lg"
              />
              <p className="text-xs text-gray-500 mt-2">
                Will create approximately {Math.ceil(intake.enrolments.length / groupSize)} groups
              </p>
            </div>

            <button
              onClick={handleAutoGenerate}
              className="btn-primary w-full"
              disabled={intake.enrolments.length === 0}
            >
              Auto-Generate Groups
            </button>

            {intake.enrolments.length === 0 && (
              <p className="text-xs text-danger mt-2">
                No students enrolled yet. Assign students first.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* Groups Display */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {groups.length} group{groups.length !== 1 ? "s" : ""} created •{" "}
              {assignedStudents.size} of {intake.enrolments.length} students assigned
            </p>
            <button
              onClick={() => {
                if (confirm("Clear all groups and start over?")) {
                  setGroups([]);
                }
              }}
              className="btn-ghost text-danger text-sm"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {groups.map((group) => (
              <div key={group.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{group.name}</h3>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="text-danger text-sm hover:underline"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-2">
                  {group.members.map((userId) => {
                    const enrolment = intake.enrolments.find((e) => e.userId === userId);
                    if (!enrolment) return null;
                    return (
                      <div key={userId} className="flex items-center gap-2">
                        <div className="relative w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                          {enrolment.user.avatarUrl ? (
                            <Image
                              src={enrolment.user.avatarUrl}
                              alt={enrolment.user.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-gray-600">
                              {getInitials(enrolment.user.name)}
                            </div>
                          )}
                        </div>
                        <span className="text-sm truncate">{enrolment.user.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Unassigned Students */}
          {unassignedStudents.length > 0 && (
            <div className="card bg-amber-50 border-amber-200">
              <h3 className="font-semibold mb-3 text-amber-900">
                ⚠️ Unassigned Students ({unassignedStudents.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {unassignedStudents.map((enrolment) => (
                  <div key={enrolment.userId} className="flex items-center gap-2 text-sm">
                    <div className="relative w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {enrolment.user.avatarUrl ? (
                        <Image
                          src={enrolment.user.avatarUrl}
                          alt={enrolment.user.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-gray-600">
                          {getInitials(enrolment.user.name)}
                        </div>
                      )}
                    </div>
                    <span className="truncate">{enrolment.user.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Group Dialog */}
      {showManualDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">Create Manual Group</h2>

            <div className="mb-4">
              <label className="label">Group Name *</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Advanced Practice Group"
                className="input w-full"
              />
            </div>

            <div className="mb-4">
              <label className="label">
                Select Members * ({selectedMembers.length} selected)
              </label>
              <div className="space-y-2 max-h-96 overflow-y-auto border border-border rounded p-3">
                {intake.enrolments.map((enrolment) => {
                  const isSelected = selectedMembers.includes(enrolment.userId);
                  const isAssigned = assignedStudents.has(enrolment.userId);
                  return (
                    <div
                      key={enrolment.userId}
                      onClick={() => !isAssigned && toggleMember(enrolment.userId)}
                      className={`flex items-center gap-3 p-2 border rounded cursor-pointer transition-colors ${
                        isAssigned
                          ? "opacity-50 cursor-not-allowed border-gray-200"
                          : isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-surface/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isAssigned}
                        onChange={() => {}}
                        className="w-4 h-4"
                      />
                      <div className="relative w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        {enrolment.user.avatarUrl ? (
                          <Image
                            src={enrolment.user.avatarUrl}
                            alt={enrolment.user.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-gray-600">
                            {getInitials(enrolment.user.name)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{enrolment.user.name}</p>
                        {isAssigned && (
                          <p className="text-xs text-gray-500">Already in a group</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowManualDialog(false);
                  setNewGroupName("");
                  setSelectedMembers([]);
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateManual}
                className="btn-primary"
                disabled={!newGroupName.trim() || selectedMembers.length === 0}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
