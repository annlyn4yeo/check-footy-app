import { prisma } from "../client.js";
import type { Prisma } from "@prisma/client";

type LeagueRecord = Prisma.LeagueGetPayload<{}>;

export interface ILeagueRepository {
  findByProviderId(providerId: number): Promise<LeagueRecord | null>;
  findManyByProviderIds(providerIds: number[]): Promise<LeagueRecord[]>;
  upsertByProviderId(input: {
    providerId: number;
    name: string;
    country?: string | null;
  }): Promise<LeagueRecord>;
}

export const LeagueRepository: ILeagueRepository = {
  findByProviderId(providerId: number) {
    return prisma.league.findUnique({
      where: { providerId },
    });
  },

  findManyByProviderIds(providerIds: number[]) {
    if (providerIds.length === 0) {
      return Promise.resolve([]);
    }

    return prisma.league.findMany({
      where: { providerId: { in: providerIds } },
      orderBy: { providerId: "asc" },
    });
  },

  upsertByProviderId(input) {
    return prisma.league.upsert({
      where: { providerId: input.providerId },
      update: {
        name: input.name,
        country: input.country ?? null,
      },
      create: {
        providerId: input.providerId,
        name: input.name,
        country: input.country ?? null,
      },
    });
  },
};
