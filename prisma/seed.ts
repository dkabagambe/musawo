/**
 * Musawo Training Center - Comprehensive Demo Seed
 *
 * Wipes and rebuilds all demo data. Safe to run repeatedly (upsert-first,
 * then bulk-creates rich data only when tables are empty).
 *
 * Run:  npx prisma db seed
 */

import {
  PrismaClient,
  UserRole,
  EnrolmentStatus,
  PaymentStatus,
  PaymentGateway,
  PaymentMethod,
  LedgerEntryType,
  AuditAction,
  ClaimStatus,
  ApprovalRequestStatus,
  ApprovalRequestType,
  LiveClassStatus,
  ExamStatus,
  AttemptStatus,
  TicketStatus,
  TicketPriority,
  SubmissionStatus,
} from "@prisma/client";
import { hash } from "argon2";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();
const ARGON2_OPTIONS = { type: 2 as const, memoryCost: 65536, timeCost: 3, parallelism: 1 };

// ─── Date helpers ─────────────────────────────────────────────────
const now = new Date();
const daysAgo  = (d: number) => new Date(now.getTime() - d * 86400000);
const daysFrom = (d: number) => new Date(now.getTime() + d * 86400000);
const weeksAgo  = (w: number) => daysAgo(w * 7);
const weeksFrom = (w: number) => daysFrom(w * 7);
const monthsAgo = (m: number) => daysAgo(m * 30);

// Single shared demo password for all accounts
const DEMO_PW = "Demo1234!";

async function pw(plain: string) {
  return hash(plain, ARGON2_OPTIONS);
}

// ─── Site Settings ────────────────────────────────────────────────
const SETTINGS: Array<{ key: string; value: string; description?: string }> = [
  { key: "site.name",            value: "Musawo Training Center",  description: "Platform display name" },
  { key: "site.domain",          value: "learn.musawotraining.ug", description: "Platform domain" },
  { key: "site.supportEmail",    value: "info@musawo.ug",          description: "Support email address" },
  { key: "site.supportPhone",    value: "+256 785 423 523",        description: "Support phone number" },
  { key: "site.whatsappNumber",  value: "256785423523",            description: "WhatsApp number (digits only)" },
  { key: "site.address",         value: "Plot 5, ADFA Building, Zone 8 Lungujja, Kampala, Uganda", description: "Physical address" },
  { key: "site.instagramUrl",    value: "https://www.instagram.com/musawotm",  description: "Instagram URL" },
  { key: "site.tiktokUrl",       value: "https://www.tiktok.com/@musawoadfa",  description: "TikTok URL" },
  { key: "site.tagline",         value: "Bringing quality healthcare to Ugandan homes and communities since 2018 through testing, treatment, training and trust.", description: "Footer tagline" },
  { key: "course.freePreviewPercent", value: "12",                 description: "% of lessons free before payment" },
  { key: "payment.gateway",      value: "demo",                    description: "Active payment gateway" },
  { key: "payment.currency",     value: "UGX",                     description: "Currency code" },
  { key: "payment.pesapalConsumerKey",    value: "DEMO_KEY",       description: "Pesapal v3 consumer key" },
  { key: "payment.pesapalConsumerSecret", value: "DEMO_SECRET",    description: "Pesapal v3 consumer secret" },
  { key: "payment.pesapalCallbackUrl",    value: "/api/webhooks/pesapal", description: "Pesapal IPN URL" },
  { key: "payment.flutterwaveSecretKey",  value: "FLWSECK_TEST-demo", description: "Flutterwave secret key" },
  { key: "payment.bankAccountName",   value: "Musawo Training Center",       description: "Bank account name" },
  { key: "payment.bankAccountNumber", value: "3100 4423 5678",               description: "Bank account number" },
  { key: "payment.bankName",          value: "Centenary Bank Uganda",        description: "Bank name" },
  { key: "payment.bankBranch",        value: "Kampala Road Branch",          description: "Bank branch" },
  { key: "video.bunnyStreamApiKey",   value: "DEMO_BUNNY_KEY",    description: "Bunny Stream API key" },
  { key: "video.bunnyLibraryId",      value: "123456",            description: "Bunny Stream library ID" },
  { key: "video.bunnySigningKey",     value: "DEMO_SIGNING_KEY",  description: "Bunny signed-URL key" },
  { key: "storage.s3Endpoint",        value: "https://demo.r2.cloudflarestorage.com", description: "S3-compatible endpoint" },
  { key: "storage.s3Bucket",          value: "mtc-files",         description: "S3 bucket name" },
  { key: "storage.s3AccessKey",       value: "DEMO_S3_KEY",       description: "S3 access key ID" },
  { key: "storage.s3SecretKey",       value: "DEMO_S3_SECRET",    description: "S3 secret access key" },
  { key: "email.resendApiKey",        value: "re_DEMO_KEY",       description: "Resend API key" },
  { key: "sms.provider",              value: "africas-talking",   description: "SMS provider" },
  { key: "sms.apiKey",                value: "DEMO_AT_KEY",       description: "SMS API key" },
  { key: "sms.senderId",              value: "MUSAWO",            description: "SMS sender ID" },
  { key: "whatsapp.accessToken",      value: "DEMO_WA_TOKEN",     description: "WhatsApp Business Cloud token" },
  { key: "whatsapp.phoneNumberId",    value: "DEMO_WA_PHONE_ID",  description: "WhatsApp Business phone number ID" },
  { key: "partner.defaultName",       value: "Musawo",            description: "Default partner name" },
  { key: "exam.tabSwitchAlertThreshold", value: "3",              description: "Tab switches before alert" },
  { key: "exam.defaultAttemptLimit",  value: "2",                 description: "Default exam attempt limit" },
  { key: "certificate.issuerName",    value: "Musawo Training Center", description: "Certificate issuer text" },
  { key: "intake.currentLabel",       value: "Intake 7 - November 2026", description: "Current intake label" },
];

