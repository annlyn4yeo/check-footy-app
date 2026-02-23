import { prisma } from "@checkfooty/db";
import { logger } from "../logger.js";
import { getRedis } from "../redis.js";
import type { Prisma } from "@checkfooty/db";
import { publishFixtureUpdated } from "../events/publisher.js";
import type { FixtureStatus } from "../types/fixture-status.js";

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
  providerTeamId?: number | null;
  playerName?: string | null;
  assistName?: string | null;
};

type IngestFixturePayload = {
  providerFixtureId: number;
  minute: number;
  scoreHome: number;
  scoreAway: number;
  status: FixtureStatus;
  providerTimestamp: Date;
  events: IngestEventInput[];
};

type FixtureEventPayload = {
  type: "fixture.event";
  providerFixtureId: number;
  eventId: string;
  minute: number;
  kind: "GOAL" | "OTHER";
  team: "HOME" | "AWAY";
  createdAt: string;
};

function resolveFixtureTeam(
  fixture: {
    homeTeamId: string;
    awayTeamId: string;
    homeTeam: { providerId: number };
    awayTeam: { providerId: number };
  },
  providerTeamId: number | null | undefined,
): { teamId: string | null; teamSide: "HOME" | "AWAY" } {
  if (providerTeamId == null) {
    return { teamId: null, teamSide: "HOME" };
  }

  if (providerTeamId === fixture.homeTeam.providerId) {
    return { teamId: fixture.homeTeamId, teamSide: "HOME" };
  }

  if (providerTeamId === fixture.awayTeam.providerId) {
    return { teamId: fixture.awayTeamId, teamSide: "AWAY" };
  }

  return { teamId: null, teamSide: "HOME" };
}

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
  const createdEvents: FixtureEventPayload[] = [];

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    logger.info(
      { providerFixtureId: payload.providerFixtureId },
      "Starting atomic fixture ingestion",
    );

    const fixture = await tx.fixture.findUnique({
      where: { providerFixtureId: payload.providerFixtureId },
      select: {
        id: true,
        providerLastUpdatedAt: true,
        status: true,
        minute: true,
        homeTeamId: true,
        awayTeamId: true,
        homeTeam: {
          select: { providerId: true },
        },
        awayTeam: {
          select: { providerId: true },
        },
      },
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

    // Deterministic event ordering
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
          teamId: resolveFixtureTeam(fixture, event.providerTeamId).teamId,
          playerName: event.playerName ?? null,
          assistName: event.assistName ?? null,
          providerUpdatedAt: new Date(),
        },
      });

      const mappedTeam = resolveFixtureTeam(fixture, event.providerTeamId);

      createdEvents.push({
        type: "fixture.event",
        providerFixtureId: payload.providerFixtureId,
        eventId: crypto.randomUUID(),
        minute: event.minute,
        kind:
          event.type === "GOAL" ||
          event.type === "PENALTY_GOAL" ||
          event.type === "OWN_GOAL"
            ? "GOAL"
            : "OTHER",
        team: mappedTeam.teamSide,
        createdAt: new Date().toISOString(),
      });

      logger.info({ providerEventId: event.providerEventId }, "Event created");
    }

    logger.info(
      { providerFixtureId: payload.providerFixtureId },
      "Atomic ingestion complete",
    );
  });

  // Redis invalidation AFTER successful transaction
  const redis = getRedis();
  const cacheKey = `fixture:${payload.providerFixtureId}`;

  await redis.del(cacheKey);

  logger.info({ cacheKey }, "Redis cache invalidated after ingestion");

  await publishFixtureUpdated({
    type: "fixture.updated",
    providerFixtureId: payload.providerFixtureId,
    status: payload.status,
    minute: payload.minute,
    scoreHome: payload.scoreHome,
    scoreAway: payload.scoreAway,
    updatedAt: new Date().toISOString(),
  });

  for (const eventPayload of createdEvents) {
    await redis.publish("fixture.event", JSON.stringify(eventPayload));
    console.log("Published fixture.event", eventPayload);
  }

  logger.info(
    { providerFixtureId: payload.providerFixtureId },
    "Published fixture.updated event",
  );
}
