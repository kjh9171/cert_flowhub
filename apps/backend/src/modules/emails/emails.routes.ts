// FlowHub 비즈니스 메일 모듈
// - 미처리/거래처/세금계산서 자동 라벨링(룰 기반), 읽음 처리, 발주로 전환

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";
import { resolveWorkspaceId } from "../../lib/workspace";
import { logAudit } from "../../lib/audit";

const router = Router();
router.use(authMiddleware);

// 룰 기반 자동 라벨링: 제목/보낸이 키워드로 분류
export function classifyEmail(fromEmail: string, subject: string): "UNHANDLED" | "VENDOR" | "TAX_INVOICE" {
  const s = `${fromEmail} ${subject}`.toLowerCase();
  if (/세금계산서|tax[\s-]?invoice|전자세금|계산서/.test(subject)) return "TAX_INVOICE";
  if (/taxinvoice|estimate@|partner@|거래처/.test(fromEmail)) return "VENDOR";
  if (/세금|계산서/.test(subject)) return "TAX_INVOICE";
  if (/견적|발주|거래|협력회사|은행|거래처/.test(`${subject} ${fromEmail}`)) return "VENDOR";
  return "UNHANDLED";
}

// GET /api/emails?classification=&unreadOnly=&q=&workspaceId=
router.get("/", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { classification, unreadOnly, q } = req.query;
    const emails = await prisma.businessEmail.findMany({
      where: {
        workspaceId,
        ...(classification ? { classification: String(classification) as any } : {}),
        ...(unreadOnly === "true" ? { isRead: false } : {}),
        ...(q ? { OR: [
          { subject: { contains: String(q), mode: "insensitive" } },
          { fromName: { contains: String(q), mode: "insensitive" } },
          { fromEmail: { contains: String(q), mode: "insensitive" } },
        ] } : {}),
      },
      orderBy: { receivedAt: "desc" },
      take: 100,
    });
    res.json(emails);
  } catch (e) { next(e); }
});

// PATCH /api/emails/:id — 읽음/분류 변경
router.patch("/:id", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const existing = await prisma.businessEmail.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "메일을 찾을 수 없습니다.");
    const { isRead, classification } = req.body || {};
    const email = await prisma.businessEmail.update({
      where: { id: existing.id },
      data: {
        ...(isRead !== undefined ? { isRead: Boolean(isRead) } : {}),
        ...(classification ? { classification } : {}),
      },
    });
    res.json(email);
  } catch (e) { next(e); }
});

// POST /api/emails/:id/to-order — 메일을 발주노트로 전환
router.post("/:id/to-order", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const email = await prisma.businessEmail.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!email) throw new HttpError(404, "메일을 찾을 수 없습니다.");

    const ym = (() => {
      const d = new Date();
      return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    })();
    const count = await prisma.orderNote.count({ where: { workspaceId } });
    const orderNo = `PO-${ym}-${String(count + 1).padStart(4, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const order = await prisma.orderNote.create({
      data: {
        workspaceId,
        orderNo,
        partnerName: email.fromName || email.fromEmail,
        partnerContact: email.fromEmail,
        memo: `[메일 발주 전환] ${email.subject}${email.snippet ? `\n\n${email.snippet}` : ""}`,
        authorId: req.user!.userId,
        items: {
          create: [{ name: email.subject.slice(0, 100), qty: 1, unit: "EA", unitPrice: 0, amount: 0, note: "메일에서 자동 생성됨" }],
        },
      },
      include: { items: true },
    });
    await prisma.businessEmail.update({ where: { id: email.id }, data: { classification: "VENDOR", isRead: true } });
    await logAudit({ workspaceId, userId: req.user!.userId, action: "CONVERT", entity: "ORDER_NOTE", entityId: order.id, summary: `메일→발주 전환: ${email.subject} → ${orderNo}` });
    res.status(201).json(order);
  } catch (e) { next(e); }
});

// DELETE /api/emails/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const existing = await prisma.businessEmail.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "메일을 찾을 수 없습니다.");
    await prisma.businessEmail.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
