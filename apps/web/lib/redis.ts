import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis({
    host: "localhost",
    port: 6379,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
