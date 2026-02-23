import type { FixtureStatus } from "../types/fixture-status.js";

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
