import { prisma } from "../client.js";
import type { FixtureStatus, Prisma } from "@prisma/client";

const fixtureListSelect = {
  providerFixtureId: true,
  status: true,
  minute: true,
  scoreHome: true,
  scoreAway: true,
  isLive: true,
  kickoffUtc: true,
  league: {
    select: {
      providerId: true,
      name: true,
      country: true,
    },
  },
  homeTeam: {
    select: {
      providerId: true,
      name: true,
      shortName: true,
      crestUrl: true,
    },
  },
  awayTeam: {
    select: {
      providerId: true,
      name: true,
      shortName: true,
      crestUrl: true,
    },
  },
} satisfies Prisma.FixtureSelect;

const fixtureDetailSelect = {
  ...fixtureListSelect,
  homeTeamId: true,
  awayTeamId: true,
  updatedAt: true,
  matchEvents: {
    orderBy: [{ minute: "desc" }, { providerEventId: "desc" }],
    select: {
      providerEventId: true,
      minute: true,
      extraMinute: true,
      type: true,
      teamId: true,
      playerName: true,
      assistName: true,
      createdAt: true,
    },
  },
} satisfies Prisma.FixtureSelect;

export type FixturePublicListItem = Prisma.FixtureGetPayload<{
  select: typeof fixtureListSelect;
}>;

export type FixturePublicDetail = Prisma.FixtureGetPayload<{
  select: typeof fixtureDetailSelect;
}>;

export interface IFixtureRepository {
  findByProviderFixtureId(
    providerFixtureId: number,
  ): Promise<Prisma.FixtureGetPayload<{
    include: {
      league: true;
      homeTeam: true;
      awayTeam: true;
      matchEvents: true;
    };
  }> | null>;

  findLive(): Promise<Prisma.FixtureGetPayload<{}>[]>;
  upsertByProviderFixtureId(input: {
    providerFixtureId: number;
    leagueId: string;
    homeTeamId: string;
    awayTeamId: string;
    kickoffUtc: Date;
    minute: number;
    scoreHome: number;
    scoreAway: number;
    status: FixtureStatus;
    providerLastUpdatedAt?: Date | null;
  }): Promise<Prisma.FixtureGetPayload<{}>>;
  findPublicList(): Promise<FixturePublicListItem[]>;
  findPublicByProviderFixtureId(
    providerFixtureId: number,
  ): Promise<FixturePublicDetail | null>;
}

export const FixtureRepository: IFixtureRepository = {
  findByProviderFixtureId(providerFixtureId: number) {
    return prisma.fixture.findUnique({
      where: { providerFixtureId },
      include: {
        league: true,
        homeTeam: true,
        awayTeam: true,
        matchEvents: {
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

  upsertByProviderFixtureId(input) {
    const isLive = input.status === "LIVE";

    return prisma.fixture.upsert({
      where: { providerFixtureId: input.providerFixtureId },
      update: {
        leagueId: input.leagueId,
        homeTeamId: input.homeTeamId,
        awayTeamId: input.awayTeamId,
        kickoffUtc: input.kickoffUtc,
        minute: input.minute,
        scoreHome: input.scoreHome,
        scoreAway: input.scoreAway,
        status: input.status,
        isLive,
        providerLastUpdatedAt: input.providerLastUpdatedAt ?? null,
        deletedAt: null,
      },
      create: {
        providerFixtureId: input.providerFixtureId,
        leagueId: input.leagueId,
        homeTeamId: input.homeTeamId,
        awayTeamId: input.awayTeamId,
        kickoffUtc: input.kickoffUtc,
        minute: input.minute,
        scoreHome: input.scoreHome,
        scoreAway: input.scoreAway,
        status: input.status,
        isLive,
        providerLastUpdatedAt: input.providerLastUpdatedAt ?? null,
      },
    });
  },

  findPublicList() {
    return prisma.fixture.findMany({
      where: { deletedAt: null },
      orderBy: [{ isLive: "desc" }, { kickoffUtc: "asc" }],
      select: fixtureListSelect,
    });
  },

  findPublicByProviderFixtureId(providerFixtureId: number) {
    return prisma.fixture.findUnique({
      where: { providerFixtureId },
      select: fixtureDetailSelect,
    });
  },
};
