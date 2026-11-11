// FlowHub Task 모듈

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";
import { io } from "../../realtime/socket";
import { cacheGet, cacheSet, cacheDelPattern } from "../../lib/cache";

const router = Router();
router.use(authMiddleware);

// GET /api/tasks?projectId=&workspaceId=&status=&assigneeId=
router.get("/", async (req, res, next) => {
  try {
    const { projectId, workspaceId, status, assigneeId } = req.query;
    const cacheKey = `tasks:${projectId || ""}:${workspaceId || ""}:${status || ""}:${assigneeId || ""}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) return res.json(cached);

    const tasks = await prisma.task.findMany({
      where: {
        ...(projectId ? { projectId: String(projectId) } : {}),
        ...(workspaceId ? { workspaceId: String(workspaceId) } : {}),
        ...(status ? { status: String(status) as any } : {}),
        ...(assigneeId ? { assignees: { some: { userId: String(assigneeId) } } } : {}),
      },
      include: {
        assignees: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        dependencies: true,
        _count: { select: { comments: true, attachments: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    await cacheSet(cacheKey, tasks, 30);
    res.json(tasks);
  } catch (e) {
    next(e);
  }
});

// POST /api/tasks
router.post("/", async (req, res, next) => {
  try {
    const { projectId, workspaceId, title, content, status, priority, progress, startDate, endDate, dueDate, assigneeIds, dependencyIds } = req.body;
    if (!title) throw new HttpError(400, "title은 필수입니다.");
    const task = await prisma.task.create({
      data: {
        projectId: projectId || null,
        workspaceId: workspaceId || null,
        title,
        content,
        status: status || "REQUESTED",
        priority: priority || "MEDIUM",
        progress: progress ?? 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        authorId: req.user!.userId,
        assignees: assigneeIds?.length
          ? { create: assigneeIds.map((uid: string) => ({ userId: uid })) }
          : undefined,
        dependencies: dependencyIds?.length
          ? { create: dependencyIds.map((depId: string) => ({ dependsOnTaskId: depId })) }
          : undefined,
      },
      include: { assignees: true, dependencies: true },
    });
    await cacheDelPattern("tasks:*");
    io?.emit("task:updated", { action: "created", task });
    res.status(201).json(task);
  } catch (e) {
    next(e);
  }
});

// GET /api/tasks/:id
router.get("/:id", async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        assignees: { include: { user: { select: { id: true, name: true, avatarUrl: true, status: true } } } },
        dependencies: { include: { dependsOnTask: { select: { id: true, title: true } } } },
        comments: { include: { author: { select: { id: true, name: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" } },
        attachments: true,
        badges: true,
      },
    });
    if (!task) throw new HttpError(404, "작업을 찾을 수 없습니다.");
    res.json(task);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/tasks/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const { title, content, status, priority, progress, startDate, endDate, dueDate, assigneeIds } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (progress !== undefined) data.progress = progress;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: { assignees: true },
    });

    // 담당자 재설정
    if (assigneeIds) {
      await prisma.taskAssignee.deleteMany({ where: { taskId: req.params.id } });
      if (assigneeIds.length) {
        await prisma.taskAssignee.createMany({
          data: assigneeIds.map((uid: string) => ({ taskId: req.params.id, userId: uid })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { assignees: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } }, dependencies: true },
    });

    await cacheDelPattern("tasks:*");
    io?.emit("task:updated", { action: "updated", task: updated });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    await cacheDelPattern("tasks:*");
    io?.emit("task:updated", { action: "deleted", taskId: req.params.id });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// POST /api/tasks/:id/dependencies
router.post("/:id/dependencies", async (req, res, next) => {
  try {
    const { dependsOnTaskId, type, lagDays } = req.body;
    if (!dependsOnTaskId) throw new HttpError(400, "dependsOnTaskId는 필수입니다.");
    const dep = await prisma.taskDependency.create({
      data: {
        taskId: req.params.id,
        dependsOnTaskId,
        type: type || "FS",
        lagDays: lagDays ?? 0,
      },
    });
    res.status(201).json(dep);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/tasks/:id/dependencies/:depId
router.delete("/:id/dependencies/:depId", async (req, res, next) => {
  try {
    await prisma.taskDependency.delete({ where: { id: req.params.depId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
