"use client";

/**
 * GroupPanel - instructor-side breakaway group management.
 * Renders inside the instructor's live class row.
 *
 * Features:
 * - Random assignment (default size 5, reshuffle)
 * - Manual assignment (pick by name: drag students into groups)
 * - Move students between groups
 * - Set optional Meet link per group
 * - Rename groups
 * - Link to group discussion thread
 */

import React, { useCallback, useEffect, useState } from "react";
import { Users, Shuffle, Plus, ExternalLink, MessageSquare, ChevronDown, ChevronUp, Pencil, Check, X, ListTree } from "lucide-react";

interface Member {
  id: string;
  name: string;
  studentNumber?: string | null;
}

interface Group {
  id: string;
  name: string;
  meetLink?: string | null;
  members: { id: string; userId: string; user: Member }[];
}

interface EnrolledStudent {
  id: string;
  name: string;
  studentNumber?: string | null;
}

interface Props {
  classId: string;
  courseId: string;
}

// ─── Manual group builder draft type ──────────────────────────────────────────
interface DraftGroup {
  key: string; // local-only key
  name: string;
  memberIds: string[];
}

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function GroupPanel({ classId, courseId }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [groupSize, setGroupSize] = useState(5);
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState("");

  // Editing state for saved groups
  const [editingName, setEditingName] = useState<Record<string, string>>({});
  const [editingMeetLink, setEditingMeetLink] = useState<Record<string, string>>({});
  const [movingUser, setMovingUser] = useState<{ userId: string; fromGroupId: string; name: string } | null>(null);

  // Manual assignment state
  const [mode, setMode] = useState<"random" | "manual">("random");
  const [allStudents, setAllStudents] = useState<EnrolledStudent[]>([]);
  const [draftGroups, setDraftGroups] = useState<DraftGroup[]>([{ key: "g0", name: "Group A", memberIds: [] }]);
  const [dragStudentId, setDragStudentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${classId}`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups ?? []);
        // Collect all unique members across all groups as a proxy for enrolled students
        const seen = new Set<string>();
        const students: EnrolledStudent[] = [];
        for (const g of (data.groups ?? []) as Group[]) {
          for (const m of g.members) {
            if (!seen.has(m.userId)) {
              seen.add(m.userId);
              students.push({ id: m.userId, name: m.user.name, studentNumber: m.user.studentNumber });
            }
          }
        }
        if (students.length) setAllStudents(students);
      }
    } finally {
      setLoading(false);
    }
  }, [classId]);

  // Fetch enrolled students for manual mode (separate call to the enrollment endpoint)
  const fetchEnrolled = useCallback(async () => {
    const res = await fetch(`/api/groups/${classId}/students`);
    if (res.ok) {
      const data = await res.json();
      setAllStudents(data.students ?? []);
    }
  }, [classId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (mode === "manual") void fetchEnrolled();
  }, [mode, fetchEnrolled]);

  async function randomise() {
    setWorking(true);
    setMsg("");
    try {
      const res = await fetch(`/api/groups/${classId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "random", groupSize }),
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups ?? []);
        setMsg(`Created ${data.groups?.length ?? 0} groups of up to ${groupSize}.`);
        setExpanded(true);
      } else {
        const d = await res.json();
        setMsg(d.error ?? "Failed.");
      }
    } finally {
      setWorking(false);
    }
  }

  async function submitManual() {
    // Validate
    const filled = draftGroups.filter((g) => g.memberIds.length > 0);
    if (filled.length === 0) { setMsg("Add at least one student to a group."); return; }

    setWorking(true);
    setMsg("");
    try {
      const res = await fetch(`/api/groups/${classId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual",
          groups: filled.map((g) => ({ name: g.name, memberIds: g.memberIds })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups ?? []);
        setMsg(`Saved ${data.groups?.length ?? 0} groups.`);
        setMode("random");
        setExpanded(true);
      } else {
        const d = await res.json();
        setMsg(d.error ?? "Failed.");
      }
    } finally {
      setWorking(false);
    }
  }

  async function patch(payload: Record<string, unknown>) {
    setWorking(true);
    try {
      const res = await fetch(`/api/groups/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) await load();
      else {
        const d = await res.json();
        setMsg(d.error ?? "Failed.");
      }
    } finally {
      setWorking(false);
    }
  }

  async function saveGroupName(groupId: string) {
    const name = editingName[groupId]?.trim();
    if (!name) return;
    await patch({ groupId, action: "rename", name });
    setEditingName((prev) => { const n = { ...prev }; delete n[groupId]; return n; });
  }

  async function saveMeetLink(groupId: string) {
    const link = editingMeetLink[groupId]?.trim() || null;
    await patch({ groupId, action: "set_meet_link", meetLink: link });
    setEditingMeetLink((prev) => { const n = { ...prev }; delete n[groupId]; return n; });
  }

  async function moveToGroup(targetGroupId: string) {
    if (!movingUser) return;
    await patch({ groupId: movingUser.fromGroupId, action: "remove_member", userId: movingUser.userId, targetGroupId });
    setMovingUser(null);
  }

  async function removeMember(groupId: string, userId: string) {
    await patch({ groupId, action: "remove_member", userId });
  }

  // ─── Manual draft helpers ────────────────────────────────────────────────────

  function addDraftGroup() {
    const idx = draftGroups.length;
    setDraftGroups((prev) => [...prev, { key: `g${Date.now()}`, name: `Group ${ALPHA[idx] ?? idx + 1}`, memberIds: [] }]);
  }

  function removeDraftGroup(key: string) {
    setDraftGroups((prev) => prev.filter((g) => g.key !== key));
  }

  function renameDraftGroup(key: string, name: string) {
    setDraftGroups((prev) => prev.map((g) => g.key === key ? { ...g, name } : g));
  }

  function addStudentToDraft(groupKey: string, studentId: string) {
    setDraftGroups((prev) =>
      prev.map((g) =>
        g.key === groupKey && !g.memberIds.includes(studentId)
          ? { ...g, memberIds: [...g.memberIds, studentId] }
          : g
      )
    );
  }

  function removeStudentFromDraft(groupKey: string, studentId: string) {
    setDraftGroups((prev) =>
      prev.map((g) =>
        g.key === groupKey ? { ...g, memberIds: g.memberIds.filter((id) => id !== studentId) } : g
      )
    );
  }

  // Students not yet assigned to any draft group
  const assignedIds = new Set(draftGroups.flatMap((g) => g.memberIds));
  const unassigned = allStudents.filter((s) => !assignedIds.has(s.id));

  // ─── Drag helpers ─────────────────────────────────────────────────────────────

  function handleDragStart(studentId: string) { setDragStudentId(studentId); }
  function handleDropOnGroup(groupKey: string, e: React.DragEvent) {
    e.preventDefault();
    if (dragStudentId) { addStudentToDraft(groupKey, dragStudentId); setDragStudentId(null); }
  }
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); }

  return (
    <div className="border border-border rounded-2xl bg-surface mt-3">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-primary hover:bg-gray-50 rounded-2xl transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <Users className="w-4 h-4 text-accent" />
        Breakaway Groups
        {groups.length > 0 && (
          <span className="ml-1 text-xs font-normal text-gray-500">({groups.length} group{groups.length !== 1 ? "s" : ""})</span>
        )}
        <span className="ml-auto">{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {msg && (
            <p className="text-sm px-3 py-2 rounded-xl bg-accent/10 text-accent font-medium">{msg}</p>
          )}

          {/* Mode tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("random")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${mode === "random" ? "bg-primary text-white border-primary" : "border-border text-gray-500 hover:bg-gray-50"}`}
            >
              <Shuffle className="w-3 h-3 inline mr-1" />
              Random
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${mode === "manual" ? "bg-primary text-white border-primary" : "border-border text-gray-500 hover:bg-gray-50"}`}
            >
              <ListTree className="w-3 h-3 inline mr-1" />
              Pick by name
            </button>
          </div>

          {/* ─── RANDOM mode ─────────────────────────────────────────────────── */}
          {mode === "random" && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="gs" className="text-xs text-gray-500">Group size:</label>
                <select
                  id="gs"
                  className="input !py-1 !text-sm w-16"
                  value={groupSize}
                  onChange={(e) => setGroupSize(Number(e.target.value))}
                >
                  {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={working}
                onClick={randomise}
                className="btn-secondary text-xs flex items-center gap-1"
              >
                <Shuffle className="w-3 h-3" />
                {groups.length > 0 ? "Reshuffle randomly" : "Assign randomly"}
              </button>
              {loading && <span className="text-xs text-gray-400">Loading...</span>}
            </div>
          )}

          {/* ─── MANUAL mode ─────────────────────────────────────────────────── */}
          {mode === "manual" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Drag students from the pool below into a group, or click a student then click a group.
                {groups.length > 0 && <span className="text-amber-600 ml-1">Saving will replace existing groups.</span>}
              </p>

              {/* Unassigned pool */}
              <div className="border border-dashed border-border rounded-xl p-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Unassigned students ({unassigned.length})</p>
                {unassigned.length === 0 ? (
                  <p className="text-xs text-gray-400">All students are assigned.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {unassigned.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        draggable
                        onDragStart={() => handleDragStart(s.id)}
                        onClick={() => {
                          // click-to-assign: put in first group with space
                          const target = draftGroups[0];
                          if (target) addStudentToDraft(target.key, s.id);
                        }}
                        className="bg-white border border-border rounded-full px-2.5 py-1 text-xs text-gray-700 hover:border-accent hover:text-accent cursor-grab active:cursor-grabbing transition-colors"
                        title="Drag or click to assign to first group"
                      >
                        {s.name}
                        {s.studentNumber && <span className="text-gray-400 ml-1">({s.studentNumber})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Draft groups */}
              <div className="space-y-2">
                {draftGroups.map((g, i) => (
                  <div
                    key={g.key}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnGroup(g.key, e)}
                    className="border border-border rounded-xl p-3 bg-white min-h-[72px] transition-colors hover:border-accent/40"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        className="input !py-1 text-sm flex-1"
                        value={g.name}
                        onChange={(e) => renameDraftGroup(g.key, e.target.value)}
                        placeholder={`Group ${ALPHA[i] ?? i + 1}`}
                      />
                      <span className="text-xs text-gray-400">{g.memberIds.length} students</span>
                      {draftGroups.length > 1 && (
                        <button type="button" onClick={() => removeDraftGroup(g.key)} className="p-1 text-gray-300 hover:text-danger">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.memberIds.map((id) => {
                        const s = allStudents.find((st) => st.id === id);
                        if (!s) return null;
                        return (
                          <span key={id} className="flex items-center gap-1 bg-accent/10 rounded-full px-2 py-0.5 text-xs text-primary">
                            {s.name}
                            <button type="button" onClick={() => removeStudentFromDraft(g.key, id)} className="text-gray-400 hover:text-danger">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        );
                      })}
                      {g.memberIds.length === 0 && (
                        <span className="text-xs text-gray-300 italic">Drop students here</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={addDraftGroup} className="btn-secondary text-xs flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add group
                </button>
                <button type="button" disabled={working} onClick={submitManual} className="btn-primary text-xs">
                  {working ? "Saving..." : "Save groups"}
                </button>
              </div>
            </div>
          )}

          {/* Move indicator (for saved groups) */}
          {movingUser && (
            <div className="flex items-center gap-2 bg-warning/10 rounded-xl px-3 py-2 text-sm text-amber-700">
              <span>Moving <strong>{movingUser.name}</strong> - click a group to move them there</span>
              <button type="button" onClick={() => setMovingUser(null)} className="ml-auto text-xs underline">Cancel</button>
            </div>
          )}

          {/* Saved group list */}
          {mode === "random" && (
            <>
              {groups.length === 0 && !loading && (
                <p className="text-sm text-gray-400">No groups yet. Use a mode above to create groups.</p>
              )}

              <div className="space-y-3">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className={`border rounded-xl p-3 bg-white ${movingUser && movingUser.fromGroupId !== group.id ? "border-accent/50 cursor-pointer hover:bg-accent/5" : "border-border"}`}
                    onClick={() => { if (movingUser && movingUser.fromGroupId !== group.id) void moveToGroup(group.id); }}
                  >
                    {/* Group name row */}
                    <div className="flex items-center gap-2 mb-2">
                      {editingName[group.id] !== undefined ? (
                        <>
                          <input
                            className="input !py-1 text-sm flex-1"
                            value={editingName[group.id]}
                            onChange={(e) => setEditingName((p) => ({ ...p, [group.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") void saveGroupName(group.id); }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button type="button" onClick={(e) => { e.stopPropagation(); void saveGroupName(group.id); }} className="p-1 text-success"><Check className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setEditingName((p) => { const n = { ...p }; delete n[group.id]; return n; }); }} className="p-1 text-danger"><X className="w-3.5 h-3.5" /></button>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-sm text-primary">{group.name}</span>
                          <span className="text-xs text-gray-400">({group.members.length} member{group.members.length !== 1 ? "s" : ""})</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingName((p) => ({ ...p, [group.id]: group.name })); }}
                            className="p-1 text-gray-400 hover:text-primary"
                            title="Rename group"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </>
                      )}

                      {/* Forum link */}
                      <a
                        href={`/tutor/forum?classId=${classId}&groupId=${group.id}&courseId=${courseId}`}
                        className="ml-auto text-accent hover:text-primary no-underline flex items-center gap-1 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageSquare className="w-3 h-3" />
                        Group thread
                      </a>
                    </div>

                    {/* Meet link row */}
                    <div className="flex items-center gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
                      {editingMeetLink[group.id] !== undefined ? (
                        <>
                          <input
                            className="input !py-1 text-xs flex-1"
                            placeholder="https://meet.google.com/..."
                            value={editingMeetLink[group.id]}
                            onChange={(e) => setEditingMeetLink((p) => ({ ...p, [group.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") void saveMeetLink(group.id); }}
                            autoFocus
                          />
                          <button type="button" onClick={() => void saveMeetLink(group.id)} className="p-1 text-success"><Check className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => setEditingMeetLink((p) => { const n = { ...p }; delete n[group.id]; return n; })} className="p-1 text-danger"><X className="w-3.5 h-3.5" /></button>
                        </>
                      ) : group.meetLink ? (
                        <>
                          <a href={group.meetLink} target="_blank" rel="noopener noreferrer" className="text-xs text-accent no-underline flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Group Meet room
                          </a>
                          <button type="button" onClick={() => setEditingMeetLink((p) => ({ ...p, [group.id]: group.meetLink ?? "" }))} className="text-xs text-gray-400 underline">Edit</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setEditingMeetLink((p) => ({ ...p, [group.id]: "" }))} className="text-xs text-gray-400 flex items-center gap-1 hover:text-accent">
                          <Plus className="w-3 h-3" /> Add Meet room link
                        </button>
                      )}
                    </div>

                    {/* Members */}
                    <div className="flex flex-wrap gap-1.5">
                      {group.members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-1 bg-surface rounded-full px-2 py-0.5 text-xs text-gray-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>{m.user.name}</span>
                          {m.user.studentNumber && <span className="text-gray-400">({m.user.studentNumber})</span>}
                          <button
                            type="button"
                            onClick={() => setMovingUser({ userId: m.userId, fromGroupId: group.id, name: m.user.name })}
                            className="ml-1 text-gray-400 hover:text-accent"
                            title="Move to another group"
                          >
                            &#8644;
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeMember(group.id, m.userId)}
                            className="ml-0.5 text-gray-300 hover:text-danger"
                            title="Remove from group"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* After manual save, show saved groups too */}
          {mode === "manual" && groups.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-1">Current saved groups:</p>
              <div className="flex flex-wrap gap-1">
                {groups.map((g) => (
                  <span key={g.id} className="text-xs bg-surface border border-border rounded-full px-2 py-0.5 text-gray-600">
                    {g.name} ({g.members.length})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
