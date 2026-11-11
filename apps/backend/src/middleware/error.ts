// FlowHub 전역 에러 핸들러

import { Request, Response, NextFunction } from "express";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error("[error]", err);
  const status = err?.status || 500;
  const message = err?.message || "서버 내부 오류가 발생했습니다.";
  res.status(status).json({ message });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: "요청한 리소스를 찾을 수 없습니다." });
}
