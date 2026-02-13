import { logger } from "./logger.js";
import { ingestFixturePayload } from "./services/fixture-ingestion.service.js";

const INTERVAL_MS = 5000;

let isRunning = false;
let minuteCounter = 1;

export function startIngestionLoop() {
  async function runCycle() {
    if (isRunning) {
      logger.warn("Previous ingestion cycle still running, skipping");
      return scheduleNext();
    }

    isRunning = true;

    const start = Date.now();

    logger.info("Ingestion cycle started");

    try {
      await ingestFixturePayload({
        providerFixtureId: 1001,
        minute: minuteCounter,
        scoreHome: Math.floor(minuteCounter / 10),
        scoreAway: 0,
        status: minuteCounter < 90 ? "LIVE" : "FULL_TIME",
        providerTimestamp: new Date(Date.now()),
        events: [],
      });

      minuteCounter++;
    } catch (error) {
      logger.error({ error }, "Ingestion cycle failed");
    }

    const duration = Date.now() - start;

    logger.info({ durationMs: duration }, "Ingestion cycle completed");

    isRunning = false;

    scheduleNext();
  }

  function scheduleNext() {
    setTimeout(runCycle, INTERVAL_MS);
  }

  scheduleNext();
}
