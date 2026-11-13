// FlowHub 비즈니스 문자(SMS/MMS) 모듈
// - 스레드 관리, 안읽음 필터, MMS 사진 첨부, 수신 시뮬레이션(개발용)
// - 실제 통신사업자 연동은 별도 게이트웨이(알리고/문자나라 등) 설정이 필요.
//   본 구현은 발송 시 "전송 완료(시뮬레이션)" 처리.

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";
import { resolveWorkspaceId } from "../../lib/workspace";

const router = Router();
router.use(authMiddleware);

// GET /api/sms/threads?unreadOnly=&q=&workspaceId=
router.get("/threads", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { unreadOnly, q } = req.query;
    const threads = await prisma.smsThread.findMany({
      where: {
        workspaceId,
        ...(unreadOnly === "true" ? { unreadCount: { gt: 0 } } : {}),
        ...(q ? { OR: [
          { participantName: { contains: String(q), mode: "insensitive" } },
          { participantPhone: { contains: String(q) } },
        ] } : {}),
      },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { lastMessageAt: "desc" },
    });
    res.json(threads);
  } catch (e) { next(e); }
});

// GET /api/sms/threads/:id/messages
router.get("/threads/:id/messages", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const thread = await prisma.smsThread.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!thread) throw new HttpError(404, "대화방을 찾을 수 없습니다.");
    const messages = await prisma.smsMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
    });
    // 읽음 처리
    await prisma.smsThread.update({ where: { id: thread.id }, data: { unreadCount: 0 } });
    await prisma.smsMessage.updateMany({ where: { threadId: thread.id, direction: "IN", isRead: false }, data: { isRead: true } });
    res.json(messages);
  } catch (e) { next(e); }
});

// POST /api/sms/messages — 발송 { participantPhone, participantName?, content, attachments? }
router.post("/messages", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { participantPhone, participantName, content, attachments } = req.body || {};
    if (!participantPhone || !content) throw new HttpError(400, "수신번호와 내용은 필수입니다.");
    const thread = await prisma.smsThread.upsert({
      where: { workspaceId_participantPhone: { workspaceId, participantPhone: String(participantPhone).trim() } },
      create: { workspaceId, participantPhone: String(participantPhone).trim(), participantName: participantName || null, lastMessageAt: new Date(), unreadCount: 0 },
      update: { ...(participantName ? { participantName } : {}), lastMessageAt: new Date() },
    });
    const msg = await prisma.smsMessage.create({
      data: {
        threadId: thread.id,
        direction: "OUT",
        content: String(content).trim(),
        attachments: Array.isArray(attachments) ? attachments : [],
        isRead: true,
      },
    });
    res.status(201).json({ thread, message: msg });
  } catch (e) { next(e); }
});

// POST /api/sms/threads/:id/receive — 수신 시뮬레이션(개발/데모용)
router.post("/threads/:id/receive", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const thread = await prisma.smsThread.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!thread) throw new HttpError(404, "대화방을 찾을 수 없습니다.");
    const { content, attachments } = req.body || {};
    if (!content) throw new HttpError(400, "내용은 필수입니다.");
    const [message] = await prisma.$transaction([
      prisma.smsMessage.create({ data: { threadId: thread.id, direction: "IN", content: String(content).trim(), attachments: Array.isArray(attachments) ? attachments : [], isRead: false } }),
      prisma.smsThread.update({ where: { id: thread.id }, data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } } }),
    ]);
    res.status(201).json(message);
  } catch (e) { next(e); }
});

// DELETE /api/sms/threads/:id — 대화 삭제
router.delete("/threads/:id", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const existing = await prisma.smsThread.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "대화방을 찾을 수 없습니다.");
    await prisma.smsThread.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
