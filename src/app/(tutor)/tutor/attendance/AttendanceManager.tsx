"use client";

import { useEffect, useState } from "react";

type ClassItem = { id: string; courseId: string; title: string; course: string; scheduledAt: string; status: string };
type Student = { id: string; name: string; studentNumber: string | null; present: boolean; startMark?: string | null; endMark?: string | null; startComment?: string | null; endComment?: string | null; canSpeak?: boolean; isMuted?: boolean; isPresenter?: boolean };
type WaitingStudent = { userId: string; name: string; studentNumber: string | null; admissionRequestedAt: string; handRaisedAt?: string | null };
type Presence = { id: string; name: string; status: string; lastSeenAt: string | null; classTitle: string | null };

export default function AttendanceManager({ classes, canMark, canAdmit, canExport }: { classes: ClassItem[]; canMark: boolean; canAdmit: boolean; canExport: boolean }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [students, setStudents] = useState<Student[]>([]);
  const [waiting, setWaiting] = useState<WaitingStudent[]>([]);
  const [raisedHands, setRaisedHands] = useState<WaitingStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [presence, setPresence] = useState<{ online: number; inClass: number; total: number; students: Presence[] }>({ online: 0, inClass: 0, total: 0, students: [] });
  const [rollCallPoint, setRollCallPoint] = useState<"start" | "end">("start");

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    const load = () => fetch(`/api/tutor/attendance?classId=${encodeURIComponent(classId)}`)
      .then((response) => response.json())
      .then((data) => { setStudents((data.students ?? []).map((student: Student) => { const mark = data.marks?.find((row: { userId: string }) => row.userId === student.id); return { ...student, startMark: mark?.startMark ?? (student.present ? "PRESENT" : "ABSENT"), endMark: mark?.endMark, startComment: mark?.startComment, endComment: mark?.endComment, canSpeak: mark?.canSpeak, isMuted: mark?.isMuted, isPresenter: mark?.isPresenter }; })); setWaiting(data.waiting ?? []); setRaisedHands(data.raisedHands ?? []); })
      .catch(() => setMessage("Could not load the class list."))
      .finally(() => setLoading(false));
    void load(); const timer = setInterval(load, 10_000);
    return () => clearInterval(timer);
  }, [classId]);

  useEffect(() => {
    const selectedClass = classes.find((item) => item.id === classId);
    if (!selectedClass) return;
    let active = true;
    const load = () => fetch(`/api/tutor/presence?courseId=${encodeURIComponent(selectedClass.courseId)}`, { cache: "no-store" }).then((res) => res.ok ? res.json() : null).then((data) => { if (active && data) setPresence(data); }).catch(() => undefined);
    void load(); const timer = setInterval(load, 30_000);
    const stream = new EventSource(`/api/tutor/presence/stream?courseId=${encodeURIComponent(selectedClass.courseId)}`);
    stream.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data) as { userId?: string; presence?: { lastSeenAt: number; classId: string | null } | null; users?: Array<{ userId: string; presence: { lastSeenAt: number; classId: string | null } | null }> };
        const updates = update.users ?? (update.userId ? [{ userId: update.userId, presence: update.presence ?? null }] : []);
        if (!updates.length) return;
        setPresence((current) => {
          const byId = new Map(updates.map((item) => [item.userId, item.presence]));
          const students = current.students.map((student) => {
            if (!byId.has(student.id)) return student;
            const item = byId.get(student.id);
            return { ...student, status: !item ? "offline" : item.classId ? "in_class" : "online", lastSeenAt: item ? new Date(item.lastSeenAt).toISOString() : student.lastSeenAt };
          });
          return { ...current, students, online: students.filter((student) => student.status !== "offline").length, inClass: students.filter((student) => student.status === "in_class").length };
        });
      } catch { /* keep the last good presence snapshot */ }
    };
    return () => { active = false; clearInterval(timer); stream.close(); };
  }, [classId, classes]);

  function setAll(present: boolean) { setStudents((rows) => rows.map((row) => ({ ...row, present }))); }
  function toggle(id: string) { setStudents((rows) => rows.map((row) => row.id === id ? { ...row, present: !row.present } : row)); }

  async function save() {
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/tutor/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rollcall", classId, point: rollCallPoint, marks: students.map((student) => ({ studentId: student.id, status: rollCallPoint === "start" ? student.startMark ?? (student.present ? "PRESENT" : "ABSENT") : student.endMark ?? (student.present ? "PRESENT" : "ABSENT"), comment: rollCallPoint === "start" ? student.startComment : student.endComment })) }),
      });
      const data = await response.json();
      setMessage(response.ok ? `Attendance saved for ${data.saved} students.` : data.error ?? "Could not save attendance.");
    } catch { setMessage("Could not save attendance."); }
    finally { setSaving(false); }
  }

  async function admit(studentIds: string[]) {
    const response = await fetch("/api/tutor/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "admit", classId, studentIds }) });
    if (response.ok) setWaiting((rows) => rows.filter((row) => !studentIds.includes(row.userId)));
    else setMessage("Could not admit the selected student or students.");
  }

  async function admitAllEnrolled() {
    const response = await fetch("/api/tutor/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "admit_all", classId }) });
    if (response.ok) setWaiting([]); else setMessage("Could not admit all enrolled students.");
  }
  async function control(studentId: string, update: { canSpeak?: boolean; isMuted?: boolean; isPresenter?: boolean }) {
    const response = await fetch("/api/tutor/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "controls", classId, studentId, ...update }) });
    const data = await response.json();
    if (!response.ok) setMessage(data.error ?? "Could not update interaction controls.");
    else setMessage(data.providerSupport ?? "Updated.");
    if (response.ok) setStudents((rows) => rows.map((row) => row.id !== studentId ? row : { ...row, ...update }));
  }
  async function controlAll(isMuted: boolean) {
    const response = await fetch("/api/tutor/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "controls_all", classId, canSpeak: !isMuted, isMuted }) });
    const data = await response.json();
    if (response.ok) { setStudents((rows) => rows.map((row) => ({ ...row, canSpeak: !isMuted, isMuted }))); setMessage(data.providerSupport ?? "Updated all microphones."); }
    else setMessage(data.error ?? "Could not update all microphones.");
  }

  const selected = classes.find((item) => item.id === classId);
  return (
    <main className="max-w-4xl mx-auto space-y-5">
      <header><h1 className="text-2xl font-bold text-primary">Class attendance</h1><p className="text-sm text-gray-500 mt-1">Mark and review attendance for your assigned courses.</p></header>
      {classes.length === 0 ? <section className="card text-sm text-gray-500">No classes are scheduled for your assigned courses yet.</section> : <>
        <label className="block"><span className="label">Class</span><select className="input" value={classId} onChange={(event) => setClassId(event.target.value)}>{classes.map((item) => <option key={item.id} value={item.id}>{item.course} · {item.title} · {new Date(item.scheduledAt).toLocaleDateString("en-UG")}</option>)}</select></label>
        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h2 className="font-semibold">{selected?.title}</h2><p className="text-xs text-gray-500">{selected?.course}</p></div><div className="flex flex-wrap gap-2">{canMark && <><select className="input !w-auto !py-1 text-xs" value={rollCallPoint} onChange={(event) => setRollCallPoint(event.target.value as "start" | "end")}><option value="start">Start roll call</option><option value="end">End roll call</option></select><button type="button" className="btn-outline text-xs" onClick={() => setAll(true)}>Mark all present</button><button type="button" className="btn-outline text-xs" onClick={() => setAll(false)}>Mark all absent</button></>}{canAdmit && selected?.status === "LIVE" && <><button type="button" className="btn-outline text-xs" onClick={() => controlAll(false)}>Allow all microphones</button><button type="button" className="btn-outline text-xs" onClick={() => controlAll(true)}>Mute all</button></>}</div></div>
          {canExport && <div className="flex gap-2 mb-4"><a className="btn-outline text-xs no-underline" href={`/api/tutor/attendance/export?classId=${classId}&format=csv`}>Download attendance CSV</a><a className="btn-outline text-xs no-underline" href={`/api/tutor/attendance/export?classId=${classId}&format=pdf`}>Download attendance PDF</a></div>}
          {loading ? <p className="py-8 text-center text-sm text-gray-400">Loading students…</p> : students.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">No enrolled students for this class.</p> : <div className="divide-y divide-border">{students.map((student) => <div key={student.id} className="flex flex-wrap items-center gap-3 py-3"><span className="flex-1 text-sm">{student.name}</span><span className="font-mono text-xs text-gray-400">{student.studentNumber ?? ""}</span>{canMark && <><select className="input !w-auto !py-1 text-xs" value={rollCallPoint === "start" ? student.startMark ?? (student.present ? "PRESENT" : "ABSENT") : student.endMark ?? (student.present ? "PRESENT" : "ABSENT")} onChange={(event) => setStudents((rows) => rows.map((row) => row.id === student.id ? { ...row, ...(rollCallPoint === "start" ? { startMark: event.target.value } : { endMark: event.target.value }), present: ["PRESENT", "LATE"].includes(event.target.value) } : row))}><option value="PRESENT">Present</option><option value="LATE">Late</option><option value="ABSENT">Absent</option><option value="EXCUSED">Excused</option></select><input className="input !w-44 !py-1 text-xs" aria-label={`Roll call comment for ${student.name}`} placeholder="Comment (optional)" value={rollCallPoint === "start" ? student.startComment ?? "" : student.endComment ?? ""} onChange={(event) => setStudents((rows) => rows.map((row) => row.id === student.id ? { ...row, ...(rollCallPoint === "start" ? { startComment: event.target.value } : { endComment: event.target.value }) } : row))} /></>}{canAdmit && selected?.id && <div className="flex gap-1"><button type="button" className="btn-outline text-xs" title="Allow speaking" onClick={() => control(student.id, { canSpeak: !student.canSpeak, isMuted: Boolean(student.canSpeak) })}>{student.canSpeak ? "Allowing mic" : "Allow mic"}</button><button type="button" className="btn-outline text-xs" title="Grant or revoke presenter rights" onClick={() => control(student.id, { isPresenter: !student.isPresenter })}>{student.isPresenter ? "Revoke presenter" : "Presenter"}</button></div>}</div>)}</div>}
          {canMark && students.length > 0 && <div className="mt-4 flex items-center justify-between"><p role="status" className="text-sm text-gray-500">{message}</p><button type="button" className="btn-primary" disabled={saving || loading} onClick={save}>{saving ? "Saving…" : "Save attendance"}</button></div>}
        </section>
        {(waiting.length > 0 || canAdmit && selected?.status === "LIVE") && <section className="card"><div className="flex items-center justify-between gap-3 mb-3"><div><h2 className="font-semibold">Waiting room</h2><p className="text-xs text-gray-500">{waiting.length} student{waiting.length === 1 ? "" : "s"} waiting for entry</p></div>{canAdmit && <div className="flex gap-2"><button type="button" className="btn-outline text-xs" disabled={!waiting.length} onClick={() => admit(waiting.map((row) => row.userId))}>Admit requests</button><button type="button" className="btn-primary text-xs" onClick={admitAllEnrolled}>Admit all enrolled</button></div>}</div>{waiting.length === 0 ? <p className="text-sm text-gray-500">No current requests.</p> : <div className="divide-y divide-border">{waiting.map((row) => <div key={row.userId} className="flex items-center gap-3 py-3"><span className="flex-1 text-sm">{row.name}{row.handRaisedAt ? <span className="ml-2 text-xs text-amber-700">Raised hand</span> : null}</span><span className="text-xs font-mono text-gray-400">{row.studentNumber ?? ""}</span>{canAdmit && <button type="button" className="btn-outline text-xs" onClick={() => admit([row.userId])}>Admit</button>}</div>)}</div>}</section>}
        {raisedHands.length > 0 && <section className="card"><h2 className="font-semibold mb-2">Raised hands</h2><div className="divide-y divide-border">{raisedHands.map((row) => <div key={row.userId} className="flex items-center gap-3 py-2"><span className="flex-1 text-sm">{row.name}</span><button type="button" className="btn-outline text-xs" onClick={() => control(row.userId, { canSpeak: true, isMuted: false })}>Allow to speak</button></div>)}</div></section>}
        <section className="card"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Student presence</h2><p className="text-xs text-gray-500">Refreshes every 30 seconds. Online means a recent platform heartbeat.</p></div><p className="text-sm"><strong>{presence.online}</strong> online · <strong>{presence.inClass}</strong> in class · {presence.total} enrolled</p></div><div className="mt-3 divide-y divide-border">{presence.students.map((student) => <div key={student.id} className="flex items-center gap-3 py-2 text-sm"><span className={`w-2 h-2 rounded-full ${student.status === "in_class" ? "bg-success" : student.status === "online" ? "bg-amber-500" : "bg-gray-300"}`} /><span className="flex-1">{student.name}</span><span className="text-xs text-gray-500">{student.status.replace("_", " ")}{student.lastSeenAt ? ` · ${new Date(student.lastSeenAt).toLocaleTimeString("en-UG")}` : ""}</span></div>)}</div></section>
      </>}
    </main>
  );
}
