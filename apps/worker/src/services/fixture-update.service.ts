import { prisma } from "@checkfooty/db";
import { logger } from "../logger.js";

type UpdateFixtureInput = {
  providerFixtureId: number;
  minute: number;
  scoreHome: number;
  scoreAway: number;
  isLive: boolean;
};

export async function updateFixture(input: UpdateFixtureInput) {
  return prisma.$transaction(async (tx) => {
    logger.info(
      { providerFixtureId: input.providerFixtureId },
      "Starting fixture update transaction",
    );

    const existing = await tx.fixture.findUnique({
      where: { providerFixtureId: input.providerFixtureId },
    });

    if (!existing) {
      logger.warn(
        { providerFixtureId: input.providerFixtureId },
        "Fixture not found",
      );
      return null;
    }

    const updated = await tx.fixture.update({
      where: { id: existing.id },
      data: {
        minute: input.minute,
        scoreHome: input.scoreHome,
        scoreAway: input.scoreAway,
        isLive: input.isLive,
        providerLastUpdatedAt: new Date(),
      },
    });

    logger.info({ fixtureId: updated.id }, "Fixture updated successfully");

    return updated;
  });
}
