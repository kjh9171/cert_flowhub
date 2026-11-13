// FlowHub 전달사항 모듈
// - 담당자 할 일 메모, @발주노트 멘션 연결, 사진 첨부, 완료 체크

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";
import { resolveWorkspaceId } from "../../lib/workspace";

const router = Router();
router.use(authMiddleware);

// GET /api/handover-memos?done=&q=&workspaceId=
router.get("/", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { done, q } = req.query;
    const memos = await prisma.handoverMemo.findMany({
      where: {
        workspaceId,
        ...(done !== undefined ? { done: done === "true" } : {}),
        ...(q ? { content: { contains: String(q), mode: "insensitive" as const } } : {}),
      },
      include: {
        author: { select: { id: true, name: true } },
        orderNote: { select: { id: true, orderNo: true, partnerName: true } },
      },
      orderBy: [{ done: "asc" }, { createdAt: "desc" }],
    });
    res.json(memos);
  } catch (e) { next(e); }
});

// POST /api/handover-memos
router.post("/", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { content, photos, orderNoteId } = req.body || {};
    if (!content || !String(content).trim()) throw new HttpError(400, "내용은 필수입니다.");
    const memo = await prisma.handoverMemo.create({
      data: {
        workspaceId,
        authorId: req.user!.userId,
        content: String(content).trim(),
        photos: Array.isArray(photos) ? photos : [],
        orderNoteId: orderNoteId || null,
      },
      include: {
        author: { select: { id: true, name: true } },
        orderNote: { select: { id: true, orderNo: true, partnerName: true } },
      },
    });
    res.status(201).json(memo);
  } catch (e) { next(e); }
});

// PATCH /api/handover-memos/:id — 완료 토글/내용 수정
router.patch("/:id", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const existing = await prisma.handoverMemo.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "전달사항을 찾을 수 없습니다.");
    const { content, done, photos, orderNoteId } = req.body || {};
    const memo = await prisma.handoverMemo.update({
      where: { id: existing.id },
      data: {
        ...(content !== undefined ? { content: String(content).trim() } : {}),
        ...(done !== undefined ? { done: Boolean(done) } : {}),
        ...(Array.isArray(photos) ? { photos } : {}),
        ...(orderNoteId !== undefined ? { orderNoteId: orderNoteId || null } : {}),
      },
      include: {
        author: { select: { id: true, name: true } },
        orderNote: { select: { id: true, orderNo: true, partnerName: true } },
      },
    });
    res.json(memo);
  } catch (e) { next(e); }
});

// DELETE /api/handover-memos/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const existing = await prisma.handoverMemo.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "전달사항을 찾을 수 없습니다.");
    await prisma.handoverMemo.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
