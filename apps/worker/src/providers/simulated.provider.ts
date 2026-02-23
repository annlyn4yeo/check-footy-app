import type { FixtureProvider } from "./provider.interface.js";
import type { FixtureStatus } from "../types/fixture-status.js";
import { FixtureRepository } from "@checkfooty/db";
import type { ProviderFixtureEvent } from "./provider.interface.js";

export class SimulatedProvider implements FixtureProvider {
  async getFixtureUpdate(providerFixtureId: number) {
    const fixture =
      await FixtureRepository.findByProviderFixtureId(providerFixtureId);

    if (!fixture) return null;
    if (fixture.status !== "LIVE") return null;

    const nextMinute = fixture.minute + 1;
    const nextStatus: FixtureStatus = nextMinute >= 90 ? "FULL_TIME" : "LIVE";

    const events: ProviderFixtureEvent[] =
      nextMinute % 15 === 0
        ? [
            {
              providerEventId: Date.now(),
              minute: nextMinute,
              type: "GOAL",
              providerTeamId:
                nextMinute % 30 === 0
                  ? fixture.awayTeam.providerId
                  : fixture.homeTeam.providerId,
              playerName: "Sim Player",
              assistName: "Sim Assist",
            },
          ]
        : [];

    return {
      providerFixtureId,
      minute: nextMinute,
      scoreHome: Math.floor(nextMinute / 10),
      scoreAway: 0,
      status: nextStatus,
      providerTimestamp: new Date(),
      events,
    };
  }
}
