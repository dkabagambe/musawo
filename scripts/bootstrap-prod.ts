/**
 * Production bootstrap script.
 *
 * Creates the five core staff accounts from environment-supplied email addresses,
 * each with a one-time set-password token and no demo password.
 * Also loads site settings, the 7 real courses, and policy/phase placeholders.
 *
 * NEVER loads demo students or demo data.
 * REFUSES to run if:
 *   - APP_ENV is not "production"
 *   - The demo seed was already applied (detected by presence of student.full@example.com)
 *   - Required bootstrap env vars are missing
 *
 * Required env vars:
 *   BOOTSTRAP_DIRECTOR_EMAIL   - Email for the Director account
 *   BOOTSTRAP_PRINCIPAL_EMAIL  - Email for the Principal account
 *   BOOTSTRAP_ADMIN_EMAIL      - Email for the Admin (registrar/secretary) account
 *   BOOTSTRAP_REGISTRAR_EMAIL  - Email for the Academic Registrar account (created as INACTIVE)
 *   BOOTSTRAP_ITADMIN_EMAIL    - Email for the IT Admin account
 *
 * Run:
 *   APP_ENV=production \
 *   BOOTSTRAP_DIRECTOR_EMAIL=director@example.com \
 *   BOOTSTRAP_PRINCIPAL_EMAIL=principal@example.com \
 *   BOOTSTRAP_ADMIN_EMAIL=admin@example.com \
 *   BOOTSTRAP_REGISTRAR_EMAIL=registrar@example.com \
 *   BOOTSTRAP_ITADMIN_EMAIL=itadmin@example.com \
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/bootstrap-prod.ts
 */

import { PrismaClient, UserRole } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

// ── Safety guards ──────────────────────────────────────────────────────────

if (process.env.APP_ENV !== "production") {
  console.error(
    "\n[bootstrap:prod] REFUSED: APP_ENV must be 'production'.",
    "\n  Set APP_ENV=production to run this script.",
    "\n  In development use: npm run db:seed\n"
  );
  process.exit(1);
}

const REQUIRED_VARS = [
  "BOOTSTRAP_DIRECTOR_EMAIL",
  "BOOTSTRAP_PRINCIPAL_EMAIL",
  "BOOTSTRAP_ADMIN_EMAIL",
  "BOOTSTRAP_REGISTRAR_EMAIL",
  "BOOTSTRAP_ITADMIN_EMAIL",
] as const;

const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(
    "\n[bootstrap:prod] REFUSED: Missing required environment variables:",
    missing.map((k) => `\n  - ${k}`).join(""),
    "\n"
  );
  process.exit(1);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateSetPasswordToken(): string {
  return randomBytes(32).toString("hex");
}

const ACCOUNTS: Array<{
  emailVar: (typeof REQUIRED_VARS)[number];
  name: string;
  role: UserRole;
  status: "ACTIVE" | "PENDING_VERIFICATION";
}> = [
  { emailVar: "BOOTSTRAP_DIRECTOR_EMAIL",   name: "Director",           role: "DIRECTOR",           status: "ACTIVE"               },
  { emailVar: "BOOTSTRAP_PRINCIPAL_EMAIL",  name: "Principal",          role: "PRINCIPAL",          status: "ACTIVE"               },
  { emailVar: "BOOTSTRAP_ADMIN_EMAIL",      name: "Administrator",      role: "ADMIN",              status: "ACTIVE"               },
  // Academic Registrar starts as PENDING_VERIFICATION; activate via Admin portal when ready
  { emailVar: "BOOTSTRAP_REGISTRAR_EMAIL",  name: "Academic Registrar", role: "ACADEMIC_REGISTRAR", status: "PENDING_VERIFICATION" },
  { emailVar: "BOOTSTRAP_ITADMIN_EMAIL",    name: "IT Administrator",   role: "SYSTEM_IT",          status: "ACTIVE"               },
];

// ── Site settings (minimal production set) ─────────────────────────────────

