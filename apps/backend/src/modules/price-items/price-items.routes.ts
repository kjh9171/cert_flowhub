// FlowHub 단가표 모듈
// - 카테고리/묶음별 단가 검색, 인라인 수정

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";
import { resolveWorkspaceId } from "../../lib/workspace";
import { logAudit } from "../../lib/audit";

const router = Router();
router.use(authMiddleware);

// GET /api/price-items?q=&category=&workspaceId=
router.get("/", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { q, category } = req.query;
    const items = await prisma.priceItem.findMany({
      where: {
        workspaceId,
        ...(category ? { category: String(category) } : {}),
        ...(q ? { OR: [
          { name: { contains: String(q), mode: "insensitive" } },
          { category: { contains: String(q), mode: "insensitive" } },
          { bundle: { contains: String(q), mode: "insensitive" } },
        ] } : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    res.json(items);
  } catch (e) { next(e); }
});

// GET /api/price-items/categories
router.get("/categories", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const rows = await prisma.priceItem.findMany({
      where: { workspaceId },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    res.json(rows.map((r) => r.category));
  } catch (e) { next(e); }
});

// POST /api/price-items
router.post("/", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { category, bundle, name, unitPrice, note } = req.body || {};
    if (!category || !name) throw new HttpError(400, "카테고리와 품목명은 필수입니다.");
    const item = await prisma.priceItem.create({
      data: {
        workspaceId,
        category: String(category).trim(),
        bundle: bundle || null,
        name: String(name).trim(),
        unitPrice: Number(unitPrice) || 0,
        note: note || null,
      },
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

// PATCH /api/price-items/:id — 인라인 단가 수정 포함
router.patch("/:id", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const existing = await prisma.priceItem.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "단가 항목을 찾을 수 없습니다.");
    const { category, bundle, name, unitPrice, note } = req.body || {};
    const prevPrice = existing.unitPrice;
    const item = await prisma.priceItem.update({
      where: { id: existing.id },
      data: {
        ...(category !== undefined ? { category } : {}),
        ...(bundle !== undefined ? { bundle } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(unitPrice !== undefined ? { unitPrice: Number(unitPrice) || 0 } : {}),
        ...(note !== undefined ? { note } : {}),
      },
    });
    if (unitPrice !== undefined && Number(unitPrice) !== prevPrice) {
      await logAudit({ workspaceId, userId: req.user!.userId, action: "UPDATE", entity: "PRICE_ITEM", entityId: item.id, summary: `단가 수정 ${item.name} ${prevPrice.toLocaleString()} → ${item.unitPrice.toLocaleString()}` });
    }
    res.json(item);
  } catch (e) { next(e); }
});

// DELETE /api/price-items/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const existing = await prisma.priceItem.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "단가 항목을 찾을 수 없습니다.");
    await prisma.priceItem.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
