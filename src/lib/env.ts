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

/**
 * Whether mandatory TOTP setup is enforced for DIRECTOR and PRINCIPAL.
 *
 * True when:
 *   - APP_ENV=production  (always enforced in production)
 *   - TOTP_REQUIRED=true  (explicitly forced, e.g. on staging for testing)
 *
 * False (default) in development and staging so demo Director/Principal
 * accounts can log in without a TOTP app.
 */
export function isTotpEnforced(): boolean {
  if (isProduction()) return true;
  return process.env.TOTP_REQUIRED === "true";
}
