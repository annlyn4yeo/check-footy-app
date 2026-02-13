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
      minute: 90,
      scoreHome: 2,
      scoreAway: 0,
      status: "FULL_TIME",
      providerTimestamp: new Date("2026-03-01T11:30:00Z"),
      events: [],
    });

    startHeartbeat();
  } catch (error) {
    logger.error({ error }, "Worker failed to start");
    process.exit(1);
  }
}

bootstrap();
