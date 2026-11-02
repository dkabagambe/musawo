/**
 * ESM wrapper — runs the seed against a remote DATABASE_URL.
 * Usage: APP_ENV=staging DATABASE_URL="postgresql://..." node scripts/seed-remote-runner.mjs
 */
import { execSync } from "child_process";

const appEnv = process.env.APP_ENV;
if (appEnv !== "staging") {
  console.error("BLOCKED: APP_ENV must be 'staging'. Got:", appEnv);
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

console.log("Running migrations...");
execSync("node_modules/.bin/prisma migrate deploy", { stdio: "inherit" });

console.log("Running seed...");
execSync(
  `node_modules/.bin/ts-node --project tsconfig.seed.json prisma/seed.ts`,
  { stdio: "inherit" }
);

console.log("\n✓ Done.");
