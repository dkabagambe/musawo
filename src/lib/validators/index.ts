import { z } from "zod";

// ─── Shared limits ────────────────────────────
// These cap string and collection sizes to prevent the Zod CVE-2025-XXXX
// memory-exhaustion issue on oversized constrained collections.
const MAX_TEXT = 10_000;  // general free-text field cap
const MAX_ANSWERS = 200;  // maximum questions per exam submission

// ─── Auth ──────────────────────────────────────
export const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254).optional(),
  phone: z
    .string()
    .regex(/^\+256[0-9]{9}$/, "Phone must be in format +256XXXXXXXXX")
    .optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  dataConsent: z.literal(true, {
    errorMap: () => ({ message: "You must consent to data processing" }),
  }),
});

export const LoginSchema = z.object({
  identifier: z.string().min(3).max(254),
  password: z.string().min(1).max(256),
});

export const OtpSchema = z.object({
  phone: z.string().regex(/^\+256[0-9]{9}$/),
  code: z.string().length(6),
});

// ─── Payments ─────────────────────────────────
export const InitiatePaymentSchema = z.object({
  courseId: z.string().cuid(),
  intakeId: z.string().cuid().optional(),
  planType: z.enum(["FULL", "INSTALMENT"]),
});

// ─── Courses ──────────────────────────────────
export const CreateCourseSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10).max(MAX_TEXT),
  shortDescription: z.string().max(300).optional(),
  fullFeeUgx: z.number().int().positive(),
  instalmentCount: z.number().int().min(1).max(12),
  freePreviewPercent: z.number().int().min(0).max(100),
  durationWeeks: z.number().int().positive().optional(),
});

// ─── Exams ────────────────────────────────────
export const CreateExamSchema = z.object({
  courseId: z.string().cuid(),
  blockId: z.string().cuid().optional(),
  title: z.string().min(2).max(200),
  timeLimitMin: z.number().int().positive().optional(),
  attemptLimit: z.number().int().min(1).max(10),
  passPercent: z.number().int().min(0).max(100),
  shuffleQuestions: z.boolean(),
});

export const SubmitExamSchema = z.object({
  attemptId: z.string().cuid(),
  // Cap at MAX_ANSWERS entries to prevent memory exhaustion (Zod CVE on oversized records)
  answers: z.record(z.string().cuid(), z.string().max(500)).refine(
    (obj) => Object.keys(obj).length <= MAX_ANSWERS,
    { message: `Exam may not have more than ${MAX_ANSWERS} answers` },
  ),
});

// ─── Settings ─────────────────────────────────
export const UpdateSettingSchema = z.object({
  key: z.string().min(1).max(200),
  value: z.string().max(2000),
});

// ─── Live Classes ─────────────────────────────
export const CreateLiveClassSchema = z.object({
  courseId: z.string().cuid(),
  blockId: z.string().cuid().optional(),
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().min(15).max(300),
  joinUrl: z.string().url().max(2048),
  platform: z.enum(["google_meet", "zoom", "jitsi"]),
});
