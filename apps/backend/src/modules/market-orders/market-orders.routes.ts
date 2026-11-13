// FlowHub 통합주문 모듈 (네이버 스마트스토어 · 쿠팡)
// - 미발송 주문 수집, 발송기한 D-Day, 선불/착불, 송장 일괄 등록

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";
import { resolveWorkspaceId } from "../../lib/workspace";
import { logAudit } from "../../lib/audit";

const router = Router();
router.use(authMiddleware);

const PLATFORM_LABEL: Record<string, string> = {
  SMARTSTORE: "스마트스토어",
  COUPANG: "쿠팡",
  OTHER: "기타",
};

// GET /api/market-orders?status=&platform=&unshippedOnly=&q=&workspaceId=
router.get("/", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { status, platform, unshippedOnly, q } = req.query;
    const where: any = { workspaceId };
    if (status) where.status = String(status);
    if (platform) where.platform = String(platform);
    if (unshippedOnly === "true") where.status = { in: ["PENDING", "PREPARING"] };
    if (q) {
      where.OR = [
        { productName: { contains: String(q), mode: "insensitive" } },
        { orderNo: { contains: String(q), mode: "insensitive" } },
        { recipientName: { contains: String(q), mode: "insensitive" } },
        { buyerName: { contains: String(q), mode: "insensitive" } },
      ];
    }
    const orders = await prisma.marketOrder.findMany({
      where,
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });
    res.json(orders);
  } catch (e) { next(e); }
});

// POST /api/market-orders — 주문 등록 (수동/스마트스토어·쿠팡 수집 대체)
router.post("/", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { platform, orderNo, buyerName, buyerPhone, productName, qty, price, isPrepaid, recipientName, recipientAddress, recipientPhone, dueDate } = req.body || {};
    if (!platform || !orderNo || !productName || !recipientName || !recipientAddress) {
      throw new HttpError(400, "플랫폼/주문번호/상품명/수령인/수령지 주소는 필수입니다.");
    }
    const order = await prisma.marketOrder.create({
      data: {
        workspaceId,
        platform,
        orderNo: String(orderNo).trim(),
        buyerName: buyerName || recipientName,
        buyerPhone: buyerPhone || null,
        productName: String(productName).trim(),
        qty: Number(qty) || 1,
        price: Number(price) || 0,
        isPrepaid: isPrepaid !== false,
        recipientName: String(recipientName).trim(),
        recipientAddress: String(recipientAddress).trim(),
        recipientPhone: recipientPhone || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
    res.status(201).json(order);
  } catch (e) { next(e); }
});

// PATCH /api/market-orders/bulk-ship — 송장 일괄 발송 등록
router.patch("/bulk-ship", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { ids, trackingNo } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) throw new HttpError(400, "대상 주문 id 배열이 필요합니다.");
    const result = await prisma.marketOrder.updateMany({
      where: { id: { in: ids }, workspaceId },
      data: {
        status: "SHIPPING",
        shippedAt: new Date(),
        ...(trackingNo ? { trackingNo: String(trackingNo) } : {}),
      },
    });
    await logAudit({ workspaceId, userId: req.user!.userId, action: "STATUS", entity: "MARKET_ORDER", summary: `통합주문 일괄 발송 등록 ${result.count}건${trackingNo ? ` (송장 ${trackingNo})` : ""}` });
    res.json({ updated: result.count });
  } catch (e) { next(e); }
});

// PATCH /api/market-orders/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const existing = await prisma.marketOrder.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "주문을 찾을 수 없습니다.");
    const body = req.body || {};
    const data: any = {};
    for (const k of ["productName", "recipientName", "recipientAddress", "recipientPhone", "buyerName", "buyerPhone", "trackingNo", "platform"]) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    if (body.qty !== undefined) data.qty = Number(body.qty) || 1;
    if (body.price !== undefined) data.price = Number(body.price) || 0;
    if (body.isPrepaid !== undefined) data.isPrepaid = Boolean(body.isPrepaid);
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === "SHIPPING" && !existing.shippedAt) data.shippedAt = new Date();
      if (body.status === "DELIVERED") data.shippedAt = existing.shippedAt ?? new Date();
    }
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    const order = await prisma.marketOrder.update({ where: { id: existing.id }, data });
    await logAudit({ workspaceId, userId: req.user!.userId, action: "UPDATE", entity: "MARKET_ORDER", entityId: order.id, summary: `${PLATFORM_LABEL[order.platform] ?? order.platform} 주문 ${order.orderNo} 수정 (${order.status})` });
    res.json(order);
  } catch (e) { next(e); }
});

// DELETE /api/market-orders/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const existing = await prisma.marketOrder.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "주문을 찾을 수 없습니다.");
    await prisma.marketOrder.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
