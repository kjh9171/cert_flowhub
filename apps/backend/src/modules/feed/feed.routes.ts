// FlowHub Feed 모듈

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { createNotification, notifyMany } from "../../lib/notify";
import { HttpError } from "../../middleware/error";

const router = Router();
router.use(authMiddleware);

// ── 멘션 처리: 콘텐츠 내 @이름 추출 → Mention 레코드 생성 + 멘션 대상자에게 실시간 알림
async function handleMentions(content: string, authorId: string, opts: { postId?: string; commentId?: string }) {
  if (!content) return;
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const mentioned = new Map<string, string>(); // userId → 이름 (중복 제거)
  const re = /@([\p{L}\d_-]+)/gu; // 한글/영문 닉네임 지원
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    const u = users.find((x) => x.name === m![1]);
    if (u && u.id !== authorId) mentioned.set(u.id, u.name); // 작성자 본인 제외
  }
  if (!mentioned.size) return;

  await prisma.mention.createMany({
    data: [...mentioned.keys()].map((uid) => ({ userId: uid, postId: opts.postId ?? null, commentId: opts.commentId ?? null })),
  });

  const authorName = (await prisma.user.findUnique({ where: { id: authorId }, select: { name: true } }))?.name ?? "알 수 없음";
  await notifyMany([...mentioned.keys()], {
    type: "FEED_MENTION", // NotificationType enum — FEED_MENTION(피드 멘션)
    title: `${authorName} 님이 멘션했습니다`,
    body: content.slice(0, 100),
    link: "/feed",
  });
}

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
    // 멘션된 사용자에게 알림 (게시글 본문 내 @이름)
    await handleMentions(content, req.user!.userId, { postId: post.id });
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
    // 멘션된 사용자에게 알림 (댓글 내 @이름)
    await handleMentions(content, req.user!.userId, { postId: req.params.id, commentId: comment.id });
    // 게시글 작성자에게 알림 (댓글 작성자 제외)
    const post = await prisma.feedPost.findUnique({ where: { id: req.params.id }, select: { authorId: true, title: true } });
    if (post && post.authorId !== req.user!.userId) {
      await createNotification({
        userId: post.authorId,
        type: "FEED_COMMENT",
        title: "댓글이 등록되었습니다",
        body: content.slice(0, 100),
        link: `/feed`,
      });
    }
    res.status(201).json(comment);
  } catch (e) {
    next(e);
  }
});

export default router;