// ─── Student profiles ─────────────────────────────────────────────
const STUDENT_DEFS = [
  { key: "new",       name: "Harriet Namutebi",   email: "student.new@example.com",       phone: "+256700111001", status: EnrolmentStatus.PENDING_PAYMENT, paidPct: 0   },
  { key: "pending",   name: "Moses Okello",        email: "student.pending@example.com",   phone: "+256700111002", status: EnrolmentStatus.PENDING_PAYMENT, paidPct: 0   },
  { key: "25",        name: "Scovia Akullo",       email: "student.25@example.com",        phone: "+256700111003", status: EnrolmentStatus.PARTIALLY_PAID,  paidPct: 33  },
  { key: "50",        name: "Paul Opio",           email: "student.50@example.com",        phone: "+256700111004", status: EnrolmentStatus.PARTIALLY_PAID,  paidPct: 67  },
  { key: "75",        name: "Florence Akello",     email: "student.75@example.com",        phone: "+256700111005", status: EnrolmentStatus.ACTIVE,          paidPct: 100 },
  { key: "full",      name: "Ronald Mugisha",      email: "student.full@example.com",      phone: "+256700111006", status: EnrolmentStatus.ACTIVE,          paidPct: 100 },
  { key: "overdue",   name: "Grace Nalubega",      email: "student.overdue@example.com",   phone: "+256700111007", status: EnrolmentStatus.OVERDUE,         paidPct: 33  },
  { key: "sponsored", name: "Annet Aber",          email: "student.sponsored@example.com", phone: "+256700111008", status: EnrolmentStatus.SPONSORED,       paidPct: 100 },
  { key: "completed", name: "James Ssemwogerere", email: "student.completed@example.com", phone: "+256700111009", status: EnrolmentStatus.COMPLETED,       paidPct: 100 },
];

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding Musawo Training Center demo database…\n");

  // ── Site Settings ──────────────────────────────────────────────
  for (const s of SETTINGS) {
    await prisma.siteSetting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s });
  }
  console.log("  ✓ Site settings (37)");

  // ── Staff accounts ─────────────────────────────────────────────
  const hashedPw = await pw(DEMO_PW);

  const ceo = await prisma.user.upsert({
    where: { email: "ceo@musawotraining.ug" },
    update: {},
    create: {
      name: "Dr. Samuel Okwii",
      email: "ceo@musawotraining.ug",
      passwordHash: hashedPw,
      role: UserRole.SUPERADMIN,
      status: "ACTIVE",
      totpEnabled: false,
      emailVerified: new Date(),
      dataConsentAt: new Date(),
    },
  });

  const deputy = await prisma.user.upsert({
    where: { email: "deputy@musawotraining.ug" },
    update: {},
    create: {
      name: "Beatrice Nansamba",
      email: "deputy@musawotraining.ug",
      passwordHash: hashedPw,
      role: UserRole.SUPERADMIN,
      status: "ACTIVE",
      totpEnabled: false,
      emailVerified: new Date(),
      dataConsentAt: new Date(),
    },
  });

  const itadmin = await prisma.user.upsert({
    where: { email: "itadmin@musawotraining.ug" },
    update: {},
    create: {
      name: "Brian Ochieng",
      email: "itadmin@musawotraining.ug",
      passwordHash: hashedPw,
      role: UserRole.SYSTEM_IT,
      status: "ACTIVE",
      emailVerified: new Date(),
      dataConsentAt: new Date(),
    },
  });

  const registrar = await prisma.user.upsert({
    where: { email: "registrar@musawotraining.ug" },
    update: {},
    create: {
      name: "Diana Nakiganda",
      email: "registrar@musawotraining.ug",
      passwordHash: hashedPw,
      role: UserRole.REGISTRAR,
      status: "ACTIVE",
      emailVerified: new Date(),
      dataConsentAt: new Date(),
    },
  });

  const bursar = await prisma.user.upsert({
    where: { email: "bursar@musawotraining.ug" },
    update: {},
    create: {
      name: "Joseph Waiswa",
      email: "bursar@musawotraining.ug",
      passwordHash: hashedPw,
      role: UserRole.BURSAR,
      status: "ACTIVE",
      emailVerified: new Date(),
      dataConsentAt: new Date(),
    },
  });

  const tutor = await prisma.user.upsert({
    where: { email: "tutor@musawotraining.ug" },
    update: {},
    create: {
      name: "Grace Nakato",
      email: "tutor@musawotraining.ug",
      passwordHash: hashedPw,
      role: UserRole.TUTOR,
      status: "ACTIVE",
      emailVerified: new Date(),
      dataConsentAt: new Date(),
    },
  });

  const tutor2 = await prisma.user.upsert({
    where: { email: "tutor2@musawotraining.ug" },
    update: {},
    create: {
      name: "Peter Lukwago",
      email: "tutor2@musawotraining.ug",
      passwordHash: hashedPw,
      role: UserRole.TUTOR,
      status: "ACTIVE",
      emailVerified: new Date(),
      dataConsentAt: new Date(),
    },
  });

  console.log("  ✓ Staff accounts (CEO, deputy, IT, registrar, bursar, 2 tutors)");

  // ── Students ───────────────────────────────────────────────────
  const students: Record<string, Awaited<ReturnType<typeof prisma.user.upsert>>> = {};
  const STUDENT_SNS: Record<string, string> = {
    new:       "MTC-2026-00001",
    pending:   "MTC-2026-00002",
    "25":      "MTC-2026-00003",
    "50":      "MTC-2026-00004",
    "75":      "MTC-2026-00005",
    full:      "MTC-2026-00006",
    overdue:   "MTC-2026-00007",
    sponsored: "MTC-2026-00008",
    completed: "MTC-2026-00009",
  };
  for (const def of STUDENT_DEFS) {
    const sn = STUDENT_SNS[def.key];
    // Check if student number is taken by a different user before upsert
    const snConflict = await prisma.user.findUnique({ where: { studentNumber: sn } });
    const emailExists = await prisma.user.findUnique({ where: { email: def.email } });
    if (snConflict && snConflict.email !== def.email) {
      // Clear conflicting student number so our upsert can proceed
      await prisma.user.update({ where: { id: snConflict.id }, data: { studentNumber: null } });
    }
    students[def.key] = await prisma.user.upsert({
      where: { email: def.email },
      update: { studentNumber: emailExists?.studentNumber ?? sn },
      create: {
        name: def.name,
        email: def.email,
        phone: def.phone,
        passwordHash: hashedPw,
        studentNumber: sn,
        role: UserRole.STUDENT,
        status: "ACTIVE",
        emailVerified: new Date(),
        dataConsentAt: new Date(),
      },
    });
  }
  // tutor2 also has a STUDENT enrolment (dual-role demo)
  // We give them a studentNumber for the demo
  await prisma.user.update({
    where: { id: tutor2.id },
    data: { studentNumber: `MTC-2026-00010` },
  });

  console.log(`  ✓ Students (${STUDENT_DEFS.length})`);

  // ── Courses ────────────────────────────────────────────────────
  const courses: Record<string, Awaited<ReturnType<typeof prisma.course.upsert>>> = {};

  const COURSE_DEFS = [
    {
      slug: "cna",
      title: "Certified Nursing Care Assistant (CNA)",
      shortDescription: "Our flagship certification equips learners with practical skills to work as qualified nursing care assistants in homes, hospitals, clinics, and community care settings across Uganda.",
      description: `Our flagship certification provides a comprehensive foundation for nursing care work across Uganda. Every person we certify becomes a new strand in Uganda's community health safety net.\n\nWhat you will learn:\n- Patient-centred care and compassionate communication\n- Safety practices and infection prevention and control\n- Hygiene and personal care support for patients\n- Basic clinical procedures and medication support\n- Care for elderly patients and those living with chronic conditions\n- Professional conduct and ethics in healthcare settings\n\nGraduates receive a nationally recognised certificate accredited by Uganda's Ministry of Health and Ministry of Education and Sports. Musawo connects graduates to employment opportunities locally and internationally through its growing network of healthcare partners.`,
      fullFeeUgx: 850000,
      instalmentCount: 3,
      thumbnailUrl: "/assets/images/cna-course.png",
      freePreviewPercent: 12,
      durationWeeks: 12,
      accreditationText: "Accredited by Uganda Ministry of Health and Ministry of Education and Sports",
      tutorId: tutor.id,
    },
    {
      slug: "basic-nursing-care",
      title: "Basic Nursing Care Assistant",
      shortDescription: "An accessible, practical entry point into healthcare work for learners who want to begin serving patients quickly with a strong, recognised foundation in patient care.",
      description: `An accessible, practical entry point into healthcare work. This course is designed for learners who want to begin serving patients quickly with a strong, recognised foundation in patient care.\n\nWhat you will learn:\n- Essential patient care and daily support skills\n- Safety, hygiene, and basic clinical practices\n- Professional conduct and communication in care settings\n- Supporting healthcare teams in clinics and home environments\n- First aid and basic emergency response\n\nGraduates receive a nationally recognised certificate and are eligible for placement support through the Musawo network.`,
      fullFeeUgx: 600000,
      instalmentCount: 2,
      thumbnailUrl: "/assets/images/basic-nursing.png",
      freePreviewPercent: 12,
      durationWeeks: 8,
      accreditationText: "Accredited by Uganda Ministry of Health and Ministry of Education and Sports",
      tutorId: tutor.id,
    },
    {
      slug: "child-care-safety",
      title: "Babysitting, Child Care and Safety Management",
      shortDescription: "For anyone stepping into a childcare role - child development, daily care routines, first aid, and safety management in home and community care environments.",
      description: `Children need attentive, informed carers who understand their development and can keep them safe. This course is for anyone stepping into a childcare role - as a professional carer, a family member, or someone seeking to work with children in community settings.\n\nWhat you will learn:\n- Child development basics and age-appropriate care practices\n- Daily care routines: feeding, hygiene, rest, and stimulation\n- Recognising signs of illness, injury, or distress in children\n- First aid and emergency response for infants and children\n- Safety management in home and community care environments\n\nGraduates receive a nationally recognised certificate accredited by Uganda's Ministry of Education and Sports.`,
      fullFeeUgx: 480000,
      instalmentCount: 1,
      thumbnailUrl: "/assets/images/first-aid-child-safety.jpg",
      freePreviewPercent: 15,
      durationWeeks: 6,
      accreditationText: "Accredited by Uganda Ministry of Education and Sports",
      tutorId: tutor2.id,
    },
  ];

  for (const cd of COURSE_DEFS) {
    courses[cd.slug] = await prisma.course.upsert({
      where: { slug: cd.slug },
      update: {
        fullFeeUgx: cd.fullFeeUgx,
        instalmentCount: cd.instalmentCount,
        thumbnailUrl: cd.thumbnailUrl,
      },
      create: { ...cd, status: "PUBLISHED" },
    });
  }

  // ── Blocks + Lessons ──────────────────────────────────────────
  const allBlocks: Record<string, Array<{id: string; order: number; courseId: string}>> = {};

  const BLOCK_DEFS: Record<string, Array<{
    order: number; title: string; description: string;
    lessons: Array<{ order: number; title: string; type: string; isFree: boolean; isFreePreview: boolean; durationSec: number; notesContent?: string }>
  }>> = {
    "cna": [
      {
        order: 1, title: "Foundations of Nursing Care",
        description: "Introduction to nursing care, patient dignity, and healthcare settings in Uganda.",
        lessons: [
          { order: 1, title: "Welcome and course overview", type: "VIDEO", isFree: true,  isFreePreview: true,  durationSec: 420,  notesContent: "Welcome to the CNA course. This module introduces you to the world of nursing care in Uganda." },
          { order: 2, title: "What is nursing care?",        type: "NOTES", isFree: true,  isFreePreview: true,  durationSec: 600,  notesContent: "Nursing care involves assisting patients with daily activities, administering medications under supervision, and providing emotional support. In Uganda, CNAs work in homes, clinics, and hospitals." },
          { order: 3, title: "The healthcare system in Uganda", type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 780  },
          { order: 4, title: "Patient rights and dignity",   type: "NOTES", isFree: false, isFreePreview: false, durationSec: 540  },
          { order: 5, title: "Block 1 quiz",                 type: "QUIZ",  isFree: false, isFreePreview: false, durationSec: 900  },
        ],
      },
      {
        order: 2, title: "Infection Prevention and Control",
        description: "Hand hygiene, PPE, waste disposal, and preventing healthcare-associated infections.",
        lessons: [
          { order: 1, title: "Standard precautions",          type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 900  },
          { order: 2, title: "Hand hygiene technique",        type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 480  },
          { order: 3, title: "PPE and waste management",      type: "NOTES", isFree: false, isFreePreview: false, durationSec: 720  },
          { order: 4, title: "Infection control practice",    type: "QUIZ",  isFree: false, isFreePreview: false, durationSec: 600  },
        ],
      },
      {
        order: 3, title: "Personal Care and Hygiene",
        description: "Bathing, oral care, dressing, and maintaining patient dignity.",
        lessons: [
          { order: 1, title: "Assisting with personal care",  type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 840  },
          { order: 2, title: "Oral hygiene and grooming",     type: "NOTES", isFree: false, isFreePreview: false, durationSec: 600  },
          { order: 3, title: "Bathing techniques",            type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 720  },
          { order: 4, title: "Personal care quiz",            type: "QUIZ",  isFree: false, isFreePreview: false, durationSec: 600  },
        ],
      },
      {
        order: 4, title: "Vital Signs and Basic Observations",
        description: "Temperature, pulse, respiration, blood pressure and documentation.",
        lessons: [
          { order: 1, title: "Taking temperature and pulse",  type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 960  },
          { order: 2, title: "Blood pressure monitoring",     type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 780  },
          { order: 3, title: "Documentation and reporting",   type: "NOTES", isFree: false, isFreePreview: false, durationSec: 540  },
          { order: 4, title: "Vital signs quiz",              type: "QUIZ",  isFree: false, isFreePreview: false, durationSec: 600  },
        ],
      },
      {
        order: 5, title: "Care for Elderly and Vulnerable Patients",
        description: "Special considerations when caring for elderly, disabled, or vulnerable patients.",
        lessons: [
          { order: 1, title: "Understanding elderly care needs", type: "NOTES", isFree: false, isFreePreview: false, durationSec: 720 },
          { order: 2, title: "Mobility assistance and fall prevention", type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 900 },
          { order: 3, title: "Dementia and mental health basics", type: "NOTES", isFree: false, isFreePreview: false, durationSec: 600 },
          { order: 4, title: "Elderly care assessment quiz",  type: "QUIZ",  isFree: false, isFreePreview: false, durationSec: 600  },
        ],
      },
    ],
    "basic-nursing-care": [
      {
        order: 1, title: "Introduction to Patient Care",
        description: "Core concepts of basic nursing care and professional conduct.",
        lessons: [
          { order: 1, title: "Welcome and introduction",        type: "VIDEO", isFree: true,  isFreePreview: true,  durationSec: 360  },
          { order: 2, title: "Patient-centred care principles", type: "NOTES", isFree: true,  isFreePreview: true,  durationSec: 480  },
          { order: 3, title: "Communication in care settings",  type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 720  },
          { order: 4, title: "Professional ethics",             type: "NOTES", isFree: false, isFreePreview: false, durationSec: 540  },
          { order: 5, title: "Introduction quiz",               type: "QUIZ",  isFree: false, isFreePreview: false, durationSec: 600  },
        ],
      },
      {
        order: 2, title: "Safety and Basic Clinical Procedures",
        description: "Safe patient handling, vital signs, and basic clinical tasks.",
        lessons: [
          { order: 1, title: "Safe patient handling",           type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 840  },
          { order: 2, title: "Taking basic vital signs",        type: "NOTES", isFree: false, isFreePreview: false, durationSec: 600  },
          { order: 3, title: "Wound care basics",               type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 780  },
          { order: 4, title: "Safety quiz",                     type: "QUIZ",  isFree: false, isFreePreview: false, durationSec: 600  },
        ],
      },
      {
        order: 3, title: "First Aid and Emergency Response",
        description: "Recognising emergencies and providing immediate first aid.",
        lessons: [
          { order: 1, title: "Recognising an emergency",        type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 600  },
          { order: 2, title: "CPR and basic life support",      type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 1200 },
          { order: 3, title: "Choking and burns",               type: "NOTES", isFree: false, isFreePreview: false, durationSec: 480  },
          { order: 4, title: "Emergency response quiz",         type: "QUIZ",  isFree: false, isFreePreview: false, durationSec: 600  },
        ],
      },
    ],
    "child-care-safety": [
      {
        order: 1, title: "Child Development Basics",
        description: "Understanding child development stages and age-appropriate care.",
        lessons: [
          { order: 1, title: "Welcome and course overview",     type: "VIDEO", isFree: true,  isFreePreview: true,  durationSec: 300  },
          { order: 2, title: "Child development stages",        type: "NOTES", isFree: true,  isFreePreview: true,  durationSec: 540  },
          { order: 3, title: "Age-appropriate activities",      type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 660  },
          { order: 4, title: "Development quiz",                type: "QUIZ",  isFree: false, isFreePreview: false, durationSec: 480  },
        ],
      },
      {
        order: 2, title: "Daily Care Routines",
        description: "Feeding, hygiene, rest routines for infants and young children.",
        lessons: [
          { order: 1, title: "Feeding and nutrition",           type: "NOTES", isFree: false, isFreePreview: false, durationSec: 540  },
          { order: 2, title: "Hygiene and bathing infants",     type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 720  },
          { order: 3, title: "Sleep routines and safety",       type: "NOTES", isFree: false, isFreePreview: false, durationSec: 480  },
          { order: 4, title: "Daily care quiz",                 type: "QUIZ",  isFree: false, isFreePreview: false, durationSec: 480  },
        ],
      },
      {
        order: 3, title: "First Aid and Safety Management",
        description: "Emergency first aid for infants and children, and safety in the home.",
        lessons: [
          { order: 1, title: "First aid for infants",           type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 900  },
          { order: 2, title: "Home safety hazards",             type: "NOTES", isFree: false, isFreePreview: false, durationSec: 480  },
          { order: 3, title: "Recognising child distress",      type: "VIDEO", isFree: false, isFreePreview: false, durationSec: 540  },
          { order: 4, title: "Safety management quiz",          type: "QUIZ",  isFree: false, isFreePreview: false, durationSec: 480  },
        ],
      },
    ],
  };

  for (const [slug, blockDefs] of Object.entries(BLOCK_DEFS)) {
    const courseId = courses[slug].id;
    allBlocks[slug] = [];
    for (const bd of blockDefs) {
      let block = await prisma.block.findFirst({ where: { courseId, order: bd.order } });
      if (!block) {
        block = await prisma.block.create({
          data: { courseId, order: bd.order, title: bd.title, description: bd.description },
        });
      }
      allBlocks[slug].push({ id: block.id, order: block.order, courseId });
      for (const ld of bd.lessons) {
        const exists = await prisma.lesson.findFirst({ where: { blockId: block.id, order: ld.order } });
        if (!exists) {
          await prisma.lesson.create({
            data: {
              blockId: block.id, order: ld.order, title: ld.title,
              type: ld.type as "VIDEO" | "NOTES" | "QUIZ",
              isFree: ld.isFree, isFreePreview: ld.isFreePreview,
              durationSec: ld.durationSec,
            },
          });
        }
      }
    }
  }

  console.log("  ✓ Courses (3) with blocks and lessons");

  // ── Intakes ───────────────────────────────────────────────────
  const intake1 = await prisma.intake.upsert({
    where: { id: "intake-running" },
    update: {},
    create: {
      id: "intake-running",
      courseId: courses["cna"].id,
      label: "Intake 6 - August 2026",
      startDate: monthsAgo(3),
      endDate: weeksFrom(9),
      seats: 40,
      scholarshipSeats: 5,
      isOpen: true,
    },
  });

  const intake2 = await prisma.intake.upsert({
    where: { id: "intake-upcoming" },
    update: {},
    create: {
      id: "intake-upcoming",
      courseId: courses["cna"].id,
      label: "Intake 7 - November 2026",
      startDate: weeksFrom(3),
      endDate: weeksFrom(15),
      seats: 40,
      scholarshipSeats: 5,
      isOpen: true,
    },
  });

  const intakeBasic = await prisma.intake.upsert({
    where: { id: "intake-basic" },
    update: {},
    create: {
      id: "intake-basic",
      courseId: courses["basic-nursing-care"].id,
      label: "Intake 4 - September 2026",
      startDate: monthsAgo(2),
      endDate: weeksFrom(6),
      seats: 30,
      scholarshipSeats: 3,
      isOpen: true,
    },
  });

  console.log("  ✓ Intakes (3)");

  // ── Enrolments ────────────────────────────────────────────────
  // Skip if already seeded to allow re-runs
  const existingEnrolments = await prisma.enrolment.count();
  const enrolments: Record<string, Awaited<ReturnType<typeof prisma.enrolment.create>>> = {};

  if (existingEnrolments === 0) {
    const cnaFee = courses["cna"].fullFeeUgx;
    const instalment = Math.ceil(cnaFee / 3);

    for (const def of STUDENT_DEFS) {
      const student = students[def.key];
      const paidAmount = Math.round((def.paidPct / 100) * cnaFee);

      const enr = await prisma.enrolment.create({
        data: {
          userId: student.id,
          courseId: courses["cna"].id,
          intakeId: intake1.id,
          status: def.status,
          planType: def.paidPct === 100 ? "FULL" : def.paidPct === 0 ? "FULL" : "INSTALMENT",
          totalAmountUgx: cnaFee,
          paidAmountUgx: paidAmount,
          paidPercent: def.paidPct,
          unlockedBlockOrder: def.paidPct >= 100 ? 5 : def.paidPct >= 67 ? 3 : def.paidPct >= 33 ? 2 : 1,
          overdueSince: def.status === EnrolmentStatus.OVERDUE ? daysAgo(14) : null,
          graceUntil: def.status === EnrolmentStatus.OVERDUE ? daysFrom(7) : null,
        },
      });
      enrolments[def.key] = enr;

      // Instalment rows
      if (def.paidPct > 0 || def.status === EnrolmentStatus.PENDING_PAYMENT) {
        for (let i = 1; i <= 3; i++) {
          const paid = (i === 1 && def.paidPct >= 33) || (i === 2 && def.paidPct >= 67) || (i === 3 && def.paidPct >= 100);
          await prisma.instalment.create({
            data: {
              enrolmentId: enr.id,
              number: i,
              amount: instalment,
              dueDate: daysAgo(90 - i * 30),
              paidAt: paid ? daysAgo(90 - i * 30 + 3) : null,
            },
          });
        }
      }
    }

    // Also enrol tutor2 as a student
    const tutor2Enrol = await prisma.enrolment.create({
      data: {
        userId: tutor2.id,
        courseId: courses["basic-nursing-care"].id,
        intakeId: intakeBasic.id,
        status: EnrolmentStatus.ACTIVE,
        planType: "FULL",
        totalAmountUgx: courses["basic-nursing-care"].fullFeeUgx,
        paidAmountUgx: courses["basic-nursing-care"].fullFeeUgx,
        paidPercent: 100,
        unlockedBlockOrder: 3,
      },
    });
    enrolments["tutor2"] = tutor2Enrol;

    console.log("  ✓ Enrolments (10)");

    // ── Payments + Ledger (60+ entries) ───────────────────────────
    const PAYMENT_SCENARIOS: Array<{
      studentKey: string; method: PaymentMethod; gateway: PaymentGateway;
      amount: number; daysBack: number; status: PaymentStatus;
    }> = [
      { studentKey: "25",        method: PaymentMethod.MTN_MOMO,      gateway: PaymentGateway.MANUAL,      amount: instalment, daysBack: 75, status: PaymentStatus.COMPLETED },
      { studentKey: "50",        method: PaymentMethod.MTN_MOMO,      gateway: PaymentGateway.MANUAL,      amount: instalment, daysBack: 70, status: PaymentStatus.COMPLETED },
      { studentKey: "50",        method: PaymentMethod.AIRTEL_MONEY,  gateway: PaymentGateway.MANUAL,      amount: instalment, daysBack: 40, status: PaymentStatus.COMPLETED },
      { studentKey: "75",        method: PaymentMethod.MTN_MOMO,      gateway: PaymentGateway.PESAPAL,     amount: cnaFee,     daysBack: 60, status: PaymentStatus.COMPLETED },
      { studentKey: "full",      method: PaymentMethod.BANK_TRANSFER, gateway: PaymentGateway.MANUAL,      amount: cnaFee,     daysBack: 55, status: PaymentStatus.COMPLETED },
      { studentKey: "overdue",   method: PaymentMethod.MTN_MOMO,      gateway: PaymentGateway.MANUAL,      amount: instalment, daysBack: 80, status: PaymentStatus.COMPLETED },
      { studentKey: "completed", method: PaymentMethod.MTN_MOMO,      gateway: PaymentGateway.PESAPAL,     amount: cnaFee,     daysBack: 120, status: PaymentStatus.COMPLETED },
      { studentKey: "sponsored", method: PaymentMethod.SCHOLARSHIP,   gateway: PaymentGateway.MANUAL,      amount: cnaFee,     daysBack: 90, status: PaymentStatus.COMPLETED },
      { studentKey: "tutor2",    method: PaymentMethod.BANK_TRANSFER, gateway: PaymentGateway.MANUAL,      amount: courses["basic-nursing-care"].fullFeeUgx, daysBack: 50, status: PaymentStatus.COMPLETED },
      // One reversed payment (fraud)
      { studentKey: "75",        method: PaymentMethod.MTN_MOMO,      gateway: PaymentGateway.PESAPAL,     amount: 85000,      daysBack: 30, status: PaymentStatus.REFUNDED },
    ];

    // Extra historical payments for revenue charts (past 6 months)
    const extraStudentKeys = ["25", "50", "75", "full", "completed", "sponsored"];
    const extraPayments: typeof PAYMENT_SCENARIOS = [];
    for (let m = 1; m <= 5; m++) {
      for (let i = 0; i < 4; i++) {
        extraPayments.push({
          studentKey: extraStudentKeys[i % extraStudentKeys.length],
          method: i % 2 === 0 ? PaymentMethod.MTN_MOMO : PaymentMethod.AIRTEL_MONEY,
          gateway: PaymentGateway.PESAPAL,
          amount: [250000, 350000, 150000, 200000][i % 4],
          daysBack: m * 30 + i * 5,
          status: PaymentStatus.COMPLETED,
        });
      }
    }

    const allPayments = [...PAYMENT_SCENARIOS, ...extraPayments];

    for (const ps of allPayments) {
      const enr = enrolments[ps.studentKey];
      if (!enr) continue;
      const paidAt = daysAgo(ps.daysBack);
      const isReversed = ps.status === PaymentStatus.REFUNDED;
      await prisma.payment.create({
        data: {
          enrolmentId: enr.id,
          amount: ps.amount,
          method: ps.method,
          gateway: ps.gateway,
          gatewayRef: `TXN-${randomBytes(4).toString("hex").toUpperCase()}`,
          status: ps.status,
          paidAt,
          reversedAt: isReversed ? daysAgo(ps.daysBack - 5) : null,
          fraudStrike: isReversed,
        },
      });

      // Ledger entries
      await prisma.ledgerEntry.create({
        data: {
          enrolmentId: enr.id,
          type: isReversed ? LedgerEntryType.REFUND : LedgerEntryType.PAYMENT,
          amount: isReversed ? -ps.amount : ps.amount,
          balanceAfter: ps.amount,
          description: isReversed ? "Payment reversed - fraud flag" : `Payment via ${ps.method.replace("_", " ")}`,
          createdAt: paidAt,
        },
      });
    }

    console.log("  ✓ Payments (60+) and ledger entries");

    // ── Manual payment claims ──────────────────────────────────
    const CLAIM_DEFS = [
      { studentKey: "25",  method: "MOBILE_MONEY_MTN"   as const, txId: "MTN-2026-001234", amount: instalment, status: ClaimStatus.VERIFIED,     daysBack: 70 },
      { studentKey: "50",  method: "MOBILE_MONEY_AIRTEL" as const, txId: "AIR-2026-005567", amount: instalment, status: ClaimStatus.UNDER_REVIEW, daysBack: 10 },
      { studentKey: "new", method: "BANK_TRANSFER"        as const, txId: "BANK-2026-00112",  amount: instalment, status: ClaimStatus.SUBMITTED,    daysBack: 2  },
      { studentKey: "pending", method: "MOBILE_MONEY_MTN" as const, txId: "MTN-2026-DUPE-99", amount: instalment, status: ClaimStatus.REJECTED,     daysBack: 15, note: "Duplicate transaction ID" },
    ];

    for (const cd of CLAIM_DEFS) {
      const enr = enrolments[cd.studentKey];
      if (!enr) continue;
      await prisma.manualPaymentClaim.create({
        data: {
          enrolmentId: enr.id,
          claimantId: students[cd.studentKey].id,
          method: cd.method,
          transactionId: cd.txId,
          amount: cd.amount,
          payerName: students[cd.studentKey].name,
          payerPhone: students[cd.studentKey].phone ?? "+256700000000",
          bankOrProvider: cd.method === "BANK_TRANSFER" ? "Centenary Bank" : cd.method === "MOBILE_MONEY_MTN" ? "MTN Mobile Money" : "Airtel Money",
          claimedAt: daysAgo(cd.daysBack),
          receiptS3Key: `claims/demo-receipt-${cd.studentKey}.pdf`,
          status: cd.status,
          duplicateImageFlag: cd.note === "Duplicate transaction ID",
          verifiedById: cd.status === ClaimStatus.VERIFIED ? bursar.id : null,
          createdAt: daysAgo(cd.daysBack),
        },
      });
    }

    console.log("  ✓ Manual payment claims (4)");

    // ── Lesson Progress ────────────────────────────────────────
    const cnaLessons = await prisma.lesson.findMany({
      where: { block: { courseId: courses["cna"].id } },
      orderBy: [{ block: { order: "asc" } }, { order: "asc" }],
    });

    for (const def of STUDENT_DEFS.filter(d => d.paidPct >= 33)) {
      const student = students[def.key];
      const lessonsToUnlock = Math.ceil((def.paidPct / 100) * cnaLessons.length);
      for (let i = 0; i < lessonsToUnlock; i++) {
        const lesson = cnaLessons[i];
        if (!lesson) continue;
        await prisma.lessonProgress.upsert({
          where: { userId_lessonId: { userId: student.id, lessonId: lesson.id } },
          update: {},
          create: {
            userId: student.id,
            lessonId: lesson.id,
            watchPercent: i < lessonsToUnlock - 1 ? 100 : 45,
            completedAt: i < lessonsToUnlock - 1 ? daysAgo(lessonsToUnlock - i) : null,
          },
        });
      }
    }
    console.log("  ✓ Lesson progress");

  } else {
    // Fetch existing enrolments for downstream use
    for (const def of STUDENT_DEFS) {
      const enr = await prisma.enrolment.findFirst({ where: { userId: students[def.key].id } });
      if (enr) enrolments[def.key] = enr;
    }
    const tutor2Enr = await prisma.enrolment.findFirst({ where: { userId: tutor2.id } });
    if (tutor2Enr) enrolments["tutor2"] = tutor2Enr;
    console.log("  ℹ  Enrolments already seeded - skipping payments/progress");
  }

  // ── Discount codes ─────────────────────────────────────────────
  await prisma.discountCode.upsert({
    where: { code: "SCHOLAR2026" },
    update: {},
    create: {
      code: "SCHOLAR2026", type: "SCHOLARSHIP", value: 100, maxUses: 20,
      expiresAt: new Date("2027-12-31"), createdBy: registrar.id,
    },
  });
  await prisma.discountCode.upsert({
    where: { code: "LAUNCH20" },
    update: {},
    create: {
      code: "LAUNCH20", type: "PERCENTAGE", value: 20, maxUses: 50,
      expiresAt: new Date("2026-12-31"), createdBy: registrar.id,
    },
  });
  await prisma.discountCode.upsert({
    where: { code: "STAFF50" },
    update: {},
    create: {
      code: "STAFF50", type: "PERCENTAGE", value: 50, maxUses: 10,
      expiresAt: new Date("2027-06-30"), createdBy: ceo.id,
    },
  });
  console.log("  ✓ Discount codes (3)");

  // ── Exams ──────────────────────────────────────────────────────
  const existingExams = await prisma.exam.count();
  let examCna: Awaited<ReturnType<typeof prisma.exam.create>> | null = null;
  let examFinal: Awaited<ReturnType<typeof prisma.exam.create>> | null = null;

  if (existingExams === 0) {
    examCna = await prisma.exam.create({
      data: {
        courseId: courses["cna"].id,
        title: "Block 2: Infection Control Assessment",
        timeLimitMin: 30,
        attemptLimit: 2,
        passPercent: 60,
        shuffleQuestions: true,
        status: ExamStatus.PUBLISHED,
      },
    });

    examFinal = await prisma.exam.create({
      data: {
        courseId: courses["cna"].id,
        title: "CNA Final Certification Exam",
        timeLimitMin: 60,
        attemptLimit: 2,
        passPercent: 70,
        shuffleQuestions: true,
        status: ExamStatus.PUBLISHED,
      },
    });

    // Block 2 exam questions
    const block2Questions = [
      { text: "What is the most important step in preventing the spread of infection?", type: "MCQ", options: JSON.stringify(["Regular hand washing","Wearing gloves at all times","Isolating all patients","Disinfecting floors daily"]), correctAnswer: "Regular hand washing", points: 5 },
      { text: "PPE stands for:", type: "MCQ", options: JSON.stringify(["Personal Protective Equipment","Patient Protection Elements","Protective Personnel Ensemble","Primary Precaution Equipment"]), correctAnswer: "Personal Protective Equipment", points: 5 },
      { text: "Alcohol-based hand sanitiser kills all types of pathogens.", type: "TRUE_FALSE", options: JSON.stringify(["True","False"]), correctAnswer: "False", points: 5 },
      { text: "Which waste container is used for sharps such as needles?", type: "MCQ", options: JSON.stringify(["Yellow bag","Red bag","Sharps container","Black bin"]), correctAnswer: "Sharps container", points: 5 },
      { text: "Standard precautions should be applied to:", type: "MCQ", options: JSON.stringify(["Only visibly ill patients","All patients regardless of diagnosis","Only patients with known infections","Patients in isolation only"]), correctAnswer: "All patients regardless of diagnosis", points: 5 },
      { text: "Describe in your own words the 5 moments for hand hygiene as defined by the WHO.", type: "SHORT_ANSWER", options: null, correctAnswer: null, points: 10 },
    ];

    for (const q of block2Questions) {
      await prisma.quizQuestion.create({
        data: { examId: examCna.id, ...q, type: q.type as "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER", options: q.options ?? undefined },
      });
    }

    // Final exam questions
    const finalQuestions = [
      { text: "Which of the following is NOT a vital sign?", type: "MCQ", options: JSON.stringify(["Temperature","Pulse","Height","Blood pressure"]), correctAnswer: "Height", points: 5 },
      { text: "Normal adult resting pulse rate is:", type: "MCQ", options: JSON.stringify(["40-60 bpm","60-100 bpm","100-120 bpm","120-160 bpm"]), correctAnswer: "60-100 bpm", points: 5 },
      { text: "A patient tells you they are in pain. What should you do first?", type: "MCQ", options: JSON.stringify(["Give them paracetamol","Assess and document the pain, then inform the nurse","Ask them to wait","Tell them it will pass"]), correctAnswer: "Assess and document the pain, then inform the nurse", points: 5 },
      { text: "Patient confidentiality means:", type: "MCQ", options: JSON.stringify(["Only sharing patient information with family members","Never discussing a patient with anyone","Sharing patient information only with authorised healthcare team members","Posting patient updates on social media with their permission"]), correctAnswer: "Sharing patient information only with authorised healthcare team members", points: 5 },
      { text: "A nursing care assistant can independently prescribe medications.", type: "TRUE_FALSE", options: JSON.stringify(["True","False"]), correctAnswer: "False", points: 5 },
      { text: "Dignity in care means:", type: "MCQ", options: JSON.stringify(["Treating all patients with respect and maintaining their privacy","Giving patients expensive treatment","Allowing patients to do whatever they want","Only caring for patients who are polite"]), correctAnswer: "Treating all patients with respect and maintaining their privacy", points: 5 },
      { text: "What is the correct sequence for donning PPE?", type: "MCQ", options: JSON.stringify(["Gloves → Gown → Mask → Eye protection","Gown → Mask → Eye protection → Gloves","Mask → Gown → Eye protection → Gloves","Eye protection → Gloves → Gown → Mask"]), correctAnswer: "Gown → Mask → Eye protection → Gloves", points: 5 },
      { text: "Describe the procedure you would follow if a patient falls while in your care.", type: "SHORT_ANSWER", options: null, correctAnswer: null, points: 15 },
    ];

    for (const q of finalQuestions) {
      await prisma.quizQuestion.create({
        data: { examId: examFinal.id, ...q, type: q.type as "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER", options: q.options ?? undefined },
      });
    }

    // Exam attempts
    // student.completed passed both
    if (enrolments["completed"]) {
      const attempt1 = await prisma.examAttempt.create({
        data: {
          examId: examCna.id, userId: students["completed"].id,
          number: 1, status: AttemptStatus.MARKED,
          score: 25, maxScore: 30, passed: true,
          answers: JSON.stringify({}),
          startedAt: daysAgo(60), submittedAt: daysAgo(60),
        },
      });
      await prisma.examAttempt.create({
        data: {
          examId: examFinal.id, userId: students["completed"].id,
          number: 1, status: AttemptStatus.MARKED,
          score: 52, maxScore: 65, passed: true,
          answers: JSON.stringify({}),
          startedAt: daysAgo(30), submittedAt: daysAgo(30),
        },
      });
    }
    // student.75 failed block 2 once
    if (enrolments["75"]) {
      await prisma.examAttempt.create({
        data: {
          examId: examCna.id, userId: students["75"].id,
          number: 1, status: AttemptStatus.MARKED,
          score: 12, maxScore: 30, passed: false,
          answers: JSON.stringify({}),
          startedAt: daysAgo(20), submittedAt: daysAgo(20),
        },
      });
    }
    // student.full has a pending short-answer submission
    if (enrolments["full"]) {
      await prisma.examAttempt.create({
        data: {
          examId: examCna.id, userId: students["full"].id,
          number: 1, status: AttemptStatus.SUBMITTED,
          score: null, maxScore: 30, passed: null,
          answers: JSON.stringify({ short: "Hand hygiene should be performed before and after patient contact..." }),
          startedAt: daysAgo(5), submittedAt: daysAgo(5),
        },
      });
    }

    console.log("  ✓ Exams (2) with questions and attempts");
  }

  // ── Certificates ───────────────────────────────────────────────
  const existingCerts = await prisma.certificate.count();
  if (existingCerts === 0) {
    await prisma.certificate.create({
      data: {
        userId: students["completed"].id,
        courseId: courses["cna"].id,
        uniqueId: "MTC-2026-CNA-00001",
        fileS3Key: "certificates/MTC-2026-CNA-00001.pdf",
        issuedAt: daysAgo(25),
      },
    });
    // Revoked cert
    await prisma.certificate.create({
      data: {
        userId: students["75"].id,
        courseId: courses["cna"].id,
        uniqueId: "MTC-2026-CNA-00002-REVOKED",
        fileS3Key: "certificates/MTC-2026-CNA-00002.pdf",
        issuedAt: daysAgo(90),
        revokedAt: daysAgo(10),
        revokedReason: "Fraudulent exam submission detected",
      },
    });
    console.log("  ✓ Certificates (1 valid, 1 revoked)");
  }

  // ── Live Classes ───────────────────────────────────────────────
  const existingClasses = await prisma.liveClass.count();
  if (existingClasses === 0) {
    const classes = [
      { title: "Block 2 Live Q&A: Infection Control", daysOffset: -14, status: LiveClassStatus.COMPLETED, recordingUrl: "https://youtu.be/demo-recording-1" },
      { title: "Block 3 Live Tutorial: Personal Care Skills", daysOffset: -7,  status: LiveClassStatus.COMPLETED, recordingUrl: "https://youtu.be/demo-recording-2" },
      { title: "Block 4 Live: Vital Signs Workshop", daysOffset: 3,  status: LiveClassStatus.SCHEDULED, recordingUrl: undefined },
      { title: "Block 5 Live: Elderly Care Q&A", daysOffset: 10, status: LiveClassStatus.SCHEDULED, recordingUrl: undefined },
      { title: "Final Exam Revision Session", daysOffset: 17, status: LiveClassStatus.SCHEDULED, recordingUrl: undefined },
    ];

    for (const cls of classes) {
      const lc = await prisma.liveClass.create({
        data: {
          courseId: courses["cna"].id,
          tutorId: tutor.id,
          title: cls.title,
          scheduledAt: daysFrom(cls.daysOffset),
          durationMin: 90,
          joinUrl: "https://meet.google.com/demo-mtc-" + randomBytes(3).toString("hex"),
          platform: "Google Meet",
          status: cls.status,
          recordingUrl: cls.recordingUrl,
        },
      });

      // Attendance for completed classes
      if (cls.status === LiveClassStatus.COMPLETED) {
        for (const key of ["75", "full", "completed"]) {
          if (students[key]) {
            await prisma.attendance.create({
              data: {
                liveClassId: lc.id,
                userId: students[key].id,
                joinedAt: daysFrom(cls.daysOffset),
                markedPresent: true,
              },
            });
          }
        }
      }
    }
    console.log("  ✓ Live classes (5: 2 past with recordings, 3 upcoming)");
  }

  // ── Announcements ──────────────────────────────────────────────
  const existingAnnouncements = await prisma.announcement.count();
  if (existingAnnouncements === 0) {
    await prisma.announcement.createMany({
      data: [
        { authorId: tutor.id, courseId: courses["cna"].id, title: "Block 4 live class this Thursday at 6pm", body: "Join us this Thursday for our Block 4 live class on vital signs. Link will be sent 30 minutes before the session.", pinned: true,  createdAt: daysAgo(3) },
        { authorId: registrar.id, courseId: null, title: "Intake 7 registration now open", body: "We are now accepting registrations for our November 2026 intake. Early bird discount applies for the first 10 students.", pinned: true,  createdAt: daysAgo(7) },
        { authorId: tutor.id, courseId: courses["cna"].id, title: "Block 2 exam results released", body: "Results for the Block 2 Infection Control Assessment are now available in your Results section.", pinned: false, createdAt: daysAgo(10) },
        { authorId: ceo.id, courseId: null, title: "Platform maintenance - Saturday 2am", body: "We will perform scheduled maintenance this Saturday from 2am to 4am EAT. The platform will be briefly unavailable.", pinned: false, createdAt: daysAgo(5) },
      ],
    });
    console.log("  ✓ Announcements (4)");
  }

  // ── Forum ──────────────────────────────────────────────────────
  const existingThreads = await prisma.forumThread.count();
  if (existingThreads === 0) {
    const thread1 = await prisma.forumThread.create({
      data: {
        courseId: courses["cna"].id,
        authorId: students["75"].id,
        title: "Hand hygiene question - 5 moments",
        body: "I have a question about the 5 moments for hand hygiene. When exactly should we wash hands before patient contact if the patient is already in isolation? Is it inside or outside the room?",
        createdAt: daysAgo(8),
      },
    });
    await prisma.forumReply.createMany({
      data: [
        { threadId: thread1.id, authorId: tutor.id, body: "Great question! You should perform hand hygiene outside the room before entering, and then again inside once you have donned PPE. The key principle is protecting both you and the patient.", createdAt: daysAgo(7) },
        { threadId: thread1.id, authorId: students["full"].id, body: "Thank you for asking this, I had the same question!", createdAt: daysAgo(6) },
      ],
    });

    const thread2 = await prisma.forumThread.create({
      data: {
        courseId: courses["cna"].id,
        authorId: students["full"].id,
        title: "Tips for the vital signs block?",
        body: "Has anyone already done Block 4? Any tips for the vital signs practical? I am a bit nervous about measuring blood pressure correctly.",
        createdAt: daysAgo(3),
      },
    });
    await prisma.forumReply.create({
      data: { threadId: thread2.id, authorId: tutor.id, body: "Practice makes perfect! I would recommend practicing on a family member at home first. In the live class we will do a full demonstration together.", createdAt: daysAgo(2) },
    });

    const thread3 = await prisma.forumThread.create({
      data: {
        courseId: courses["cna"].id,
        authorId: students["completed"].id,
        title: "Certificate verification - works great!",
        body: "Just tested the QR code on my certificate and it verified correctly. Well done Musawo team for making this work so smoothly!",
        createdAt: daysAgo(20),
        pinned: false,
      },
    });
    await prisma.forumReply.create({
      data: { threadId: thread3.id, authorId: registrar.id, body: "Thank you for the kind words! We are glad the verification is working well. Please share with your employer.", createdAt: daysAgo(19) },
    });

    console.log("  ✓ Forum threads (3) with replies");
  }

  // ── Support Tickets ───────────────────────────────────────────
  const existingTickets = await prisma.supportTicket.count();
  if (existingTickets === 0) {
    const ticket1 = await prisma.supportTicket.create({
      data: {
        userId: students["new"].id,
        subject: "Payment not reflecting on my account",
        body: "I paid UGX 283,334 via MTN Mobile Money on 10 October 2026 but my account still shows pending. Transaction ID: MTN-2026-DEMO-001. Please help.",
        status: TicketStatus.OPEN,
        priority: TicketPriority.HIGH,
        createdAt: daysAgo(2),
      },
    });
    await prisma.supportReply.create({
      data: {
        ticketId: ticket1.id,
        authorId: bursar.id,
        body: "Thank you for reaching out. We have found your transaction and are processing the confirmation. Your account will be updated within 24 hours.",
        isStaff: true,
        createdAt: daysAgo(1),
      },
    });

    await prisma.supportTicket.create({
      data: {
        userId: students["50"].id,
        subject: "Cannot access Block 3 lessons",
        body: "I have paid my second instalment but I cannot see the Block 3 lessons. The platform says I need to pay more but I already paid.",
        status: TicketStatus.RESOLVED,
        priority: TicketPriority.NORMAL,
        createdAt: daysAgo(5),
      },
    });

    await prisma.supportTicket.create({
      data: {
        userId: students["completed"].id,
        subject: "Request for employer reference letter",
        body: "I have completed my CNA course. Could you please provide a reference letter for my employer at Mulago Hospital?",
        status: TicketStatus.CLOSED,
        priority: TicketPriority.LOW,
        createdAt: daysAgo(30),
      },
    });

    console.log("  ✓ Support tickets (3)");
  }

  // ── Resources ──────────────────────────────────────────────────
  const existingResources = await prisma.resource.count();
  if (existingResources === 0) {
    const resourceItems = [
      { title: "Uganda Healthcare Worker Reference Guide",      description: "A free reference guide for community health workers covering infection prevention and patient communication.", s3Key: "resources/healthcare-reference-guide.pdf",     category: "Reference",  isPublic: true  },
      { title: "Hand Hygiene Poster (WHO)",                     description: "WHO official 5 moments for hand hygiene poster - print and display in your workplace.",                     s3Key: "resources/who-hand-hygiene-poster.pdf",         category: "Posters",    isPublic: true  },
      { title: "Vital Signs Normal Ranges Quick Reference",     description: "Laminated quick-reference card for normal adult vital sign ranges.",                                        s3Key: "resources/vital-signs-quick-ref.pdf",           category: "Reference",  isPublic: false },
      { title: "CNA Course Syllabus 2026",                      description: "Full syllabus and learning outcomes for the Certified Nursing Care Assistant course.",                      s3Key: "resources/cna-syllabus-2026.pdf",               category: "Syllabi",    isPublic: true  },
      { title: "Basic Nursing Care Assistant Syllabus 2026",    description: "Full syllabus and learning outcomes for the Basic Nursing Care Assistant course.",                         s3Key: "resources/basic-nursing-syllabus-2026.pdf",     category: "Syllabi",    isPublic: true  },
      { title: "Uganda Nurses and Midwives Act",                description: "Official text of the Uganda Nurses and Midwives Act (Cap. 274) - required reading for all students.",       s3Key: "resources/nurses-midwives-act-uganda.pdf",      category: "Legal",      isPublic: true  },
      { title: "Personal Care Procedures Manual",               description: "Step-by-step procedures for bathing, oral care, and grooming in a care setting.",                          s3Key: "resources/personal-care-procedures.pdf",        category: "Manuals",    isPublic: false },
      { title: "Infection Prevention Standard Precautions",     description: "WHO guidelines on standard precautions for infection prevention in healthcare settings.",                   s3Key: "resources/who-standard-precautions.pdf",        category: "Guidelines", isPublic: true  },
      { title: "Patient Rights Charter Uganda",                 description: "The Uganda Patient's Charter outlining rights and responsibilities in healthcare.",                         s3Key: "resources/patient-rights-charter-uganda.pdf",   category: "Legal",      isPublic: true  },
      { title: "CPR Quick Reference Card",                      description: "Pocket reference for adult and infant CPR - print and keep on hand during practical sessions.",             s3Key: "resources/cpr-quick-reference.pdf",             category: "Reference",  isPublic: false },
    ];

    for (const r of resourceItems) {
      await prisma.resource.create({
        data: { ...r, uploadedBy: registrar.id },
      });
    }
    console.log("  ✓ Resources (10)");
  }

  // ── Approvals ──────────────────────────────────────────────────
  const existingApprovals = await prisma.approvalRequest.count({ where: { status: ApprovalRequestStatus.PENDING } });
  if (existingApprovals === 0) {
    const approvalToken = () => randomBytes(32).toString("hex");
    await prisma.approvalRequest.createMany({
      data: [
        {
          type: ApprovalRequestType.REFUND,
          status: ApprovalRequestStatus.PENDING,
          initiatorId: bursar.id,
          studentId: students["75"].id,
          enrolmentId: enrolments["75"]?.id,
          amount: 85000,
          reason: "Payment reversed after bank fraud dispute. Student requests refund of the reversed amount. Bank reference: TXN-FRAUD-001.",
          approvalToken: approvalToken(),
          createdAt: daysAgo(3),
        },
        {
          type: ApprovalRequestType.REFUND,
          status: ApprovalRequestStatus.PENDING,
          initiatorId: bursar.id,
          studentId: students["overdue"].id,
          enrolmentId: enrolments["overdue"]?.id,
          amount: 50000,
          reason: "Student withdrew from course before Block 2. Requesting partial refund per refund policy.",
          approvalToken: approvalToken(),
          createdAt: daysAgo(5),
        },
        {
          type: ApprovalRequestType.WAIVER,
          status: ApprovalRequestStatus.PENDING,
          initiatorId: registrar.id,
          studentId: students["overdue"].id,
          enrolmentId: enrolments["overdue"]?.id,
          amount: 100000,
          reason: "Student is a frontline health worker. Requesting 30% fee waiver per MoH partnership agreement.",
          approvalToken: approvalToken(),
          createdAt: daysAgo(7),
        },
        {
          type: ApprovalRequestType.SCHOLARSHIP_AWARD,
          status: ApprovalRequestStatus.PENDING,
          initiatorId: registrar.id,
          studentId: students["new"].id,
          enrolmentId: enrolments["new"]?.id,
          amount: courses["cna"].fullFeeUgx,
          reason: "Student qualifies under Uganda Ministry of Health community health worker scholarship programme.",
          approvalToken: approvalToken(),
          createdAt: daysAgo(1),
        },
        {
          type: ApprovalRequestType.SCHOLARSHIP_AWARD,
          status: ApprovalRequestStatus.PENDING,
          initiatorId: registrar.id,
          studentId: students["pending"].id,
          enrolmentId: enrolments["pending"]?.id,
          amount: courses["cna"].fullFeeUgx,
          reason: "Nominated by St. Francis Hospital, Nsambya for the 2026 community health scholarship.",
          approvalToken: approvalToken(),
          createdAt: daysAgo(2),
        },
        {
          type: ApprovalRequestType.FEE_CHANGE,
          status: ApprovalRequestStatus.PENDING,
          initiatorId: registrar.id,
          amount: 920000,
          reason: "Proposed CNA fee increase from UGX 850,000 to UGX 920,000 effective Intake 8 (February 2027) to cover increased instructor costs.",
          approvalToken: approvalToken(),
          createdAt: daysAgo(4),
        },
      ],
    });
    console.log("  ✓ Pending approvals (6: 2 refunds, 1 waiver, 2 scholarships, 1 fee change)");
  }

  // ── Notifications ──────────────────────────────────────────────
  const existingNotifications = await prisma.notification.count();
  if (existingNotifications === 0) {
    const notifData: Array<{
      userId: string; channel: "IN_APP"; type: string; subject: string; body: string; readAt: Date | null;
    }> = [
      { userId: students["75"].id,        channel: "IN_APP", type: "EXAM_RESULT",      subject: "Exam result available",          body: "Your Block 2 Infection Control assessment result is now available. Please visit Results.", readAt: null },
      { userId: students["full"].id,      channel: "IN_APP", type: "CLASS_REMINDER",   subject: "Live class in 24 hours",         body: "Block 4 Vital Signs Workshop starts tomorrow at 6pm EAT. Join link: meet.google.com/demo", readAt: null },
      { userId: students["overdue"].id,   channel: "IN_APP", type: "PAYMENT_REMINDER", subject: "Instalment overdue",             body: "Your second instalment of UGX 283,334 was due 14 days ago. Please pay to retain access.", readAt: null },
      { userId: students["new"].id,       channel: "IN_APP", type: "WELCOME",          subject: "Welcome to Musawo Training Center!", body: "Welcome, Harriet! Your account has been created. Please complete your first payment to unlock your course.", readAt: daysAgo(2) },
      { userId: students["completed"].id, channel: "IN_APP", type: "CERTIFICATE_READY", subject: "Your certificate is ready", body: "Congratulations! Your CNA certificate (MTC-2026-CNA-00001) is ready to download.", readAt: daysAgo(20) },
      { userId: bursar.id,                channel: "IN_APP", type: "CLAIM_SUBMITTED",  subject: "New payment claim submitted",    body: "A new manual payment claim has been submitted by Harriet Namutebi. Please review.", readAt: null },
      { userId: ceo.id,                   channel: "IN_APP", type: "APPROVAL_NEEDED",  subject: "6 approvals awaiting your decision", body: "There are 6 approval requests pending in your inbox: 2 refunds, 1 waiver, 2 scholarships, 1 fee change.", readAt: null },
      { userId: tutor.id,                 channel: "IN_APP", type: "EXAM_REVIEW",      subject: "Exam submission pending review", body: "Ronald Mugisha submitted Block 2 exam 5 days ago and has a short-answer question awaiting your marking.", readAt: null },
    ];

    await prisma.notification.createMany({ data: notifData });
    console.log("  ✓ Notifications (8)");
  }

  // ── Assignments ────────────────────────────────────────────────
  const existingAssignments = await prisma.assignment.count();
  if (existingAssignments === 0) {
    const cnaCourseId = courses["cna"].id;
    const block3Id = allBlocks["cna"]?.[2]?.id;

    const assignment1 = await prisma.assignment.create({
      data: {
        courseId: cnaCourseId,
        blockId: block3Id ?? null,
        title: "Personal Care Reflection Journal",
        instructions: "Write a 300-500 word reflective journal entry describing how you would assist a patient with bathing while maintaining their dignity. Include: (1) how you would explain the procedure to the patient, (2) the steps you would follow, and (3) how you would ensure privacy and comfort throughout. You may submit as text or upload a Word document/PDF.",
        dueDate: daysFrom(7),
        maxPoints: 20,
        status: "PUBLISHED",
      },
    });

    const assignment2 = await prisma.assignment.create({
      data: {
        courseId: cnaCourseId,
        blockId: null,
        title: "Infection Control Scenario Analysis",
        instructions: "Read the scenario in the attached brief and answer the three questions: (1) What infection risks are present? (2) What standard precautions should be applied? (3) How would you document and report the incident? Upload your answers as a PDF.",
        dueDate: daysFrom(14),
        maxPoints: 30,
        status: "PUBLISHED",
      },
    });

    // Submission from student.full
    if (enrolments["full"]) {
      await prisma.assignmentSubmission.create({
        data: {
          assignmentId: assignment1.id,
          userId: students["full"].id,
          textBody: "When assisting a patient with bathing, I would first explain the procedure clearly in a calm and respectful tone. I would ask for their consent and ensure the bathroom is warm and private before starting...",
          status: SubmissionStatus.SUBMITTED,
          submittedAt: daysAgo(2),
        },
      });
    }

    console.log("  ✓ Assignments (2) with submission");
  }

  // ── Audit Log ─────────────────────────────────────────────────
  const existingAudit = await prisma.auditLog.count();
  if (existingAudit < 20) {
    const auditEvents: Array<{
      actorId: string; action: AuditAction; entityType: string; entityId: string;
      metadata?: string; ip?: string; createdAt: Date;
    }> = [
      { actorId: ceo.id,       action: AuditAction.LOGIN,               entityType: "User", entityId: ceo.id,       ip: "197.239.5.10", createdAt: daysAgo(1) },
      { actorId: registrar.id, action: AuditAction.LOGIN,               entityType: "User", entityId: registrar.id, ip: "197.239.5.11", createdAt: daysAgo(1) },
      { actorId: bursar.id,    action: AuditAction.LOGIN,               entityType: "User", entityId: bursar.id,    ip: "41.210.3.22",  createdAt: daysAgo(2) },
      { actorId: tutor.id,     action: AuditAction.LOGIN,               entityType: "User", entityId: tutor.id,     ip: "41.210.3.23",  createdAt: daysAgo(2) },
      { actorId: registrar.id, action: AuditAction.ENROLMENT_CREATED,   entityType: "Enrolment", entityId: enrolments["new"]?.id ?? "x", metadata: JSON.stringify({ student: "Harriet Namutebi", course: "CNA" }), createdAt: daysAgo(14) },
      { actorId: bursar.id,    action: AuditAction.PAYMENT_CONFIRMED,   entityType: "Payment", entityId: "demo-p1", metadata: JSON.stringify({ amount: 850000, method: "MTN_MOMO" }), createdAt: daysAgo(55) },
      { actorId: registrar.id, action: AuditAction.CERTIFICATE_ISSUED,  entityType: "Certificate", entityId: "MTC-2026-CNA-00001", metadata: JSON.stringify({ student: "James Ssemwogerere" }), createdAt: daysAgo(25) },
      { actorId: ceo.id,       action: AuditAction.APPROVAL_APPROVED,   entityType: "ApprovalRequest", entityId: "demo-ap1", metadata: JSON.stringify({ type: "SCHOLARSHIP_AWARD", student: "Annet Aber" }), createdAt: daysAgo(85) },
      { actorId: bursar.id,    action: AuditAction.PAYMENT_REVERSED,    entityType: "Payment", entityId: "demo-p2", metadata: JSON.stringify({ amount: 85000, reason: "Fraud" }), createdAt: daysAgo(25) },
      { actorId: itadmin.id,   action: AuditAction.SETTINGS_CHANGED,    entityType: "SiteSetting", entityId: "payment.gateway", metadata: JSON.stringify({ from: "pesapal", to: "demo" }), createdAt: daysAgo(3) },
      { actorId: ceo.id,       action: AuditAction.ACCESS_REVIEW_COMPLETED, entityType: "AccessReview", entityId: "demo-ar1", metadata: JSON.stringify({ quarter: "Q3 2026", reviewedAccounts: 6 }), createdAt: daysAgo(30) },
      { actorId: bursar.id,    action: AuditAction.PAYMENT_CLAIM_SUBMITTED, entityType: "ManualPaymentClaim", entityId: "demo-claim-1", metadata: JSON.stringify({ amount: 283334 }), createdAt: daysAgo(70) },
      { actorId: bursar.id,    action: AuditAction.PAYMENT_CLAIM_VERIFIED, entityType: "ManualPaymentClaim", entityId: "demo-claim-1", metadata: JSON.stringify({ verifiedBy: "bursar" }), createdAt: daysAgo(68) },
      { actorId: registrar.id, action: AuditAction.BULK_EXPORT,         entityType: "Student", entityId: "export-2026-10", metadata: JSON.stringify({ format: "CSV", count: 9 }), createdAt: daysAgo(7) },
      { actorId: tutor.id,     action: AuditAction.EXAM_SUBMITTED,      entityType: "ExamAttempt", entityId: "demo-ea1", metadata: JSON.stringify({ exam: "Block 2", student: "Ronald Mugisha" }), createdAt: daysAgo(5) },
      { actorId: students["completed"].id, action: AuditAction.LOGIN,   entityType: "User", entityId: students["completed"].id, ip: "197.239.5.55", createdAt: daysAgo(26) },
      { actorId: ceo.id,       action: AuditAction.ROLE_CHANGED,        entityType: "User", entityId: tutor2.id, metadata: JSON.stringify({ from: "TUTOR", note: "Also enrolled as student for demo" }), createdAt: daysAgo(60) },
      { actorId: itadmin.id,   action: AuditAction.TOTP_DISABLED,       entityType: "User", entityId: ceo.id, metadata: JSON.stringify({ reason: "Dev seed: TOTP disabled for demo" }), createdAt: daysAgo(1) },
    ];

    // Add more historical logins for all students
    for (const def of STUDENT_DEFS.slice(2)) {
      auditEvents.push({
        actorId: students[def.key].id, action: AuditAction.LOGIN,
        entityType: "User", entityId: students[def.key].id,
        ip: "197.239." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
        createdAt: daysAgo(Math.floor(Math.random() * 30) + 1),
      });
    }

    await prisma.auditLog.createMany({ data: auditEvents });
    console.log(`  ✓ Audit log (${auditEvents.length} entries)`);
  }

  // ── Grade Book ─────────────────────────────────────────────────
  const existingGrades = await prisma.gradeEntry.count();
  if (existingGrades === 0) {
    const gradeData = [
      { userId: students["completed"].id, courseId: courses["cna"].id, itemType: "EXAM",       itemId: "exam-block2", itemTitle: "Block 2: Infection Control Assessment", score: 25, maxScore: 30, percentage: 83, passed: true  },
      { userId: students["completed"].id, courseId: courses["cna"].id, itemType: "EXAM",       itemId: "exam-final",  itemTitle: "CNA Final Certification Exam",           score: 52, maxScore: 65, percentage: 80, passed: true  },
      { userId: students["75"].id,        courseId: courses["cna"].id, itemType: "EXAM",       itemId: "exam-block2", itemTitle: "Block 2: Infection Control Assessment", score: 12, maxScore: 30, percentage: 40, passed: false },
      { userId: students["full"].id,      courseId: courses["cna"].id, itemType: "ASSIGNMENT", itemId: "assign-1",    itemTitle: "Personal Care Reflection Journal",      score: null, maxScore: 20, percentage: null, passed: null },
    ];

    await prisma.gradeEntry.createMany({ data: gradeData });
    console.log("  ✓ Grade book entries (4)");
  }

  // ── Staff Invite ───────────────────────────────────────────────
  const existingInvite = await prisma.staffInvite.count();
  if (existingInvite === 0) {
    await prisma.staffInvite.create({
      data: {
        email: "newstaff@musawotraining.ug",
        role: "TUTOR",
        token: "demo-invite-token-" + randomBytes(8).toString("hex"),
        expiresAt: daysFrom(7),
        createdById: ceo.id,
      },
    });
    console.log("  ✓ Pending staff invite (newstaff@musawotraining.ug)");
  }

  // ── Access Review ──────────────────────────────────────────────
  const existingReview = await prisma.accessReview.count();
  if (existingReview === 0) {
    await prisma.accessReview.create({
      data: {
        reviewedById: ceo.id,
        quarter: "Q3-2026",
        notes: "All staff accounts reviewed. No anomalies detected. IT admin account last accessed 3 days ago. All accounts confirmed active and appropriate.",
        completedAt: daysAgo(30),
      },
    });
    console.log("  ✓ Access review record");
  }

  // ── Print summary ──────────────────────────────────────────────
  console.log("\n" + "═".repeat(62));
  console.log("  🎉  DEMO SEED COMPLETE");
  console.log("═".repeat(62));
  console.log("\n  All demo accounts use password: Demo1234!\n");
  console.log("  STAFF ACCOUNTS");
  console.log("  ─────────────────────────────────────────────────────");
  console.log("  CEO/SUPERADMIN  ceo@musawotraining.ug      → /director");
  console.log("  Deputy CEO      deputy@musawotraining.ug   → /director");
  console.log("  IT Admin        itadmin@musawotraining.ug  → /system");
  console.log("  Registrar       registrar@musawotraining.ug → /admin/students");
  console.log("  Bursar          bursar@musawotraining.ug   → /bursar");
  console.log("  Tutor 1         tutor@musawotraining.ug    → /tutor");
  console.log("  Tutor 2 (dual)  tutor2@musawotraining.ug   → /tutor (+ student)");
  console.log("\n  STUDENT ACCOUNTS (all CNA course)");
  console.log("  ─────────────────────────────────────────────────────");
  for (const def of STUDENT_DEFS) {
    console.log(`  ${def.status.padEnd(15)} ${def.email}`);
  }
  console.log("\n  See docs/DEMO.md for the full presentation walkthrough.");
  console.log("═".repeat(62) + "\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
