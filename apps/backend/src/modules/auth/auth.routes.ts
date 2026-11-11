// FlowHub Auth 모듈

import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { HttpError } from "../../middleware/error";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      throw new HttpError(400, "email, password, name은 필수입니다.");
    }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new HttpError(409, "이미 가입된 이메일입니다.");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, status: "ONLINE" },
    });

    // 기본 워크스페이스 생성
    const workspace = await prisma.workspace.create({
      data: {
        name: `${name}의 워크스페이스`,
        slug: `ws-${user.id.slice(0, 8)}`,
        ownerId: user.id,
      },
    });
    await prisma.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status },
      workspace,
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new HttpError(400, "email, password는 필수입니다.");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpError(401, "이메일 또는 비밀번호가 올바르지 않습니다.");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, "이메일 또는 비밀번호가 올바르지 않습니다.");

    await prisma.user.update({
      where: { id: user.id },
      data: { status: "ONLINE", lastSeenAt: new Date() },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, status: "ONLINE" },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
