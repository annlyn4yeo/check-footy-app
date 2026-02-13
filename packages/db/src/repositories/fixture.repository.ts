import { prisma } from "../client";

export const FixtureRepository = {
  findById(id: string) {
    return prisma.fixture.findUnique({
      where: { id },
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
