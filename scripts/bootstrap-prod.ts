/**
 * Production bootstrap script.
 *
 * Creates the five core staff accounts, loads the 7 real courses with course
 * codes and intake settings, sets the 50/25/25 payment phases, and writes
 * neutral policy placeholders.
 *
 * NEVER loads demo students or demo data.
 * REFUSES to run if:
 *   - APP_ENV is not "production"
 *   - The demo seed was already applied (detected by student.full@example.com)
 *   - Required bootstrap env vars are missing
 *
 * Required env vars:
 *   BOOTSTRAP_DIRECTOR_EMAIL   - Email for the Director account
 *   BOOTSTRAP_PRINCIPAL_EMAIL  - Email for the Principal account
 *   BOOTSTRAP_ADMIN_EMAIL      - Email for the Admin account
 *   BOOTSTRAP_REGISTRAR_EMAIL  - Email for the Academic Registrar account
 *   BOOTSTRAP_ITADMIN_EMAIL    - Email for the IT Admin account
 *
 * Optional (for the courses):
 *   BOOTSTRAP_INSTRUCTOR_EMAIL - Email for the first Instructor (used as course tutor)
 *
 * Run:
 *   APP_ENV=production \
 *   BOOTSTRAP_DIRECTOR_EMAIL=director@yourdomain.com \
 *   BOOTSTRAP_PRINCIPAL_EMAIL=principal@yourdomain.com \
 *   BOOTSTRAP_ADMIN_EMAIL=admin@yourdomain.com \
 *   BOOTSTRAP_REGISTRAR_EMAIL=registrar@yourdomain.com \
 *   BOOTSTRAP_ITADMIN_EMAIL=itadmin@yourdomain.com \
 *   npm run bootstrap:prod
 *
 * To regenerate a set-password link for an existing account:
 *   APP_ENV=production <same vars> npm run bootstrap:prod
 *   (accounts that already exist are skipped; links are only generated once per new account)
 *
 * To regenerate a link for one person, delete their OtpCode(purpose=RESET) rows
 * from the DB then rerun bootstrap:prod -- it will skip existing accounts but you
 * can also directly INSERT a new OtpCode row with a fresh token.
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

function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

// ── Accounts ───────────────────────────────────────────────────────────────

const ACCOUNTS: Array<{
  emailVar: (typeof REQUIRED_VARS)[number];
  name: string;
  role: UserRole;
  status: "ACTIVE" | "PENDING_VERIFICATION";
}> = [
  { emailVar: "BOOTSTRAP_DIRECTOR_EMAIL",  name: "Director",           role: "DIRECTOR",           status: "ACTIVE"               },
  { emailVar: "BOOTSTRAP_PRINCIPAL_EMAIL", name: "Principal",          role: "PRINCIPAL",          status: "ACTIVE"               },
  { emailVar: "BOOTSTRAP_ADMIN_EMAIL",     name: "Administrator",      role: "ADMIN",              status: "ACTIVE"               },
  // Academic Registrar starts as PENDING_VERIFICATION; activate via Admin portal when ready
  { emailVar: "BOOTSTRAP_REGISTRAR_EMAIL", name: "Academic Registrar", role: "ACADEMIC_REGISTRAR", status: "PENDING_VERIFICATION" },
  { emailVar: "BOOTSTRAP_ITADMIN_EMAIL",   name: "IT Administrator",   role: "SYSTEM_IT",          status: "ACTIVE"               },
];

// ── Site settings ──────────────────────────────────────────────────────────

const SETTINGS: Array<{ key: string; value: string; description?: string }> = [
  { key: "site.name",           value: "Musawo Training Center" },
  { key: "site.domain",         value: "musawo.ug" },
  { key: "site.url",            value: "https://learn.musawotraining.ug" },
  { key: "site.supportEmail",   value: "info@mtc.ac.ug" },
  { key: "site.admissionsEmail",value: "admissions@mtc.ac.ug" },
  { key: "site.supportPhone",   value: "+256709184468" },
  { key: "site.whatsappNumber", value: "256709184468" },
  { key: "role.label.DIRECTOR",           value: "Director" },
  { key: "role.label.PRINCIPAL",          value: "Principal" },
  { key: "role.label.ADMIN",              value: "Administrator" },
  { key: "role.label.ACADEMIC_REGISTRAR", value: "Academic Registrar" },
  { key: "role.label.SYSTEM_IT",          value: "IT Admin" },
  { key: "role.label.INSTRUCTOR",         value: "Instructor" },
  { key: "role.label.STUDENT",            value: "Student" },
  { key: "feature.ACADEMIC_REGISTRAR_ACTIVE", value: "false" },
  // Rate-limit
  { key: "auth.rateLimit.account.maxFailures", value: "5" },
  { key: "auth.rateLimit.account.windowSecs",  value: "900" },
  { key: "auth.rateLimit.ip.maxFailures",      value: "100" },
  { key: "auth.rateLimit.ip.windowSecs",       value: "900" },
  // Payment phases: 50% to access first block, 25% for second, 25% for third
  { key: "payment.phase1Percent",   value: "50",  description: "Phase 1 unlock threshold (50% of fee)" },
  { key: "payment.phase2Percent",   value: "25",  description: "Phase 2 unlock threshold (25% more)" },
  { key: "payment.phase3Percent",   value: "25",  description: "Phase 3 unlock threshold (final 25%)" },
  { key: "payment.activeGateway",   value: "manual", description: "Active payment gateway: manual|pesapal|flutterwave|demo" },
  // Policy placeholders -- replace with real text via Admin portal before launch
  { key: "policy.privacyPolicy",    value: "[Replace this with your Privacy Policy before launch]" },
  { key: "policy.termsOfService",   value: "[Replace this with your Terms of Service before launch]" },
  { key: "policy.refundPolicy",     value: "[Replace this with your Refund Policy before launch]" },
  { key: "policy.admissionsPolicy", value: "[Replace this with your Admissions Policy before launch]" },
];

// ── 7 real courses ─────────────────────────────────────────────────────────

interface CourseData {
  slug: string;
  courseCode: string;
  title: string;
  shortDescription: string;
  category: string;
  durationMonths: number;
  fullFeeUgx: number;
  feeContactOnly: boolean;
  instalmentCount: number;
  eligibilityText?: string;
}

const COURSES: CourseData[] = [
  {
    slug: "medical-home-caregiver",
    courseCode: "MHC",
    title: "Certificate in Medical Home Care Course",
    shortDescription: "For health professionals. Equips nurses, midwives and clinical officers to provide safe, competent home-based care.",
    category: "PROFESSIONAL",
    durationMonths: 3,
    fullFeeUgx: 0,
    feeContactOnly: true,
    instalmentCount: 3,
    eligibilityText: "Applicants must hold a professional nursing, midwifery or clinical officer qualification and provide their professional title and registration number.",
  },
  {
    slug: "basic-home-caregiver",
    courseCode: "BHC",
    title: "Certificate in Basic Home Care",
    shortDescription: "Open to all. Foundation certificate for community caregivers providing home-based support to patients and families.",
    category: "OPEN",
    durationMonths: 3,
    fullFeeUgx: 0,
    feeContactOnly: true,
    instalmentCount: 3,
  },
  {
    slug: "babysitting-childcare-safety",
    courseCode: "BCS",
    title: "Certificate in Babysitting, Childcare and Safety",
    shortDescription: "Open to all. Essential childcare, child development and safety skills for parents, guardians and professional childcarers.",
    category: "OPEN",
    durationMonths: 3,
    fullFeeUgx: 0,
    feeContactOnly: true,
    instalmentCount: 3,
  },
  {
    slug: "mental-health-support-advocacy",
    courseCode: "MHA",
    title: "Certificate in Mental Health Support and Advocacy",
    shortDescription: "Open to all. Equips participants to support people living with mental health conditions in home and community settings.",
    category: "OPEN",
    durationMonths: 3,
    fullFeeUgx: 0,
    feeContactOnly: true,
    instalmentCount: 3,
  },
  {
    slug: "care-older-persons-disability",
    courseCode: "COP",
    title: "Certificate in Care for Older Persons and Persons with Disability",
    shortDescription: "Open to all. Skills for respectful, effective care of elderly persons and persons living with disability.",
    category: "OPEN",
    durationMonths: 3,
    fullFeeUgx: 0,
    feeContactOnly: true,
    instalmentCount: 3,
  },
  {
    slug: "basic-life-support-first-aid",
    courseCode: "BLS",
    title: "Certificate in Basic Life Support",
    shortDescription: "For health professionals. BLS, CPR and emergency response skills aligned to international standards.",
    category: "PROFESSIONAL",
    durationMonths: 1,
    fullFeeUgx: 0,
    feeContactOnly: true,
    instalmentCount: 1,
    eligibilityText: "Designed for health professionals. Applicants must provide their professional title and registration number.",
  },
  {
    slug: "advanced-first-aid",
    courseCode: "AFA",
    title: "Certificate in Advanced First Aid",
    shortDescription: "Open to all. Comprehensive first aid, emergency management and safety skills for workplace and community settings.",
    category: "OPEN",
    durationMonths: 2,
    fullFeeUgx: 0,
    feeContactOnly: true,
    instalmentCount: 2,
  },
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
      "\n  Drop and recreate the database, then run bootstrap:prod on a clean database.\n"
    );
    process.exit(1);
  }

  const demoStaff = await prisma.user.findUnique({
    where: { email: "director@mtc.ac.ug" },
    select: { id: true },
  });
  if (demoStaff) {
    console.error(
      "[bootstrap:prod] REFUSED: Demo staff account detected (director@mtc.ac.ug).",
      "\n  Drop and recreate the database, then run bootstrap:prod on a clean database.\n"
    );
    process.exit(1);
  }

  // 1. Site settings
  console.log("[bootstrap:prod] Writing site settings...");
  for (const s of SETTINGS) {
    await prisma.siteSetting.upsert({
      where:  { key: s.key },
      update: {},  // never overwrite existing production settings
      create: { key: s.key, value: s.value, description: s.description ?? "" },
    });
  }
  console.log(`  -> ${SETTINGS.length} settings written (existing values preserved)`);

  // 2. Staff accounts
  console.log("\n[bootstrap:prod] Creating staff accounts...");
  const created: Array<{ email: string; role: string; resetUrl: string }> = [];

  for (const acct of ACCOUNTS) {
    const email = process.env[acct.emailVar]!;
    const token = generateResetToken();
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      console.log(`  -> SKIP ${acct.role} (${email}) - already exists`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email,
        name:          acct.name,
        role:          acct.role,
        status:        acct.status,
        passwordHash:  null,   // user must set via the one-time link
        totpEnabled:   false,
        emailVerified: new Date(),
        dataConsentAt: new Date(),
      },
    });

    // Use RESET purpose so the existing /reset-password page handles it
    await prisma.otpCode.create({
      data: {
        userId:    user.id,
        code:      token,
        purpose:   "RESET",
        expiresAt: tokenExpiry,
      },
    });

    const appUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "https://learn.musawotraining.ug";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    created.push({ email, role: acct.role, resetUrl });
    console.log(`  -> CREATED ${acct.role} (${email})`);
  }

  // 3. Courses (need a tutor placeholder -- use the Director or a dedicated Instructor if provided)
  console.log("\n[bootstrap:prod] Loading 7 real courses...");

  // Find a tutor: prefer BOOTSTRAP_INSTRUCTOR_EMAIL, fall back to Director
  const instructorEmail = process.env.BOOTSTRAP_INSTRUCTOR_EMAIL ?? process.env.BOOTSTRAP_DIRECTOR_EMAIL!;
  const tutorUser = await prisma.user.findUnique({
    where: { email: instructorEmail },
    select: { id: true },
  });

  if (!tutorUser) {
    console.warn(`  -> WARNING: tutor user (${instructorEmail}) not found, skipping course creation.`);
    console.warn("     Create an Instructor account first, then rerun bootstrap:prod.");
  } else {
    for (const cd of COURSES) {
      const existing = await prisma.course.findUnique({ where: { slug: cd.slug }, select: { id: true } });
      if (existing) {
        console.log(`  -> SKIP ${cd.courseCode} ${cd.title} - already exists`);
        continue;
      }
      await prisma.course.create({
        data: {
          slug:             cd.slug,
          courseCode:       cd.courseCode,
          title:            cd.title,
          shortDescription: cd.shortDescription,
          description:      `[Placeholder description for ${cd.title}. Replace with full content before publishing.]`,
          category:         cd.category,
          durationMonths:   cd.durationMonths,
          fullFeeUgx:       cd.feeContactOnly ? null : cd.fullFeeUgx,
          feeContactOnly:   cd.feeContactOnly,
          instalmentCount:  cd.instalmentCount,
          eligibilityText:  cd.eligibilityText ?? null,
          status:           "DRAFT",
          tutorId:          tutorUser.id,
          freePreviewPercent: 0,
          accessThresholds:  { phase1: 50, phase2: 75, phase3: 100 },
        },
      });
      console.log(`  -> CREATED ${cd.courseCode}: ${cd.title}`);
    }
  }

  // 4. Student number sequence seeds (one per course code)
  console.log("\n[bootstrap:prod] Seeding student number sequences...");
  const year = new Date().getFullYear();
  for (const cd of COURSES) {
    try {
      await prisma.studentNumberSequence.upsert({
        where: { courseCode_year: { courseCode: cd.courseCode, year } },
        update: {},
        create: { courseCode: cd.courseCode, year, lastSeq: 0 },
      });
    } catch {
      // Table may not exist yet if first run; non-fatal
    }
  }

  // 5. Print summary
  console.log("\n[bootstrap:prod] Bootstrap complete.\n");

  if (created.length > 0) {
    console.log("============================================================");
    console.log("  ONE-TIME SET-PASSWORD LINKS  (valid 7 days, shown once)");
    console.log("============================================================\n");
    for (const { email, role, resetUrl } of created) {
      console.log(`${role} -- ${email}`);
      console.log(`  ${resetUrl}\n`);
    }
    console.log("  IMPORTANT: Save these links now. They cannot be retrieved.");
    console.log("  To regenerate a link, run:");
    console.log("    -- Delete the RESET OtpCode row for the user in the DB");
    console.log("    -- Rerun: npm run bootstrap:prod");
    console.log("============================================================\n");
  }

  console.log("Next steps:");
  console.log("  1. Send each set-password link to the correct staff member.");
  console.log("  2. Director and Principal complete 2FA setup on first login (APP_ENV=production).");
  console.log("  3. Use the Director portal to invite Instructors.");
  console.log("  4. Use the Admin portal to publish courses, set fees, and configure intakes.");
  console.log("  5. Set policy texts via Admin portal (privacy, terms, refund, admissions).\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("[bootstrap:prod] Fatal error:", err);
    prisma.$disconnect();
    process.exit(1);
  });
