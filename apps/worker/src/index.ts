import { logger } from "./logger.js";
import { startHeartbeat } from "./heartbeat.js";
import { prisma } from "@checkfooty/db";
import { ingestFixturePayload } from "./services/fixture-ingestion.service.js";

async function bootstrap() {
  logger.info("Worker booting");

  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connection verified");

    await ingestFixturePayload({
      providerFixtureId: 1001,
      minute: 25,
      scoreHome: 3,
      scoreAway: 0,
      isLive: true,
      providerTimestamp: new Date("2026-01-01T10:00:00Z"),
      events: [
        {
          providerEventId: 7001,
          minute: 24,
          type: "GOAL",
          playerName: "Player C",
        },
      ],
    });

    startHeartbeat();
  } catch (error) {
    logger.error({ error }, "Worker failed to start");
    process.exit(1);
  }
}

bootstrap();
