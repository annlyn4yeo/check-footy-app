import type { FixtureStatus } from "../types/fixture-status.js";

export interface FixtureProvider {
  getFixtureUpdate(providerFixtureId: number): Promise<{
    providerFixtureId: number;
    minute: number;
    scoreHome: number;
    scoreAway: number;
    status: FixtureStatus;
    providerTimestamp: Date;
    events: any[];
  } | null>;
}
