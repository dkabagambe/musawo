import { db } from "@/lib/db";
import type { AuditAction } from "@prisma/client";

interface AuditParams {
  actorId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export async function audit(params: AuditParams): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      action: params.action,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
    },
  });
}
