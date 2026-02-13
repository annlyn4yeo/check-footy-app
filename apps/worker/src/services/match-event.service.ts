import { prisma } from "@checkfooty/db";
import { logger } from "../logger.js";
import type { Prisma } from "@checkfooty/db";

type UpsertMatchEventInput = {
  providerEventId: number;
  providerFixtureId: number;
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
  teamId?: string | null;
  playerName?: string | null;
  assistName?: string | null;
};

export async function upsertMatchEvent(input: UpsertMatchEventInput) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    logger.info(
      { providerEventId: input.providerEventId },
      "Starting match event upsert",
    );

    const fixture = await tx.fixture.findUnique({
      where: { providerFixtureId: input.providerFixtureId },
    });

    if (!fixture) {
      logger.warn(
        { providerFixtureId: input.providerFixtureId },
        "Fixture not found for event",
      );
      return null;
    }

    const existingEvent = await tx.matchEvent.findUnique({
      where: { providerEventId: input.providerEventId },
    });

    if (existingEvent) {
      logger.info(
        { providerEventId: input.providerEventId },
        "Event already exists — idempotent skip",
      );
      return existingEvent;
    }

    const created = await tx.matchEvent.create({
      data: {
        providerEventId: input.providerEventId,
        fixtureId: fixture.id,
        minute: input.minute,
        extraMinute: input.extraMinute ?? null,
        type: input.type,
        teamId: input.teamId ?? null,
        playerName: input.playerName ?? null,
        assistName: input.assistName ?? null,
        providerUpdatedAt: new Date(),
      },
    });

    logger.info({ eventId: created.id }, "Match event created");

    return created;
  });
}
