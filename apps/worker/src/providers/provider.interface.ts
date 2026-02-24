import type { FixtureStatus } from "../types/fixture-status.js";

export type ProviderFixtureSeed = {
  providerFixtureId: number;
  kickoffUtc: Date;
  minute: number;
  scoreHome: number;
  scoreAway: number;
  status: FixtureStatus;
  providerTimestamp: Date;
  league: {
    providerId: number;
    name: string;
    country?: string | null;
  };
  homeTeam: {
    providerId: number;
    name: string;
    shortName?: string | null;
    crestUrl?: string | null;
  };
  awayTeam: {
    providerId: number;
    name: string;
    shortName?: string | null;
    crestUrl?: string | null;
  };
};

export type ProviderFixtureEvent = {
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

export interface FixtureProvider {
  discoverFixtures(): Promise<ProviderFixtureSeed[]>;

  getFixtureUpdate(providerFixtureId: number): Promise<{
    providerFixtureId: number;
    minute: number;
    scoreHome: number;
    scoreAway: number;
    status: FixtureStatus;
    providerTimestamp: Date;
    events: ProviderFixtureEvent[];
  } | null>;
}
