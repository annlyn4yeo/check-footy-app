import type { FixtureProvider } from "./provider.interface.js";
import type { FixtureStatus } from "../types/fixture-status.js";

export class ApiFootballProvider implements FixtureProvider {
  async getFixtureUpdate(providerFixtureId: number) {
    try {
      throw new Error("API provider not implemented yet");
    } catch (error) {
      console.error("API provider error:", error);
      return null;
    }
  }
}
