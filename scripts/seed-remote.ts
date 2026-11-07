/**
 * seed:remote — run prisma migrate deploy then the demo seed against DATABASE_URL.
 * Only permitted when APP_ENV=staging.
 *
 * Usage:
 *   APP_ENV=staging DATABASE_URL="postgresql://..." npm run seed:remote
 */

import { execSync } from "child_process";

const appEnv = process.env.APP_ENV;

if (appEnv !== "staging") {
  console.error(
    "\n" +
    "╔══════════════════════════════════════════════════════════════╗\n" +
    "║  BLOCKED: seed:remote refused to run.                        ║\n" +
    "║  APP_ENV must be exactly \"staging\".                          ║\n" +
    "║  Current APP_ENV = " + String(appEnv).padEnd(40) + "║\n" +
    "║                                                              ║\n" +
    "║  This script will wipe and reseed the database.              ║\n" +
    "║  Never run it against a production database.                 ║\n" +
    "╚══════════════════════════════════════════════════════════════╝\n"
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

console.log("APP_ENV=staging — proceeding with remote seed.");
console.log("DATABASE_URL target:", process.env.DATABASE_URL.replace(/:\/\/[^@]+@/, "://<credentials>@"));

console.log("\n[1/3] Running prisma migrate deploy...");
execSync("npx prisma migrate deploy", { stdio: "inherit" });

console.log("\n[2/3] Running prisma db seed (base)...");
execSync("npx prisma db seed", { stdio: "inherit" });

console.log("\n[3/3] Running seed-topup (35+ students, live classes, all role demo data)...");
execSync(
  "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed-topup.ts",
  { stdio: "inherit" },
);

console.log("\n✓ Remote seed complete (base + topup).");
