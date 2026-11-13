// FlowHub 발주노트 모듈
// - 거래처 발주 관리, 회계(공급가/VAT/합계, 미수금), 납기일, 작업/도면 연결
// - 워크스페이스 멤버십 강제 (테넌트 격리)

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";
import { resolveWorkspaceId } from "../../lib/workspace";
import { logAudit } from "../../lib/audit";

const router = Router();
router.use(authMiddleware);

const ORDER_NO_SEQ = 1; // 발주번호 채번: 워크스페이스별 카운트 + 1

async function genOrderNo(workspaceId: string): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const count = await prisma.orderNote.count({ where: { workspaceId } });
  return `PO-${ym}-${String(count + ORDER_NO_SEQ).padStart(4, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function calcAmounts(items: Array<{ qty: number; unitPrice: number }>) {
  const supply = items.reduce((sum, it) => sum + Math.round(it.qty * it.unitPrice), 0);
  const vat = Math.round(supply * 0.1);
  return { supplyAmount: supply, vatAmount: vat, totalAmount: supply + vat };
}

function normalizeItems(items: any[] | undefined) {
  return (items ?? [])
    .filter((it) => it && String(it.name || "").trim())
    .map((it, i) => {
      const qty = Number(it.qty) || 0;
      const unitPrice = Number(it.unitPrice) || 0;
      return {
        name: String(it.name).trim(),
        spec: it.spec ? String(it.spec) : null,
        qty,
        unit: it.unit ? String(it.unit) : "EA",
        unitPrice,
        amount: Math.round(qty * unitPrice),
        note: it.note ? String(it.note) : null,
        sort: i,
      };
    });
}

// GET /api/orders?status=&paymentStatus=&q=&workspaceId=
router.get("/", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { status, paymentStatus, q } = req.query;
    const where: any = { workspaceId };
    if (status) where.status = String(status);
    if (paymentStatus) where.paymentStatus = String(paymentStatus);
    if (q) {
      where.OR = [
        { orderNo: { contains: String(q), mode: "insensitive" } },
        { partnerName: { contains: String(q), mode: "insensitive" } },
        { memo: { contains: String(q), mode: "insensitive" } },
      ];
    }
    const orders = await prisma.orderNote.findMany({
      where,
      include: {
        items: true,
        task: { select: { id: true, title: true, status: true } },
        drawing: { select: { id: true, fileName: true, svgUrl: true, status: true } },
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (e) { next(e); }
});

// GET /api/orders/:id
router.get("/:id", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const order = await prisma.orderNote.findFirst({
      where: { id: req.params.id, workspaceId },
      include: {
        items: true,
        task: { select: { id: true, title: true, status: true, progress: true, assignees: { include: { user: { select: { id: true, name: true } } } } } },
        drawing: true,
        author: { select: { id: true, name: true } },
      },
    });
    if (!order) throw new HttpError(404, "발주노트를 찾을 수 없습니다.");
    res.json(order);
  } catch (e) { next(e); }
});

// POST /api/orders
router.post("/", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { partnerName, partnerContact, dueDate, memo, taskId, drawingId, items } = req.body || {};
    if (!partnerName) throw new HttpError(400, "거래처명은 필수입니다.");
    const norm = normalizeItems(items);
    const amounts = calcAmounts(norm);
    const order = await prisma.orderNote.create({
      data: {
        workspaceId,
        orderNo: await genOrderNo(workspaceId),
        partnerName: String(partnerName).trim(),
        partnerContact: partnerContact || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        memo: memo || null,
        taskId: taskId || null,
        drawingId: drawingId || null,
        authorId: req.user!.userId,
        ...amounts,
        items: { create: norm.map(({ sort, ...rest }) => rest) },
      },
      include: { items: true },
    });
    await logAudit({ workspaceId, userId: req.user!.userId, action: "CREATE", entity: "ORDER_NOTE", entityId: order.id, summary: `발주 생성 ${order.orderNo} — ${order.partnerName} (${order.totalAmount.toLocaleString()}원)` });
    res.status(201).json(order);
  } catch (e) { next(e); }
});

// PATCH /api/orders/:id — 품목 전체 교체 포함
router.patch("/:id", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const existing = await prisma.orderNote.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "발주노트를 찾을 수 없습니다.");
    const { partnerName, partnerContact, dueDate, memo, taskId, drawingId, status, paymentStatus, items } = req.body || {};

    const data: any = {};
    if (partnerName !== undefined) data.partnerName = String(partnerName).trim();
    if (partnerContact !== undefined) data.partnerContact = partnerContact || null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (memo !== undefined) data.memo = memo || null;
    if (taskId !== undefined) data.taskId = taskId || null;
    if (drawingId !== undefined) data.drawingId = drawingId || null;
    if (status !== undefined) data.status = status;
    if (paymentStatus !== undefined) data.paymentStatus = paymentStatus;

    if (Array.isArray(items)) {
      const norm = normalizeItems(items);
      const amounts = calcAmounts(norm);
      Object.assign(data, amounts);
      await prisma.orderItem.deleteMany({ where: { orderNoteId: existing.id } });
      await prisma.orderItem.createMany({
        data: norm.map(({ sort, ...rest }) => ({ ...rest, orderNoteId: existing.id })),
      });
    }

    const order = await prisma.orderNote.update({
      where: { id: existing.id },
      data,
      include: { items: true },
    });
    await logAudit({ workspaceId, userId: req.user!.userId, action: "UPDATE", entity: "ORDER_NOTE", entityId: order.id, summary: `발주 수정 ${order.orderNo} (상태 ${order.status}${status ? `→${status}` : ""})` });
    res.json(order);
  } catch (e) { next(e); }
});

// DELETE /api/orders/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const existing = await prisma.orderNote.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "발주노트를 찾을 수 없습니다.");
    await prisma.orderNote.delete({ where: { id: existing.id } });
    await logAudit({ workspaceId, userId: req.user!.userId, action: "DELETE", entity: "ORDER_NOTE", entityId: existing.id, summary: `발주 삭제 ${existing.orderNo}` });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
