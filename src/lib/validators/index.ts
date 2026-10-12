import { z } from "zod";

// ─── Auth ──────────────────────────────────────
export const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
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
  identifier: z.string().min(3),
  password: z.string().min(1),
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
  discountCode: z.string().max(50).optional(),
});

// ─── Courses ──────────────────────────────────
export const CreateCourseSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10),
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
  answers: z.record(z.string().cuid(), z.string()),
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
  joinUrl: z.string().url(),
  platform: z.enum(["google_meet", "zoom", "jitsi"]),
});

// ─── Admin ────────────────────────────────────
export const CreateDiscountCodeSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/),
  type: z.enum(["SCHOLARSHIP", "PERCENTAGE", "FIXED_AMOUNT"]),
  value: z.number().int().min(0),
  maxUses: z.number().int().positive().optional(),
  courseId: z.string().cuid().optional(),
  expiresAt: z.string().datetime().optional(),
});
