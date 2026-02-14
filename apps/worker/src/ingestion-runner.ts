import { logger } from "./logger.js";
import { ingestFixturePayload } from "./services/fixture-ingestion.service.js";
import { FixtureRepository } from "@checkfooty/db";
import { createProvider } from "./providers/providers.factory.js";

const INTERVAL_MS = 5000;

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
    logger.info("Ingestion cycle started");

    try {
      const fixture =
        await FixtureRepository.findByProviderFixtureId(providerFixtureId);

      if (!fixture) {
        logger.warn(
          { providerFixtureId },
          "Fixture not found. Skipping cycle.",
        );
        return;
      }

      // ---- Terminal State Lock ----
      const terminalStates = ["FULL_TIME", "POSTPONED", "CANCELLED"];

      if (terminalStates.includes(fixture.status)) {
        logger.info(
          { status: fixture.status },
          "[Terminal Lock] Fixture is terminal. No mutation.",
        );
        return;
      }

      // Only mutate LIVE fixtures
      if (fixture.status !== "LIVE") {
        logger.info(
          { status: fixture.status },
          "Fixture not LIVE. Skipping mutation.",
        );
        return;
      }

      const nextMinute = fixture.minute + 1;

      let nextStatus: "LIVE" | "FULL_TIME" = "LIVE";

      if (nextMinute >= 90) {
        nextStatus = "FULL_TIME";
      }

      const update = await provider.getFixtureUpdate(providerFixtureId);

      if (!update) {
        scheduleNext();
        return;
      }

      await ingestFixturePayload(update);
    } catch (error) {
      logger.error({ error }, "Ingestion cycle failed");
    } finally {
      const duration = Date.now() - start;

      logger.info({ durationMs: duration }, "Ingestion cycle completed");

      isRunning = false;
      scheduleNext();
    }
  }

  function scheduleNext() {
    setTimeout(runCycle, INTERVAL_MS);
  }

  scheduleNext();
}
