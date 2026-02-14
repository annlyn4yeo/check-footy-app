import { logger } from "./logger.js";
import { ingestFixturePayload } from "./services/fixture-ingestion.service.js";
import { FixtureRepository } from "@checkfooty/db";

const INTERVAL_MS = 5000;

let isRunning = false;

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

      await ingestFixturePayload({
        providerFixtureId,
        minute: nextMinute,
        scoreHome: Math.floor(nextMinute / 10),
        scoreAway: 0,
        status: nextStatus,
        providerTimestamp: new Date(),
        events: [],
      });
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
