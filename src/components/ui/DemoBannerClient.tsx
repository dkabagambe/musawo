"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

/** Height of the banner in px - must match the rendered height. */
export const BANNER_H = 28;

/**
 * Dismissible demo banner shown at the top of every page in non-production.
 * Stores dismiss state in localStorage so it stays dismissed per browser.
 */
export default function DemoBannerClient({ label }: { label: string }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem("mtc-banner-dismissed") === "true");
    } catch {
      /* storage can be unavailable */
    }
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem("mtc-banner-dismissed", "true");
    } catch {
      /* ignore */
    }
  }

  if (dismissed) {
    return <style>{`:root { --banner-h: 0px; }`}</style>;
  }

  return (
    <>
      <style>{`:root { --banner-h: ${BANNER_H}px; }`}</style>
      <div
        role="alert"
        aria-live="polite"
        className="fixed inset-x-0 top-0 w-full bg-amber-500 text-white text-xs font-semibold py-1.5 text-center px-2 flex items-center justify-center gap-2"
        style={{ zIndex: 60, height: BANNER_H }}
      >
        <span className="sm:hidden flex-1 text-left">
          {label} - demo only.{" "}
          <a href="/dev/login" className="underline">Accounts</a>
        </span>
        <span className="hidden sm:inline flex-1">
          {label} environment, not for real use. Data may be reset at any time.{" "}
          <a href="/dev/login" className="underline ml-1">Demo accounts</a>
        </span>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          title="Dismiss"
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-white/20 transition-colors"
        >
          <X size={14} className="text-white" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
