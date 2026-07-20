import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Audit trail service.
 *
 * Called by every mutating service method. Audit writes must never break the
 * primary operation, so failures are logged and swallowed. When the caller
 * already runs inside a transaction it should pass the transaction client so
 * the audit row commits (or rolls back) atomically with the change.
 */
export interface AuditEvent {
  action: AuditAction;
  entity: string;
  entityId?: string;
  userId?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function recordAudit(
  event: AuditEvent,
  tx: Prisma.TransactionClient = prisma,
): Promise<void> {
  try {
    await tx.auditLog.create({
      data: {
        action: event.action,
        entity: event.entity,
        entityId: event.entityId,
        userId: event.userId,
        metadata: event.metadata,
      },
    });
  } catch (err) {
    logger.error("Failed to write audit log", {
      event,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
