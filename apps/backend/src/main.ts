// FlowHub Backend Entrypoint
// Express REST API + Socket.io WebSocket 서버

import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import apiRoutes from "./routes";
import { initSocket } from "./realtime/socket";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { optionalAuth } from "./middleware/auth";
import redis from "./lib/redis";

const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const app = express();
const server = http.createServer(app);

// Socket.io
initSocket(server);

// ── 미들웨어 ────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(","),
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// ── Health Check ────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "flowhub-backend",
    timestamp: new Date().toISOString(),
  });
});

// ── API 라우트 ──────────────────────────────────
app.use("/api", apiRoutes);

// ── 업로드 파일 정적 서빙 ───────────────────────
app.use("/uploads", express.static("/app/uploads"));

// ── 404 / 에러 핸들러 ──────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Redis 연결 ──────────────────────────────────
redis.connect().catch((err) => console.warn("[redis] connect failed:", err.message));

// ── 서버 시작 ───────────────────────────────────
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[flowhub-backend] listening on port ${PORT}`);
});

export { app };
