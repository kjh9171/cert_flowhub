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

export default redis;
