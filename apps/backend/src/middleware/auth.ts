// FlowHub 인증 미들웨어

import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "인증 토큰이 필요합니다." });
  }
  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: "유효하지 않은 토큰입니다." });
  }
  req.user = payload;
  next();
}

// 선택적 인증 (토큰 있으면 파싱, 없어도 통과)
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const payload = verifyToken(header.slice(7));
    if (payload) req.user = payload;
  }
  next();
}
