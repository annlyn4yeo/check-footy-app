import { SimulatedProvider } from "./simulated.provider.js";
import { FootballDataProvider } from "./football-data.provider.js";
import type { FixtureProvider } from "./provider.interface.js";

export function createProvider(): FixtureProvider {
  const providerType = (process.env.FIXTURE_PROVIDER ?? "football-data").toLowerCase();

  switch (providerType) {
    case "simulated":
      return new SimulatedProvider();

    case "football-data":
      return new FootballDataProvider();

    default:
      throw new Error(`Unsupported FIXTURE_PROVIDER: ${providerType}`);
  }
}
