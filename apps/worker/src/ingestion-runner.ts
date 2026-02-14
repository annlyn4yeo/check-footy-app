import { logger } from "./logger.js";
import { ingestFixturePayload } from "./services/fixture-ingestion.service.js";
import { FixtureRepository } from "@checkfooty/db";
import { createProvider } from "./providers/providers.factory.js";

let currentInterval = 5000;
const MIN_INTERVAL = 5000;
const MAX_INTERVAL = 60000;
const MAX_CONCURRENT = 3;

let isRunning = false;
const provider = createProvider();
const providerFixtureId = 1001;

async function processFixture(providerFixtureId: number) {
  const update = await provider.getFixtureUpdate(providerFixtureId);
  if (!update) return;

  await ingestFixturePayload(update);
}

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

      const queue = [...liveFixtures];

      const workers = Array.from(
        { length: Math.min(MAX_CONCURRENT, queue.length) },
        async () => {
          while (queue.length > 0) {
            const fixture = queue.shift();
            if (!fixture) return;

            try {
              await processFixture(fixture.providerFixtureId);
            } catch (error) {
              logger.error(
                { error, providerFixtureId: fixture.providerFixtureId },
                "Fixture processing failed",
              );
            }
          }
        },
      );

      await Promise.all(workers);

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
