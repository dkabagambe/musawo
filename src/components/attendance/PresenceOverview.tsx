"use client";

import { useEffect, useState } from "react";

type Student = { id: string; name: string; status: string; lastSeenAt: string | null; classTitle: string | null };
export default function PresenceOverview() {
  const [students, setStudents] = useState<Student[]>([]);
  useEffect(() => {
    let active = true;
    const refresh = () => fetch("/api/tutor/presence", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data) => { if (active && data) setStudents(data.students ?? []); }).catch(() => undefined);
    void refresh(); const timer = setInterval(refresh, 30_000);
    const stream = new EventSource("/api/tutor/presence/stream");
    stream.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data) as { userId?: string; presence?: { lastSeenAt: number; classId: string | null } | null; users?: Array<{ userId: string; presence: { lastSeenAt: number; classId: string | null } | null }> };
        const updates = update.users ?? (update.userId ? [{ userId: update.userId, presence: update.presence ?? null }] : []);
        if (!updates.length) return;
        setStudents((current) => current.map((student) => {
          const update = updates.find((item) => item.userId === student.id);
          if (!update) return student;
          return { ...student, status: !update.presence ? "offline" : update.presence.classId ? "in_class" : "online", lastSeenAt: update.presence ? new Date(update.presence.lastSeenAt).toISOString() : student.lastSeenAt };
        }));
      } catch { /* retain current presence view */ }
    };
    return () => { active = false; clearInterval(timer); stream.close(); };
  }, []);
  const online = students.filter((student) => student.status !== "offline").length;
  const inClass = students.filter((student) => student.status === "in_class").length;
  return <section className="card"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Student presence</h2><p className="text-xs text-gray-500">Live updates from the platform and live rooms</p></div><p className="text-sm"><strong>{online}</strong> online · <strong>{inClass}</strong> in class · {students.length} enrolled</p></div><div className="mt-3 max-h-72 divide-y divide-border overflow-y-auto">{students.map((student) => <div key={student.id} className="flex items-center gap-3 py-2 text-sm"><span className={`h-2 w-2 rounded-full ${student.status === "in_class" ? "bg-success" : student.status === "online" ? "bg-amber-500" : "bg-gray-300"}`} /><span className="flex-1">{student.name}</span><span className="text-xs text-gray-500">{student.status.replace("_", " ")}{student.lastSeenAt ? ` · ${new Date(student.lastSeenAt).toLocaleTimeString("en-UG")}` : ""}</span></div>)}</div></section>;
}
