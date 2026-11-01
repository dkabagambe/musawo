/**
 * Central environment helpers.
 * APP_ENV: "development" | "staging" | "production"
 * NODE_ENV is Next.js/build-time; APP_ENV is our runtime environment signal.
 */

export type AppEnv = "development" | "staging" | "production";

export function getAppEnv(): AppEnv {
  const v = process.env.APP_ENV;
  if (v === "staging" || v === "production") return v;
  return "development"; // default safe
}

/** Demo features (dev/login, demo payments, TOTP bypass) are permitted. */
export function isDemoAllowed(): boolean {
  const env = getAppEnv();
  return env === "development" || env === "staging";
}

/** Refuse to start demo features in production with a loud error. */
export function assertDemoAllowed(feature: string): void {
  if (!isDemoAllowed()) {
    throw new Error(
      `[SECURITY] Demo feature "${feature}" is disabled in APP_ENV=production. ` +
      `Do not enable demo features on a production deployment.`
    );
  }
}

export function isProduction(): boolean {
  return getAppEnv() === "production";
}
