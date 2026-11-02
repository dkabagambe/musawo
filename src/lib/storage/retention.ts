/**
 * Storage retention helpers (section 10).
 *
 * What counts as "platform-stored" and eligible for cleanup:
 *   - Lesson notes:      lessons.notesS3Key  (S3 files)
 *   - Class presentations: class_presentations.s3Key (S3 files)
 *   - Live class recordings: live_classes.recordingUrl (external links only;
 *     we never own the bytes, so we only unlink, not delete)
 *
 * What is NEVER deleted:
 *   - marks (grade_entries, exam_attempts, short_answer_reviews)
 *   - attendance
 *   - results / certificates / payments / audit_logs
 *
 * The flow:
 *   1. Cron job detects that an intake has ended and calls scanIntake().
 *   2. This writes a StorageCleanupJob record (status PENDING_CONFIRMATION).
 *   3. Principal reviews the preview and calls confirmJob() to confirm.
 *   4. Status moves to IN_TRASH; executeAfter = now + trashDays.
 *   5. Cron job calls executeReadyJobs() when executeAfter <= now.
 *   6. S3 files are deleted; external links are unlinked (set to NULL).
 *   7. Status moves to EXECUTED; audit log written.
 */

import { db } from "@/lib/db";
import { deleteObject } from "@/lib/s3";
import { audit } from "@/lib/audit";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CleanupItemType =
  | "lesson_notes"
  | "class_presentation"
  | "recording_link";

export interface CleanupItem {
  type: CleanupItemType;
  id: string;           // lessonId / classPresentationId / liveClassId
  s3Key?: string;       // present for lesson_notes and class_presentation
  recordingUrl?: string; // present for recording_link
  fileName: string;
  sizeBytes: number;    // 0 for external links
  courseTitle: string;
  intakeLabel: string;
}

// ─── Scan an intake ────────────────────────────────────────────────────────────

/**
 * Build the list of files associated with a past intake.
 * Writes a StorageCleanupJob row in PENDING_CONFIRMATION status.
 * Idempotent: if a job already exists for this intake and is not EXECUTED
 * or CANCELLED, the existing job id is returned.
 */
export async function scanIntake(
  intakeId: string,
  actorId: string,
): Promise<string> {
  // Idempotency check
  const existing = await db.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM storage_cleanup_jobs
    WHERE "intakeId" = ${intakeId}
      AND status NOT IN ('EXECUTED','CANCELLED')
    LIMIT 1
  `;
  if (existing.length > 0) return existing[0].id;

  const intake = await db.intake.findUnique({
    where: { id: intakeId },
    include: { course: { select: { title: true } } },
  });
  if (!intake) throw new Error(`Intake ${intakeId} not found`);

  const items: CleanupItem[] = [];

  // 1. Lesson notes for courses in this intake
  const enrolmentCourseIds = await db.enrolment.findMany({
    where: { intakeId },
    select: { courseId: true },
    distinct: ["courseId"],
  });
  const courseIds = enrolmentCourseIds.map((e) => e.courseId);

  if (courseIds.length > 0) {
    const lessons = await db.$queryRaw<
      Array<{
        id: string;
        notesS3Key: string | null;
        sizeBytes: number | null;
        title: string;
        courseTitle: string;
      }>
    >`
      SELECT l.id, l."notesS3Key", l."sizeBytes", l.title, c.title AS "courseTitle"
      FROM lessons l
      JOIN blocks b ON l."blockId" = b.id
      JOIN courses c ON b."courseId" = c.id
      WHERE l."notesS3Key" IS NOT NULL
        AND b."courseId" = ANY(${courseIds})
    `;
    for (const l of lessons) {
      items.push({
        type: "lesson_notes",
        id: l.id,
        s3Key: l.notesS3Key!,
        fileName: `${l.title}.pdf`,
        sizeBytes: l.sizeBytes ?? 0,
        courseTitle: l.courseTitle,
        intakeLabel: intake.label,
      });
    }

    // 2. Class presentations for live classes in these courses
    const presentations = await db.$queryRaw<
      Array<{
        id: string;
        s3Key: string;
        sizeBytes: number;
        fileName: string;
        courseTitle: string;
      }>
    >`
      SELECT cp.id, cp."s3Key", cp."sizeBytes", cp."fileName", c.title AS "courseTitle"
      FROM class_presentations cp
      JOIN live_classes lc ON cp."liveClassId" = lc.id
      JOIN courses c ON lc."courseId" = c.id
      WHERE lc."courseId" = ANY(${courseIds})
    `;
    for (const p of presentations) {
      items.push({
        type: "class_presentation",
        id: p.id,
        s3Key: p.s3Key,
        fileName: p.fileName,
        sizeBytes: p.sizeBytes,
        courseTitle: p.courseTitle,
        intakeLabel: intake.label,
      });
    }

    // 3. Live class recording links (external only; sizeBytes = 0)
    const recordings = await db.$queryRaw<
      Array<{
        id: string;
        recordingUrl: string;
        title: string;
        courseTitle: string;
      }>
    >`
      SELECT lc.id, lc."recordingUrl", lc.title, c.title AS "courseTitle"
      FROM live_classes lc
      JOIN courses c ON lc."courseId" = c.id
      WHERE lc."courseId" = ANY(${courseIds})
        AND lc."recordingUrl" IS NOT NULL
    `;
    for (const r of recordings) {
      items.push({
        type: "recording_link",
        id: r.id,
        recordingUrl: r.recordingUrl,
        fileName: `Recording: ${r.title}`,
        sizeBytes: 0,
        courseTitle: r.courseTitle,
        intakeLabel: intake.label,
      });
    }
  }

  const totalSizeBytes = items.reduce((sum, i) => sum + i.sizeBytes, 0);

  // Read trash-days setting
  const trashSetting = await db.siteSetting.findUnique({
    where: { key: "storage.trash_retention_days" },
  });
  const trashDays = parseInt(trashSetting?.value ?? "14", 10);

  // Create the job
  const job = await db.$executeRaw`
    INSERT INTO storage_cleanup_jobs
      (id, "intakeId", "intakeLabel", status, "itemsJson", "totalSizeBytes",
       "trashDays", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      ${intakeId},
      ${intake.label},
      'PENDING_CONFIRMATION',
      ${JSON.stringify(items)}::jsonb,
      ${BigInt(totalSizeBytes)},
      ${trashDays},
      NOW(), NOW()
    )
  `;
  void job; // result is row count

  // Re-fetch to get the id
  const created = await db.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM storage_cleanup_jobs
    WHERE "intakeId" = ${intakeId}
      AND status = 'PENDING_CONFIRMATION'
    ORDER BY "createdAt" DESC LIMIT 1
  `;
  const jobId = created[0]?.id ?? "";

  await audit({
    actorId,
    action: "STORAGE_SCAN" as import("@prisma/client").AuditAction,
    entityType: "StorageCleanupJob",
    entityId: jobId,
    metadata: { intakeId, intakeLabel: intake.label, items: items.length, totalSizeBytes },
  });

  return jobId;
}

