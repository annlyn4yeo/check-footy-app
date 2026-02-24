import { logger } from "./logger.js";
import { startHeartbeat } from "./heartbeat.js";
import { loadWorkerEnv } from "./env.js";

const loadedEnvFiles = loadWorkerEnv();

async function bootstrap() {
  logger.info(
    {
      loadedEnvFiles,
      fixtureProvider: process.env.FIXTURE_PROVIDER ?? "api",
    },
    "Worker booting",
  );

  try {
    const [{ prisma }, { startIngestionLoop }] = await Promise.all([
      import("@checkfooty/db"),
      import("./ingestion-runner.js"),
    ]);

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
