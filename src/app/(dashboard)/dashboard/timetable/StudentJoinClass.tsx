"use client";

import { useEffect, useState } from "react";

type SpeakStatus = "LISTEN_ONLY" | "REQUESTED" | "CAN_SPEAK";

export default function StudentJoinClass({ classId, isLive }: { classId: string; isLive: boolean }) {
  const [state, setState] = useState<"idle" | "waiting" | "admitted" | "closed">("idle");
  const [joinUrl, setJoinUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [speakStatus, setSpeakStatus] = useState<SpeakStatus>("LISTEN_ONLY");
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    if (!isLive) return;
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/live-classes/${classId}/join`, { cache: "no-store" });
        if (!active) return;
        if (response.ok) {
          const data = await response.json();
          setState(data.state === "admitted" ? "admitted" : data.state === "waiting" ? "waiting" : "idle");
          setJoinUrl(data.joinUrl ?? "");
          setSpeakStatus((data.speakStatus as SpeakStatus) ?? "LISTEN_ONLY");
        } else if (response.status === 409) setState("closed");
      } catch { /* retain last known state */ }
    };
    void refresh();
    const timer = setInterval(refresh, 8000);
    return () => { active = false; clearInterval(timer); };
  }, [classId, isLive]);

  useEffect(() => {
    if (!tracking || !isLive) return;
    const beat = () => fetch("/api/presence/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId }), keepalive: true }).catch(() => undefined);
    void beat();
    const timer = setInterval(beat, 30_000);
    const leave = () => { void fetch("/api/presence/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId, leave: true }), keepalive: true }); };
    window.addEventListener("pagehide", leave);
    return () => { clearInterval(timer); window.removeEventListener("pagehide", leave); leave(); };
  }, [classId, isLive, tracking]);

  async function requestEntry() {
    setBusy(true);
    try {
      const response = await fetch(`/api/live-classes/${classId}/join`, { method: "POST" });
      if (response.ok) setState("waiting");
      else setState("closed");
    } finally { setBusy(false); }
  }

  async function raiseHand() {
    const response = await fetch(`/api/live-classes/${classId}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "raise_hand" }) });
    if (response.ok) setSpeakStatus("REQUESTED");
  }

  if (!isLive) return <span className="max-w-32 text-right text-xs text-gray-400">Link appears when class starts</span>;

  if (state === "admitted" && joinUrl) {
    const statusLine =
      speakStatus === "CAN_SPEAK" ? "You can speak now. The instructor enables your microphone in Google Meet."
      : speakStatus === "REQUESTED" ? "Hand raised. Waiting for the instructor to let you speak."
      : "You are in listen-only mode. Raise your hand to ask to speak.";
    const statusColor = speakStatus === "CAN_SPEAK" ? "text-green-700" : speakStatus === "REQUESTED" ? "text-amber-700" : "text-gray-500";
    return (
      <div className="flex flex-col gap-2">
        <a href={joinUrl} target="_blank" rel="noopener noreferrer" onClick={() => setTracking(true)} className="btn-primary text-xs px-4 py-2 no-underline">Join now</a>
        <div className="flex gap-1">
          <button type="button" disabled={speakStatus !== "LISTEN_ONLY"} onClick={raiseHand} className="btn-outline text-xs px-3 py-1">
            {speakStatus === "REQUESTED" ? "Hand raised" : speakStatus === "CAN_SPEAK" ? "Speaking allowed" : "Raise hand"}
          </button>
          <button type="button" disabled={checkedIn} onClick={async () => { const response = await fetch(`/api/live-classes/${classId}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "self_checkin" }) }); if (response.ok) setCheckedIn(true); }} className="btn-outline text-xs px-3 py-1">{checkedIn ? "Checked in" : "I am here"}</button>
        </div>
        <p role="status" className={`text-xs font-medium ${statusColor}`}>{statusLine}</p>
      </div>
    );
  }
  if (state === "waiting") return <span role="status" className="text-xs font-medium text-amber-700">Waiting for instructor</span>;
  if (state === "closed") return <span className="text-xs text-gray-400">Class has ended</span>;
  return <button type="button" disabled={busy} onClick={requestEntry} className="btn-primary text-xs px-4 py-2">{busy ? "Requesting…" : "Request to join"}</button>;
}
