"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

interface ExamWaitingRoomProps {
  examTitle: string;
  courseTitle: string;
  startWindowAt: string; // ISO string
}

export default function ExamWaitingRoom({
  examTitle,
  courseTitle,
  startWindowAt,
}: ExamWaitingRoomProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const target = new Date(startWindowAt).getTime();

    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) {
        setCountdown("00:00:00");
        setOpen(true);
        return;
      }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startWindowAt]);

  // Auto-refresh the page when the exam opens so the server re-checks the window.
  useEffect(() => {
    if (open) {
      router.refresh();
    }
  }, [open, router]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-border shadow-sm text-center py-14 px-8">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>

        <h1 className="text-xl font-bold text-primary mb-1">{examTitle}</h1>
        <p className="text-sm text-gray-500 mb-8">{courseTitle}</p>

        {open ? (
          <p className="text-sm text-success font-semibold mb-6">The exam is now open. Reloading...</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">Exam starts in</p>
            <p
              className="font-mono text-5xl font-extrabold text-primary tracking-tight mb-8"
              aria-live="polite"
              aria-label={`Countdown: ${countdown}`}
            >
              {countdown}
            </p>
            <ul className="text-sm text-gray-500 text-left mb-8 space-y-1.5 inline-block max-w-sm">
              <li>Stay on this page - it will update when the exam opens.</li>
              <li>Close other tabs to avoid tab-switch warnings.</li>
              <li>Make sure your internet connection is stable.</li>
              <li>Questions are forward-only: you cannot go back once you move on.</li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