// ─── Principal confirms a job ─────────────────────────────────────────────────

export async function confirmJob(
  jobId: string,
  principalId: string,
): Promise<void> {
  const job = await db.$queryRaw<Array<{ id: string; trashDays: number }>>`
    SELECT id, "trashDays" FROM storage_cleanup_jobs
    WHERE id = ${jobId} AND status = 'PENDING_CONFIRMATION'
    LIMIT 1
  `;
  if (!job.length) throw new Error("Job not found or already confirmed");

  const executeAfter = new Date(
    Date.now() + job[0].trashDays * 24 * 60 * 60 * 1000,
  );

  await db.$executeRaw`
    UPDATE storage_cleanup_jobs SET
      status = 'IN_TRASH',
      "confirmedById" = ${principalId},
      "confirmedAt" = NOW(),
      "executeAfter" = ${executeAfter},
      "updatedAt" = NOW()
    WHERE id = ${jobId}
  `;

  await audit({
    actorId: principalId,
    action: "STORAGE_PURGE_CONFIRMED" as import("@prisma/client").AuditAction,
    entityType: "StorageCleanupJob",
    entityId: jobId,
    metadata: { executeAfter: executeAfter.toISOString() },
  });
}

// ─── Cancel a job ────────────────────────────────────────────────────────────

export async function cancelJob(
  jobId: string,
  actorId: string,
): Promise<void> {
  await db.$executeRaw`
    UPDATE storage_cleanup_jobs SET
      status = 'CANCELLED',
      "cancelledAt" = NOW(),
      "updatedAt" = NOW()
    WHERE id = ${jobId}
      AND status IN ('PENDING_CONFIRMATION', 'IN_TRASH')
  `;
  await audit({
    actorId,
    action: "STORAGE_PURGE_EXECUTED" as import("@prisma/client").AuditAction, // reuse; intent is clear from metadata
    entityType: "StorageCleanupJob",
    entityId: jobId,
    metadata: { cancelled: true },
  });
}

// ─── Execute ready (in-trash, past executeAfter) jobs ─────────────────────────

