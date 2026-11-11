// FlowHub 대시보드 통계 모듈

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";

const router = Router();
router.use(authMiddleware);

// GET /api/stats?workspaceId=
router.get("/", async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId ? String(req.query.workspaceId) : undefined;
    const where = workspaceId ? { workspaceId } : {};

    const [totalTasks, byStatus, totalProjects, totalArticles, recentPosts, badges] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.groupBy({ by: ["status"], where, _count: { _all: true } }),
      prisma.project.count({ where: workspaceId ? { workspaceId } : {} }),
      prisma.knowledgeArticle.count({ where: workspaceId ? { workspaceId } : {} }),
      prisma.feedPost.count({ where: workspaceId ? { workspaceId } : {} }),
      prisma.integrationBadge.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((s: any) => { statusMap[s.status] = s._count._all; });

    const badgeMap: Record<string, number> = {};
    badges.forEach((b: any) => { badgeMap[b.status] = b._count._all; });

    res.json({
      totalTasks,
      byStatus: statusMap,
      totalProjects,
      totalArticles,
      recentPosts,
      badges: badgeMap,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
