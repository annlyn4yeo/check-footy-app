import { prisma } from "../client.js";
import type { Prisma } from "@prisma/client";

export interface IFixtureRepository {
  findByProviderFixtureId(
    providerFixtureId: number,
  ): Promise<Prisma.FixtureGetPayload<{
    include: {
      league: true;
      homeTeam: true;
      awayTeam: true;
      events: true;
    };
  }> | null>;

  findLive(): Promise<Prisma.FixtureGetPayload<{}>[]>;
}

export const FixtureRepository: IFixtureRepository = {
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
