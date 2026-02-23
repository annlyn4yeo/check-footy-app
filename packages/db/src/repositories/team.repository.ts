import { prisma } from "../client.js";
import type { Prisma } from "@prisma/client";

type TeamRecord = Prisma.TeamGetPayload<{}>;

export interface ITeamRepository {
  findByProviderId(providerId: number): Promise<TeamRecord | null>;
  findManyByProviderIds(providerIds: number[]): Promise<TeamRecord[]>;
  upsertByProviderId(input: {
    providerId: number;
    name: string;
    shortName?: string | null;
    crestUrl?: string | null;
  }): Promise<TeamRecord>;
}

export const TeamRepository: ITeamRepository = {
  findByProviderId(providerId: number) {
    return prisma.team.findUnique({
      where: { providerId },
    });
  },

  findManyByProviderIds(providerIds: number[]) {
    if (providerIds.length === 0) {
      return Promise.resolve([]);
    }

    return prisma.team.findMany({
      where: { providerId: { in: providerIds } },
      orderBy: { providerId: "asc" },
    });
  },

  upsertByProviderId(input) {
    return prisma.team.upsert({
      where: { providerId: input.providerId },
      update: {
        name: input.name,
        shortName: input.shortName ?? null,
        crestUrl: input.crestUrl ?? null,
      },
      create: {
        providerId: input.providerId,
        name: input.name,
        shortName: input.shortName ?? null,
        crestUrl: input.crestUrl ?? null,
      },
    });
  },
};