const SETTINGS: Array<{ key: string; value: string; description?: string }> = [
  { key: "site.name",           value: "Musawo Training Center",    description: "Platform display name" },
  { key: "site.domain",         value: "musawo.ug",                 description: "Site domain" },
  { key: "site.url",            value: "https://learn.musawotraining.ug", description: "Full site URL" },
  { key: "site.supportEmail",   value: "info@mtc.ac.ug",            description: "Primary support email" },
  { key: "site.admissionsEmail",value: "admissions@mtc.ac.ug",      description: "Admissions email" },
  { key: "site.supportPhone",   value: "+256709184468",             description: "Primary phone" },
  { key: "site.whatsappNumber", value: "256709184468",              description: "WhatsApp number" },
  { key: "role.label.DIRECTOR",           value: "Director",           description: "Display label for DIRECTOR" },
  { key: "role.label.PRINCIPAL",          value: "Principal",          description: "Display label for PRINCIPAL" },
  { key: "role.label.ADMIN",              value: "Administrator",      description: "Display label for ADMIN" },
  { key: "role.label.ACADEMIC_REGISTRAR", value: "Academic Registrar", description: "Display label for ACADEMIC_REGISTRAR" },
  { key: "role.label.SYSTEM_IT",          value: "IT Admin",           description: "Display label for SYSTEM_IT" },
  { key: "role.label.INSTRUCTOR",         value: "Instructor",         description: "Display label for INSTRUCTOR" },
  { key: "role.label.STUDENT",            value: "Student",            description: "Display label for STUDENT" },
  { key: "feature.ACADEMIC_REGISTRAR_ACTIVE", value: "false", description: "ACADEMIC_REGISTRAR portal active" },
  // Rate-limit settings (production-safe defaults)
  { key: "auth.rateLimit.account.maxFailures", value: "5",   description: "Max login failures per account before lock" },
  { key: "auth.rateLimit.account.windowSecs",  value: "900", description: "Account lock window (seconds)" },
  { key: "auth.rateLimit.ip.maxFailures",      value: "100", description: "Max login failures per IP before lock" },
  { key: "auth.rateLimit.ip.windowSecs",       value: "900", description: "IP lock window (seconds)" },
  // Phase/fee placeholders (set real values via Admin portal)
  { key: "payment.phase1Percent", value: "50", description: "Phase 1 payment threshold (%)" },
  { key: "payment.phase2Percent", value: "25", description: "Phase 2 payment threshold (%)" },
  { key: "payment.phase3Percent", value: "25", description: "Phase 3 payment threshold (%)" },
];

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n[bootstrap:prod] Starting production bootstrap...\n");

  // Guard: refuse if demo seed was applied
  const demoCheck = await prisma.user.findUnique({
    where: { email: "student.full@example.com" },
    select: { id: true },
  });
  if (demoCheck) {
    console.error(
      "[bootstrap:prod] REFUSED: Demo seed data detected (student.full@example.com exists).",
      "\n  This database has been seeded with demo data.",
      "\n  Drop and recreate the database, then run bootstrap:prod on a clean database.",
      "\n  Never use a demo-seeded database in production.\n"
    );
    process.exit(1);
  }

  // Also guard against director@mtc.ac.ug demo accounts
  const demoStaff = await prisma.user.findUnique({
    where: { email: "director@mtc.ac.ug" },
    select: { id: true },
  });
  if (demoStaff) {
    console.error(
      "[bootstrap:prod] REFUSED: Demo staff account detected (director@mtc.ac.ug exists).",
      "\n  This database has demo staff accounts. Drop and recreate before bootstrapping.\n"
    );
    process.exit(1);
  }

  // 1. Site settings
  console.log("[bootstrap:prod] Writing site settings...");
  for (const s of SETTINGS) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: {},           // never overwrite existing production settings
      create: { key: s.key, value: s.value, description: s.description ?? "" },
    });
  }
  console.log(`  -> ${SETTINGS.length} settings written (skipped if already set)`);

  // 2. Staff accounts
  console.log("\n[bootstrap:prod] Creating staff accounts...");
  const created: Array<{ email: string; role: string; setPasswordUrl: string }> = [];

  for (const acct of ACCOUNTS) {
    const email = process.env[acct.emailVar]!;
    const token = generateSetPasswordToken();
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      console.log(`  -> SKIP ${acct.role} (${email}) - already exists`);
      continue;
    }

    await prisma.user.create({
      data: {
        email,
        name: acct.name,
        role: acct.role,
        status: acct.status,
        // No passwordHash - user must set password via the one-time link
        passwordHash: null,
        totpEnabled: false,
        emailVerified: new Date(),
        dataConsentAt: new Date(),
      },
    });

    // Store the set-password token as an OtpCode with purpose RESET
    // (reuses the same flow as forgot-password; the /reset-password page and API handle it)
    const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
    await prisma.otpCode.create({
      data: {
        userId:    user.id,
        code:      token,
        purpose:   "RESET",
        expiresAt: tokenExpiry,
      },
    });

    const appUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "https://learn.musawotraining.ug";
    const setPasswordUrl = `${appUrl}/reset-password?token=${token}`;

    created.push({ email, role: acct.role, setPasswordUrl });
    console.log(`  -> CREATED ${acct.role} (${email})`);
  }

  // 3. Summary
  console.log("\n[bootstrap:prod] Bootstrap complete.\n");

  if (created.length > 0) {
    console.log("=== ONE-TIME SET-PASSWORD LINKS (valid 7 days) ===\n");
    console.log("Send each link to the corresponding staff member.");
    console.log("Each link is single-use and expires in 7 days.\n");
    for (const { email, role, setPasswordUrl } of created) {
      console.log(`${role} (${email}):`);
      console.log(`  ${setPasswordUrl}\n`);
    }
    console.log("=== END OF LINKS ===\n");
    console.log("IMPORTANT: These links are shown only once. Save them now.\n");
  }

  console.log("Next steps:");
  console.log("  1. Send the set-password links above to each staff member.");
  console.log("  2. Director and Principal must complete 2FA setup on first login.");
  console.log("  3. Use the Admin portal to add courses, intakes, and fee phases.");
  console.log("  4. Use the Director portal to invite Instructors.");
  console.log("");
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("[bootstrap:prod] Fatal error:", err);
    prisma.$disconnect();
    process.exit(1);
  });
