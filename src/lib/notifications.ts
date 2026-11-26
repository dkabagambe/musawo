/**
 * Notification utilities for creating and managing in-app notifications.
 * Sends notifications to all enrolled students when a class status changes.
 */

import { db } from "@/lib/db";

export interface NotificationPayload {
  userId: string;
  type: string;
  subject?: string;
  body: string;
  metadata?: Record<string, any>;
}

/**
 * Create a single notification for a user
 */
export async function createNotification(payload: NotificationPayload) {
  try {
    await db.notification.create({
      data: {
        userId: payload.userId,
        channel: "IN_APP",
        type: payload.type,
        subject: payload.subject,
        body: payload.body,
        metadata: payload.metadata,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

/**
 * Create notifications for all enrolled students in a course
 */
export async function notifyEnrolledStudents(params: {
  courseId: string;
  type: string;
  subject?: string;
  body: string;
  metadata?: Record<string, any>;
}) {
  try {
    // Find all active enrolments for the course
    const enrolments = await db.enrolment.findMany({
      where: {
        courseId: params.courseId,
        status: { in: ["ACTIVE", "PARTIALLY_PAID", "COMPLETED", "OVERDUE"] },
      },
      select: { userId: true },
    });

    // Create notification for each student
    const notifications = enrolments.map((enr) => ({
      userId: enr.userId,
      channel: "IN_APP" as const,
      type: params.type,
      subject: params.subject,
      body: params.body,
      metadata: params.metadata,
      createdAt: new Date(),
    }));

    if (notifications.length > 0) {
      await db.notification.createMany({
        data: notifications,
      });
    }

    console.log(`Notified ${notifications.length} students for course ${params.courseId}`);
  } catch (error) {
    console.error("Failed to notify enrolled students:", error);
  }
}

/**
 * Notify students when a live class is cancelled
 */
export async function notifyClassCancellation(params: {
  liveClassId: string;
  courseId: string;
  classTitle: string;
  cancelReason?: string;
}) {
  const body =
    `Class "${params.classTitle}" has been cancelled.` +
    (params.cancelReason ? ` Reason: ${params.cancelReason}` : "");

  await notifyEnrolledStudents({
    courseId: params.courseId,
    type: "CLASS_CANCELLED",
    subject: `Class Cancelled: ${params.classTitle}`,
    body,
    metadata: {
      liveClassId: params.liveClassId,
      courseId: params.courseId,
      reason: params.cancelReason,
    },
  });
}

/**
 * Notify students when a live class is rescheduled
 */
export async function notifyClassReschedule(params: {
  liveClassId: string;
  courseId: string;
  classTitle: string;
  originalScheduledAt: Date;
  newScheduledAt: Date;
  rescheduleReason?: string;
}) {
  const originalTime = params.originalScheduledAt.toLocaleString("en-UG");
  const newTime = params.newScheduledAt.toLocaleString("en-UG");

  const body =
    `Class "${params.classTitle}" has been rescheduled.\n` +
    `Original: ${originalTime}\n` +
    `New: ${newTime}` +
    (params.rescheduleReason ? `\n\nReason: ${params.rescheduleReason}` : "");

  await notifyEnrolledStudents({
    courseId: params.courseId,
    type: "CLASS_RESCHEDULED",
    subject: `Class Rescheduled: ${params.classTitle}`,
    body,
    metadata: {
      liveClassId: params.liveClassId,
      courseId: params.courseId,
      originalScheduledAt: params.originalScheduledAt.toISOString(),
      newScheduledAt: params.newScheduledAt.toISOString(),
      reason: params.rescheduleReason,
    },
  });
}
