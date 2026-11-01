/**
 * DemoBanner — shown at the top of every page when APP_ENV is not production.
 * Server component; reads env at build/request time.
 */
import { getAppEnv } from "@/lib/env";

export default function DemoBanner() {
  const env = getAppEnv();
  if (env === "production") return null;

  const label = env === "staging" ? "Staging demo" : "Development";

  return (
    <div
      role="alert"
      aria-live="polite"
      className="w-full bg-amber-500 text-white text-xs font-semibold py-1.5 text-center z-50"
    >
      {label} environment &mdash; not for real use. Data may be reset at any time.{" "}
      <a href="/dev/login" className="underline ml-1">
        Demo accounts
      </a>
    </div>
  );
}
