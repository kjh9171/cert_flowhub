// FlowHub Backend Entrypoint

import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import apiRoutes from "./routes";
import { initSocket } from "./realtime/socket";
import { errorHandler, notFoundHandler } from "./middleware/error";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./lib/swagger";
import redis from "./lib/redis";
import * as Sentry from "@sentry/node";

const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV || "development" });
}

const app = express();
const server = http.createServer(app);

initSocket(server);

// ── 보안/로깅 미들웨어 ─────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(pinoHttp());
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

// ── Swagger 문서 ────────────────────────────────
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── 업로드 파일 정적 서빙 ───────────────────────
app.use("/uploads", express.static("/app/uploads"));

// ── Sentry 에러 핸들러 ──────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

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
