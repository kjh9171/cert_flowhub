// FlowHub Notification 모듈

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";

const router = Router();
router.use(authMiddleware);

// GET /api/notifications
router.get("/", async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", async (req, res, next) => {
  try {
    const n = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(n);
  } catch (e) {
    next(e);
  }
});

// POST /api/notifications/read-all
router.post("/read-all", async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
