// FlowHub Workspace 모듈

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";

const router = Router();

router.use(authMiddleware);

// GET /api/workspaces
router.get("/", async (req, res, next) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.user!.userId },
      include: { workspace: true },
    });
    res.json(memberships.map((m) => ({ ...m.workspace, role: m.role })));
  } catch (e) {
    next(e);
  }
});

// POST /api/workspaces
router.post("/", async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) throw new HttpError(400, "name은 필수입니다.");
    const slug = `ws-${Date.now().toString(36)}`;
    const ws = await prisma.workspace.create({
      data: {
        name,
        slug,
        description,
        ownerId: req.user!.userId,
        members: { create: { userId: req.user!.userId, role: "OWNER" } },
      },
    });
    res.status(201).json(ws);
  } catch (e) {
    next(e);
  }
});

// GET /api/workspaces/:id
router.get("/:id", async (req, res, next) => {
  try {
    const ws = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: { members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, status: true } } } } },
    });
    if (!ws) throw new HttpError(404, "워크스페이스를 찾을 수 없습니다.");
    res.json(ws);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/workspaces/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const ws = await prisma.workspace.update({
      where: { id: req.params.id },
      data: { name, description },
    });
    res.json(ws);
  } catch (e) {
    next(e);
  }
});

export default router;
