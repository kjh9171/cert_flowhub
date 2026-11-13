// 워크스페이스 테넌트 격리 헬퍼
// - 모든 ERP API가 workspaceId 기준으로 멤버십을 검증
// - body/query의 workspaceId 명시 > 소속 워크스페이스 중 첫 번째

import prisma from "./prisma";
import { HttpError } from "../middleware/error";
import type { Request } from "express";

export async function resolveWorkspaceId(req: Request): Promise<string> {
  const raw = (req.body?.workspaceId ?? req.query?.workspaceId) as string | undefined;
  if (raw) {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: raw, userId: req.user!.userId } },
    });
    if (!member) throw new HttpError(403, "해당 워크스페이스의 멤버가 아닙니다.");
    return raw;
  }
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: req.user!.userId },
    orderBy: { joinedAt: "asc" },
  });
  if (!member) throw new HttpError(400, "소속된 워크스페이스가 없습니다.");
  return member.workspaceId;
}
