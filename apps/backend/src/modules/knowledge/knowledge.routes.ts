// FlowHub Knowledge Base 모듈

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";

const router = Router();
router.use(authMiddleware);

// GET /api/knowledge?workspaceId=&visibility=&category=
router.get("/", async (req, res, next) => {
  try {
    const { workspaceId, visibility, category, search } = req.query;
    const articles = await prisma.knowledgeArticle.findMany({
      where: {
        ...(workspaceId ? { workspaceId: String(workspaceId) } : {}),
        ...(visibility ? { visibility: String(visibility) as any } : {}),
        ...(category ? { category: String(category) } : {}),
        ...(search
          ? { OR: [{ title: { contains: String(search), mode: "insensitive" } }, { content: { contains: String(search), mode: "insensitive" } }] }
          : {}),
      },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { updatedAt: "desc" },
    });
    res.json(articles);
  } catch (e) {
    next(e);
  }
});

// POST /api/knowledge
router.post("/", async (req, res, next) => {
  try {
    const { workspaceId, title, content, visibility, category, tags, parentId } = req.body;
    if (!title) throw new HttpError(400, "title은 필수입니다.");
    const article = await prisma.knowledgeArticle.create({
      data: {
        workspaceId: workspaceId || null,
        authorId: req.user!.userId,
        title,
        content: content || "",
        visibility: visibility || "PERSONAL",
        category,
        tags: tags || [],
        parentId: parentId || null,
        version: 1,
      },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
    // 초기 버전 저장
    await prisma.knowledgeVersion.create({
      data: { articleId: article.id, version: 1, content: content || "", title, editorId: req.user!.userId },
    });
    res.status(201).json(article);
  } catch (e) {
    next(e);
  }
});

// GET /api/knowledge/:id
router.get("/:id", async (req, res, next) => {
  try {
    const article = await prisma.knowledgeArticle.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        versions: { orderBy: { version: "desc" }, take: 10 },
        comments: { include: { author: { select: { id: true, name: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" } },
        attachments: true,
        links: true,
        children: { select: { id: true, title: true } },
      },
    });
    if (!article) throw new HttpError(404, "문서를 찾을 수 없습니다.");
    res.json(article);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/knowledge/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const { title, content, visibility, category, tags, isPinned, changeNote } = req.body;
    const existing = await prisma.knowledgeArticle.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "문서를 찾을 수 없습니다.");

    const newVersion = existing.version + 1;
    const article = await prisma.knowledgeArticle.update({
      where: { id: req.params.id },
      data: {
        title: title ?? existing.title,
        content: content ?? existing.content,
        visibility: visibility ?? existing.visibility,
        category: category ?? existing.category,
        tags: tags ?? existing.tags,
        isPinned: isPinned ?? existing.isPinned,
        version: content !== undefined || title !== undefined ? newVersion : existing.version,
      },
    });

    if (content !== undefined || title !== undefined) {
      await prisma.knowledgeVersion.create({
        data: {
          articleId: article.id,
          version: newVersion,
          content: article.content,
          title: article.title,
          editorId: req.user!.userId,
          changeNote: changeNote || null,
        },
      });
    }
    res.json(article);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/knowledge/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.knowledgeArticle.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// POST /api/knowledge/:id/promote (개인 -> 팀 승격)
router.post("/:id/promote", async (req, res, next) => {
  try {
    const article = await prisma.knowledgeArticle.update({
      where: { id: req.params.id },
      data: { visibility: "TEAM", promotedFromId: req.params.id },
    });
    res.json(article);
  } catch (e) {
    next(e);
  }
});

// GET /api/knowledge/:id/versions
router.get("/:id/versions", async (req, res, next) => {
  try {
    const versions = await prisma.knowledgeVersion.findMany({
      where: { articleId: req.params.id },
      include: { editor: { select: { id: true, name: true } } },
      orderBy: { version: "desc" },
    });
    res.json(versions);
  } catch (e) {
    next(e);
  }
});

export default router;
