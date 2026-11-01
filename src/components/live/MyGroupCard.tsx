"use client";

/**
 * MyGroupCard - student view of their breakaway group for a live class.
 * Shows: group name, members, optional Meet link, group discussion thread link.
 */

import React, { useEffect, useState } from "react";
import { Users, ExternalLink, MessageSquare } from "lucide-react";

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

interface Props {
  classId: string;
  courseId: string;
}

export default function MyGroupCard({ classId, courseId }: Props) {
  const [myGroupId, setMyGroupId] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/groups/${classId}`)
      .then((r) => r.json())
      .then((data) => {
        setMyGroupId(data.myGroupId ?? null);
        if (data.myGroupId) {
          const found = (data.groups as Group[]).find((g) => g.id === data.myGroupId) ?? null;
          setGroup(found);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [classId]);

  if (loading) return null;
  if (!myGroupId || !group) return null;

  return (
    <div className="mt-3 border border-accent/30 bg-accent/5 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-accent" />
        <span className="font-semibold text-sm text-primary">Your Group: {group.name}</span>
      </div>

      {/* Members */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {group.members.map((m) => (
          <span key={m.id} className="bg-white border border-border rounded-full px-2 py-0.5 text-xs text-gray-700">
            {m.user.name}
            {m.user.studentNumber && <span className="text-gray-400 ml-1">({m.user.studentNumber})</span>}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Group Meet room */}
        {group.meetLink && (
          <a
            href={group.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline text-xs no-underline flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Open group room
          </a>
        )}

        {/* Group discussion */}
        <a
          href={`/dashboard/forum?classId=${classId}&groupId=${group.id}&courseId=${courseId}`}
          className="btn-secondary text-xs no-underline flex items-center gap-1"
        >
          <MessageSquare className="w-3 h-3" />
          Group discussion
        </a>
      </div>
    </div>
  );
}
