"use client";

import { useEffect, useState } from "react";

type SpeakStatus = "LISTEN_ONLY" | "REQUESTED" | "CAN_SPEAK";

export default function StudentJoinClass({ classId, isLive: initialIsLive, scheduledAt }: { classId: string; isLive: boolean; scheduledAt?: string }) {
  const [state, setState] = useState<"idle" | "waiting" | "admitted" | "closed">("idle");
  const [joinUrl, setJoinUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [speakStatus, setSpeakStatus] = useState<SpeakStatus>("LISTEN_ONLY");
  const [checkedIn, setCheckedIn] = useState(false);
  // Allow the component to discover that the class went live without a page reload
  const [isLive, setIsLive] = useState(initialIsLive);

  // Poll the join endpoint. When the class is live, poll every 8 seconds to track
  // admission and speak status. When the class is scheduled but starting within
  // 30 minutes, poll every 20 seconds to detect the LIVE transition.
  useEffect(() => {
    // How many ms until the scheduled start (0 if already live or no scheduledAt given)
    const msUntilStart = scheduledAt ? Math.max(0, new Date(scheduledAt).getTime() - Date.now()) : 0;
    const isNearlyLive = !isLive && msUntilStart < 30 * 60 * 1000; // within 30 minutes

    if (!isLive && !isNearlyLive) return; // far in the future — no point polling

    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/live-classes/${classId}/join`, { cache: "no-store" });
        if (!active) return;
        if (response.status === 409) {
          // 409 means the class is not live (or has ended)
          if (isLive) setState("closed");
          return;
        }
        if (response.ok) {
          const data = await response.json();
          // Class just went live — update local flag so the full join UI appears
          if (!isLive) setIsLive(true);
          setState(data.state === "admitted" ? "admitted" : data.state === "waiting" ? "waiting" : "idle");
          setJoinUrl(data.joinUrl ?? "");
          setSpeakStatus((data.speakStatus as SpeakStatus) ?? "LISTEN_ONLY");
        }
      } catch { /* retain last known state */ }
    };
    void refresh();
    const intervalMs = isLive ? 8000 : 20000;
    const timer = setInterval(refresh, intervalMs);
    return () => { active = false; clearInterval(timer); };
  }, [classId, isLive, scheduledAt]);

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

  if (!isLive) {
    const msUntilStart = scheduledAt ? new Date(scheduledAt).getTime() - Date.now() : Infinity;
    const nearlyLive = msUntilStart < 30 * 60 * 1000;
    if (nearlyLive) {
      return <span className="max-w-40 text-right text-xs text-amber-700 animate-pulse">Starting soon - checking...</span>;
    }
    return <span className="max-w-32 text-right text-xs text-gray-400">Link appears when class starts</span>;
  }

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
