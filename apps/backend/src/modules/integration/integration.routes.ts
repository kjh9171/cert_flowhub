// FlowHub Integration Badge 모듈

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { githubWebhookAuth } from "../../middleware/webhook";
import { HttpError } from "../../middleware/error";
import { io } from "../../realtime/socket";

const router = Router();

// ── GitHub Webhook 수신 (JWT 미적용: HMAC-SHA256 서명만 검증) ─────────────
// GitHub은 X-Hub-Signature-256 헤더만 전송하며 Bearer 토큰은 보내지 않으므로
// authMiddleware 이전(라우트 등록 순서)에 배치해야 한다.
router.post("/webhook/github", githubWebhookAuth, async (req, res, next) => {
  try {
    const event = req.headers["x-github-event"] as string;
    const payload: any = req.body;

    // 이벤트 → (유형, 상태) 매핑. IntegrationStatus enum: SUCCESS(초록)/IN_PROGRESS(파랑=진행중)/FAILED(빨강)
    let eventType: "COMMIT" | "PULL_REQUEST" | "CI_CD" = "COMMIT";
    let status: "SUCCESS" | "IN_PROGRESS" | "FAILED" = "SUCCESS";
    let title = "GitHub 이벤트";

    if (event === "pull_request") {
      const pr = payload.pull_request || {};
      eventType = "PULL_REQUEST";
      if (payload.action === "opened" || payload.action === "synchronize") {
        status = "IN_PROGRESS"; // PR 열림/갱신 → 리뷰 진행중 (파랑)
        title = `PR ${payload.action}: ${pr.title || "(제목 없음)"}`;
      } else if (payload.action === "closed") {
        status = pr.merged ? "SUCCESS" : "FAILED"; // 병합 여부로 성공/실패
        title = pr.merged ? `PR 병합됨: ${pr.title}` : `PR 폐기됨: ${pr.title}`;
      } else {
        title = `PR ${payload.action}: ${pr.title}`;
      }
    } else if (event === "workflow_run") {
      const run = payload.workflow_run || {};
      eventType = "CI_CD";
      if (payload.action === "completed") {
        status = run.conclusion === "success" ? "SUCCESS" : "FAILED"; // 성공(초록)/실패(빨강)
      } else {
        status = "IN_PROGRESS"; // created/in_progress → 파랑
      }
      title = `CI/CD ${run.name || "워크플로우"}: ${status}`;
    } else if (event === "push") {
      eventType = "COMMIT";
      status = "SUCCESS"; // 커밋 푸시 성공 (초록)
      const repoName = payload.repository?.full_name || "";
      title = `Push ${payload.commits?.length ?? 0} commits${repoName ? ` @ ${repoName}` : ""}`;
    }

    // 동일한 externalId의 기존 Badge가 있으면 그 워크스페이스를 상속 (같은 PR/워크플로우의 후속 이벤트)
    const externalId = String(
      payload.pull_request?.id || (eventType === "CI_CD" ? payload.workflow_run?.id : "") || payload.after || ""
    );
    const existing = externalId
      ? await prisma.integrationBadge.findFirst({ where: { externalId }, select: { workspaceId: true } })
      : null;

    const badge = await prisma.integrationBadge.create({
      data: {
        status,
        eventType,
        title,
        description: `GitHub ${event}${payload.action ? ` → ${payload.action}` : ""} (raw payload 저장)`,
        targetUrl: payload.pull_request?.html_url || payload.workflow_run?.html_url || payload.head_commit?.url,
        externalId: externalId || null,
        metadata: payload, // 원본 payload 객체를 JSONB로 저장 (audit 용도)
        workspaceId: existing?.workspaceId || null,
      },
    });

    io?.emit("badge:updated", { action: "created", badge });
    res.status(201).json({ received: true, badgeId: badge.id });
  } catch (e) {
    next(e);
  }
});

// ── 이하 라우트는 JWT 인증 필요 ─────────────────────────────────────────
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

export default router;
