import { SimulatedProvider } from "./simulated.provider.js";
import type { FixtureProvider } from "./provider.interface.js";

export function createProvider(): FixtureProvider {
  const providerType = process.env.FIXTURE_PROVIDER ?? "simulated";

  switch (providerType) {
    case "simulated":
      return new SimulatedProvider();

    default:
      throw new Error(`Unsupported FIXTURE_PROVIDER: ${providerType}`);
  }
}
