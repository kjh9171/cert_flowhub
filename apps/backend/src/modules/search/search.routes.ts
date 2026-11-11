// FlowHub 통합 검색 모듈

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";

const router = Router();
router.use(authMiddleware);

// GET /api/search?q=&workspaceId=
router.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const workspaceId = req.query.workspaceId ? String(req.query.workspaceId) : undefined;
    if (!q) {
      return res.json({ tasks: [], articles: [], posts: [] });
    }
    const [tasks, articles, posts] = await Promise.all([
      prisma.task.findMany({
        where: {
          ...(workspaceId ? { workspaceId } : {}),
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, status: true, priority: true, projectId: true },
        take: 20,
      }),
      prisma.knowledgeArticle.findMany({
        where: {
          ...(workspaceId ? { workspaceId } : {}),
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, visibility: true, category: true },
        take: 20,
      }),
      prisma.feedPost.findMany({
        where: {
          ...(workspaceId ? { workspaceId } : {}),
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, type: true, createdAt: true },
        take: 20,
      }),
    ]);
    res.json({ tasks, articles, posts });
  } catch (e) {
    next(e);
  }
});

// GET /api/search/advanced?q=&workspaceId=
router.get("/advanced", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const workspaceId = req.query.workspaceId ? String(req.query.workspaceId) : null;
    if (!q) return res.json({ tasks: [], articles: [], posts: [] });

    const tsq = q.split(/\s+/).join(" & ");

    const tasks = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, title, status, priority, "projectId",
              ts_rank(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,'')), to_tsquery('simple', $1)) AS rank
       FROM tasks
       WHERE to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,'')) @@ to_tsquery('simple', $1)
         ${workspaceId ? "AND \"workspaceId\" = $2" : ""}
       ORDER BY rank DESC LIMIT 20`,
      tsq,
      ...(workspaceId ? [workspaceId] : [])
    );

    const articles = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, title, visibility, category,
              ts_rank(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,'')), to_tsquery('simple', $1)) AS rank
       FROM knowledge_articles
       WHERE to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,'')) @@ to_tsquery('simple', $1)
         ${workspaceId ? "AND \"workspaceId\" = $2" : ""}
       ORDER BY rank DESC LIMIT 20`,
      tsq,
      ...(workspaceId ? [workspaceId] : [])
    );

    const posts = await prisma.feedPost.findMany({
      where: {
        ...(workspaceId ? { workspaceId } : {}),
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, type: true, createdAt: true },
      take: 20,
    });

    res.json({ tasks, articles, posts });
  } catch (e) {
    next(e);
  }
});

export default router;
