// FlowHub 외부 시스템 Webhook 인증 미들웨어
// GitHub은 JWT 대신 HMAC-SHA256 서명(X-Hub-Signature-256)만 전송하므로
// rawBody 기준 timingSafeEqual 검증으로 위변조를 방지한다.

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/** GitHub Webhook 서명 검증 — GITHUB_WEBHOOK_SECRET 미설정 시 개발 모드(허용+경고) */
export function githubWebhookAuth(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  // main.ts의 express.json verify 콜백에서 저장된 원본 바디 (JSON 재시리얼라이즈와 불일치 방지)
  const rawBody: Buffer | undefined = (req as any).rawBody;

  // 개발 편의: 시크릿 미설정 시에는 서명 없이 허용 (프로덕션에서는 반드시 설정)
  if (!secret) {
    console.warn("[webhook] GITHUB_WEBHOOK_SECRET 미설정 — 서명 검증 없이 허용합니다 (개발 모드)");
    return next();
  }

  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  if (!signature || !rawBody) {
    return res.status(401).json({ message: "Webhook 서명이 없습니다." });
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  const provided = Buffer.from(signature.replace(/^sha256=/, ""), "hex");

  // SHA-256은 반드시 32바이트 — 길이 불일치(부정규 hex 포함)는 즉시 거부
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return res.status(401).json({ message: "Webhook 서명 검증에 실패했습니다." });
  }

  next();
}
