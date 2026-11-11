// FlowHub Feed 모듈

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";

const router = Router();
router.use(authMiddleware);

// GET /api/feed?workspaceId=&projectId=
router.get("/", async (req, res, next) => {
  try {
    const { workspaceId, projectId } = req.query;
    const posts = await prisma.feedPost.findMany({
      where: {
        ...(workspaceId ? { workspaceId: String(workspaceId) } : {}),
        ...(projectId ? { projectId: String(projectId) } : {}),
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, status: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });
    res.json(posts);
  } catch (e) {
    next(e);
  }
});

// POST /api/feed
router.post("/", async (req, res, next) => {
  try {
    const { workspaceId, projectId, type, title, content } = req.body;
    if (!workspaceId || !content) throw new HttpError(400, "workspaceId, content는 필수입니다.");
    const post = await prisma.feedPost.create({
      data: {
        workspaceId,
        projectId: projectId || null,
        authorId: req.user!.userId,
        type: type || "SHARE",
        title,
        content,
      },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
    res.status(201).json(post);
  } catch (e) {
    next(e);
  }
});

// GET /api/feed/:id
router.get("/:id", async (req, res, next) => {
  try {
    const post = await prisma.feedPost.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        comments: {
          include: { author: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: "asc" },
        },
        attachments: true,
      },
    });
    if (!post) throw new HttpError(404, "게시글을 찾을 수 없습니다.");
    res.json(post);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/feed/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const { title, content, isPinned } = req.body;
    const post = await prisma.feedPost.update({
      where: { id: req.params.id },
      data: { title, content, isPinned },
    });
    res.json(post);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/feed/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.feedPost.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// POST /api/feed/:id/comments
router.post("/:id/comments", async (req, res, next) => {
  try {
    const { content, parentId } = req.body;
    if (!content) throw new HttpError(400, "content는 필수입니다.");
    const comment = await prisma.comment.create({
      data: {
        postId: req.params.id,
        authorId: req.user!.userId,
        content,
        parentId: parentId || null,
      },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
    res.status(201).json(comment);
  } catch (e) {
    next(e);
  }
});

export default router;
