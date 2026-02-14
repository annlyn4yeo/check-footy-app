import { getRedis } from "../redis.js";
import type { FixtureUpdatedEvent } from "@checkfooty/db";

const CHANNEL = "fixture.updated";

export async function publishFixtureUpdated(
  event: FixtureUpdatedEvent,
): Promise<void> {
  const redis = getRedis();
  await redis.publish(CHANNEL, JSON.stringify(event));
}
