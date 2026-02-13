import { logger } from "./logger.js";
import { startHeartbeat } from "./heartbeat.js";
import { prisma } from "@checkfooty/db";
import { startIngestionLoop } from "./ingestion-runner.js";

async function bootstrap() {
  logger.info("Worker booting");

  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connection verified");

    startIngestionLoop();
    startHeartbeat();
  } catch (error) {
    logger.error({ error }, "Worker failed to start");
    process.exit(1);
  }
}

bootstrap();
