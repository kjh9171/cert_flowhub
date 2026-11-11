// FlowHub Integration Badge 모듈

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";
import { io } from "../../realtime/socket";

const router = Router();
router.use(authMiddleware);

// GET /api/integrations/badges?taskId=&projectId=&workspaceId=&status=
router.get("/badges", async (req, res, next) => {
  try {
    const { taskId, projectId, workspaceId, status } = req.query;
    const badges = await prisma.integrationBadge.findMany({
      where: {
        ...(taskId ? { taskId: String(taskId) } : {}),
        ...(projectId ? { projectId: String(projectId) } : {}),
        ...(workspaceId ? { workspaceId: String(workspaceId) } : {}),
        ...(status ? { status: String(status) as any } : {}),
      },
      include: {
        actor: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(badges);
  } catch (e) {
    next(e);
  }
});

// POST /api/integrations/badges
router.post("/badges", async (req, res, next) => {
  try {
    const { status, eventType, title, description, targetUrl, externalId, metadata, taskId, projectId, workspaceId } = req.body;
    if (!eventType || !title) throw new HttpError(400, "eventType, title은 필수입니다.");
    const badge = await prisma.integrationBadge.create({
      data: {
        status: status || "PENDING",
        eventType,
        title,
        description,
        targetUrl,
        externalId,
        metadata: metadata || undefined,
        taskId: taskId || null,
        projectId: projectId || null,
        workspaceId: workspaceId || null,
        actorId: req.user!.userId,
      },
    });
    io?.emit("badge:updated", { action: "created", badge });
    res.status(201).json(badge);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/integrations/badges/:id
router.patch("/badges/:id", async (req, res, next) => {
  try {
    const { status, title, description, targetUrl, metadata } = req.body;
    const badge = await prisma.integrationBadge.update({
      where: { id: req.params.id },
      data: { status, title, description, targetUrl, metadata },
    });
    io?.emit("badge:updated", { action: "updated", badge });
    res.json(badge);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/integrations/badges/:id
router.delete("/badges/:id", async (req, res, next) => {
  try {
    await prisma.integrationBadge.delete({ where: { id: req.params.id } });
    io?.emit("badge:updated", { action: "deleted", badgeId: req.params.id });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// POST /api/integrations/webhook/github (GitHub webhook 수신 -> Badge 생성/업데이트)
router.post("/webhook/github", async (req, res, next) => {
  try {
    const event = req.headers["x-github-event"] as string;
    const payload = req.body;
    // 간단한 매핑: push -> COMMIT, pull_request -> PULL_REQUEST
    let eventType: any = "COMMIT";
    let status: any = "SUCCESS";
    let title = "GitHub 이벤트";
    if (event === "pull_request") {
      eventType = "PULL_REQUEST";
      title = `PR ${payload.action}: ${payload.pull_request?.title}`;
    } else if (event === "push") {
      eventType = "COMMIT";
      title = `Push: ${payload.commits?.length || 0} commits`;
    } else if (event === "workflow_run") {
      eventType = "CI_CD";
      status = payload.workflow_run?.conclusion === "success" ? "SUCCESS" : "FAILED";
      title = `CI: ${payload.workflow_run?.name}`;
    }
    const badge = await prisma.integrationBadge.create({
      data: {
        status,
        eventType,
        title,
        description: JSON.stringify(payload).slice(0, 500),
        targetUrl: payload.pull_request?.html_url || payload.head_commit?.url,
        externalId: String(payload.pull_request?.id || payload.after || ""),
        metadata: payload,
      },
    });
    io?.emit("badge:updated", { action: "created", badge });
    res.status(201).json({ received: true, badgeId: badge.id });
  } catch (e) {
    next(e);
  }
});

export default router;
