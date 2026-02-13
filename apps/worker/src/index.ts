import { logger } from "./logger.js";
import { startHeartbeat } from "./heartbeat.js";
import { prisma } from "@checkfooty/db";
import { updateFixture } from "./services/fixture-update.service.js";
import { upsertMatchEvent } from "./services/match-event.service.js";

async function bootstrap() {
  logger.info("Worker booting");

  try {
    // Validate DB connectivity
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connection verified");
    startHeartbeat();
  } catch (error) {
    logger.error({ error }, "Worker failed to start");
    process.exit(1);
  }

  await updateFixture({
    providerFixtureId: 1001,
    minute: 10,
    scoreHome: 1,
    scoreAway: 0,
    isLive: true,
  });

  await upsertMatchEvent({
    providerEventId: 5001,
    providerFixtureId: 1001,
    minute: 12,
    type: "GOAL",
    playerName: "Test Player",
  });
}

bootstrap();
