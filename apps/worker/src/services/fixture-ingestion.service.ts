import { prisma } from "@checkfooty/db";
import { logger } from "../logger.js";

type IngestEventInput = {
  providerEventId: number;
  minute: number;
  extraMinute?: number | null;
  type:
    | "GOAL"
    | "PENALTY_GOAL"
    | "OWN_GOAL"
    | "YELLOW_CARD"
    | "RED_CARD"
    | "SUBSTITUTION"
    | "VAR";
  playerName?: string | null;
  assistName?: string | null;
};

type IngestFixturePayload = {
  providerFixtureId: number;
  minute: number;
  scoreHome: number;
  scoreAway: number;
  isLive: boolean;
  providerTimestamp: Date;
  events: IngestEventInput[];
};

export async function ingestFixturePayload(payload: IngestFixturePayload) {
  return prisma.$transaction(async (tx) => {
    logger.info(
      { providerFixtureId: payload.providerFixtureId },
      "Starting atomic fixture ingestion",
    );

    const fixture = await tx.fixture.findUnique({
      where: { providerFixtureId: payload.providerFixtureId },
    });

    if (!fixture) {
      throw new Error("Fixture not found for ingestion");
    }

    if (
      fixture.providerLastUpdatedAt &&
      payload.providerTimestamp <= fixture.providerLastUpdatedAt
    ) {
      logger.warn(
        {
          providerFixtureId: payload.providerFixtureId,
          incomingTimestamp: payload.providerTimestamp,
          lastProcessed: fixture.providerLastUpdatedAt,
        },
        "Skipping stale ingestion payload",
      );

      return;
    }

    // Update fixture state
    await tx.fixture.update({
      where: { id: fixture.id },
      data: {
        minute: payload.minute,
        scoreHome: payload.scoreHome,
        scoreAway: payload.scoreAway,
        isLive: payload.isLive,
        providerLastUpdatedAt: payload.providerTimestamp,
      },
    });

    // Process events
    for (const event of payload.events) {
      const exists = await tx.matchEvent.findUnique({
        where: { providerEventId: event.providerEventId },
      });

      if (exists) {
        logger.info(
          { providerEventId: event.providerEventId },
          "Skipping existing event",
        );
        continue;
      }

      await tx.matchEvent.create({
        data: {
          providerEventId: event.providerEventId,
          fixtureId: fixture.id,
          minute: event.minute,
          extraMinute: event.extraMinute ?? null,
          type: event.type,
          playerName: event.playerName ?? null,
          assistName: event.assistName ?? null,
          providerUpdatedAt: new Date(),
        },
      });

      logger.info({ providerEventId: event.providerEventId }, "Event created");
    }

    logger.info(
      { providerFixtureId: payload.providerFixtureId },
      "Atomic ingestion complete",
    );
  });
}
