// FlowHub Project 모듈

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";

const router = Router();
router.use(authMiddleware);

// GET /api/projects?workspaceId=
router.get("/", async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId as string | undefined;
    const projects = await prisma.project.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      include: { owner: { select: { id: true, name: true } }, _count: { select: { tasks: true, members: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (e) {
    next(e);
  }
});

// POST /api/projects
router.post("/", async (req, res, next) => {
  try {
    const { workspaceId, name, description, color, viewType, startDate, endDate } = req.body;
    if (!workspaceId || !name) throw new HttpError(400, "workspaceId, name은 필수입니다.");
    const project = await prisma.project.create({
      data: {
        workspaceId,
        name,
        description,
        color,
        viewType: viewType || "KANBAN",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        ownerId: req.user!.userId,
        members: { create: { userId: req.user!.userId, role: "OWNER" } },
      },
    });
    res.status(201).json(project);
  } catch (e) {
    next(e);
  }
});

// GET /api/projects/:id
router.get("/:id", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { members: { include: { user: { select: { id: true, name: true, avatarUrl: true, status: true } } } }, tasks: { orderBy: { createdAt: "desc" } } },
    });
    if (!project) throw new HttpError(404, "프로젝트를 찾을 수 없습니다.");
    res.json(project);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/projects/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const { name, description, color, viewType, startDate, endDate, isArchived } = req.body;
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        color,
        viewType,
        isArchived,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    });
    res.json(project);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/projects/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
