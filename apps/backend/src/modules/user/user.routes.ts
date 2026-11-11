// FlowHub User 모듈

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";

const router = Router();

// GET /api/users/me
router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true, status: true, statusMessage: true },
    });
    if (!user) throw new HttpError(404, "사용자를 찾을 수 없습니다.");
    res.json(user);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/users/me/status
router.patch("/me/status", authMiddleware, async (req, res, next) => {
  try {
    const { status, statusMessage } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { status, statusMessage },
      select: { id: true, status: true, statusMessage: true },
    });
    // Socket broadcast는 main에서 처리 (여기선 DB만)
    res.json(user);
  } catch (e) {
    next(e);
  }
});

// GET /api/users (워크스페이스 멤버 조회)
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId as string | undefined;
    const users = await prisma.user.findMany({
      where: workspaceId
        ? { workspaceMembers: { some: { workspaceId } } }
        : undefined,
      select: { id: true, name: true, email: true, avatarUrl: true, role: true, status: true, statusMessage: true },
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (e) {
    next(e);
  }
});

export default router;
