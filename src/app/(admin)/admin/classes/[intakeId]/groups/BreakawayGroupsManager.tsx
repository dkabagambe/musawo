"use client";

import { useState } from "react";

type Student = {
  id: string;
  name: string;
  registrationNumber: string | null;
};

type Group = {
  name: string;
  students: Student[];
};

type Props = {
  intakeId: string;
  students: Student[];
};

export default function BreakawayGroupsManager({ intakeId, students }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupSize, setGroupSize] = useState(5);
  const [unassigned, setUnassigned] = useState<Student[]>(students);

  const handleAutoGenerate = () => {
    if (students.length === 0) return;

    const newGroups: Group[] = [];
    const shuffled = [...students].sort(() => Math.random() - 0.5);

    let groupIndex = 0;
    for (let i = 0; i < shuffled.length; i += groupSize) {
      const groupStudents = shuffled.slice(i, i + groupSize);
      newGroups.push({
        name: `Group ${String.fromCharCode(65 + groupIndex)}`, // A, B, C, etc.
        students: groupStudents,
      });
      groupIndex++;
    }

    setGroups(newGroups);
    setUnassigned([]);
  };

  const handleManualCreate = () => {
    const newGroupName = `Group ${String.fromCharCode(65 + groups.length)}`;
    setGroups([...groups, { name: newGroupName, students: [] }]);
  };

  const handleRenameGroup = (index: number, newName: string) => {
    const updated = [...groups];
    updated[index].name = newName;
    setGroups(updated);
  };

  const handleAddToGroup = (groupIndex: number, student: Student) => {
    const updated = [...groups];
    updated[groupIndex].students.push(student);
    setGroups(updated);
    setUnassigned(unassigned.filter((s) => s.id !== student.id));
  };

  const handleRemoveFromGroup = (groupIndex: number, studentId: string) => {
    const updated = [...groups];
    const student = updated[groupIndex].students.find((s) => s.id === studentId);
    if (student) {
      updated[groupIndex].students = updated[groupIndex].students.filter(
        (s) => s.id !== studentId,
      );
      setGroups(updated);
      setUnassigned([...unassigned, student]);
    }
  };

  const handleDeleteGroup = (index: number) => {
    const group = groups[index];
    setUnassigned([...unassigned, ...group.students]);
    setGroups(groups.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setGroups([]);
    setUnassigned(students);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card">
        <h2 className="font-semibold mb-4">Group Configuration</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">Group Size</label>
            <input
              type="number"
              min="2"
              max="20"
              value={groupSize}
              onChange={(e) => setGroupSize(Number(e.target.value))}
              className="input w-24"
            />
          </div>
          <button onClick={handleAutoGenerate} className="btn btn-primary">
            Auto-Generate Groups
          </button>
          <button onClick={handleManualCreate} className="btn btn-secondary">
            Create Empty Group
          </button>
          {groups.length > 0 && (
            <button onClick={handleReset} className="btn btn-outline">
              Reset All
            </button>
          )}
        </div>
      </div>

      {/* Unassigned Students */}
      {unassigned.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">
            Unassigned Students ({unassigned.length})
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unassigned.map((student) => (
              <div
                key={student.id}
                className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
              >
                <p className="font-medium">{student.name}</p>
                <p className="text-xs text-gray-500 font-mono">
                  {student.registrationNumber || "N/A"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Groups */}
      {groups.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-gray-500 text-sm">
            No groups created yet. Use auto-generate or create manually.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group, groupIndex) => (
            <div key={groupIndex} className="card">
              <div className="flex items-start justify-between mb-3">
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) => handleRenameGroup(groupIndex, e.target.value)}
                  className="input input-sm font-semibold"
                />
                <button
                  onClick={() => handleDeleteGroup(groupIndex)}
                  className="btn btn-sm btn-danger ml-2"
                >
                  Delete
                </button>
              </div>

              <p className="text-xs text-gray-500 mb-3">
                {group.students.length} student{group.students.length !== 1 ? "s" : ""}
              </p>

              {group.students.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  No students in this group
                </p>
              ) : (
                <div className="space-y-2">
                  {group.students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
                    >
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-gray-500 font-mono">
                          {student.registrationNumber || "N/A"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveFromGroup(groupIndex, student.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {unassigned.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs text-accent cursor-pointer">
                    Add student
                  </summary>
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {unassigned.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => handleAddToGroup(groupIndex, student)}
                        className="block w-full text-left p-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        {student.name}
                      </button>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {groups.length > 0 && (
        <div className="card bg-accent/5">
          <h3 className="font-semibold mb-2">Summary</h3>
          <ul className="text-sm space-y-1">
            <li>Total groups: {groups.length}</li>
            <li>
              Assigned students: {groups.reduce((sum, g) => sum + g.students.length, 0)}
            </li>
            <li>Unassigned: {unassigned.length}</li>
          </ul>
          <p className="text-xs text-gray-500 mt-3">
            Note: These groups are for planning purposes. They will be created in live classes
            when the instructor schedules breakaway sessions.
          </p>
        </div>
      )}
    </div>
  );
}
