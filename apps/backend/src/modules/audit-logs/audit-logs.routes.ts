// FlowHub 감사 로그 조회 모듈 (관리자/멤버용 — 최근 이벤트만)

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { resolveWorkspaceId } from "../../lib/workspace";

const router = Router();
router.use(authMiddleware);

// GET /api/audit-logs?entity=&workspaceId=
router.get("/", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { entity } = req.query;
    const logs = await prisma.auditLog.findMany({
      where: { workspaceId, ...(entity ? { entity: String(entity) } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(logs);
  } catch (e) { next(e); }
});

export default router;
