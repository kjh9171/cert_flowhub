// FlowHub Redis 클라이언트 (ioredis)

import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.error("[redis] error:", err.message);
});

redis.on("connect", () => {
  console.log("[redis] connected");
});

// Pub/Sub 채널 구독용 전용 커넥션 (ioredis: subscribe 상태의 클라이언트는 다른 명령을 실행할 수 없음)
export const redisSubscriber = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
redisSubscriber.on("error", (err) => {
  console.error("[redis:subscriber] error:", err.message);
});
redisSubscriber.on("connect", () => {
  console.log("[redis:subscriber] connected");
});

export default redis;
