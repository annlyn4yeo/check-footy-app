import { logger } from "./logger.js";
import { ingestFixturePayload } from "./services/fixture-ingestion.service.js";
import { FixtureRepository } from "@checkfooty/db";
import { createProvider } from "./providers/providers.factory.js";

let currentInterval = 5000;
const MIN_INTERVAL = 5000;
const MAX_INTERVAL = 60000;

let isRunning = false;
const provider = createProvider();
const providerFixtureId = 1001;

export function startIngestionLoop() {
  async function runCycle() {
    if (isRunning) {
      logger.warn("Previous ingestion cycle still running, skipping");
      return scheduleNext();
    }

    isRunning = true;
    const start = Date.now();

    try {
      const liveFixtures = await FixtureRepository.findLive();

      if (liveFixtures.length === 0) {
        currentInterval = Math.min(currentInterval * 2, MAX_INTERVAL);
        return;
      }

      for (const fixture of liveFixtures) {
        const update = await provider.getFixtureUpdate(
          fixture.providerFixtureId,
        );

        if (!update) continue;

        await ingestFixturePayload(update);
      }

      currentInterval = MIN_INTERVAL;
    } catch (error) {
      logger.error({ error }, "Ingestion cycle failed");
      currentInterval = Math.min(currentInterval * 2, MAX_INTERVAL);
    } finally {
      const duration = Date.now() - start;
      logger.info({ durationMs: duration }, "Ingestion cycle completed");
      isRunning = false;
      scheduleNext();
    }
  }

  function scheduleNext() {
    const jitter = Math.random() * 0.2 * currentInterval;
    const delay = currentInterval + jitter;
    setTimeout(runCycle, delay);
  }

  scheduleNext();
}
