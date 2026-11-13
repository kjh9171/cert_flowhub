// FlowHub 재고관리 모듈
// - 현재고 조회, +/- 즉시 조정, 안전재고 미만 필터, 변경 이력(InventoryLog)

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";
import { resolveWorkspaceId } from "../../lib/workspace";
import { logAudit } from "../../lib/audit";

const router = Router();
router.use(authMiddleware);

// GET /api/inventory?kind=&q=&lowStockOnly=&workspaceId=
router.get("/", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { kind, q, lowStockOnly } = req.query;
    const items = await prisma.inventoryItem.findMany({
      where: {
        workspaceId,
        ...(kind ? { kind: String(kind) as any } : {}),
        ...(q ? { name: { contains: String(q), mode: "insensitive" as const } } : {}),
      },
      include: { _count: { select: { logs: true } } },
      orderBy: { updatedAt: "desc" },
    });
    const filtered = lowStockOnly === "true" ? items.filter((i) => i.qty <= i.safetyQty) : items;
    res.json(filtered);
  } catch (e) { next(e); }
});

// POST /api/inventory
router.post("/", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { sku, name, kind, unit, qty, safetyQty, note } = req.body || {};
    if (!name) throw new HttpError(400, "품목명은 필수입니다.");
    const item = await prisma.inventoryItem.create({
      data: {
        workspaceId,
        sku: sku || null,
        name: String(name).trim(),
        kind: kind === "RAW" ? "RAW" : "PRODUCT",
        unit: unit || "EA",
        qty: Number(qty) || 0,
        safetyQty: Number(safetyQty) || 0,
        note: note || null,
      },
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

// PATCH /api/inventory/:id — 기본 정보 수정
router.patch("/:id", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const existing = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "재고 품목을 찾을 수 없습니다.");
    const { sku, name, kind, unit, safetyQty, note } = req.body || {};
    const item = await prisma.inventoryItem.update({
      where: { id: existing.id },
      data: {
        ...(sku !== undefined ? { sku } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(kind !== undefined ? { kind: kind === "RAW" ? "RAW" : "PRODUCT" } : {}),
        ...(unit !== undefined ? { unit } : {}),
        ...(safetyQty !== undefined ? { safetyQty: Number(safetyQty) || 0 } : {}),
        ...(note !== undefined ? { note } : {}),
      },
    });
    res.json(item);
  } catch (e) { next(e); }
});

// POST /api/inventory/:id/adjust — 수량 즉시 조정 { delta, reason }
router.post("/:id/adjust", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { delta, reason } = req.body || {};
    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) throw new HttpError(400, "delta(0이 아닌 숫자)가 필요합니다.");
    const existing = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "재고 품목을 찾을 수 없습니다.");
    const nextQty = existing.qty + d;
    if (nextQty < 0) throw new HttpError(400, `현재고(${existing.qty})보다 더 많이 출고할 수 없습니다.`);
    const [item] = await prisma.$transaction([
      prisma.inventoryItem.update({ where: { id: existing.id }, data: { qty: nextQty } }),
      prisma.inventoryLog.create({ data: { itemId: existing.id, delta: d, after: nextQty, reason: reason || null, actorId: req.user!.userId } }),
    ]);
    await logAudit({ workspaceId, userId: req.user!.userId, action: "ADJUST", entity: "INVENTORY", entityId: item.id, summary: `재고 조정 ${item.name} ${d >= 0 ? "+" : ""}${d} → 잔고 ${nextQty}` });
    res.json(item);
  } catch (e) { next(e); }
});

// GET /api/inventory/:id/logs — 변경 이력
router.get("/:id/logs", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const existing = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "재고 품목을 찾을 수 없습니다.");
    const logs = await prisma.inventoryLog.findMany({
      where: { itemId: existing.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(logs);
  } catch (e) { next(e); }
});

// DELETE /api/inventory/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const existing = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "재고 품목을 찾을 수 없습니다.");
    await prisma.inventoryItem.delete({ where: { id: existing.id } });
    await logAudit({ workspaceId, userId: req.user!.userId, action: "DELETE", entity: "INVENTORY", entityId: existing.id, summary: `재고 품목 삭제 ${existing.name}` });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
