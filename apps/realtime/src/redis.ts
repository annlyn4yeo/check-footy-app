import IORedisModule from "ioredis";

const IORedis = (IORedisModule as any).default ?? IORedisModule;

let subscriber: InstanceType<typeof IORedis> | null = null;

export function getSubscriber(): InstanceType<typeof IORedis> {
  if (!subscriber) {
    subscriber = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379");
  }
  return subscriber;
}
