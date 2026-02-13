import { prisma } from "../client";

export const FixtureRepository = {
  findByProviderFixtureId(providerFixtureId: number) {
    return prisma.fixture.findUnique({
      where: { providerFixtureId },
      include: {
        league: true,
        homeTeam: true,
        awayTeam: true,
        events: {
          orderBy: [
            { minute: "asc" },
            { extraMinute: "asc" },
            { createdAt: "asc" },
          ],
        },
      },
    });
  },

  findLive() {
    return prisma.fixture.findMany({
      where: { isLive: true },
      orderBy: { kickoffUtc: "asc" },
    });
  },
};
