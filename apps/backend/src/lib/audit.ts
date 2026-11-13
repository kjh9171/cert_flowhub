// 감사 로그(AuditLog) — 주요 변경 이력 기록 (best-effort)
// 실패해도 본 작업을 막지 않는다.

import prisma from "./prisma";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "ADJUST" | "STATUS" | "CONVERT";

export async function logAudit(params: {
  workspaceId?: string | null;
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  summary: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: params.workspaceId ?? null,
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        summary: params.summary.slice(0, 500),
      },
    });
  } catch (e) {
    console.error("[audit] 기록 실패:", e);
  }
}
