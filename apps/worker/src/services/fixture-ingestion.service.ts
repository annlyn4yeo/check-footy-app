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
  status:
    | "SCHEDULED"
    | "LIVE"
    | "HALF_TIME"
    | "FULL_TIME"
    | "POSTPONED"
    | "CANCELLED";
  providerTimestamp: Date;
  events: IngestEventInput[];
};

function isValidStatusTransition(current: string, incoming: string): boolean {
  if (current === incoming) return true;

  const allowed: Record<string, string[]> = {
    SCHEDULED: ["LIVE", "POSTPONED", "CANCELLED"],
    LIVE: ["HALF_TIME", "FULL_TIME"],
    HALF_TIME: ["LIVE", "FULL_TIME"],
    FULL_TIME: [],
    POSTPONED: [],
    CANCELLED: [],
  };

  return allowed[current]?.includes(incoming) ?? false;
}

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

    // VERSION GUARD
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

    // MINUTE REGRESSION GUARD
    if (fixture.status === "LIVE" && payload.minute < fixture.minute) {
      logger.error(
        {
          providerFixtureId: payload.providerFixtureId,
          currentMinute: fixture.minute,
          incomingMinute: payload.minute,
        },
        "Minute regression detected during LIVE state",
      );

      throw new Error("Illegal minute regression");
    }

    // STATUS TRANSITION GUARD
    if (!isValidStatusTransition(fixture.status, payload.status)) {
      logger.error(
        {
          currentStatus: fixture.status,
          incomingStatus: payload.status,
          providerFixtureId: payload.providerFixtureId,
        },
        "Invalid fixture status transition detected",
      );

      throw new Error("Illegal fixture state transition");
    }

    // Update fixture state
    await tx.fixture.update({
      where: { id: fixture.id },
      data: {
        minute: payload.minute,
        scoreHome: payload.scoreHome,
        scoreAway: payload.scoreAway,
        isLive: payload.status === "LIVE",
        status: payload.status,
        providerLastUpdatedAt: payload.providerTimestamp,
      },
    });

    // Deterministic ordering
    const sortedEvents = [...payload.events].sort((a, b) => {
      if (a.minute !== b.minute) {
        return a.minute - b.minute;
      }

      const extraA = a.extraMinute ?? 0;
      const extraB = b.extraMinute ?? 0;

      if (extraA !== extraB) {
        return extraA - extraB;
      }

      return a.providerEventId - b.providerEventId;
    });

    for (const event of sortedEvents) {
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
