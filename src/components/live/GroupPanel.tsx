"use client";

/**
 * GroupPanel - instructor-side breakaway group management.
 * Renders inside the instructor's live class row.
 *
 * Features:
 * - Random assignment (default size 5, reshuffle)
 * - Manual assignment (select members per group)
 * - Move students between groups
 * - Set optional Meet link per group
 * - Rename groups
 * - Link to group discussion thread
 */

import React, { useCallback, useEffect, useState } from "react";
import { Users, Shuffle, Plus, ExternalLink, MessageSquare, ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";

interface Member {
  id: string;
  name: string;
  studentId?: string | null;
}

interface Group {
  id: string;
  name: string;
  meetLink?: string | null;
  members: { id: string; userId: string; user: Member }[];
}

interface Props {
  classId: string;
  courseId: string;
}

export default function GroupPanel({ classId, courseId }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [groupSize, setGroupSize] = useState(5);
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState("");

  // Editing state
  const [editingName, setEditingName] = useState<Record<string, string>>({});
  const [editingMeetLink, setEditingMeetLink] = useState<Record<string, string>>({});
  const [movingUser, setMovingUser] = useState<{ userId: string; fromGroupId: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${classId}`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { void load(); }, [load]);

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
        setMsg(`Created ${data.groups?.length ?? 0} groups of ${groupSize}.`);
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

          {/* Controls */}
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

          {/* Move indicator */}
          {movingUser && (
            <div className="flex items-center gap-2 bg-warning/10 rounded-xl px-3 py-2 text-sm text-amber-700">
              <span>Moving <strong>{movingUser.name}</strong> - click a group to move them there</span>
              <button type="button" onClick={() => setMovingUser(null)} className="ml-auto text-xs underline">Cancel</button>
            </div>
          )}

          {/* Group list */}
          {groups.length === 0 && !loading && (
            <p className="text-sm text-gray-400">No groups yet. Use Assign randomly or create groups manually above.</p>
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
                      {m.user.studentId && <span className="text-gray-400">({m.user.studentId})</span>}
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
        </div>
      )}
    </div>
  );
}
