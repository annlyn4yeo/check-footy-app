import type { FixtureProvider } from "./provider.interface.js";
import type { FixtureStatus } from "../types/fixture-status.js";
import { FixtureRepository } from "@checkfooty/db";

export class SimulatedProvider implements FixtureProvider {
  async getFixtureUpdate(providerFixtureId: number) {
    const fixture =
      await FixtureRepository.findByProviderFixtureId(providerFixtureId);

    if (!fixture) return null;
    if (fixture.status !== "LIVE") return null;

    const nextMinute = fixture.minute + 1;
    const nextStatus: FixtureStatus = nextMinute >= 90 ? "FULL_TIME" : "LIVE";

    return {
      providerFixtureId,
      minute: nextMinute,
      scoreHome: Math.floor(nextMinute / 10),
      scoreAway: 0,
      status: nextStatus,
      providerTimestamp: new Date(),
      events:
        nextMinute % 15 === 0
          ? [
              {
                providerEventId: Date.now(),
                minute: nextMinute,
                type: "GOAL",
                playerName: "Sim Player",
              },
            ]
          : [],
    };
  }
}
