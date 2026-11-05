/**
 * DemoBanner — shown at the top of every page when APP_ENV is not production.
 * Server component; reads env at build/request time.
 * Rendered fixed above the navbar; sets --banner-h CSS variable so the
 * navbar and main content offset themselves correctly.
 */
import { getAppEnv } from "@/lib/env";

/** Height of the banner in px — must match the rendered height. */
export const BANNER_H = 28;

export default function DemoBanner() {
  const env = getAppEnv();
  if (env === "production") return null;

  const label = env === "staging" ? "Staging demo" : "Development";

  return (
    <>
      {/* Set CSS variable so header and main can offset by the banner height */}
      <style>{`:root { --banner-h: ${BANNER_H}px; }`}</style>
      <div
        role="alert"
        aria-live="polite"
        className="fixed inset-x-0 top-0 w-full bg-amber-500 text-white text-xs font-semibold py-1.5 text-center px-2"
        style={{ zIndex: 60, height: BANNER_H }}
      >
        {/* Short text on narrow phones, full text on wider screens */}
        <span className="sm:hidden">
          {label} &mdash; demo only.{" "}
          <a href="/dev/login" className="underline">Accounts</a>
        </span>
        <span className="hidden sm:inline">
          {label} environment &mdash; not for real use. Data may be reset at any time.{" "}
          <a href="/dev/login" className="underline ml-1">Demo accounts</a>
        </span>
      </div>
    </>
  );
}
