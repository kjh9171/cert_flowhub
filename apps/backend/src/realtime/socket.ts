// FlowHub 실시간 소켓 게이트웨이 (Socket.IO)
// - JWT 인증 미들웨어: 클라이언트가 handshake.auth.token으로 토큰을 전달해야 연결 가능
// - Presence: Redis INCR/DECR + Pub/Sub 채널(flowhub:presence)로
//     사용자 접속 상태(ONLINE ↔ 저장된 상태)를 모든 클라이언트에게 실시간 브로드캐스트
// - 알림/상태 이벤트는 `user:{userId}` 룸으로 타겟팅 (notify.ts, user.routes 참조)

import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { verifyToken } from "../lib/jwt";
import redis, { redisSubscriber } from "../lib/redis";
import prisma from "../lib/prisma";

// 라우트 모듈들이 `io?.emit(...)`으로 참조하는 싱글톤 — initSocket() 호출 시 실제 Server로 대체
export let io: SocketIOServer | null = null;

/** 현재 서버 인스턴스 접근 (라우트/서비스에서 방어적 사용) */
export function getIO(): SocketIOServer | null {
  return io;
}

const PRESENCE_CHANNEL = "flowhub:presence";
// 접속 후 TTL(초) — 클라이언트 하트비트(presence:refresh)로 갱신된다
const PRESENCE_TTL = 180;

export function initSocket(nodeServer: http.Server): SocketIOServer {
  const server = new SocketIOServer(nodeServer, {
    // 프론트엔드 도메인별 CORS — 개발 환경에서는 전체 허용 (CORS_ORIGIN과 동일 전략)
    cors: { origin: process.env.CORS_ORIGIN === "*" ? true : (process.env.CORS_ORIGIN || "*").split(","), credentials: true },
  });
  io = server;

  // ── 인증 미들웨어: 유효한 JWT만 연결 허용 ─────────────────────
  server.use((socket, next) => {
    const token = (socket.handshake.auth?.token as string) || undefined;
    if (!token) return next(new Error("인증 토큰이 필요합니다."));
    const payload = verifyToken(token);
    if (!payload) return next(new Error("유효하지 않은 토큰입니다."));
    socket.data.userId = payload.userId;
    next();
  });

  // ── Presence 구독: Redis 채널에서 접속 상태 변경 수신 → 전체 브로드캐스트
  redisSubscriber.subscribe(PRESENCE_CHANNEL).catch((e) => {
    console.error("[socket] presence 구독 실패:", e.message);
  });
  redisSubscriber.on("message", async (_ch, message) => {
    try {
      const msg = JSON.parse(message);
      // 저장된 상태 조회 — 수동 설정값(AWAY/BUSY)은 접속 중에도 유지되어야 한다
      const user = await prisma.user.findUnique({ where: { id: msg.userId }, select: { status: true, statusMessage: true } });
      const effective = msg.online
        ? (user?.status && user.status !== "OFFLINE" ? user.status : "ONLINE") // 수동 상태 우선, OFFLINE이면 ONLINE 복귀
        : "OFFLINE";
      server.emit("user:status", {
        userId: msg.userId,
        status: effective,
        statusMessage: user?.statusMessage ?? null,
      });
    } catch { /* 무시 */ }
  });

  server.on("connection", async (socket) => {
    const userId: string = socket.data.userId;
    if (!userId) return socket.disconnect(true);

    // 개인 룸 가입 → notify.ts의 io.to(user:{id}) 타겟 알림 수신
    socket.join(`user:${userId}`);

    // ── 접속: Redis 카운터 증가 (0→1 전환 시만 ONLINE 발행)
    try {
      const key = `flowhub:presence:${userId}`;
      const count = await redis.incr(key);
      await redis.expire(key, PRESENCE_TTL);
      if (count === 1) {
        await redis.publish(PRESENCE_CHANNEL, JSON.stringify({ userId, online: true }));
      }
    } catch (e) {
      console.error("[socket] presence incr 실패:", e);
    }

    // ── 하트비트: TTL 재갱신 (브라우저 탭이 살아있음을 증명)
    socket.on("presence:refresh", async () => {
      try {
        await redis.expire(`flowhub:presence:${userId}`, PRESENCE_TTL);
      } catch { /* 무시 */ }
    });

    // ── 작업/알림 이벤트 (클라이언트 → 브로드캐스트, 기존 동작 유지)
    socket.on("task:updated", (payload) => { server.emit("task:updated", payload); });
    socket.on("badge:updated", (payload) => { server.emit("badge:updated", payload); });
    socket.on("notification:new", (payload) => { server.to(`user:${userId}`).emit("notification:new", payload); });

    // ── 접속 해제: 카운터 감소 (1→0 전환 시만 저장 상태로 복귀)
    socket.on("disconnect", async () => {
      try {
        const key = `flowhub:presence:${userId}`;
        const count = await redis.decr(key);
        if (count <= 0) {
          await redis.del(key);
          // 저장 상태가 ONLINE이면 DB를 OFFLINE으로 복구 후 채널 발행
          const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
          if (user?.status === "ONLINE") {
            await prisma.user.update({ where: { id: userId }, data: { status: "OFFLINE" } });
          }
          await redis.publish(PRESENCE_CHANNEL, JSON.stringify({ userId, online: false }));
        }
      } catch (e) {
        console.error("[socket] presence decr 실패:", e);
      }
    });
  });

  console.log("[socket.io] realtime gateway initialised (auth + redis presence)");
  return server;
}