export async function executeReadyJobs(): Promise<number> {
  const jobs = await db.$queryRaw<
    Array<{ id: string; itemsJson: unknown }>
  >`
    SELECT id, "itemsJson"
    FROM storage_cleanup_jobs
    WHERE status = 'IN_TRASH'
      AND "executeAfter" <= NOW()
    ORDER BY "executeAfter"
    LIMIT 20
    FOR UPDATE SKIP LOCKED
  `;

  let executed = 0;
  for (const job of jobs) {
    const items = job.itemsJson as CleanupItem[];
    const errors: string[] = [];

    for (const item of items) {
      try {
        if (
          (item.type === "lesson_notes" || item.type === "class_presentation") &&
          item.s3Key
        ) {
          await deleteObject(item.s3Key);
          if (item.type === "lesson_notes") {
            await db.$executeRaw`
              UPDATE lessons SET "notesS3Key" = NULL, "sizeBytes" = NULL
              WHERE id = ${item.id}
            `;
          } else {
            await db.classPresentation.delete({ where: { id: item.id } });
          }
        } else if (item.type === "recording_link") {
          // External link: unlink only (never delete the actual bytes)
          await db.$executeRaw`
            UPDATE live_classes SET "recordingUrl" = NULL WHERE id = ${item.id}
          `;
        }
      } catch (err) {
        errors.push(`${item.type}:${item.id}: ${String(err)}`);
      }
    }

    await db.$executeRaw`
      UPDATE storage_cleanup_jobs SET
        status = 'EXECUTED',
        "executedAt" = NOW(),
        "updatedAt" = NOW()
      WHERE id = ${job.id}
    `;

    await audit({
      action: "STORAGE_PURGE_EXECUTED" as import("@prisma/client").AuditAction,
      entityType: "StorageCleanupJob",
      entityId: job.id,
      metadata: {
        itemsProcessed: items.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });

    executed += 1;
  }
  return executed;
}

// ─── Storage usage summary ────────────────────────────────────────────────────

export interface StorageUsageSummary {
  totalUsedBytes: number;
  warningPercent: number;
  totalQuotaGb: number;
  usedPercent: number;
  isWarning: boolean;
  perCourse: Array<{
    courseId: string;
    courseTitle: string;
    notesBytes: number;
    presentationsBytes: number;
    totalBytes: number;
  }>;
}

export async function getStorageUsageSummary(): Promise<StorageUsageSummary> {
  // Read settings
  const [warnSetting, quotaSetting] = await Promise.all([
    db.siteSetting.findUnique({ where: { key: "storage.warning_percent" } }),
    db.siteSetting.findUnique({ where: { key: "storage.total_gb" } }),
  ]);
  const warningPercent = parseInt(warnSetting?.value ?? "80", 10);
  const totalQuotaGb = parseInt(quotaSetting?.value ?? "50", 10);
  const totalQuotaBytes = totalQuotaGb * 1024 * 1024 * 1024;

  // Sum notes sizes from lessons
  const notesSizes = await db.$queryRaw<
    Array<{ courseId: string; courseTitle: string; totalBytes: bigint }>
  >`
    SELECT b."courseId", c.title AS "courseTitle",
           COALESCE(SUM(l."sizeBytes"), 0)::bigint AS "totalBytes"
    FROM lessons l
    JOIN blocks b ON l."blockId" = b.id
    JOIN courses c ON b."courseId" = c.id
    WHERE l."notesS3Key" IS NOT NULL
    GROUP BY b."courseId", c.title
  `;

  // Sum presentation sizes
  const presentationSizes = await db.$queryRaw<
    Array<{ courseId: string; totalBytes: bigint }>
  >`
    SELECT lc."courseId",
           COALESCE(SUM(cp."sizeBytes"), 0)::bigint AS "totalBytes"
    FROM class_presentations cp
    JOIN live_classes lc ON cp."liveClassId" = lc.id
    GROUP BY lc."courseId"
  `;

  const presMap = new Map<string, number>(
    presentationSizes.map((p) => [p.courseId, Number(p.totalBytes)]),
  );

  const perCourse = notesSizes.map((n) => ({
    courseId: n.courseId,
    courseTitle: n.courseTitle,
    notesBytes: Number(n.totalBytes),
    presentationsBytes: presMap.get(n.courseId) ?? 0,
    totalBytes: Number(n.totalBytes) + (presMap.get(n.courseId) ?? 0),
  }));

  // Add courses that have only presentations
  for (const [courseId, presBytes] of Array.from(presMap.entries())) {
    if (!notesSizes.find((n) => n.courseId === courseId)) {
      const course = await db.course.findUnique({
        where: { id: courseId },
        select: { title: true },
      });
      perCourse.push({
        courseId,
        courseTitle: course?.title ?? courseId,
        notesBytes: 0,
        presentationsBytes: presBytes,
        totalBytes: presBytes,
      });
    }
  }

  const totalUsedBytes = perCourse.reduce((s, c) => s + c.totalBytes, 0);
  const usedPercent =
    totalQuotaBytes > 0 ? Math.round((totalUsedBytes / totalQuotaBytes) * 100) : 0;

  return {
    totalUsedBytes,
    warningPercent,
    totalQuotaGb,
    usedPercent,
    isWarning: usedPercent >= warningPercent,
    perCourse: perCourse.sort((a, b) => b.totalBytes - a.totalBytes),
  };
}
