import { logger } from "./logger.js";
import { startHeartbeat } from "./heartbeat.js";
import { prisma } from "@checkfooty/db";

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
}

bootstrap();
