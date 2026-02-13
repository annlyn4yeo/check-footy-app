import { Redis } from "ioredis";

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      host: "localhost",
      port: 6379,
    });
  }

  return redisInstance;
}
