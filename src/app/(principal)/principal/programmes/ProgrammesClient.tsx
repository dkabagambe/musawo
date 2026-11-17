"use client";

import { useState } from "react";
import ProgrammeFormDialog from "./ProgrammeFormDialog";
import Link from "next/link";

interface Programme {
  id: string;
  title: string;
  courseCode: string | null;
  description: string;
  shortDescription: string | null;
  category: string;
  status: string;
  fullFeeUgx: number | null;
  internationalFeeUgx: number | null;
  instalmentCount: number;
  durationMonths: number | null;
  eligibilityText: string | null;
  targetAudience: string | null;
  intakeLabel: string | null;
  tutor: { name: string };
  enrolments: Array<{ id: string }>;
  intakes: Array<{ id: string; label: string | null }>;
  departments: Array<{
    department: { id: string; name: string };
  }>;
}

interface Props {
  courses: Programme[];
  departments: Array<{ id: string; name: string }>;
  canEdit: boolean;
  canPublish: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge-warning",
  PUBLISHED: "badge-success",
  ARCHIVED: "badge-neutral",
};

export default function ProgrammesClient({ courses, departments, canEdit, canPublish }: Props) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingProgramme, setEditingProgramme] = useState<Programme | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  const filteredCourses = courses.filter((c) => {
    if (filter === "ALL") return true;
    return c.status === filter;
  });

  const handleEdit = (prog: Programme) => {
    setEditingProgramme(prog);
    setShowDialog(true);
  };

  const handleCreate = () => {
    setEditingProgramme(null);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingProgramme(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold">Academic Programmes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {courses.length} programme{courses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button onClick={handleCreate} className="btn-primary text-sm">
              + Create Programme
            </button>
          )}
          <Link href="/principal/courses" className="btn-ghost text-sm no-underline">
            Manage Course Units
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm font-medium">Filter:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input text-sm"
        >
          <option value="ALL">All ({courses.length})</option>
          <option value="PUBLISHED">
            Published ({courses.filter((c) => c.status === "PUBLISHED").length})
          </option>
          <option value="DRAFT">
            Draft ({courses.filter((c) => c.status === "DRAFT").length})
          </option>
          <option value="ARCHIVED">
            Archived ({courses.filter((c) => c.status === "ARCHIVED").length})
          </option>
        </select>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📚</p>
          <p className="text-gray-500 text-sm">
            {filter === "ALL"
              ? "No programmes configured yet."
              : `No ${filter.toLowerCase()} programmes.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCourses.map((c) => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <h2 className="font-semibold text-base">{c.title}</h2>
                  {c.courseCode && (
                    <span className="font-mono text-xs text-gray-400">{c.courseCode}</span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`badge text-xs flex-shrink-0 ${
                      STATUS_BADGE[c.status] ?? "badge-info"
                    }`}
                  >
                    {c.status}
                  </span>
                  {c.category === "PROFESSIONAL" && (
                    <span className="badge badge-info text-xs">Professionals</span>
                  )}
                </div>
              </div>

              {c.departments.length > 0 && (
                <p className="text-xs text-gray-500 mb-2">
                  📂 {c.departments.map((d) => d.department.name).join(", ")}
                </p>
              )}

              <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                {c.shortDescription ?? c.description}
              </p>

              <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap mb-3">
                <span>👤 {c.tutor.name}</span>
                <span>👥 {c.enrolments.length} enrolled</span>
                {c.durationMonths && <span>⏱ {c.durationMonths} months</span>}
              </div>

              {c.intakes.length > 0 && (
                <p className="text-xs text-green-600 font-medium mb-2">
                  ✓ Open intake: {c.intakes[0].label ?? "Current"}
                </p>
              )}

              {c.fullFeeUgx && (
                <p className="text-sm text-primary font-medium mb-3">
                  UGX {c.fullFeeUgx.toLocaleString()}
                  {c.internationalFeeUgx
                    ? ` / USD ${c.internationalFeeUgx.toLocaleString()}`
                    : ""}
                  {c.instalmentCount > 1 && (
                    <span className="text-xs text-gray-500">
                      {" "}
                      ({c.instalmentCount} instalments)
                    </span>
                  )}
                </p>
              )}

              {canEdit && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => handleEdit(c)}
                    className="btn-ghost text-xs flex-1"
                  >
                    ✏ Edit
                  </button>
                  <button className="btn-ghost text-xs text-gray-400" disabled>
                    📋 View Details
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 card bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-900 mb-2">
          <strong>ℹ Director Approval Required:</strong>
        </p>
        <p className="text-sm text-amber-700">
          All programme changes (create, modify, archive) require Director approval before taking
          effect. When you create or edit a programme, an approval request is submitted
          automatically. Track status in{" "}
          <Link href="/principal/approval-tracking" className="underline font-medium">
            Approval Tracking
          </Link>
          .
        </p>
      </div>

      {showDialog && (
        <ProgrammeFormDialog
          programme={editingProgramme}
          departments={departments}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  );
}
