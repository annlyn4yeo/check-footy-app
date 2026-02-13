import { logger } from "./logger.js";

export function startHeartbeat(intervalMs: number = 5000) {
  logger.info({ intervalMs }, "Worker heartbeat started");

  setInterval(() => {
    logger.info(
      {
        timestamp: new Date().toISOString(),
        pid: process.pid,
        memory: process.memoryUsage().rss,
      },
      "Worker alive",
    );
  }, intervalMs);
}
