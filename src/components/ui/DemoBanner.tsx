/**
 * DemoBanner - shown at the top of every page when APP_ENV is not production.
 * Server component; reads env at build/request time and delegates to the
 * dismissible client component.
 */
import { getAppEnv } from "@/lib/env";
import DemoBannerClient from "./DemoBannerClient";

export const BANNER_H = 28;

export default function DemoBanner() {
  const env = getAppEnv();
  if (env === "production") return null;

  const label = env === "staging" ? "Staging demo" : "Development";

  return <DemoBannerClient label={label} />;
}
