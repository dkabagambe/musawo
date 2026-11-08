/**
 * Production environment validation.
 *
 * Called once at server startup via instrumentation.ts (Node runtime only).
 * Fails loudly with a list of all missing variables so the deployment
 * is caught before the first request is served.
 *
 * Only strict in APP_ENV=production. In development / staging some secrets
 * (Pesapal, S3, etc.) may legitimately be absent.
 */

import { getAppEnv } from "@/lib/env";

interface EnvRule {
  key: string;
  /** Short description shown in the error message. */
  description: string;
  /** Only validate when true. Defaults to always. */
  when?: () => boolean;
}

const PRODUCTION_REQUIRED: EnvRule[] = [
  { key: "AUTH_SECRET",           description: "NextAuth JWT signing secret" },
  { key: "AUTH_URL",              description: "Public app URL for NextAuth" },
  { key: "DATABASE_URL",          description: "PostgreSQL connection string" },
  { key: "REDIS_URL",             description: "Redis connection string" },
  { key: "DATA_ENCRYPTION_KEY",   description: "AES key for personal data fields" },
  { key: "TOTP_ENCRYPTION_KEY",   description: "AES key for TOTP secrets (64 hex chars)" },
  { key: "CRON_SECRET",           description: "Secret for cron-job webhook authentication" },
  {
    key: "AUTH_TRUST_HOST",
    description: "Must be 'true' when behind a reverse proxy (Render)",
    when: () => !!(process.env.AUTH_URL && !process.env.AUTH_URL.startsWith("http://localhost")),
  },
];

const SHOULD_NOT_BE_DEMO: EnvRule[] = [
  { key: "DEMO_MODE", description: "Must not be 'true' in production" },
];

export function validateProductionEnv(): void {
  const env = getAppEnv();
  if (env !== "production") return;

  const missing: string[] = [];
  const badValues: string[] = [];

  for (const rule of PRODUCTION_REQUIRED) {
    if (rule.when && !rule.when()) continue;
    const val = process.env[rule.key];
    if (!val || val.trim() === "") {
      missing.push(`  - ${rule.key}: ${rule.description}`);
    }
  }

  // TOTP_ENCRYPTION_KEY must be exactly 64 hex chars
  const totpKey = process.env.TOTP_ENCRYPTION_KEY;
  if (totpKey && !/^[0-9a-fA-F]{64}$/.test(totpKey)) {
    badValues.push("  - TOTP_ENCRYPTION_KEY: must be exactly 64 hexadecimal characters");
  }

  // DATA_ENCRYPTION_KEY must be at least 32 chars
  const dataKey = process.env.DATA_ENCRYPTION_KEY;
  if (dataKey && dataKey.length < 32) {
    badValues.push("  - DATA_ENCRYPTION_KEY: must be at least 32 characters");
  }

  for (const rule of SHOULD_NOT_BE_DEMO) {
    if (process.env[rule.key] === "true") {
      badValues.push(`  - ${rule.key}: ${rule.description}`);
    }
  }

  const errors = [...missing, ...badValues];
  if (errors.length > 0) {
    const lines = [
      "",
      "==========================================================",
      "  FATAL: Missing or invalid production environment variables",
      "==========================================================",
      "",
      ...(missing.length > 0 ? ["  Missing required variables:", ...missing, ""] : []),
      ...(badValues.length > 0 ? ["  Invalid values:", ...badValues, ""] : []),
      "  Set the above variables and redeploy.",
      "==========================================================",
      "",
    ];
    // eslint-disable-next-line no-console
    console.error(lines.join("\n"));
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log("[startup] Production env validation passed");
}
